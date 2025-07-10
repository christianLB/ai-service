-- Add gocardless_data column
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS gocardless_data JSONB;

-- Add other missing columns
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(255);
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS block_number INTEGER;
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS gas_used VARCHAR(255);
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS gas_price VARCHAR(255);
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS from_address VARCHAR(255);
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS to_address VARCHAR(255);
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS counterparty_account VARCHAR(255);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'financial' 
AND table_name = 'transactions' 
AND column_name IN ('gocardless_data', 'transaction_hash', 'block_number')
ORDER BY column_name;