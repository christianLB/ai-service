#!/bin/bash

echo "🔧 Fixing GoCardless Configuration in Production"
echo "================================================"
echo ""

# The SQL commands to fix GoCardless
SQL_COMMANDS='
-- Delete existing configs
DELETE FROM financial.integration_configs WHERE integration_type = '"'"'gocardless'"'"';

-- Insert as GLOBAL configs (user_id MUST be NULL)
INSERT INTO financial.integration_configs 
(user_id, integration_type, config_key, config_value, is_encrypted, is_active, is_global) 
VALUES 
(NULL, '"'"'gocardless'"'"', '"'"'secret_id'"'"', '"'"'4e004333-f788-4e45-8d18-2449cf6194e3'"'"', false, true, true),
(NULL, '"'"'gocardless'"'"', '"'"'secret_key'"'"', '"'"'8137f20b9fe17890d240741b317dbe29d85d8f4b4740d9c47797bcfc9d95290f651250d63b7adc5952f96ee284756f511449af4eb97fa2f65c0c5b9d160485fd'"'"', false, true, true),
(NULL, '"'"'gocardless'"'"', '"'"'api_url'"'"', '"'"'https://bankaccountdata.gocardless.com/api/v2'"'"', false, true, true);

-- Verify
SELECT 
  CASE WHEN user_id IS NULL THEN '"'"'GLOBAL'"'"' ELSE '"'"'USER'"'"' END as scope,
  config_key,
  is_active
FROM financial.integration_configs 
WHERE integration_type = '"'"'gocardless'"'"';
'

echo "To fix GoCardless, run these commands:"
echo ""
echo "1. SSH to your NAS:"
echo "   ssh admin@192.168.1.11"
echo ""
echo "2. Run the SQL fix:"
echo "   docker exec -i ai-service-prod psql -U ai_user -d ai_service << 'EOF'"
echo "$SQL_COMMANDS"
echo "EOF"
echo ""
echo "3. Restart the API to clear cache:"
echo "   docker restart ai-service-prod"
echo ""
echo "4. Test synchronization again"
echo ""
echo "================================================"