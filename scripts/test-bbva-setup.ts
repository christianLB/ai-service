#!/usr/bin/env ts-node

/**
 * Test BBVA Setup Flow
 * 
 * This script tests the complete flow for setting up BBVA account:
 * 1. Check GoCardless configuration
 * 2. Test authentication
 * 3. Create requisition for BBVA
 * 4. Guide through authorization
 * 5. Complete setup
 */

import axios from 'axios';
import { Logger } from '../src/utils/logger';
import readline from 'readline';

const logger = new Logger('BBVASetupTest');
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

interface TestStep {
  name: string;
  action: () => Promise<any>;
  continueOnError?: boolean;
}

class BBVASetupTester {
  private requisitionId: string | null = null;
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async runSetup(): Promise<void> {
    logger.info('🏦 BBVA Account Setup Test\n');
    logger.info('This script will guide you through the complete BBVA setup process.');
    logger.info('Make sure you have:');
    logger.info('1. GoCardless credentials configured in the database');
    logger.info('2. The backend service running (make dev-up)');
    logger.info('3. A browser ready for the authorization flow\n');

    await this.waitForConfirmation('Press Enter to start...');

    const steps: TestStep[] = [
      {
        name: 'Check Service Health',
        action: () => this.checkServiceHealth()
      },
      {
        name: 'Test GoCardless Connection',
        action: () => this.testGoCardlessConnection()
      },
      {
        name: 'Create BBVA Requisition',
        action: () => this.createBBVARequisition()
      },
      {
        name: 'Wait for Authorization',
        action: () => this.waitForAuthorization(),
        continueOnError: true
      },
      {
        name: 'Check Requisition Status',
        action: () => this.checkRequisitionStatus()
      },
      {
        name: 'Complete Setup',
        action: () => this.completeSetup()
      },
      {
        name: 'Verify Accounts',
        action: () => this.verifyAccounts()
      }
    ];

    for (const step of steps) {
      logger.info(`\n📍 Step: ${step.name}`);
      logger.info('-'.repeat(40));
      
      try {
        await step.action();
        logger.info(`✅ ${step.name} completed successfully`);
      } catch (error: any) {
        logger.error(`❌ ${step.name} failed:`, error.message);
        if (!step.continueOnError) {
          logger.error('\n🛑 Setup cannot continue. Please fix the issue and try again.');
          break;
        }
      }
    }

    this.rl.close();
    logger.info('\n✨ Setup process completed!');
  }

  private async checkServiceHealth(): Promise<void> {
    const response = await axios.get(`${API_BASE_URL}/api/financial/health`, {
      validateStatus: () => true
    });

    if (response.status !== 200 || response.data?.status !== 'healthy') {
      throw new Error('Financial service is not healthy');
    }

    logger.info('Service status: Healthy');
    logger.info(`Database: ${response.data.checks?.database}`);
    logger.info(`GoCardless: ${response.data.checks?.gocardless}`);
  }

  private async testGoCardlessConnection(): Promise<void> {
    logger.info('Testing GoCardless authentication...');
    
    const response = await axios.post(`${API_BASE_URL}/api/financial/test-gocardless`, {}, {
      validateStatus: () => true
    });

    if (response.status === 401) {
      logger.error('Authentication failed. Running diagnostic...');
      
      // Try diagnostic endpoint
      const diagResponse = await axios.post(`${API_BASE_URL}/api/financial/diagnose-gocardless`, {}, {
        validateStatus: () => true
      });
      
      if (diagResponse.data?.diagnosis) {
        logger.info('\n📊 Diagnostic Results:');
        diagResponse.data.diagnosis.checks.forEach((check: any) => {
          const icon = check.passed ? '✅' : '❌';
          logger.info(`${icon} ${check.name}`);
          if (!check.passed && check.error) {
            logger.error(`   Error: ${JSON.stringify(check.error, null, 2)}`);
          }
        });
      }
      
      throw new Error('GoCardless authentication failed. Please check your credentials.');
    }

    if (response.status !== 200) {
      throw new Error(`Unexpected response: ${response.status}`);
    }

    logger.info('GoCardless authentication successful!');
  }

