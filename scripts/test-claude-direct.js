#!/usr/bin/env node

const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

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

async function testClaudeDirect() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🧪 Testing Claude AI Direct Integration...\n');
    
    // Get Claude API key from database
    const result = await pool.query(
      `SELECT config_value, is_encrypted 
       FROM financial.integration_configs 
       WHERE integration_type = 'claude' AND config_key = 'api_key' AND is_global = true`
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No Claude API key found in database');
      process.exit(1);
    }
    
    const { config_value, is_encrypted } = result.rows[0];
    console.log('✅ Claude API key found in database');
    
    let apiKey;
    if (is_encrypted) {
      const key = process.env.INTEGRATION_CONFIG_KEY || process.env.JWT_SECRET || 'default-encryption-key-32-chars!!';
      const encryptionKey = crypto.scryptSync(key, 'salt', 32);
      apiKey = decrypt(config_value, encryptionKey);
      console.log('✅ API key decrypted successfully');
    } else {
      apiKey = config_value;
    }
    
    // Test with Anthropic SDK
    console.log('\n📡 Testing Claude API connection...');
    const client = new Anthropic({ apiKey });
    
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      temperature: 0.3,
      system: 'You are a helpful trading analyst. Keep responses very brief.',
      messages: [
        {
          role: 'user',
          content: 'Based on these indicators: BTC/USDT, price $45000, RSI 65, bullish trend. Should I buy, sell, or hold? Answer in one sentence.'
        }
      ]
    });
    
    console.log('✅ Claude API Response:');
    console.log(`   ${response.content[0].text}`);
    console.log(`\n📊 Token Usage: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output`);
    console.log('\n🎉 Claude integration is working perfectly!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.status === 401) {
      console.error('   Authentication failed - check API key');
    }
  } finally {
    await pool.end();
  }
}

testClaudeDirect();