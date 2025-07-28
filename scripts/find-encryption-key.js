#!/usr/bin/env node

/**
 * Find which encryption key can decrypt current credentials
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

async function findKeys() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔐 Finding Encryption Keys for Current Credentials\n');
    
    // Keys to try
    const keysToTry = [
      { name: 'Current INTEGRATION_CONFIG_KEY', key: process.env.INTEGRATION_CONFIG_KEY },
      { name: 'Current JWT_SECRET', key: process.env.JWT_SECRET },
      { name: 'Previous integration key', key: 'ai-service-integration-key-2025!' },
      { name: 'Default key', key: 'default-encryption-key-32-chars!!' },
      { name: 'dev-secret-key', key: 'dev-secret-key' },
    ];
    
    // Get all encrypted credentials
    const query = `
      SELECT integration_type, config_key, config_value 
      FROM financial.integration_configs 
      WHERE is_encrypted = true
      ORDER BY integration_type, config_key
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('No encrypted credentials found.');
      return;
    }
    
    console.log(`Found ${result.rows.length} encrypted credentials\n`);
    
    // Track which key works for each credential
    const workingKeys = {};
    
    for (const row of result.rows) {
      const credName = `${row.integration_type}/${row.config_key}`;
      console.log(`\n📋 Testing ${credName}:`);
      
      let found = false;
      for (const keyOption of keysToTry) {
        if (!keyOption.key) continue;
        
        const result = tryDecrypt(row.config_value, keyOption.key);
        
        if (result.success) {
          console.log(`   ✅ SUCCESS with ${keyOption.name}!`);
          console.log(`      Decrypted preview: ${result.value.substring(0, 10)}...`);
          workingKeys[credName] = keyOption.name;
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log(`   ❌ Could not decrypt with any known key`);
        workingKeys[credName] = 'UNKNOWN';
      }
    }
    
    // Summary
    console.log('\n\n📊 Summary of Working Keys:');
    console.log('═'.repeat(60));
    
    const keyGroups = {};
    for (const [cred, key] of Object.entries(workingKeys)) {
      if (!keyGroups[key]) keyGroups[key] = [];
      keyGroups[key].push(cred);
    }
    
    for (const [key, creds] of Object.entries(keyGroups)) {
      console.log(`\n${key}:`);
      creds.forEach(cred => console.log(`  - ${cred}`));
    }
    
    // Recommendations
    console.log('\n\n💡 Recommendations:');
    if (keyGroups['Previous integration key']) {
      console.log('1. Some credentials use the previous integration key.');
      console.log('   You need to update the re-encrypt script to use that as the old key.');
    }
    if (keyGroups['UNKNOWN']) {
      console.log('2. Some credentials cannot be decrypted with any known key.');
      console.log('   These will need to be reset manually.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

findKeys();