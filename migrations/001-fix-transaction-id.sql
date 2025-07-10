-- HOTFIX: Add missing transaction_id column for GoCardless integration
-- Generated: 2025-07-09
-- Issue: Transaction insertions failing due to missing column

-- Add transaction_id column with UNIQUE constraint
ALTER TABLE financial.transactions 
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255) UNIQUE;

-- Update existing rows with unique IDs if needed
UPDATE financial.transactions 
SET transaction_id = id::text 
WHERE transaction_id IS NULL;

-- Make it NOT NULL after population
ALTER TABLE financial.transactions 
ALTER COLUMN transaction_id SET NOT NULL;

-- Add missing crypto and GoCardless fields
ALTER TABLE financial.transactions 
ADD COLUMN IF NOT EXISTS gocardless_data JSONB,
ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS block_number INTEGER,
ADD COLUMN IF NOT EXISTS gas_used VARCHAR(255),
ADD COLUMN IF NOT EXISTS gas_price VARCHAR(255),
ADD COLUMN IF NOT EXISTS from_address VARCHAR(255),
ADD COLUMN IF NOT EXISTS to_address VARCHAR(255),
ADD COLUMN IF NOT EXISTS counterparty_account VARCHAR(255);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON financial.transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON financial.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial.transactions(date);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE
    ON financial.transactions FOR EACH ROW EXECUTE PROCEDURE 
    update_updated_at_column();