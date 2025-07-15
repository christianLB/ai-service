#!/usr/bin/env ts-node

/**
 * Script to check current GoCardless configuration
 * This verifies what's configured in the database via the UI
 */

import axios from 'axios';
import { Logger } from '../src/utils/logger';

const logger = new Logger('GoCardlessConfigCheck');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

interface ConfigItem {
  integrationType: string;
  configKey: string;
  configValue: string;
  isEncrypted: boolean;
  isGlobal: boolean;
}

async function checkGoCardlessConfig() {
  try {
    logger.info('🔍 Checking GoCardless configuration...\n');
    
    // Get all GoCardless configs
    const response = await axios.get(`${API_BASE_URL}/api/integrations/configs`);
    
    if (!response.data.success) {
      throw new Error('Failed to fetch configurations');
    }
    
    const goCardlessConfigs = response.data.data.filter(
      (config: ConfigItem) => config.integrationType === 'gocardless'
    );
    
    if (goCardlessConfigs.length === 0) {
      logger.warn('⚠️  No GoCardless configuration found in database');
      logger.info('Please configure GoCardless via the UI at: http://localhost:3000/dashboard/integrations');
      return;
    }
    
    logger.info('📋 GoCardless Configuration:');
    logger.info('=' .repeat(50));
    
    const configMap: { [key: string]: string } = {};
    
    goCardlessConfigs.forEach((config: ConfigItem) => {
      const value = config.isEncrypted ? '***ENCRYPTED***' : config.configValue;
      configMap[config.configKey] = value;
      logger.info(`${config.configKey}: ${value}`);
    });
    
    logger.info('=' .repeat(50));
    
    // Check required configurations
    logger.info('\n✅ Configuration Check:');
    
    const sandboxMode = configMap['sandbox_mode'] === 'true';
    logger.info(`Sandbox Mode: ${sandboxMode ? 'ENABLED 🧪' : 'DISABLED 🏦'}`);
    
    if (sandboxMode) {
      // Sandbox requirements
      if (configMap['sandbox_access_token']) {
        logger.info('✓ Sandbox access token is configured');
      } else {
        logger.error('✗ Sandbox access token is missing');
      }
      
      logger.info(`✓ Sandbox institution ID: ${configMap['sandbox_institution_id'] || 'SANDBOXFINANCE_SFIN0000 (default)'}`);
    } else {
      // Production requirements
      if (configMap['secret_id'] && configMap['secret_key']) {
        logger.info('✓ Production credentials are configured');
      } else {
        logger.error('✗ Production credentials are missing');
      }
    }
    
    // Common requirements
    if (configMap['redirect_uri']) {
      logger.info(`✓ Redirect URI: ${configMap['redirect_uri']}`);
    } else {
      logger.error('✗ Redirect URI is missing');
    }
    
    if (configMap['base_url']) {
      logger.info(`✓ Base URL: ${configMap['base_url']}`);
    } else {
      logger.info('✓ Base URL: using default (https://bankaccountdata.gocardless.com/api/v2)');
    }
    
    // Test connection
    logger.info('\n🔌 Testing connection...');
    
    try {
      const statusResponse = await axios.get(`${API_BASE_URL}/api/financial/sandbox-status`);
      
      if (statusResponse.data.success) {
        logger.info('✓ GoCardless service is responding');
        logger.info(`  Mode: ${statusResponse.data.data.enabled ? 'SANDBOX' : 'PRODUCTION'}`);
        logger.info(`  Environment: ${statusResponse.data.data.environment}`);
      }
    } catch (error: any) {
      logger.error('✗ Failed to connect to GoCardless service');
      logger.error(`  Error: ${error.response?.data?.error || error.message}`);
    }
    
  } catch (error: any) {
    logger.error('Failed to check configuration:', error.message);
    if (error.response?.status === 401) {
      logger.info('\n⚠️  Authentication required. Please log in to the dashboard first.');
    }
  }
}

// Run the check
checkGoCardlessConfig().catch(console.error);