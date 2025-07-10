-- Apply all pending migrations to fix production issues
-- Generated: 2025-07-09

-- 1. First apply the transaction ID fix (includes gocardless_data column)
\i migrations/001-fix-transaction-id.sql

-- 2. Add account insights view
\i migrations/add-account-insights.sql

-- 3. Fix account insights view if needed
\i migrations/fix-account-insights-view.sql

-- Verify the changes
SELECT 'Checking gocardless_data column:' as check_type,
       EXISTS (
           SELECT 1 
           FROM information_schema.columns 
           WHERE table_schema = 'financial' 
           AND table_name = 'transactions' 
           AND column_name = 'gocardless_data'
       ) as exists;

SELECT 'Checking account_insights view:' as check_type,
       EXISTS (
           SELECT 1 
           FROM information_schema.views 
           WHERE table_schema = 'financial' 
           AND table_name = 'account_insights'
       ) as exists;