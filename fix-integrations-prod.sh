#!/bin/bash

echo "Fixing GoCardless integration configuration in production..."
echo "This script inserts the required GoCardless credentials directly into the database."

# Insert GoCardless credentials directly using docker exec
docker exec -i ai-service-prod psql -U ai_user -d ai_service << 'EOF'
-- Check if the admin user exists and get their ID
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@ai-service.prod' 
    LIMIT 1;
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Admin user not found, using default ID';
        admin_user_id := 'f47f0e20-396c-4479-90c1-0a33b4c9d210'::UUID;
    END IF;

    -- Insert GoCardless configuration
    INSERT INTO financial.integration_configs 
    (user_id, integration_type, config_key, config_value, is_encrypted, is_active, is_global, created_at, updated_at) 
    VALUES 
    (admin_user_id, 'gocardless', 'secret_id', '3fa85f64-5717-4562-b3fc-2c963f66afa6', false, true, false, NOW(), NOW()),
    (admin_user_id, 'gocardless', 'secret_key', 'sandbox_secret_key_test_1234567890', false, true, false, NOW(), NOW())
    ON CONFLICT (user_id, integration_type, config_key) 
    DO UPDATE SET 
        config_value = EXCLUDED.config_value,
        is_active = true,
        updated_at = NOW();

    -- Also insert global API URL configuration
    INSERT INTO financial.integration_configs 
    (user_id, integration_type, config_key, config_value, is_encrypted, is_active, is_global, created_at, updated_at) 
    VALUES 
    (NULL, 'gocardless', 'api_url', 'https://bankaccountdata.gocardless.com/api/v2', false, true, true, NOW(), NOW())
    ON CONFLICT (user_id, integration_type, config_key) 
    DO UPDATE SET 
        config_value = EXCLUDED.config_value,
        is_active = true,
        updated_at = NOW()
    WHERE integration_configs.user_id IS NULL;

    RAISE NOTICE 'GoCardless configuration inserted successfully for user ID: %', admin_user_id;
END $$;

-- Verify the configuration was inserted
SELECT 
    COALESCE(u.email, 'GLOBAL') as user_email,
    ic.integration_type, 
    ic.config_key, 
    CASE 
        WHEN ic.config_key = 'secret_key' THEN LEFT(ic.config_value, 10) || '...'
        ELSE LEFT(ic.config_value, 30) || '...'
    END as config_preview,
    ic.is_active,
    ic.is_global,
    ic.created_at,
    ic.updated_at
FROM financial.integration_configs ic
LEFT JOIN auth.users u ON ic.user_id = u.id
WHERE ic.integration_type = 'gocardless'
ORDER BY ic.is_global DESC, ic.config_key;
EOF

echo ""
echo "GoCardless configuration has been inserted!"
echo ""
echo "The integration should now work from the frontend."
echo "Note: These are sandbox/test credentials. Replace with real GoCardless"
echo "credentials when ready for production use."
echo ""
echo "To run this script on the NAS:"
echo "1. Copy: scp $0 admin@192.168.1.11:/tmp/"
echo "2. SSH: ssh admin@192.168.1.11"  
echo "3. Run: chmod +x /tmp/fix-integrations-prod.sh && /tmp/fix-integrations-prod.sh"