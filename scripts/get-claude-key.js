#!/usr/bin/env node

const { Pool } = require('pg');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, silent: true });
}

// Suppress all console output except our export command
const originalLog = console.log;
const originalError = console.error;
console.log = () => {};
console.error = () => {};

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434'),
  database: process.env.DB_NAME || 'ai_service',
  user: process.env.DB_USER || 'ai_user',
  password: process.env.DB_PASSWORD || 'ultra_secure_password_2025',
};

// Decryption function
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

async function getClaudeKey() {
  const pool = new Pool(dbConfig);
  
  try {
    const result = await pool.query(
      `SELECT config_value, is_encrypted 
       FROM financial.integration_configs 
       WHERE integration_type = 'claude' AND config_key = 'api_key' AND is_global = true`
    );
    
    if (result.rows.length === 0) {
      console.log('No Claude API key found');
      return;
    }
    
    const { config_value, is_encrypted } = result.rows[0];
    
    if (is_encrypted) {
      const key = process.env.INTEGRATION_CONFIG_KEY || process.env.JWT_SECRET || 'default-encryption-key-32-chars!!';
      const encryptionKey = crypto.scryptSync(key, 'salt', 32);
      const decryptedValue = decrypt(config_value, encryptionKey);
      
      // Output just the command to set it
      originalLog(`export CLAUDE_API_KEY="${decryptedValue}"`);
    } else {
      originalLog(`export CLAUDE_API_KEY="${config_value}"`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

getClaudeKey();