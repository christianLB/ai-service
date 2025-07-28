#!/usr/bin/env node

/**
 * Reset GoCardless Credentials Script
 * 
 * This script helps you reset GoCardless credentials when the original 
 * encryption key is lost or unknown.
 * 
 * Usage: node scripts/reset-gocardless-credentials.js
 */

const readline = require('readline');
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function resetCredentials() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔐 GoCardless Credentials Reset Tool\n');
    console.log('This tool will delete the old encrypted credentials and help you set new ones.\n');
    console.log('⚠️  WARNING: This will delete the existing GoCardless credentials!\n');
    
    const confirm = await askQuestion('Do you want to continue? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\nOperation cancelled.');
      return;
    }
    
    // Delete old credentials
    console.log('\n📋 Deleting old credentials...');
    
    const deleteQuery = `
      DELETE FROM financial.integration_configs 
      WHERE integration_type = 'gocardless' 
      AND config_key IN ('secret_id', 'secret_key')
    `;
    
    const deleteResult = await pool.query(deleteQuery);
    console.log(`✅ Deleted ${deleteResult.rowCount} old credential entries\n`);
    
    // Ask if user wants to set new credentials now
    const setNew = await askQuestion('Would you like to set new credentials now? (yes/no): ');
    
    if (setNew.toLowerCase() === 'yes') {
      console.log('\n📝 Setting New GoCardless Credentials');
      console.log('Please get your credentials from: https://bankaccountdata.gocardless.com/');
      console.log('Navigate to: User Secrets section\n');
      
      const secretId = await askQuestion('Enter your Secret ID (UUID format): ');
      const secretKey = await askQuestion('Enter your Secret Key (43 characters): ');
      
      // Validate format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(secretId.trim())) {
        console.log('\n❌ Error: Secret ID is not in UUID format');
        console.log('   Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
        return;
      }
      
      if (secretKey.trim().length !== 43) {
        console.log(`\n❌ Error: Secret Key should be 43 characters, got ${secretKey.trim().length}`);
        return;
      }
      
      console.log('\n✅ Credentials validated!\n');
      console.log('You can now set them using one of these methods:\n');
      console.log('Option 1: Using the set-config-key script:');
      console.log(`  node scripts/set-config-key.js gocardless secret_id "${secretId.trim()}" --global`);
      console.log(`  node scripts/set-config-key.js gocardless secret_key "${secretKey.trim()}" --global`);
      console.log('\nOption 2: Using the API endpoints:');
      console.log('  POST http://localhost:3001/api/financial/gocardless/credentials');
      console.log('  with JSON body containing the credentials');
      
    } else {
      console.log('\nYou can set new credentials later using:');
      console.log('  - The set-config-key.js script');
      console.log('  - The API endpoint: POST /api/financial/gocardless/credentials');
      console.log('  - The frontend Integration Settings page');
    }
    
    console.log('\n✅ GoCardless credentials reset process completed!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
    await pool.end();
  }
}

resetCredentials();