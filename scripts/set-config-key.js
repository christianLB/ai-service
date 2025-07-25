#!/usr/bin/env node

/**
 * Script to set configuration keys in the database with encryption
 * Usage: node scripts/set-config-key.js <integrationType> <configKey> <configValue> [options]
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

if (args.length < 3 || args.includes('--help') || args.includes('-h')) {
  console.log(`
📋 Configuration Key Setter

Usage: node scripts/set-config-key.js <integrationType> <configKey> <configValue> [options]

Options:
  --global          Set as global configuration (default: false)
  --no-encrypt      Store value without encryption (default: encrypted)
  --description     Add description for the config
  --user-id         Set for specific user (UUID)
  
Examples:
  # Set Claude API key (global, encrypted)
  node scripts/set-config-key.js claude api_key sk-ant-api03-xxx --global --description "Claude API Key"
  
  # Set OpenAI API key (global, encrypted)
  node scripts/set-config-key.js openai api_key sk-xxx --global
  
  # Set Alpaca credentials
  node scripts/set-config-key.js alpaca api_key PKXXX --global
  node scripts/set-config-key.js alpaca api_secret xxx --global
  
  # Set configuration for specific user
  node scripts/set-config-key.js trading max_risk 0.02 --user-id 123e4567-e89b-12d3-a456-426614174000
  `);
  process.exit(0);
}

const integrationType = args[0];
const configKey = args[1];
const configValue = args[2];

// Parse options
const options = {
  isGlobal: args.includes('--global'),
  encrypt: !args.includes('--no-encrypt'),
  description: null,
  userId: null
};

// Get description if provided
const descIndex = args.indexOf('--description');
if (descIndex !== -1 && args[descIndex + 1]) {
  options.description = args[descIndex + 1];
}

// Get user ID if provided
const userIdIndex = args.indexOf('--user-id');
if (userIdIndex !== -1 && args[userIdIndex + 1]) {
  options.userId = args[userIdIndex + 1];
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434'),
  database: process.env.DB_NAME || 'ai_service',
  user: process.env.DB_USER || 'ai_user',
  password: process.env.DB_PASSWORD || 'ultra_secure_password_2025',
};

// Encryption functions (matching the service implementation)
function encrypt(text, encryptionKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function setConfigKey() {
  const pool = new Pool(dbConfig);
  
  try {
    // Create encryption key (matching the service)
    const key = process.env.INTEGRATION_CONFIG_KEY || process.env.JWT_SECRET || 'default-encryption-key-32-chars!!';
    const encryptionKey = crypto.scryptSync(key, 'salt', 32);
    
    // Encrypt value if needed
    const finalValue = options.encrypt ? encrypt(configValue, encryptionKey) : configValue;
    
    // Prepare query based on whether it's global or user-specific
    let query;
    if (options.isGlobal && !options.userId) {
      // For global configs (user_id is NULL)
      query = `
        INSERT INTO financial.integration_configs (
          user_id, integration_type, config_key, config_value, 
          is_encrypted, is_global, description, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (integration_type, config_key) 
        WHERE user_id IS NULL AND is_global = true
        DO UPDATE SET 
          config_value = EXCLUDED.config_value,
          is_encrypted = EXCLUDED.is_encrypted,
          description = EXCLUDED.description,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `;
    } else {
      // For user-specific configs
      query = `
        INSERT INTO financial.integration_configs (
          user_id, integration_type, config_key, config_value, 
          is_encrypted, is_global, description, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id, integration_type, config_key) 
        WHERE user_id IS NOT NULL
        DO UPDATE SET 
          config_value = EXCLUDED.config_value,
          is_encrypted = EXCLUDED.is_encrypted,
          description = EXCLUDED.description,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `;
    }
    
    const params = [
      options.userId || null,
      integrationType,
      configKey,
      finalValue,
      options.encrypt,
      options.isGlobal,
      options.description,
      JSON.stringify({})
    ];
    
    await pool.query(query, params);
    
    console.log('✅ Configuration key set successfully!');
    console.log(`   Integration: ${integrationType}`);
    console.log(`   Key: ${configKey}`);
    console.log(`   Encrypted: ${options.encrypt ? 'Yes' : 'No'}`);
    console.log(`   Global: ${options.isGlobal ? 'Yes' : 'No'}`);
    if (options.userId) {
      console.log(`   User ID: ${options.userId}`);
    }
    if (options.description) {
      console.log(`   Description: ${options.description}`);
    }
    
  } catch (error) {
    console.error('❌ Error setting configuration key:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
setConfigKey();