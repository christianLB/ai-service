#!/bin/bash

# GoCardless Production Fix
# Run this script from a terminal with SSH keys configured

echo "🔧 GOCARDLESS PRODUCTION FIX"
echo "============================"
echo ""

# The SQL fix
SQL_FIX='
-- Show current state
SELECT user_id, config_key FROM financial.integration_configs WHERE integration_type = '"'"'gocardless'"'"';

-- Apply the fix
UPDATE financial.integration_configs 
SET user_id = NULL, is_global = true, updated_at = NOW()
WHERE integration_type = '"'"'gocardless'"'"';

-- Show result
SELECT config_key, 
  CASE WHEN user_id IS NULL THEN '"'"'✅ FIXED'"'"' ELSE '"'"'❌ NOT FIXED'"'"' END as status
FROM financial.integration_configs WHERE integration_type = '"'"'gocardless'"'"';
'

echo "Applying fix to production database..."
echo "$SQL_FIX" | ssh k2600x@192.168.1.11 'sudo /usr/local/bin/docker exec -i ai-postgres psql -U ai_user -d ai_service'

echo ""
echo "Restarting container..."
ssh k2600x@192.168.1.11 'sudo /usr/local/bin/docker restart ai-service'

echo ""
echo "✅ FIX COMPLETE!"
echo ""
echo "Test at: https://ai-service.anaxi.net"
echo "Go to: Financial > GoCardless Sync"
echo "Click: Sync Now"