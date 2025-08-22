#!/bin/bash

echo "================================================"
echo "🚀 APPLYING GOCARDLESS FIX TO PRODUCTION"
echo "================================================"
echo ""

# Create temporary SQL file
cat > /tmp/fix.sql << 'EOF'
-- Check before fix
\echo 'BEFORE FIX:'
SELECT user_id, config_key FROM financial.integration_configs WHERE integration_type = 'gocardless';

-- Apply fix
UPDATE financial.integration_configs 
SET user_id = NULL, is_global = true, updated_at = NOW()
WHERE integration_type = 'gocardless';

-- Check after fix  
\echo 'AFTER FIX:'
SELECT 
  config_key,
  CASE WHEN user_id IS NULL THEN '✅ GLOBAL' ELSE '❌ HAS USER_ID' END as status
FROM financial.integration_configs 
WHERE integration_type = 'gocardless';
EOF

echo "📝 SQL fix created at /tmp/fix.sql"
echo ""
echo "Now run these commands:"
echo ""
echo "1. Copy to NAS:"
echo "   scp /tmp/fix.sql admin@192.168.1.11:/tmp/"
echo ""
echo "2. SSH to NAS:"
echo "   ssh admin@192.168.1.11"
echo ""
echo "3. Apply fix:"
echo "   docker exec -i ai-service-prod psql -U ai_user -d ai_service < /tmp/fix.sql"
echo ""
echo "4. Restart container:"
echo "   docker restart ai-service-prod"
echo ""
echo "5. Test at https://ai-service.anaxi.net"
echo ""
echo "================================================"