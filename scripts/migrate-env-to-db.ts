#!/usr/bin/env ts-node

/**
 * HISTORICAL REFERENCE ONLY - Migration completed
 * This script was used to migrate environment variables to database configuration.
 * GoCardless configuration is now managed through the integration settings API.
 * Keeping this file for reference and documentation purposes.
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { integrationConfigService } from '../src/services/integrations';
import { databaseService } from '../src/services/database';
import { Logger } from '../src/utils/logger';

const logger = new Logger('EnvMigration');

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  logger.info('Loaded .env.local');
} else {
  dotenv.config();
  logger.info('Loaded default .env');
}

interface MigrationConfig {
  envKey: string;
  integrationType: string;
  configKey: string;
  description: string;
  encrypt: boolean;
}

// Define the mapping from env vars to integration configs
const migrationConfigs: MigrationConfig[] = [
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
    envKey: 'GO_SANDBOX_ACCESS_TOKEN',
    integrationType: 'gocardless',
    configKey: 'sandbox_access_token',
    description: 'GoCardless Sandbox API Key (Bearer token)',
    encrypt: true
  },
  {
    envKey: 'GO_BASE_URL',
    integrationType: 'gocardless',
    configKey: 'production_base_url',
    description: 'GoCardless Production API URL',
    encrypt: false
  },
  {
    envKey: 'GO_SANDBOX_BASE_URL',
    integrationType: 'gocardless',
    configKey: 'sandbox_base_url',
    description: 'GoCardless Sandbox API URL',
    encrypt: false
  },
  {
    envKey: 'GO_SANDBOX_INSTITUTION_ID',
    integrationType: 'gocardless',
    configKey: 'sandbox_institution_id',
    description: 'GoCardless Sandbox Institution ID',
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

async function migrateConfig(config: MigrationConfig): Promise<boolean> {
  const value = process.env[config.envKey];
  
  if (!value || value === '' || value.includes('your-')) {
    logger.warn(`Skipping ${config.envKey} - not configured or using placeholder`);
    return false;
  }
  
  try {
    // Check if config already exists
    const existing = await integrationConfigService.getConfig({
      integrationType: config.integrationType,
      configKey: config.configKey
    });
    
    if (existing) {
      logger.info(`Config already exists: ${config.integrationType}.${config.configKey}`);
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
    
    logger.info(`Migrated: ${config.envKey} -> ${config.integrationType}.${config.configKey}`);
    return true;
  } catch (error) {
    logger.error(`Failed to migrate ${config.envKey}:`, error);
    return false;
  }
}

async function main() {
  logger.info('Starting environment variable migration...');
  
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
  
  logger.info(`Migration complete:`);
  logger.info(`- Migrated: ${migrated}`);
  logger.info(`- Skipped: ${skipped}`);
  logger.info(`- Failed: ${failed}`);
  
  // Close database connection
  // await databaseService.close();
  
  if (migrated > 0) {
    logger.info('\n🎉 Environment variables successfully migrated to database!');
    logger.info('You can now manage these settings from the web interface at /integrations');
    logger.info('\nIMPORTANT: Environment variables are no longer used as fallback.');
    logger.info('All configuration must be done through the web interface.');
  }
}

// Run the migration
main().catch(error => {
  logger.error('Migration failed:', error);
  process.exit(1);
});