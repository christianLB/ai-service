#!/bin/bash

echo "=================================="
echo "GoCardless Production Fix"
echo "=================================="
echo ""
echo "This script fixes the GoCardless configuration issue in production."
echo ""
echo "MANUAL STEPS REQUIRED:"
echo ""
echo "1. SSH to your NAS:"
echo "   ssh admin@192.168.1.11"
echo ""
echo "2. Run this SQL command to fix existing configs:"
cat << 'SQL'
   docker exec -i ai-service-prod psql -U ai_user -d ai_service << 'EOF'
   -- Check current state
   SELECT 
     'BEFORE:' as status,
     user_id,
     config_key,
     is_global
   FROM financial.integration_configs 
   WHERE integration_type = 'gocardless';

   -- Fix: Make configs truly global
   UPDATE financial.integration_configs 
   SET 
     user_id = NULL,
     is_global = true,
     updated_at = NOW()
   WHERE integration_type = 'gocardless';

   -- Verify the fix
   SELECT 
     'AFTER:' as status,
     CASE WHEN user_id IS NULL THEN '✅ GLOBAL' ELSE '❌ USER' END as scope,
     config_key,
     is_global
   FROM financial.integration_configs 
   WHERE integration_type = 'gocardless';
   EOF
SQL
echo ""
echo "3. Restart the production container to clear cache:"
echo "   docker restart ai-service-prod"
echo ""
echo "4. Test GoCardless synchronization:"
echo "   - Go to https://ai-service.anaxi.net"
echo "   - Navigate to Financial > GoCardless Sync"
echo "   - Click 'Sync Now'"
echo "   - Should work without 'Invalid credentials' error"
echo ""
echo "=================================="
echo "WHY THIS FIX IS NEEDED:"
echo ""
echo "- GoCardless service expects configs with user_id = NULL (global)"
echo "- The UI was saving with your user_id even when marked as global"
echo "- Code has been fixed for future saves"
echo "- This script fixes the existing data"
echo "=================================="