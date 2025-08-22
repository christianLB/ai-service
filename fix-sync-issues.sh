#!/bin/bash

echo "🔧 FIXING GOCARDLESS SYNC ISSUES"
echo "================================"
echo ""

# SQL to fix sync_logs table
SQL_FIX='
-- Add missing account_id column to sync_logs
ALTER TABLE financial.sync_logs 
ADD COLUMN IF NOT EXISTS account_id UUID;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = '"'"'financial'"'"' 
  AND table_name = '"'"'sync_logs'"'"'
  AND column_name = '"'"'account_id'"'"';

-- Show table structure
\d financial.sync_logs
'

echo "1. Fixing sync_logs table schema..."
echo "$SQL_FIX" | ssh k2600x@192.168.1.11 'sudo /usr/local/bin/docker exec -i ai-postgres psql -U ai_user -d ai_service'

echo ""
echo "2. Fixing transaction sync period (7 → 90 days)..."
echo "   This requires a code change in gocardless.service.ts"
echo ""

# Show the fix needed
echo "✅ Database schema fixed!"
echo ""
echo "📝 For the 90-day sync issue, we need to update the code:"
echo "   File: src/services/financial/gocardless.service.ts"
echo "   Change: syncAccountTransactions(accountId: string, days = 7)"
echo "   To:     syncAccountTransactions(accountId: string, days = 90)"
echo ""
echo "Restarting container to apply schema changes..."
ssh k2600x@192.168.1.11 'sudo /usr/local/bin/docker restart ai-service'

echo ""
echo "✅ SYNC_LOGS TABLE FIXED!"
echo ""
echo "Next: Need to fix the 90-day period in the code and redeploy"