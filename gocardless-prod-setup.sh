#!/bin/bash

# GoCardless Production Setup Script
# Usage: ./gocardless-prod-setup.sh [SECRET_ID] [SECRET_KEY] [ENVIRONMENT]

SECRET_ID="${1:-demo-sandbox-id-123456}"
SECRET_KEY="${2:-demo-sandbox-key-789012}"
ENVIRONMENT="${3:-sandbox}"

echo "🏦 GoCardless Production Configuration"
echo "======================================"
echo ""
echo "Configuration:"
echo "  Secret ID: ${SECRET_ID:0:15}..."
echo "  Secret Key: ${SECRET_KEY:0:15}..."
echo "  Environment: $ENVIRONMENT"
echo ""

# Determine API URL
if [ "$ENVIRONMENT" == "production" ]; then
  API_URL="https://bankaccountdata.gocardless.com/api/v2"
else
  API_URL="https://bankaccountdata.gocardless.com/api/v2"
fi

echo "  API URL: $API_URL"
echo ""

# SQL command
SQL_CMD=$(cat << 'EOSQL'
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email IN ('admin@ai-service.prod', 'admin@ai-service.local')
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    -- Use default ID if no admin found
    admin_user_id := 'f47f0e20-396c-4479-90c1-0a33b4c9d210'::UUID;
    RAISE NOTICE 'Using default admin ID: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Found admin user ID: %', admin_user_id;
  END IF;
  
  -- Insert GoCardless configuration
  INSERT INTO financial.integration_configs 
  (user_id, integration_type, config_key, config_value, is_encrypted, is_active, is_global) 
  VALUES 
  (admin_user_id, 'gocardless', 'secret_id', 'SECRET_ID_PLACEHOLDER', false, true, false),
  (admin_user_id, 'gocardless', 'secret_key', 'SECRET_KEY_PLACEHOLDER', false, true, false)
  ON CONFLICT (user_id, integration_type, config_key) 
  DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    is_active = true,
    updated_at = NOW();
  
  -- Insert global API URL
  INSERT INTO financial.integration_configs 
  (user_id, integration_type, config_key, config_value, is_encrypted, is_active, is_global) 
  VALUES 
  (NULL, 'gocardless', 'api_url', 'API_URL_PLACEHOLDER', false, true, true)
  ON CONFLICT (user_id, integration_type, config_key) 
  DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    is_active = true,
    updated_at = NOW()
  WHERE integration_configs.user_id IS NULL;
  
  RAISE NOTICE 'GoCardless configuration updated successfully';
END $$;

-- Show configuration
SELECT 
  COALESCE(u.email, 'GLOBAL') as user_email,
  ic.config_key,
  CASE 
    WHEN ic.config_key = 'secret_key' THEN LEFT(ic.config_value, 15) || '...'
    ELSE LEFT(ic.config_value, 25) || '...'
  END as value_preview,
  ic.is_active,
  ic.updated_at
FROM financial.integration_configs ic
LEFT JOIN auth.users u ON ic.user_id = u.id
WHERE ic.integration_type = 'gocardless'
ORDER BY ic.config_key;
EOSQL
)

# Replace placeholders
SQL_CMD="${SQL_CMD//SECRET_ID_PLACEHOLDER/$SECRET_ID}"
SQL_CMD="${SQL_CMD//SECRET_KEY_PLACEHOLDER/$SECRET_KEY}"
SQL_CMD="${SQL_CMD//API_URL_PLACEHOLDER/$API_URL}"

echo "🔄 Updating production database..."
echo ""

# Execute SQL
if command -v docker &> /dev/null; then
  # If running on a system with Docker
  echo "$SQL_CMD" | docker exec -i ai-service-prod psql -U ai_user -d ai_service
  RESULT=$?
else
  # If running directly on NAS
  echo "Please run this on the NAS server or a system with Docker access to ai-service-prod"
  echo ""
  echo "To run on NAS:"
  echo "1. Copy this script: scp $0 admin@192.168.1.11:/tmp/"
  echo "2. SSH to NAS: ssh admin@192.168.1.11"
  echo "3. Run: /tmp/$(basename $0) YOUR_SECRET_ID YOUR_SECRET_KEY sandbox"
  exit 1
fi

if [ $RESULT -eq 0 ]; then
  echo ""
  echo "✅ GoCardless configuration updated successfully!"
  echo ""
  echo "The integration is now configured with the provided credentials."
  echo "You can test it from the application or using:"
  echo "  ./ai-cli.js prod gocardless test prod"
else
  echo ""
  echo "❌ Failed to update GoCardless configuration"
  exit 1
fi