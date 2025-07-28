#!/usr/bin/env node

/**
 * Re-encrypt credentials from old integration key to new one
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

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434'),
  database: process.env.DB_NAME || 'ai_service',
  user: process.env.DB_USER || 'ai_user',
  password: process.env.DB_PASSWORD || 'ultra_secure_password_2025',
};

// Encryption/Decryption functions
function decrypt(text, key) {
  const encryptionKey = crypto.scryptSync(key, 'salt', 32);
  
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

function encrypt(text, key) {
  const encryptionKey = crypto.scryptSync(key, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function reEncryptCredentials() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔐 Re-encrypt Credentials from Old to New Key\n');
    console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (database will be updated)'}\n`);
    
    // Define old and new keys
    const oldKey = 'ai-service-integration-key-2025!';
    const newKey = process.env.INTEGRATION_CONFIG_KEY;
    
    if (!newKey) {
      console.log('❌ ERROR: INTEGRATION_CONFIG_KEY not found in environment');
      console.log('   Please set it in your .env.local file');
      return;
    }
    
    console.log('Keys:');
    console.log(`  Old key: ${oldKey.substring(0, 8)}... (previous integration key)`);
    console.log(`  New key: ${newKey.substring(0, 8)}... (from INTEGRATION_CONFIG_KEY)`);
    console.log();
    
    // Get all encrypted configs
    const query = `
      SELECT id, user_id, integration_type, config_key, config_value, is_encrypted 
      FROM financial.integration_configs 
      WHERE is_encrypted = true
      ORDER BY integration_type, config_key
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('✅ No encrypted configurations found.');
      return;
    }
    
    console.log(`Found ${result.rows.length} encrypted configurations:\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const row of result.rows) {
      const display = `${row.integration_type}/${row.config_key}${row.user_id ? ` (user: ${row.user_id})` : ' (global)'}`;
      
      try {
        // Try to decrypt with old key
        let decryptedValue;
        try {
          decryptedValue = decrypt(row.config_value, oldKey);
        } catch (e) {
          // Cannot decrypt with old key, skip
          console.log(`⏭️  ${display} - Skipping (uses different key)`);
          skipCount++;
          continue;
        }
        
        // Re-encrypt with new key
        const newEncryptedValue = encrypt(decryptedValue, newKey);
        
        console.log(`✅ ${display}`);
        console.log(`   Decrypted: ${decryptedValue.substring(0, 8)}... (${decryptedValue.length} chars)`);
        console.log(`   New encrypted: ${newEncryptedValue.substring(0, 32)}...`);
        
        if (!isDryRun) {
          // Update the database
          const updateQuery = `
            UPDATE financial.integration_configs 
            SET config_value = $1, updated_at = NOW() 
            WHERE id = $2
          `;
          
          await pool.query(updateQuery, [newEncryptedValue, row.id]);
          console.log(`   ✅ Updated in database`);
        } else {
          console.log(`   🔸 Would update in database (dry run)`);
        }
        
        console.log();
        successCount++;
        
      } catch (error) {
        console.log(`❌ ${display}`);
        console.log(`   Error: ${error.message}`);
        console.log();
        errorCount++;
        errors.push({ config: display, error: error.message });
      }
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Total configs: ${result.rows.length}`);
    console.log(`   ✅ Re-encrypted: ${successCount}`);
    console.log(`   ⏭️  Skipped (different key): ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(e => {
        console.log(`   - ${e.config}: ${e.error}`);
      });
    }
    
    if (isDryRun) {
      console.log('\n🔸 This was a dry run. No changes were made to the database.');
      console.log('   Run without --dry-run to apply changes.');
    } else if (successCount > 0) {
      console.log('\n✅ Re-encryption completed successfully!');
      console.log('   Credentials have been updated to use the new encryption key.');
    }
    
    if (skipCount > 0) {
      console.log('\n💡 Some credentials were skipped because they use a different key.');
      console.log('   These will need to be reset manually (e.g., GoCardless credentials).');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
reEncryptCredentials();