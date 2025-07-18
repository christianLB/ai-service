#!/usr/bin/env ts-node

/**
 * GoCardless Credentials Verification Script
 * 
 * This script:
 * - Verifies credential format
 * - Detects common issues (whitespace, encoding, wrong format)
 * - Tests authentication directly without the service
 * - Compares with service to identify differences
 */

import axios from 'axios';
import { db } from '../src/services/database';
import crypto from 'crypto';
import { Logger } from '../src/utils/logger';
import readline from 'readline';

const logger = new Logger('CredentialsVerifier');

interface Credential {
  key: string;
  value: string;
  isEncrypted: boolean;
}

class GoCardlessCredentialsVerifier {
  private credentials: Map<string, Credential> = new Map();
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async verify(): Promise<void> {
    logger.info('🔐 GoCardless Credentials Verification Tool\n');

    try {
      // Step 1: Read credentials from database
      await this.readCredentialsFromDB();

      // Step 2: Display current credentials (obfuscated)
      this.displayCredentials();

      // Step 3: Verify format
      const formatIssues = this.verifyCredentialFormat();

      // Step 4: Test authentication
      await this.testAuthentication();

      // Step 5: Offer to fix issues
      if (formatIssues.length > 0) {
        await this.offerToFixIssues(formatIssues);
      }

      // Step 6: Test with different environments
      await this.testDifferentEnvironments();

    } finally {
      this.rl.close();
      await db.close();
    }
  }

  private async readCredentialsFromDB(): Promise<void> {
    logger.info('📖 Reading credentials from database...\n');

    const query = `
      SELECT config_key, config_value, is_encrypted 
      FROM financial.integration_configs 
      WHERE integration_type = 'gocardless'
      ORDER BY config_key
    `;

    const result = await db.pool.query(query);

    if (result.rows.length === 0) {
      throw new Error('No GoCardless credentials found in database');
    }

    for (const row of result.rows) {
      let value = row.config_value;
      
      // Decrypt if needed
      if (row.is_encrypted && value) {
        try {
          value = await this.decryptValue(value);
        } catch (error) {
          logger.error(`Failed to decrypt ${row.config_key}`);
          value = null;
        }
      }

      this.credentials.set(row.config_key, {
        key: row.config_key,
        value: value,
        isEncrypted: row.is_encrypted
      });
    }

    logger.info(`Found ${this.credentials.size} configuration entries\n`);
  }

  private displayCredentials(): void {
    logger.info('📋 Current Configuration:');
    logger.info('='.repeat(60));

    this.credentials.forEach((cred) => {
      const displayValue = this.getDisplayValue(cred);
      logger.info(`${cred.key}: ${displayValue}`);
    });

    logger.info('='.repeat(60) + '\n');
  }

  private getDisplayValue(cred: Credential): string {
    if (!cred.value) return '❌ Not set';
    
    if (cred.isEncrypted) {
      // Show format info for encrypted values
      if (cred.key === 'secret_id') {
        return `${cred.value.substring(0, 8)}...${cred.value.substring(cred.value.length - 4)} (${cred.value.length} chars)`;
      } else if (cred.key === 'secret_key') {
        return `${cred.value.substring(0, 6)}...${cred.value.substring(cred.value.length - 4)} (${cred.value.length} chars)`;
      } else {
        return '***ENCRYPTED***';
      }
    }
    
    return cred.value;
  }

  private verifyCredentialFormat(): string[] {
    logger.info('🔍 Verifying credential format...\n');
    const issues: string[] = [];

    const secretId = this.credentials.get('secret_id')?.value;
    const secretKey = this.credentials.get('secret_key')?.value;

    // Check if credentials exist
    if (!secretId) {
      issues.push('secret_id is missing');
      logger.error('❌ secret_id is missing');
    } else {
      // Verify UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(secretId)) {
        issues.push('secret_id is not in UUID format');
        logger.error(`❌ secret_id is not in UUID format (expected: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)`);
        logger.error(`   Current format: ${secretId}`);
      } else {
        logger.info('✅ secret_id format is valid (UUID)');
      }

      // Check for whitespace
      if (secretId !== secretId.trim()) {
        issues.push('secret_id contains whitespace');
        logger.error('❌ secret_id contains leading/trailing whitespace');
      }
    }

    if (!secretKey) {
      issues.push('secret_key is missing');
      logger.error('❌ secret_key is missing');
    } else {
      // Check length (GoCardless keys are typically 43 chars)
      if (secretKey.length !== 43) {
        issues.push(`secret_key length is ${secretKey.length}, expected 43`);
        logger.error(`❌ secret_key length is ${secretKey.length}, expected 43 characters`);
      } else {
        logger.info('✅ secret_key length is correct (43 chars)');
      }

      // Check for whitespace
      if (secretKey !== secretKey.trim()) {
        issues.push('secret_key contains whitespace');
        logger.error('❌ secret_key contains leading/trailing whitespace');
      }

      // Check for base64 format
      const base64Regex = /^[A-Za-z0-9+/]+=*$/;
      if (!base64Regex.test(secretKey)) {
        issues.push('secret_key does not appear to be base64 encoded');
        logger.warn('⚠️  secret_key may not be properly base64 encoded');
      }
    }

