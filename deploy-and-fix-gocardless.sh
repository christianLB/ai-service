#!/bin/bash

echo "========================================="
echo "GoCardless Fix Deployment Script"
echo "========================================="
echo ""
echo "This script will:"
echo "1. Deploy the fixed code to production"
echo "2. Fix existing GoCardless configs to be global"
echo "3. Verify the fix worked"
echo ""

# Deploy to production
echo "Step 1: Deploying fixed code to production..."
echo "Run: ./ai-cli.js prod deploy nas"
echo ""

# SQL to fix existing configs
echo "Step 2: Fix existing configs in production database"
echo "Run this SQL on production:"
echo ""
cat << 'EOF'
-- Make existing GoCardless configs global
UPDATE financial.integration_configs 
SET 
  user_id = NULL, 
  is_global = true,
  updated_at = NOW()
WHERE integration_type = 'gocardless'
  AND config_key IN ('secret_id', 'secret_key');

-- Verify the fix
SELECT 
  CASE WHEN user_id IS NULL THEN 'GLOBAL ✓' ELSE 'USER-SPECIFIC ✗' END as scope,
  config_key, 
  is_global,
  is_active
FROM financial.integration_configs 
WHERE integration_type = 'gocardless'
ORDER BY config_key;
EOF

echo ""
echo "Step 3: Test GoCardless synchronization"
echo "- Login to https://ai-service.anaxi.net"
echo "- Go to Financial > GoCardless Sync"
echo "- Click 'Sync Now'"
echo "- It should work without 'Invalid credentials' error"
echo ""
echo "========================================="