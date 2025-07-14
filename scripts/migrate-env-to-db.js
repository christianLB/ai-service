#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Loaded .env.local');
} else {
  dotenv.config();
  console.log('✅ Loaded default .env');
}

// Import after env vars are loaded
const { db } = require('../dist/services/database');
const { integrationConfigService } = require('../dist/services/integrations');

// Define the mapping from env vars to integration configs
const migrationConfigs = [
  // Telegram
  {
    envKey: 'TELEGRAM_BOT_TOKEN',
    integrationType: 'telegram',
    configKey: 'bot_token',
    description: 'Telegram Bot API Token',
    encrypt: true
  },
  {
    envKey: 'TELEGRAM_CHAT_ID',
    integrationType: 'telegram',
    configKey: 'chat_id',
    description: 'Default Telegram Chat ID',
    encrypt: false
  },
  {
    envKey: 'TELEGRAM_WEBHOOK_URL',
    integrationType: 'telegram',
    configKey: 'webhook_url',
    description: 'Telegram Webhook URL',
    encrypt: false
  },
  
  // GoCardless
  {
    envKey: 'GO_SECRET_ID',
    integrationType: 'gocardless',
    configKey: 'secret_id',
    description: 'GoCardless Secret ID',
    encrypt: true
  },
  {
    envKey: 'GO_SECRET_KEY',
    integrationType: 'gocardless',
    configKey: 'secret_key',
    description: 'GoCardless Secret Key',
    encrypt: true
  },
  {
    envKey: 'GO_SANDBOX_MODE',
    integrationType: 'gocardless',
    configKey: 'sandbox_mode',
    description: 'Enable GoCardless Sandbox Mode',
    encrypt: false
  },
  {
    envKey: 'GO_SANDBOX_TOKEN',
    integrationType: 'gocardless',
    configKey: 'sandbox_token',
    description: 'GoCardless Sandbox Institution Token',
    encrypt: false
  },
  {
    envKey: 'GO_SANDBOX_ACCESS_TOKEN',
    integrationType: 'gocardless',
    configKey: 'sandbox_access_token',
    description: 'GoCardless Sandbox Access Token',
    encrypt: false
  },

  // OpenAI
  {
    envKey: 'OPENAI_API_KEY',
    integrationType: 'openai',
    configKey: 'api_key',
    description: 'OpenAI API Key',
    encrypt: true
  },
  
  // Email (SMTP)
  {
    envKey: 'SMTP_HOST',
    integrationType: 'email',
    configKey: 'smtp_host',
    description: 'SMTP Server Host',
    encrypt: false
  },
  {
    envKey: 'SMTP_PORT',
    integrationType: 'email',
    configKey: 'smtp_port',
    description: 'SMTP Server Port',
    encrypt: false
  },
  {
    envKey: 'SMTP_USER',
    integrationType: 'email',
    configKey: 'smtp_user',
    description: 'SMTP Username',
    encrypt: false
  },
  {
    envKey: 'SMTP_PASS',
    integrationType: 'email',
    configKey: 'smtp_pass',
    description: 'SMTP Password',
    encrypt: true
  },
  {
    envKey: 'SMTP_FROM',
    integrationType: 'email',
    configKey: 'from_email',
    description: 'Default From Email',
    encrypt: false
  },
  
  // N8N
  {
    envKey: 'N8N_API_URL',
    integrationType: 'n8n',
    configKey: 'api_url',
    description: 'N8N API URL',
    encrypt: false
  },
  {
    envKey: 'N8N_API_KEY',
    integrationType: 'n8n',
    configKey: 'api_key',
    description: 'N8N API Key',
    encrypt: true
  },
  
  // Strapi
  {
    envKey: 'STRAPI_API_URL',
    integrationType: 'strapi',
    configKey: 'api_url',
    description: 'Strapi API URL',
    encrypt: false
  }
];

async function migrateConfig(config) {
  const value = process.env[config.envKey];
  
  if (!value || value === '' || value.includes('your-')) {
    console.log(`⚠️  Skipping ${config.envKey} - not configured or using placeholder`);
    return false;
  }
  
  try {
    // Check if config already exists
    const existing = await integrationConfigService.getConfig({
      integrationType: config.integrationType,
      configKey: config.configKey
    });
    
    if (existing) {
      console.log(`ℹ️  Config already exists: ${config.integrationType}.${config.configKey}`);
      return false;
    }
    
    // Save the config
    await integrationConfigService.setConfig({
      integrationType: config.integrationType,
      configKey: config.configKey,
      configValue: value,
      isGlobal: true,
      encrypt: config.encrypt,
      description: config.description
    });
    
    console.log(`✅ Migrated: ${config.envKey} -> ${config.integrationType}.${config.configKey}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to migrate ${config.envKey}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting environment variable migration...\n');
  
  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const config of migrationConfigs) {
    const result = await migrateConfig(config);
    if (result) {
      migrated++;
    } else {
      skipped++;
    }
  }
  
  console.log('\n📊 Migration complete:');
  console.log(`- Migrated: ${migrated}`);
  console.log(`- Skipped: ${skipped}`);
  console.log(`- Failed: ${failed}`);
  
  // Close database connection
  await db.pool.end();
  
  if (migrated > 0) {
    console.log('\n🎉 Environment variables successfully migrated to database!');
    console.log('You can now manage these settings from the web interface at /integrations');
    console.log('\nNote: The original environment variables are still in place as fallback.');
  }
}

// Run the migration
main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});