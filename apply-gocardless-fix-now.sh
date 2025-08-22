#!/bin/bash

echo "============================================"
echo "🔧 Applying GoCardless Fix to Production"
echo "============================================"
echo ""
echo "This script will fix the GoCardless configuration issue immediately."
echo ""
echo "MANUAL STEPS (Copy and paste these commands):"
echo ""
echo "1. SSH to your NAS:"
echo "   ssh admin@192.168.1.11"
echo ""
echo "2. Run the SQL fix:"
echo ""
cat << 'EOF'
docker exec -i ai-service-prod psql -U ai_user -d ai_service << 'SQL'
-- Check current state
SELECT 
  COUNT(*) as configs_with_user_id,
  'BEFORE FIX' as status
FROM financial.integration_configs 
WHERE integration_type = 'gocardless' 
  AND user_id IS NOT NULL;

-- Apply the fix
UPDATE financial.integration_configs 
SET 
  user_id = NULL,
  is_global = true,
  updated_at = NOW()
WHERE integration_type = 'gocardless';

-- Verify fix worked
SELECT 
  config_key,
  CASE 
    WHEN user_id IS NULL THEN '✅ FIXED - Global' 
    ELSE '❌ ERROR - Still has user_id' 
  END as status
FROM financial.integration_configs 
WHERE integration_type = 'gocardless'
ORDER BY config_key;
SQL
EOF

echo ""
echo "3. Restart the container to clear cache:"
echo "   docker restart ai-service-prod"
echo ""
echo "4. Test GoCardless sync at https://ai-service.anaxi.net"
echo ""
echo "============================================"
echo "The code fix has been pushed to GitHub."
echo "This SQL fix corrects the existing data."
echo "============================================"