#!/usr/bin/env node

// Direct GoCardless configuration script for production
const { execSync } = require('child_process');

const secretId = process.argv[2] || 'demo-sandbox-id-123456';
const secretKey = process.argv[3] || 'demo-sandbox-key-789012';
const environment = process.argv[4] || 'sandbox';

console.log('🏦 Setting GoCardless Secrets in Production');
console.log('============================================');
console.log('');
console.log('📝 Configuration:');
console.log(`  Secret ID: ${secretId.substring(0, 10)}...`);
console.log(`  Secret Key: ${secretKey.substring(0, 10)}...`);
console.log(`  Environment: ${environment}`);
console.log('');

const apiUrl = environment === 'production' 
  ? 'https://bankaccountdata.gocardless.com/api/v2'
  : 'https://bankaccountdata.gocardless.com/api/v2';

// SQL to insert configuration
const sql = `
DO \\$\\$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email IN ('admin@ai-service.prod', 'admin@ai-service.local')
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    admin_user_id := 'f47f0e20-396c-4479-90c1-0a33b4c9d210'::UUID;
  END IF;
  
  -- Insert GoCardless configuration
  INSERT INTO financial.integration_configs 
  (user_id, integration_type, config_key, config_value, is_encrypted, is_active, is_global) 
  VALUES 
  (admin_user_id, 'gocardless', 'secret_id', '${secretId}', false, true, false),
  (admin_user_id, 'gocardless', 'secret_key', '${secretKey}', false, true, false)
  ON CONFLICT (user_id, integration_type, config_key) 
  DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    is_active = true,
    updated_at = NOW();
  
  -- Insert global API URL
  INSERT INTO financial.integration_configs 
  (user_id, integration_type, config_key, config_value, is_encrypted, is_active, is_global) 
  VALUES 
  (NULL, 'gocardless', 'api_url', '${apiUrl}', false, true, true)
  ON CONFLICT (user_id, integration_type, config_key) 
  DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    is_active = true,
    updated_at = NOW()
  WHERE integration_configs.user_id IS NULL;
  
  RAISE NOTICE 'GoCardless configuration updated successfully';
END \\$\\$;

-- Verify configuration
SELECT 
  COALESCE(u.email, 'GLOBAL') as user,
  ic.config_key,
  CASE 
    WHEN ic.config_key = 'secret_key' THEN LEFT(ic.config_value, 10) || '...'
    ELSE LEFT(ic.config_value, 20) || '...'
  END as value_preview,
  ic.is_active,
  ic.updated_at
FROM financial.integration_configs ic
LEFT JOIN auth.users u ON ic.user_id = u.id
WHERE ic.integration_type = 'gocardless'
ORDER BY ic.config_key;
`;

// Execute on NAS via SSH
console.log('🔄 Connecting to production database...');

try {
  // Write SQL to temporary file
  require('fs').writeFileSync('/tmp/gocardless_setup.sql', sql);
  
  // Execute via SSH to NAS
  const result = execSync(`ssh admin@192.168.1.11 "docker exec -i ai-service-prod psql -U ai_user -d ai_service" < /tmp/gocardless_setup.sql 2>&1`, {
    encoding: 'utf8'
  });
  
  console.log('✅ GoCardless secrets configured successfully!');
  console.log('');
  console.log('Configuration Status:');
  console.log('--------------------');
  console.log(result);
  
} catch (error) {
  console.error('❌ Failed to configure GoCardless:', error.message);
  process.exit(1);
}

console.log('');
console.log('🎉 Production GoCardless configuration complete!');
console.log('');
console.log('To use your own credentials, run:');
console.log('  node set-gocardless-prod.js YOUR_SECRET_ID YOUR_SECRET_KEY sandbox');
console.log('');