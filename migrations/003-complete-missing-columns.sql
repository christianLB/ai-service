-- Complete migration to add all missing columns
-- This migration adds GoCardless and crypto support columns

BEGIN;

-- Add gocardless_data column
ALTER TABLE financial.transactions 
ADD COLUMN IF NOT EXISTS gocardless_data JSONB;

-- Add crypto-related columns
ALTER TABLE financial.transactions 
ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(255);

ALTER TABLE financial.transactions 
ADD COLUMN IF NOT EXISTS block_number INTEGER;

ALTER TABLE financial.transactions 
ADD COLUMN IF NOT EXISTS gas_used VARCHAR(255);

ALTER TABLE financial.transactions 
ADD COLUMN IF NOT EXISTS gas_price VARCHAR(255);

ALTER TABLE financial.transactions 
ADD COLUMN IF NOT EXISTS from_address VARCHAR(255);

ALTER TABLE financial.transactions 
ADD COLUMN IF NOT EXISTS to_address VARCHAR(255);

ALTER TABLE financial.transactions 
ADD COLUMN IF NOT EXISTS counterparty_account VARCHAR(255);

-- Create account_insights view
DROP VIEW IF EXISTS financial.account_insights;
CREATE VIEW financial.account_insights AS
SELECT 
    a.id,
    a.name,
    a.balance,
    c.code as currency_code,
    
    -- Last 30 days activity
    (SELECT COUNT(*) FROM financial.transactions t 
     WHERE t.account_id = a.id::text AND t.date >= NOW() - INTERVAL '30 days') as transactions_30d,
    
    (SELECT COALESCE(SUM(t.amount), 0) FROM financial.transactions t 
     WHERE t.account_id = a.id::text 
     AND t.amount > 0 
     AND t.date >= NOW() - INTERVAL '30 days') as income_30d,
     
    (SELECT COALESCE(SUM(ABS(t.amount)), 0) FROM financial.transactions t 
     WHERE t.account_id = a.id::text 
     AND t.amount < 0 
     AND t.date >= NOW() - INTERVAL '30 days') as expenses_30d
     
FROM financial.accounts a
JOIN financial.currencies c ON a.currency_id = c.id
WHERE a.is_active = true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_hash 
ON financial.transactions(transaction_hash);

CREATE INDEX IF NOT EXISTS idx_transactions_from_address 
ON financial.transactions(from_address);

CREATE INDEX IF NOT EXISTS idx_transactions_to_address 
ON financial.transactions(to_address);

-- Verify the changes
SELECT 
    'Migration completed' as status,
    COUNT(*) as columns_added
FROM information_schema.columns 
WHERE table_schema = 'financial' 
AND table_name = 'transactions'
AND column_name IN ('gocardless_data', 'transaction_hash', 'block_number', 'gas_used', 'gas_price', 'from_address', 'to_address', 'counterparty_account');

COMMIT;