  private async createBBVARequisition(): Promise<void> {
    logger.info('Creating BBVA requisition...');
    
    const response = await axios.post(`${API_BASE_URL}/api/financial/setup-bbva`, {}, {
      validateStatus: () => true
    });

    if (response.status === 401) {
      throw new Error('Authentication failed (401). Please check GoCardless credentials.');
    }

    if (response.status !== 200 || !response.data?.success) {
      const error = response.data?.error || response.data?.details || 'Unknown error';
      throw new Error(`Failed to create requisition: ${error}`);
    }

    this.requisitionId = response.data.data.requisitionId;
    const consentUrl = response.data.data.consentUrl;

    logger.info(`✅ Requisition created successfully!`);
    logger.info(`📋 Requisition ID: ${this.requisitionId}`);
    logger.info(`🔗 Consent URL: ${consentUrl}`);
    logger.info('\n' + '='.repeat(60));
    logger.info('👉 NEXT STEPS:');
    logger.info('1. Open the consent URL in your browser');
    logger.info('2. Log in to your BBVA account');
    logger.info('3. Grant consent for account access');
    logger.info('4. Return here after completing authorization');
    logger.info('='.repeat(60) + '\n');
  }

  private async waitForAuthorization(): Promise<void> {
    await this.waitForConfirmation(
      'Press Enter after completing the authorization in your browser...'
    );
  }

  private async checkRequisitionStatus(): Promise<void> {
    if (!this.requisitionId) {
      throw new Error('No requisition ID available');
    }

    logger.info(`Checking requisition status for ID: ${this.requisitionId}`);
    
    const response = await axios.get(
      `${API_BASE_URL}/api/financial/requisition-status/${this.requisitionId}`,
      { validateStatus: () => true }
    );

    if (response.status !== 200 || !response.data?.success) {
      throw new Error(`Failed to get requisition status: ${response.data?.error}`);
    }

    const status = response.data.data.status;
    const accounts = response.data.data.accounts || [];

    logger.info(`Requisition Status: ${status}`);
    logger.info(`Linked Accounts: ${accounts.length}`);

    if (status !== 'LN') {
      throw new Error(
        `Requisition is not linked. Status: ${status}. ` +
        'Please complete the authorization process.'
      );
    }

    if (accounts.length === 0) {
      throw new Error('No accounts linked to requisition');
    }

    logger.info('Requisition is linked and ready!');
  }

  private async completeSetup(): Promise<void> {
    if (!this.requisitionId) {
      throw new Error('No requisition ID available');
    }

    logger.info('Completing setup...');
    
    const response = await axios.post(
      `${API_BASE_URL}/api/financial/complete-setup`,
      { requisitionId: this.requisitionId },
      { validateStatus: () => true }
    );

    if (response.status !== 200 || !response.data?.success) {
      throw new Error(`Failed to complete setup: ${response.data?.error}`);
    }

    const { accounts, transactionsSynced } = response.data.data;

    logger.info(`✅ Setup completed successfully!`);
    logger.info(`📊 Accounts imported: ${accounts.length}`);
    logger.info(`💳 Transactions synced: ${transactionsSynced}`);

    if (accounts.length > 0) {
      logger.info('\n📦 Account Details:');
      accounts.forEach((account: any) => {
        logger.info(`  • ${account.name}`);
        logger.info(`    ID: ${account.id}`);
        logger.info(`    Balance: ${account.balance} ${account.currency_code || 'EUR'}`);
        logger.info(`    IBAN: ${account.iban || 'N/A'}`);
      });
    }
  }

  private async verifyAccounts(): Promise<void> {
    logger.info('Verifying imported accounts...');
    
    const response = await axios.get(`${API_BASE_URL}/api/financial/accounts`, {
      validateStatus: () => true
    });

    if (response.status !== 200 || !response.data?.success) {
      throw new Error('Failed to fetch accounts');
    }

    const accounts = response.data.data;
    const bbvaAccounts = accounts.filter((acc: any) => 
      acc.institution_id === 'BBVA_BBVAESMM'
    );

    logger.info(`Total accounts in system: ${accounts.length}`);
    logger.info(`BBVA accounts: ${bbvaAccounts.length}`);

    if (bbvaAccounts.length === 0) {
      logger.warn('⚠️  No BBVA accounts found. Setup may have failed.');
    } else {
      logger.info('\n🎉 BBVA accounts successfully imported!');
      logger.info('You can now:');
      logger.info('• View accounts: GET /api/financial/accounts');
      logger.info('• View transactions: GET /api/financial/transactions');
      logger.info('• Sync data: POST /api/financial/sync');
    }
  }

  private async waitForConfirmation(prompt: string): Promise<void> {
    return new Promise((resolve) => {
      this.rl.question(prompt, () => resolve());
    });
  }
}

// Run the test
async function main() {
  const tester = new BBVASetupTester();
  
  try {
    await tester.runSetup();
  } catch (error) {
    logger.error('Setup failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Handle cleanup
process.on('SIGINT', () => {
  logger.info('\n\nSetup interrupted by user');
  process.exit(0);
});

main();