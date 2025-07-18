#!/usr/bin/env ts-node

/**
 * Comprehensive GoCardless Authentication Diagnostic Script
 * 
 * This script performs a detailed diagnosis of GoCardless authentication issues:
 * - Reads credentials directly from database
 * - Shows credential format (obfuscated)
 * - Tests authentication step by step
 * - Tries different base URLs
 * - Shows exactly what's failing
 */

import axios from 'axios';
import { db } from '../src/services/database';
import { integrationConfigService } from '../src/services/integrations';
import { Logger } from '../src/utils/logger';
import crypto from 'crypto';

const logger = new Logger('GoCardlessDiagnosis');

interface DiagnosticResult {
  step: string;
  success: boolean;
  details?: any;
  error?: string;
}

class GoCardlessDiagnostic {
  private results: DiagnosticResult[] = [];
  private credentials: {
    secretId?: string;
    secretKey?: string;
    baseUrl?: string;
  } = {};

  async runFullDiagnosis(): Promise<void> {
    logger.info('🔍 Starting GoCardless Authentication Diagnosis\n');
    
    // Step 1: Database Connection
    await this.testDatabaseConnection();
    
    // Step 2: Read Credentials
    await this.readCredentials();
    
    // Step 3: Validate Credential Format
    await this.validateCredentialFormat();
    
    // Step 4: Test Direct Authentication
    await this.testDirectAuthentication();
    
    // Step 5: Test via Service Endpoint
    await this.testServiceEndpoint();
    
    // Step 6: Test Alternative URLs
    await this.testAlternativeUrls();
    
    // Print Results
    this.printResults();
  }

  private async testDatabaseConnection(): Promise<void> {
    const step = 'Database Connection';
    try {
      const result = await db.pool.query('SELECT 1');
      this.results.push({
        step,
        success: true,
        details: 'Database connection successful'
      });
      logger.info('✅ Database connection successful');
    } catch (error: any) {
      this.results.push({
        step,
        success: false,
        error: error.message
      });
      logger.error('❌ Database connection failed:', error.message);
    }
  }

  private async readCredentials(): Promise<void> {
    const step = 'Read Credentials';
    try {
      // Read directly from database to bypass any caching issues
      const query = `
        SELECT config_key, config_value, is_encrypted 
        FROM financial.integration_configs 
        WHERE integration_type = 'gocardless' 
        AND config_key IN ('secret_id', 'secret_key', 'base_url')
      `;
      
      const result = await db.pool.query(query);
      
      if (result.rows.length === 0) {
        throw new Error('No GoCardless credentials found in database');
      }
      
      // Process credentials
      for (const row of result.rows) {
        if (row.config_key === 'secret_id') {
          this.credentials.secretId = row.is_encrypted 
            ? await this.decryptValue(row.config_value)
            : row.config_value;
        } else if (row.config_key === 'secret_key') {
          this.credentials.secretKey = row.is_encrypted
            ? await this.decryptValue(row.config_value)
            : row.config_value;
        } else if (row.config_key === 'base_url') {
          this.credentials.baseUrl = row.config_value;
        }
      }
      
      this.results.push({
        step,
        success: true,
        details: {
          hasSecretId: !!this.credentials.secretId,
          hasSecretKey: !!this.credentials.secretKey,
          hasBaseUrl: !!this.credentials.baseUrl,
          secretIdLength: this.credentials.secretId?.length,
          secretKeyLength: this.credentials.secretKey?.length
        }
      });
      
      logger.info('✅ Credentials read from database');
      logger.info(`   Secret ID: ${this.obfuscate(this.credentials.secretId)}`);
      logger.info(`   Secret Key: ${this.obfuscate(this.credentials.secretKey)}`);
      logger.info(`   Base URL: ${this.credentials.baseUrl || 'Not set (will use default)'}`);
      
    } catch (error: any) {
      this.results.push({
        step,
        success: false,
        error: error.message
      });
      logger.error('❌ Failed to read credentials:', error.message);
    }
  }

