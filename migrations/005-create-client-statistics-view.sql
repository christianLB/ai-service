-- Migration: Create client_statistics view
-- Description: Creates financial.client_statistics view for dashboard endpoints
-- Date: 2025-07-12

-- Drop view if exists to avoid conflicts
DROP VIEW IF EXISTS financial.client_statistics CASCADE;

-- Create client_statistics view
CREATE OR REPLACE VIEW financial.client_statistics AS
SELECT 
    c.id AS client_id,
    c.name AS client_name,
    c.total_revenue,
    c.total_invoices,
    COUNT(CASE WHEN i.status = 'paid' THEN 1 END) AS paid_invoices,
    COUNT(CASE WHEN i.status IN ('sent', 'viewed') THEN 1 END) AS pending_invoices,
    COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) AS overdue_invoices,
    AVG(CASE 
        WHEN i.paid_date IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (i.paid_date::timestamp - i.issue_date::timestamp))/86400 
    END) AS average_payment_days,
    MAX(i.paid_date) AS last_payment_date,
    CASE 
        WHEN COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) > 2 THEN 'high'
        WHEN COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) > 0 THEN 'medium'
        ELSE 'low'
    END AS risk_score
FROM financial.clients c
LEFT JOIN financial.invoices i ON c.id = i.client_id
GROUP BY c.id, c.name, c.total_revenue, c.total_invoices;

-- Grant permissions
GRANT SELECT ON financial.client_statistics TO ai_user;

-- Add comment
COMMENT ON VIEW financial.client_statistics IS 'Aggregated statistics for clients including payment behavior and risk assessment';