#!/usr/bin/env node

/**
 * Re-encrypt Integration Credentials Script
 * 
 * This script re-encrypts all integration credentials with a new encryption key.
 * Use this when changing from JWT_SECRET to INTEGRATION_CONFIG_KEY.
 * 
 * Usage: node scripts/re-encrypt-credentials.js [options]
 * 
 * Options:
 *   --dry-run    Show what would be changed without modifying the database
 *   --help       Show this help message
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
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
🔐 Re-encrypt Integration Credentials

This script re-encrypts all encrypted integration credentials with a new key.

Usage: node scripts/re-encrypt-credentials.js [options]

Options:
  --dry-run    Show what would be changed without modifying the database
  --help       Show this help message

Current Configuration:
  OLD_KEY: ${process.env.JWT_SECRET ? 'JWT_SECRET (set)' : 'JWT_SECRET (not set)'}
  NEW_KEY: ${process.env.INTEGRATION_CONFIG_KEY ? 'INTEGRATION_CONFIG_KEY (set)' : 'INTEGRATION_CONFIG_KEY (not set)'}
  `);
  process.exit(0);
}

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
    console.log('🔐 Re-encrypt Integration Credentials\n');
    console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (database will be updated)'}\n`);
    
    // Determine old and new keys
    const oldKey = process.env.JWT_SECRET || 'default-encryption-key-32-chars!!';
    const newKey = process.env.INTEGRATION_CONFIG_KEY || process.env.JWT_SECRET || 'default-encryption-key-32-chars!!';
    
    if (oldKey === newKey) {
      console.log('⚠️  WARNING: Old and new keys are the same. No re-encryption needed.');
      console.log('   Make sure INTEGRATION_CONFIG_KEY is set in your .env.local file.');
      return;
    }
    
    console.log('Keys:');
    console.log(`  Old key source: ${process.env.JWT_SECRET ? 'JWT_SECRET' : 'default'}`);
    console.log(`  New key source: ${process.env.INTEGRATION_CONFIG_KEY ? 'INTEGRATION_CONFIG_KEY' : (process.env.JWT_SECRET ? 'JWT_SECRET' : 'default')}`);
    console.log(`  Old key preview: ${oldKey.substring(0, 8)}...`);
    console.log(`  New key preview: ${newKey.substring(0, 8)}...`);
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
    let errorCount = 0;
    const errors = [];
    
    for (const row of result.rows) {
      const display = `${row.integration_type}/${row.config_key}${row.user_id ? ` (user: ${row.user_id})` : ' (global)'}`;
      
      try {
        // Try to decrypt with old key
        const decryptedValue = decrypt(row.config_value, oldKey);
        
        // Re-encrypt with new key
        const newEncryptedValue = encrypt(decryptedValue, newKey);
        
        console.log(`✅ ${display}`);
        console.log(`   Old encrypted: ${row.config_value.substring(0, 32)}...`);
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
    console.log(`   ✅ Success: ${successCount}`);
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
      console.log('   All encrypted configurations now use the new encryption key.');
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