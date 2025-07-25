#!/usr/bin/env node

/**
 * Simple test to check Claude configuration
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('Loaded .env.local');
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434'),
  database: process.env.DB_NAME || 'ai_service',
  user: process.env.DB_USER || 'ai_user',
  password: process.env.DB_PASSWORD || 'ultra_secure_password_2025',
};

// Decryption function (matching the service)
function decrypt(text, encryptionKey) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt value', error);
    throw new Error('Failed to decrypt configuration value');
  }
}

async function testClaude() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🧪 Testing Claude Configuration...\n');
    
    // Get Claude API key from database
    const result = await pool.query(
      `SELECT config_value, is_encrypted 
       FROM financial.integration_configs 
       WHERE integration_type = 'claude' AND config_key = 'api_key' AND is_global = true`
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No Claude API key found in database');
      console.log('\nPlease set it with:');
      console.log('make config-set TYPE=claude KEY=api_key VALUE=your-api-key GLOBAL=true');
      process.exit(1);
    }
    
    const { config_value, is_encrypted } = result.rows[0];
    console.log('✅ Claude API key found in database');
    console.log(`   Encrypted: ${is_encrypted ? 'Yes' : 'No'}`);
    
    if (is_encrypted) {
      // Decrypt the value to test it
      const key = process.env.INTEGRATION_CONFIG_KEY || process.env.JWT_SECRET || 'default-encryption-key-32-chars!!';
      const encryptionKey = crypto.scryptSync(key, 'salt', 32);
      const decryptedValue = decrypt(config_value, encryptionKey);
      
      console.log(`   Decrypted successfully: ${decryptedValue.startsWith('sk-ant-') ? 'Yes (valid format)' : 'No (invalid format)'}`);
      console.log(`   Key preview: ${decryptedValue.substring(0, 15)}...`);
      
      // Test if it's a real key or dummy
      if (decryptedValue.includes('dummy') || decryptedValue.includes('test')) {
        console.log('\n⚠️  This appears to be a test/dummy key');
        console.log('   Please replace with your real Claude API key for full testing');
      }
    }
    
    // Check AI status endpoint
    console.log('\n📡 To test the full integration:');
    console.log('1. Make sure the service is running: make dev-up');
    console.log('2. Check AI status: curl http://localhost:3001/api/trading/ai-status');
    console.log('3. Test a trading analysis through the API');
    
    console.log('\n✅ Configuration test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the test
testClaude();