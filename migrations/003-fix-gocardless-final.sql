-- Final fix for missing columns
-- This adds ONLY the missing columns, one at a time

-- Add gocardless_data if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'financial' 
                   AND table_name = 'transactions' 
                   AND column_name = 'gocardless_data') THEN
        ALTER TABLE financial.transactions ADD COLUMN gocardless_data JSONB;
        RAISE NOTICE 'Added gocardless_data column';
    ELSE
        RAISE NOTICE 'gocardless_data column already exists';
    END IF;
END $$;

-- Verify
SELECT 'gocardless_data' as column_name, 
       EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'financial' 
               AND table_name = 'transactions' 
               AND column_name = 'gocardless_data') as exists;