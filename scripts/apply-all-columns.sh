#\!/bin/bash
source .make.env
export SSHPASS

echo "=== Applying all missing columns ==="
sshpass -e ssh k2600x@192.168.1.11 "echo '$SUDO_PASS'  < /dev/null |  sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service" << 'EOSQL'
BEGIN;

-- Add transaction_hash
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(255);

-- Add block_number  
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS block_number INTEGER;

-- Add gas_used
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS gas_used VARCHAR(255);

-- Add gas_price
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS gas_price VARCHAR(255);

-- Add from_address
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS from_address VARCHAR(255);

-- Add to_address
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS to_address VARCHAR(255);

-- Add counterparty_account
ALTER TABLE financial.transactions ADD COLUMN IF NOT EXISTS counterparty_account VARCHAR(255);

COMMIT;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'financial' 
AND table_name = 'transactions' 
AND column_name IN ('transaction_hash', 'block_number', 'gas_used', 'gas_price', 'from_address', 'to_address', 'counterparty_account')
ORDER BY column_name;
EOSQL