    // Check for placeholder values
    this.credentials.forEach((cred) => {
      if (cred.value && cred.value.includes('your-')) {
        issues.push(`${cred.key} contains placeholder value`);
        logger.error(`❌ ${cred.key} contains placeholder value`);
      }
    });

    if (issues.length === 0) {
      logger.info('\n✅ All credential format checks passed!\n');
    } else {
      logger.info(`\n❌ Found ${issues.length} format issues\n`);
    }

    return issues;
  }

  private async testAuthentication(): Promise<void> {
    logger.info('🔐 Testing authentication...\n');

    const secretId = this.credentials.get('secret_id')?.value;
    const secretKey = this.credentials.get('secret_key')?.value;
    const baseUrl = this.credentials.get('base_url')?.value || 'https://bankaccountdata.gocardless.com/api/v2';

    if (!secretId || !secretKey) {
      logger.error('❌ Cannot test authentication - missing credentials');
      return;
    }

    const tokenUrl = `${baseUrl}/token/new/`;
    logger.info(`Testing authentication against: ${tokenUrl}`);

    try {
      const response = await axios.post(tokenUrl, {
        secret_id: secretId,
        secret_key: secretKey
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000,
        validateStatus: () => true
      });

      if (response.status === 200 && response.data?.access) {
        logger.info('✅ Authentication successful!');
        logger.info(`   Token length: ${response.data.access.length}`);
        logger.info(`   Token prefix: ${response.data.access.substring(0, 20)}...`);
      } else {
        logger.error(`❌ Authentication failed (HTTP ${response.status})`);
        logger.error(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        
        if (response.status === 401) {
          logger.info('\n💡 Possible causes:');
          logger.info('   1. Credentials are invalid or expired');
          logger.info('   2. Wrong environment (production vs sandbox)');
          logger.info('   3. Credentials were recently rotated');
        }
      }
    } catch (error: any) {
      logger.error('❌ Authentication request failed:', error.message);
      if (error.code === 'ECONNREFUSED') {
        logger.error('   Cannot connect to GoCardless API');
      }
    }
  }

  private async offerToFixIssues(issues: string[]): Promise<void> {
    logger.info('\n🔧 Credential Issues Found\n');
    logger.info('The following issues were detected:');
    issues.forEach((issue, i) => {
      logger.info(`${i + 1}. ${issue}`);
    });

    const answer = await this.askQuestion(
      '\nWould you like guidance on fixing these issues? (y/n): '
    );

    if (answer.toLowerCase() === 'y') {
      logger.info('\n📝 How to Fix Credential Issues:\n');
      
      if (issues.some(i => i.includes('missing'))) {
        logger.info('1. For missing credentials:');
        logger.info('   - Log in to https://bankaccountdata.gocardless.com/');
        logger.info('   - Navigate to User Secrets');
        logger.info('   - Generate new credentials');
        logger.info('   - Update via the API: POST /api/integrations/configs');
      }

      if (issues.some(i => i.includes('whitespace'))) {
        logger.info('\n2. For whitespace issues:');
        logger.info('   - Update credentials without leading/trailing spaces');
        logger.info('   - Use the trim() function when saving');
      }

      if (issues.some(i => i.includes('format'))) {
        logger.info('\n3. For format issues:');
        logger.info('   - Ensure secret_id is a valid UUID');
        logger.info('   - Ensure secret_key is exactly 43 characters');
        logger.info('   - Do not modify the credentials from GoCardless');
      }
    }
  }

  private async testDifferentEnvironments(): Promise<void> {
    const answer = await this.askQuestion(
      '\nWould you like to test credentials against different environments? (y/n): '
    );

    if (answer.toLowerCase() !== 'y') return;

    logger.info('\n🌐 Testing different GoCardless environments...\n');

    const environments = [
      {
        name: 'Production',
        url: 'https://bankaccountdata.gocardless.com/api/v2'
      },
      {
        name: 'Sandbox',
        url: 'https://bankaccountdata-sandbox.gocardless.com/api/v2'
      }
    ];

    const secretId = this.credentials.get('secret_id')?.value;
    const secretKey = this.credentials.get('secret_key')?.value;

    if (!secretId || !secretKey) {
      logger.error('Cannot test - missing credentials');
      return;
    }

    for (const env of environments) {
      logger.info(`Testing ${env.name}: ${env.url}`);
      
      try {
        const response = await axios.post(`${env.url}/token/new/`, {
          secret_id: secretId,
          secret_key: secretKey
        }, {
          timeout: 5000,
          validateStatus: () => true
        });

        if (response.status === 200) {
          logger.info(`✅ ${env.name} - Authentication successful`);
          
          // Update base_url recommendation
          logger.info(`\n💡 To use ${env.name} environment, update base_url to: ${env.url}`);
        } else {
          logger.info(`❌ ${env.name} - Authentication failed (${response.status})`);
        }
      } catch (error: any) {
        logger.info(`❌ ${env.name} - Connection failed: ${error.message}`);
      }
    }
  }

  private async decryptValue(encryptedValue: string): Promise<string> {
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

  private askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }
}

// Run the verifier
async function main() {
  const verifier = new GoCardlessCredentialsVerifier();
  
  try {
    await verifier.verify();
    logger.info('\n✅ Verification complete!\n');
  } catch (error: any) {
    logger.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

main();