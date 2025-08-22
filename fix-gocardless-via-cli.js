#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔧 Applying GoCardless Fix via AI CLI');
console.log('=====================================\n');

// SQL command to fix the configs
const sqlFix = `
UPDATE financial.integration_configs 
SET user_id = NULL, is_global = true, updated_at = NOW()
WHERE integration_type = 'gocardless';

SELECT config_key, 
  CASE WHEN user_id IS NULL THEN '✅ FIXED' ELSE '❌ NOT FIXED' END as status
FROM financial.integration_configs 
WHERE integration_type = 'gocardless';
`;

try {
  // Execute via docker on production
  console.log('Applying SQL fix...');
  const result = execSync(
    `echo "${sqlFix.replace(/"/g, '\\"')}" | docker exec -i ai-service-prod psql -U ai_user -d ai_service`,
    { encoding: 'utf8', stdio: 'pipe' }
  );
  
  console.log('Result:', result);
  
  // Restart container
  console.log('\n🔄 Restarting container...');
  execSync('docker restart ai-service-prod', { stdio: 'inherit' });
  
  console.log('\n✅ Fix applied successfully!');
  console.log('\nTest at: https://ai-service.anaxi.net');
  console.log('Go to: Financial > GoCardless Sync');
  console.log('Click: Sync Now');
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}