#!/usr/bin/env node

/**
 * Validate Claude configuration is ready for integration
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
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434'),
  database: process.env.DB_NAME || 'ai_service',
  user: process.env.DB_USER || 'ai_user',
  password: process.env.DB_PASSWORD || 'ultra_secure_password_2025',
};

async function validateConfig() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔍 Validating Claude AI Configuration...\n');
    
    // Check Claude config
    const claudeResult = await pool.query(
      `SELECT config_key, is_encrypted, description, created_at 
       FROM financial.integration_configs 
       WHERE integration_type = 'claude' AND is_global = true
       ORDER BY config_key`
    );
    
    console.log('📋 Claude Configuration:');
    if (claudeResult.rows.length === 0) {
      console.log('   ❌ No configuration found');
    } else {
      claudeResult.rows.forEach(row => {
        console.log(`   ✅ ${row.config_key}: ${row.is_encrypted ? 'Encrypted' : 'Plain'} - ${row.description || 'No description'}`);
      });
    }
    
    // Check OpenAI config for fallback
    const openaiResult = await pool.query(
      `SELECT config_key, is_encrypted, description 
       FROM financial.integration_configs 
       WHERE integration_type = 'openai' AND is_global = true`
    );
    
    console.log('\n📋 OpenAI Configuration (Fallback):');
    if (openaiResult.rows.length === 0) {
      console.log('   ❌ No configuration found');
    } else {
      openaiResult.rows.forEach(row => {
        console.log(`   ✅ ${row.config_key}: ${row.is_encrypted ? 'Encrypted' : 'Plain'} - ${row.description || 'No description'}`);
      });
    }
    
    // Summary
    console.log('\n📊 Configuration Summary:');
    const hasClaude = claudeResult.rows.some(r => r.config_key === 'api_key');
    const hasOpenAI = openaiResult.rows.some(r => r.config_key === 'api_key');
    
    if (hasClaude) {
      console.log('   ✅ Claude API key is configured');
      console.log('   ℹ️  To update: make config-set TYPE=claude KEY=api_key VALUE=your-real-key GLOBAL=true');
    } else {
      console.log('   ❌ Claude API key is NOT configured');
      console.log('   ⚠️  Set it with: make config-set TYPE=claude KEY=api_key VALUE=your-key GLOBAL=true');
    }
    
    if (hasOpenAI) {
      console.log('   ✅ OpenAI fallback is available');
    } else {
      console.log('   ⚠️  No OpenAI fallback configured');
    }
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Replace dummy key with real Claude API key');
    console.log('2. Restart services: docker restart ai-service-api-dev');
    console.log('3. Check status: curl http://localhost:3001/api/trading/ai-status');
    console.log('4. Test marketplace: curl http://localhost:3001/api/marketplace');
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run validation
validateConfig();