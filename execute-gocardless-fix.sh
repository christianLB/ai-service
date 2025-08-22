#!/bin/bash

echo "🔧 Executing GoCardless Fix on Production"
echo "=========================================="

# Apply the SQL fix
ssh admin@192.168.1.11 docker exec -i ai-service-prod psql -U ai_user -d ai_service << 'SQL'
-- Show current state
\echo 'CURRENT STATE:'
SELECT user_id, config_key, is_global 
FROM financial.integration_configs 
WHERE integration_type = 'gocardless';

-- Apply the fix
UPDATE financial.integration_configs 
SET 
  user_id = NULL,
  is_global = true,
  updated_at = NOW()
WHERE integration_type = 'gocardless';

-- Show result
\echo ''
\echo 'AFTER FIX:'
SELECT 
  config_key,
  CASE 
    WHEN user_id IS NULL THEN '✅ FIXED - Now Global' 
    ELSE '❌ ERROR - Still has user_id' 
  END as status,
  is_global
FROM financial.integration_configs 
WHERE integration_type = 'gocardless'
ORDER BY config_key;

-- Count fixed records
\echo ''
SELECT COUNT(*) as records_fixed, 'GoCardless configs made global' as action
FROM financial.integration_configs 
WHERE integration_type = 'gocardless' AND user_id IS NULL;
SQL

echo ""
echo "✅ SQL Fix Applied"
echo ""
echo "🔄 Restarting container to clear cache..."

# Restart the container
ssh admin@192.168.1.11 docker restart ai-service-prod

echo ""
echo "✅ Container restarted"
echo ""
echo "=========================================="
echo "✅ FIX COMPLETE!"
echo "=========================================="
echo ""
echo "Test GoCardless sync at: https://ai-service.anaxi.net"
echo "Navigate to: Financial > GoCardless Sync"
echo "Click: Sync Now"