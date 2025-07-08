-- Add account_insights view if not exists
CREATE OR REPLACE VIEW financial.account_insights AS
SELECT 
    a.id,
    a.name,
    a.institution,
    a.iban,
    a.balance,
    a.available_balance,
    a.currency,
    a.type,
    a.last_sync,
    a.is_active,
    a.created_at,
    a.updated_at,
    COUNT(DISTINCT t.id) as transaction_count_30d,
    COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) as inflow_30d,
    COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) as outflow_30d,
    COALESCE(AVG(ABS(t.amount)), 0) as avg_transaction_30d
FROM 
    financial.accounts a
LEFT JOIN 
    financial.transactions t ON a.id = t.account_id 
    AND t.date >= CURRENT_DATE - INTERVAL '30 days'
    AND t.status = 'confirmed'
GROUP BY 
    a.id, a.name, a.institution, a.iban, a.balance, 
    a.available_balance, a.currency, a.type, a.last_sync, 
    a.is_active, a.created_at, a.updated_at;

-- Add missing columns to invoices table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'financial' 
                   AND table_name = 'invoices' 
                   AND column_name = 'aging_bucket') THEN
        ALTER TABLE financial.invoices 
        ADD COLUMN aging_bucket VARCHAR(20) 
        GENERATED ALWAYS AS (
            CASE 
                WHEN status = 'paid' THEN 'paid'
                WHEN due_date >= CURRENT_DATE THEN 'current'
                WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30'
                WHEN due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60'
                WHEN due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90'
                ELSE '90+'
            END
        ) STORED;
    END IF;
END $$;