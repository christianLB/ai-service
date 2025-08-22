#!/bin/bash

echo "Fixing GoCardless integration in production..."

# Get the container name
CONTAINER="ai-service-prod"

# Insert GoCardless test credentials for admin user
docker exec -i $CONTAINER psql -U ai_user -d ai_service << 'EOF'
-- First check if admin user exists
SELECT id, email FROM auth.users WHERE email = 'admin@ai-service.prod';

-- Insert GoCardless configuration (sandbox test credentials)
INSERT INTO financial.integration_configs (user_id, integration_type, config_key, config_value, is_encrypted, is_active, is_global) 
VALUES 
  ('f47f0e20-396c-4479-90c1-0a33b4c9d210', 'gocardless', 'secret_id', '3fa85f64-5717-4562-b3fc-2c963f66afa6', false, true, false),
  ('f47f0e20-396c-4479-90c1-0a33b4c9d210', 'gocardless', 'secret_key', 'sandbox_secret_key_test_1234567890', false, true, false)
ON CONFLICT (user_id, integration_type, config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value, 
  is_active = true,
  updated_at = NOW();

-- Also insert global sandbox URL configuration
INSERT INTO financial.integration_configs (user_id, integration_type, config_key, config_value, is_encrypted, is_active, is_global) 
VALUES 
  (NULL, 'gocardless', 'api_url', 'https://bankaccountdata.gocardless.com/api/v2', false, true, true)
ON CONFLICT (user_id, integration_type, config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value, 
  is_active = true,
  updated_at = NOW()
WHERE integration_configs.user_id IS NULL;

-- Verify the configuration
SELECT 
  user_id,
  integration_type, 
  config_key, 
  LEFT(config_value, 20) || '...' as config_preview,
  is_active,
  is_global
FROM financial.integration_configs 
WHERE integration_type = 'gocardless'
ORDER BY is_global DESC, config_key;
EOF

echo "GoCardless configuration completed!"
echo ""
echo "To run this on the NAS:"
echo "1. Copy this script to NAS: scp $0 admin@192.168.1.11:/tmp/"
echo "2. SSH to NAS: ssh admin@192.168.1.11"
echo "3. Run: chmod +x /tmp/fix-gocardless-prod.sh && /tmp/fix-gocardless-prod.sh"