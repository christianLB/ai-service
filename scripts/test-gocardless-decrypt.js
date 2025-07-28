#!/usr/bin/env node

/**
 * Test decrypting GoCardless credentials with different keys
 */

const crypto = require('crypto');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434'),
  database: process.env.DB_NAME || 'ai_service',
  user: process.env.DB_USER || 'ai_user',
  password: process.env.DB_PASSWORD || 'ultra_secure_password_2025',
};

function tryDecrypt(text, key) {
  try {
    const encryptionKey = crypto.scryptSync(key, 'salt', 32);
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return { success: true, value: decrypted };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testKeys() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔐 Testing GoCardless Credential Decryption\n');
    
    // Keys to try
    const keysToTry = [
      { name: 'Current JWT_SECRET', key: process.env.JWT_SECRET },
      { name: 'Default key', key: 'default-encryption-key-32-chars!!' },
      { name: 'dev-secret-key', key: 'dev-secret-key' },
      { name: 'Simple dev key', key: 'dev-secret-key-32-chars-padding!' },
    ];
    
    // Get GoCardless credentials
    const query = `
      SELECT config_key, config_value 
      FROM financial.integration_configs 
      WHERE integration_type = 'gocardless' 
      AND is_encrypted = true
      ORDER BY config_key
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('No encrypted GoCardless credentials found.');
      return;
    }
    
    console.log(`Found ${result.rows.length} GoCardless credentials\n`);
    
    for (const row of result.rows) {
      console.log(`\n📋 Testing ${row.config_key}:`);
      console.log(`   Encrypted value: ${row.config_value.substring(0, 32)}...`);
      
      let decrypted = false;
      for (const keyOption of keysToTry) {
        if (!keyOption.key) continue;
        
        const result = tryDecrypt(row.config_value, keyOption.key);
        
        if (result.success) {
          console.log(`   ✅ SUCCESS with ${keyOption.name}!`);
          console.log(`      Decrypted: ${result.value.substring(0, 10)}... (${result.value.length} chars)`);
          decrypted = true;
          break;
        } else {
          console.log(`   ❌ Failed with ${keyOption.name}`);
        }
      }
      
      if (!decrypted) {
        console.log(`   ⚠️  Could not decrypt with any known key`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testKeys();