  private async validateCredentialFormat(): Promise<void> {
    const step = 'Validate Credential Format';
    try {
      const errors: string[] = [];
      
      if (!this.credentials.secretId || !this.credentials.secretKey) {
        errors.push('Missing credentials');
      } else {
        // Check for UUID format (typical for GoCardless secret_id)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(this.credentials.secretId)) {
          errors.push('Secret ID does not match UUID format');
        }
        
        // Check secret key length (typically 43 characters)
        if (this.credentials.secretKey.length !== 43) {
          errors.push(`Secret Key length is ${this.credentials.secretKey.length}, expected 43`);
        }
        
        // Check for whitespace
        if (this.credentials.secretId !== this.credentials.secretId.trim()) {
          errors.push('Secret ID contains whitespace');
        }
        if (this.credentials.secretKey !== this.credentials.secretKey.trim()) {
          errors.push('Secret Key contains whitespace');
        }
        
        // Check for common placeholder values
        if (this.credentials.secretId.includes('your-') || this.credentials.secretKey.includes('your-')) {
          errors.push('Credentials contain placeholder values');
        }
      }
      
      if (errors.length === 0) {
        this.results.push({
          step,
          success: true,
          details: 'Credential format validation passed'
        });
        logger.info('✅ Credential format validation passed');
      } else {
        this.results.push({
          step,
          success: false,
          error: errors.join(', '),
          details: errors
        });
        logger.error('❌ Credential format validation failed:');
        errors.forEach(err => logger.error(`   - ${err}`));
      }
    } catch (error: any) {
      this.results.push({
        step,
        success: false,
        error: error.message
      });
      logger.error('❌ Error during validation:', error.message);
    }
  }

  private async testDirectAuthentication(): Promise<void> {
    const step = 'Direct Authentication Test';
    try {
      const baseUrl = this.credentials.baseUrl || 'https://bankaccountdata.gocardless.com/api/v2';
      const tokenUrl = `${baseUrl}/token/new/`;
      
      logger.info(`\n🔐 Testing direct authentication to: ${tokenUrl}`);
      
      const response = await axios.post(tokenUrl, {
        secret_id: this.credentials.secretId,
        secret_key: this.credentials.secretKey
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        validateStatus: () => true // Don't throw on error status
      });
      
      if (response.status === 200 && response.data?.access) {
        this.results.push({
          step,
          success: true,
          details: {
            status: response.status,
            tokenLength: response.data.access.length,
            tokenPrefix: response.data.access.substring(0, 20) + '...'
          }
        });
        logger.info('✅ Direct authentication successful!');
        logger.info(`   Token received (length: ${response.data.access.length})`);
      } else {
        this.results.push({
          step,
          success: false,
          error: `Status ${response.status}: ${response.data?.detail || response.data?.error || 'Unknown error'}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            data: response.data
          }
        });
        logger.error(`❌ Direct authentication failed (${response.status})`);
        logger.error(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      }
    } catch (error: any) {
      this.results.push({
        step,
        success: false,
        error: error.message,
        details: {
          code: error.code,
          response: error.response?.data
        }
      });
      logger.error('❌ Direct authentication error:', error.message);
      if (error.response?.data) {
        logger.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }

  private async testServiceEndpoint(): Promise<void> {
    const step = 'Service Endpoint Test';
    try {
      logger.info('\n🔌 Testing via service endpoints...');
      
      // Test the diagnostic endpoint we created
      const diagResponse = await axios.post('http://localhost:3000/api/financial/diagnose-gocardless', {}, {
        validateStatus: () => true
      });
      
      if (diagResponse.data?.success) {
        this.results.push({
          step: 'Service Diagnostic Endpoint',
          success: true,
          details: diagResponse.data.diagnosis
        });
        logger.info('✅ Service diagnostic endpoint working');
      } else {
        logger.warn('⚠️  Service diagnostic endpoint returned:', diagResponse.data);
      }
      
      // Test the main setup endpoint
      const setupResponse = await axios.post('http://localhost:3000/api/financial/setup-bbva', {}, {
        validateStatus: () => true
      });
      
      if (setupResponse.status === 200 && setupResponse.data?.success) {
        this.results.push({
          step: 'Setup BBVA Endpoint',
          success: true,
          details: {
            requisitionId: setupResponse.data.data?.requisitionId,
            consentUrl: setupResponse.data.data?.consentUrl
          }
        });
        logger.info('✅ Setup BBVA endpoint successful!');
        logger.info(`   Requisition ID: ${setupResponse.data.data?.requisitionId}`);
      } else {
        this.results.push({
          step: 'Setup BBVA Endpoint',
          success: false,
          error: setupResponse.data?.error || `Status ${setupResponse.status}`,
          details: setupResponse.data
        });
        logger.error(`❌ Setup BBVA failed (${setupResponse.status})`);
        logger.error(`   Error: ${setupResponse.data?.error || setupResponse.data?.message}`);
      }
    } catch (error: any) {
      this.results.push({
        step,
        success: false,
        error: error.message
      });
      logger.error('❌ Service endpoint test error:', error.message);
    }
  }

  private async testAlternativeUrls(): Promise<void> {
    const step = 'Alternative URLs Test';
    logger.info('\n🌐 Testing alternative GoCardless URLs...');
    
    const urls = [
      'https://bankaccountdata.gocardless.com/api/v2',
      'https://bankaccountdata-sandbox.gocardless.com/api/v2',
      'https://ob.gocardless.com/api/v2'
    ];
    
    for (const baseUrl of urls) {
      try {
        const tokenUrl = `${baseUrl}/token/new/`;
        logger.info(`   Testing: ${tokenUrl}`);
        
        const response = await axios.post(tokenUrl, {
          secret_id: this.credentials.secretId,
          secret_key: this.credentials.secretKey
        }, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        if (response.status === 200) {
          logger.info(`   ✅ Success with ${baseUrl}`);
          this.results.push({
            step: `URL Test: ${baseUrl}`,
            success: true,
            details: { status: response.status }
          });
        } else {
          logger.info(`   ❌ Failed (${response.status}) with ${baseUrl}`);
          this.results.push({
            step: `URL Test: ${baseUrl}`,
            success: false,
            error: `Status ${response.status}`
          });
        }
      } catch (error: any) {
        logger.info(`   ❌ Error with ${baseUrl}: ${error.message}`);
      }
    }
  }

  private async decryptValue(encryptedValue: string): Promise<string> {
    // Use the same decryption logic as the integration config service
    const key = process.env.INTEGRATION_CONFIG_KEY || process.env.JWT_SECRET || 'default-encryption-key-32-chars!!';
    const encryptionKey = crypto.scryptSync(key, 'salt', 32);
    
    try {
      const parts = encryptedValue.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt value');
    }
  }

  private obfuscate(value?: string): string {
    if (!value) return 'Not set';
    if (value.length <= 8) return '***';
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  }

  private printResults(): void {
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 DIAGNOSIS RESULTS SUMMARY');
    logger.info('='.repeat(60));
    
    const successCount = this.results.filter(r => r.success).length;
    const totalCount = this.results.length;
    
    this.results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      logger.info(`${icon} ${result.step}: ${result.success ? 'PASSED' : 'FAILED'}`);
      if (!result.success && result.error) {
        logger.info(`   Error: ${result.error}`);
      }
      if (result.details && !result.success) {
        logger.info(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    });
    
    logger.info('='.repeat(60));
    logger.info(`Overall: ${successCount}/${totalCount} tests passed`);
    
    // Provide recommendations
    logger.info('\n📋 RECOMMENDATIONS:');
    
    const credFormatTest = this.results.find(r => r.step === 'Validate Credential Format');
    if (!credFormatTest?.success) {
      logger.info('1. Fix credential format issues:');
      logger.info('   - Ensure Secret ID is a valid UUID');
      logger.info('   - Ensure Secret Key is exactly 43 characters');
      logger.info('   - Remove any whitespace from credentials');
    }
    
    const directAuthTest = this.results.find(r => r.step === 'Direct Authentication Test');
    if (!directAuthTest?.success) {
      logger.info('2. Authentication is failing:');
      logger.info('   - Verify credentials are from the correct environment');
      logger.info('   - Check if credentials are active and not expired');
      logger.info('   - Try regenerating credentials in GoCardless dashboard');
    }
    
    const urlTests = this.results.filter(r => r.step.startsWith('URL Test:'));
    const successfulUrl = urlTests.find(r => r.success);
    if (successfulUrl) {
      logger.info(`3. Use this base URL: ${successfulUrl.step.replace('URL Test: ', '')}`);
    }
    
    logger.info('='.repeat(60));
  }
}

// Run the diagnostic
async function main() {
  const diagnostic = new GoCardlessDiagnostic();
  
  try {
    await diagnostic.runFullDiagnosis();
  } catch (error) {
    logger.error('Diagnostic failed with error:', error);
  } finally {
    // Close database connection
    await db.close();
    process.exit(0);
  }
}

main().catch(error => {
  logger.error('Failed to run diagnostic:', error);
  process.exit(1);
});