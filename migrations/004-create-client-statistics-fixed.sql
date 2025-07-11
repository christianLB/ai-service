-- Populate initial data from existing invoices
INSERT INTO financial.client_statistics (
    client_id, 
    paid_invoices, 
    pending_invoices, 
    overdue_invoices, 
    average_payment_days, 
    last_payment_date,
    risk_score
)
SELECT 
    c.id as client_id,
    COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_invoices,
    COUNT(CASE WHEN i.status IN ('sent', 'viewed') THEN 1 END) as pending_invoices,
    COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_invoices,
    AVG(CASE 
        WHEN i.status = 'paid' AND i.paid_date IS NOT NULL AND i.issue_date IS NOT NULL 
        THEN DATE_PART('day', i.paid_date::timestamp - i.issue_date::timestamp)
        ELSE NULL 
    END) as average_payment_days,
    MAX(CASE WHEN i.status = 'paid' THEN i.paid_date ELSE NULL END) as last_payment_date,
    -- Risk score based on overdue percentage
    CASE 
        WHEN COUNT(i.id) = 0 THEN 'low'
        WHEN (COUNT(CASE WHEN i.status = 'overdue' THEN 1 END)::NUMERIC / NULLIF(COUNT(i.id), 0)) > 0.5 THEN 'high'
        WHEN (COUNT(CASE WHEN i.status = 'overdue' THEN 1 END)::NUMERIC / NULLIF(COUNT(i.id), 0)) > 0.2 THEN 'medium'
        ELSE 'low'
    END as risk_score
FROM financial.clients c
LEFT JOIN financial.invoices i ON c.id = i.client_id
GROUP BY c.id
ON CONFLICT (client_id) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON financial.client_statistics TO ai_user;