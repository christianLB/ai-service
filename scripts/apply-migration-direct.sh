#!/bin/bash
source .make.env
export SSHPASS

echo "=== Applying migration directly to production ==="

# Copy the migration file to NAS
echo "1. Copying migration file..."
sshpass -e scp migrations/1752104903760_add-all-missing-columns.js $NAS_USER@$NAS_HOST:/tmp/

# Apply the migration SQL directly
echo "2. Applying migration..."
sshpass -e ssh $NAS_USER@$NAS_HOST "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service" << 'EOF'
-- Add gocardless_data column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'financial' 
    AND table_name = 'transactions' 
    AND column_name = 'gocardless_data'
  ) THEN
    ALTER TABLE financial.transactions ADD COLUMN gocardless_data JSONB;
  END IF;
END $$;

-- Add transaction_hash
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'financial' 
    AND table_name = 'transactions' 
    AND column_name = 'transaction_hash'
  ) THEN
    ALTER TABLE financial.transactions ADD COLUMN transaction_hash VARCHAR(255);
  END IF;
END $$;

-- Add block_number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'financial' 
    AND table_name = 'transactions' 
    AND column_name = 'block_number'
  ) THEN
    ALTER TABLE financial.transactions ADD COLUMN block_number INTEGER;
  END IF;
END $$;

-- Add gas_used
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'financial' 
    AND table_name = 'transactions' 
    AND column_name = 'gas_used'
  ) THEN
    ALTER TABLE financial.transactions ADD COLUMN gas_used VARCHAR(255);
  END IF;
END $$;

-- Add gas_price
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'financial' 
    AND table_name = 'transactions' 
    AND column_name = 'gas_price'
  ) THEN
    ALTER TABLE financial.transactions ADD COLUMN gas_price VARCHAR(255);
  END IF;
END $$;

-- Add from_address
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'financial' 
    AND table_name = 'transactions' 
    AND column_name = 'from_address'
  ) THEN
    ALTER TABLE financial.transactions ADD COLUMN from_address VARCHAR(255);
  END IF;
END $$;

-- Add to_address
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'financial' 
    AND table_name = 'transactions' 
    AND column_name = 'to_address'
  ) THEN
    ALTER TABLE financial.transactions ADD COLUMN to_address VARCHAR(255);
  END IF;
END $$;

-- Add counterparty_account
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'financial' 
    AND table_name = 'transactions' 
    AND column_name = 'counterparty_account'
  ) THEN
    ALTER TABLE financial.transactions ADD COLUMN counterparty_account VARCHAR(255);
  END IF;
END $$;

-- Create account_insights view
CREATE OR REPLACE VIEW financial.account_insights AS
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

-- Create index
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_hash 
ON financial.transactions(transaction_hash);

-- Insert migration record
INSERT INTO pgmigrations (name, run_on)
VALUES ('1752104903760_add-all-missing-columns', NOW())
ON CONFLICT DO NOTHING;
EOF

echo "3. Verifying migration..."
sshpass -e ssh $NAS_USER@$NAS_HOST "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c \"SELECT column_name FROM information_schema.columns WHERE table_schema = 'financial' AND table_name = 'transactions' AND column_name IN ('gocardless_data', 'transaction_hash', 'block_number') ORDER BY column_name;\""

echo "4. Restarting service..."
sshpass -e ssh $NAS_USER@$NAS_HOST "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker restart ai-service"

echo "✅ Migration applied successfully"