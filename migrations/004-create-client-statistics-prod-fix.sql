-- Fix: Drop and recreate client_statistics table with correct types
DROP TABLE IF EXISTS financial.client_statistics CASCADE;

-- Create client_statistics table with VARCHAR client_id to match clients.id
CREATE TABLE financial.client_statistics (
    client_id VARCHAR(255) PRIMARY KEY REFERENCES financial.clients(id) ON DELETE CASCADE,
    paid_invoices INTEGER DEFAULT 0,
    pending_invoices INTEGER DEFAULT 0,
    overdue_invoices INTEGER DEFAULT 0,
    average_payment_days NUMERIC(10,2),
    last_payment_date DATE,
    risk_score VARCHAR(50) DEFAULT 'low' CHECK (risk_score IN ('low', 'medium', 'high')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_client_statistics_risk_score ON financial.client_statistics(risk_score);
CREATE INDEX idx_client_statistics_client_id ON financial.client_statistics(client_id);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_client_statistics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_statistics_updated_at_trigger
BEFORE UPDATE ON financial.client_statistics
FOR EACH ROW
EXECUTE FUNCTION update_client_statistics_updated_at();

-- Populate with initial data
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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON financial.client_statistics TO ai_user;