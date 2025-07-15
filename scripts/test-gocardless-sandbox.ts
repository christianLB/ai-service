#!/usr/bin/env ts-node

/**
 * Test script for GoCardless Sandbox Integration
 * 
 * This script tests the complete GoCardless sandbox flow:
 * 1. Verify sandbox configuration
 * 2. Create a requisition for SANDBOXFINANCE
 * 3. Complete the authorization flow
 * 4. Import dummy accounts and transactions
 */

import axios from 'axios';
import { Logger } from '../src/utils/logger';

const logger = new Logger('GoCardlessSandboxTest');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
}

class GoCardlessSandboxTester {
  private results: TestResult[] = [];
  private requisitionId: string | null = null;

  async runCompleteTest(): Promise<void> {
    logger.info('🧪 Starting GoCardless Sandbox Test Suite');
    
    await this.testSandboxStatus();
    await this.testCreateRequisition();
    
    if (this.requisitionId) {
      logger.info('⏸️  Pausing for manual authorization...');
      logger.info('📋 Please complete the authorization flow and then press Enter to continue');
      
      // Wait for user input
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
      
      await this.testRequisitionStatus();
      await this.testCompleteSetup();
      await this.testFetchAccounts();
      await this.testFetchTransactions();
    }
    
    this.printResults();
  }

  private async testSandboxStatus(): Promise<void> {
    const step = 'Check Sandbox Status';
    try {
      const response = await axios.get(`${API_BASE_URL}/api/financial/sandbox-status`);
      
      if (response.data.success && response.data.data.enabled) {
        this.results.push({
          step,
          success: true,
          data: response.data.data
        });
        logger.info('✅ Sandbox mode is enabled');
      } else {
        throw new Error('Sandbox mode is not enabled');
      }
    } catch (error: any) {
      this.results.push({
        step,
        success: false,
        error: error.message
      });
      logger.error(`❌ ${step} failed:`, error.message);
    }
  }

  private async testCreateRequisition(): Promise<void> {
    const step = 'Create Sandbox Requisition';
    try {
      const response = await axios.post(`${API_BASE_URL}/api/financial/setup-sandbox`);
      
      if (response.data.success) {
        this.requisitionId = response.data.data.requisitionId;
        this.results.push({
          step,
          success: true,
          data: {
            requisitionId: this.requisitionId,
            consentUrl: response.data.data.consentUrl
          }
        });
        
        logger.info('✅ Requisition created successfully');
        logger.info(`📋 Requisition ID: ${this.requisitionId}`);
        logger.info(`🔗 Consent URL: ${response.data.data.consentUrl}`);
        logger.info('');
        logger.info('👉 Please open the consent URL in your browser and complete the authorization');
      } else {
        throw new Error(response.data.error || 'Failed to create requisition');
      }
    } catch (error: any) {
      this.results.push({
        step,
        success: false,
        error: error.response?.data?.error || error.message
      });
      logger.error(`❌ ${step} failed:`, error.response?.data?.error || error.message);
    }
  }

  private async testRequisitionStatus(): Promise<void> {
    const step = 'Check Requisition Status';
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/financial/requisition-status/${this.requisitionId}`
      );
      
      if (response.data.success) {
        this.results.push({
          step,
          success: true,
          data: response.data.data
        });
        
        logger.info(`✅ Requisition status: ${response.data.data.status}`);
        
        if (response.data.data.status !== 'LN') {
          logger.warn('⚠️  Requisition is not yet linked. Please complete the authorization flow.');
        }
      } else {
        throw new Error(response.data.error || 'Failed to check requisition status');
      }
    } catch (error: any) {
      this.results.push({
        step,
        success: false,
        error: error.response?.data?.error || error.message
      });
      logger.error(`❌ ${step} failed:`, error.response?.data?.error || error.message);
    }
  }

  private async testCompleteSetup(): Promise<void> {
    const step = 'Complete Setup';
    try {
      const response = await axios.post(`${API_BASE_URL}/api/financial/complete-setup`, {
        requisitionId: this.requisitionId
      });
      
      if (response.data.success) {
        this.results.push({
          step,
          success: true,
          data: response.data.data
        });
        
        logger.info(`✅ Setup completed successfully`);
        logger.info(`📊 Accounts imported: ${response.data.data.accounts.length}`);
        logger.info(`💳 Transactions synced: ${response.data.data.transactionsSynced}`);
      } else {
        throw new Error(response.data.error || 'Failed to complete setup');
      }
    } catch (error: any) {
      this.results.push({
        step,
        success: false,
        error: error.response?.data?.error || error.message
      });
      logger.error(`❌ ${step} failed:`, error.response?.data?.error || error.message);
    }
  }

  private async testFetchAccounts(): Promise<void> {
    const step = 'Fetch Accounts';
    try {
      const response = await axios.get(`${API_BASE_URL}/api/financial/accounts`);
      
      if (response.data.success) {
        const sandboxAccounts = response.data.data.filter(
          (acc: any) => acc.institution_id === 'SANDBOXFINANCE_SFIN0000'
        );
        
        this.results.push({
          step,
          success: true,
          data: {
            totalAccounts: response.data.data.length,
            sandboxAccounts: sandboxAccounts.length,
            accounts: sandboxAccounts
          }
        });
        
        logger.info(`✅ Fetched ${sandboxAccounts.length} sandbox accounts`);
        sandboxAccounts.forEach((acc: any) => {
          logger.info(`  💰 ${acc.name}: ${acc.balance} ${acc.currency}`);
        });
      } else {
        throw new Error('Failed to fetch accounts');
      }
    } catch (error: any) {
      this.results.push({
        step,
        success: false,
        error: error.response?.data?.error || error.message
      });
      logger.error(`❌ ${step} failed:`, error.response?.data?.error || error.message);
    }
  }

  private async testFetchTransactions(): Promise<void> {
    const step = 'Fetch Transactions';
    try {
      const response = await axios.get(`${API_BASE_URL}/api/financial/transactions`);
      
      if (response.data.success) {
        const recentTransactions = response.data.data.slice(0, 5);
        
        this.results.push({
          step,
          success: true,
          data: {
            totalTransactions: response.data.data.length,
            sampleTransactions: recentTransactions
          }
        });
        
        logger.info(`✅ Fetched ${response.data.data.length} transactions`);
        logger.info('📋 Recent transactions:');
        recentTransactions.forEach((tx: any) => {
          logger.info(`  ${tx.date} | ${tx.description} | ${tx.amount} ${tx.currency}`);
        });
      } else {
        throw new Error('Failed to fetch transactions');
      }
    } catch (error: any) {
      this.results.push({
        step,
        success: false,
        error: error.response?.data?.error || error.message
      });
      logger.error(`❌ ${step} failed:`, error.response?.data?.error || error.message);
    }
  }

  private printResults(): void {
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('📊 TEST RESULTS SUMMARY');
    logger.info('='.repeat(60));
    
    const successCount = this.results.filter(r => r.success).length;
    const totalCount = this.results.length;
    
    this.results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      logger.info(`${icon} ${result.step}: ${result.success ? 'PASSED' : 'FAILED'}`);
      if (!result.success && result.error) {
        logger.info(`   Error: ${result.error}`);
      }
    });
    
    logger.info('='.repeat(60));
    logger.info(`Overall: ${successCount}/${totalCount} tests passed`);
    logger.info('='.repeat(60));
  }
}

// Run the test
async function main() {
  const tester = new GoCardlessSandboxTester();
  
  logger.info('📝 GoCardless Sandbox Test Requirements:');
  logger.info('1. Ensure the backend is running (make dev-up)');
  logger.info('2. Configure sandbox credentials in the database:');
  logger.info('   - sandbox_mode: "true"');
  logger.info('   - sandbox_access_token: "<your_token>"');
  logger.info('3. Have a browser ready to complete the authorization flow');
  logger.info('');
  logger.info('Press Enter to start the test...');
  
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  await tester.runCompleteTest();
  
  process.exit(0);
}

main().catch(error => {
  logger.error('Test failed with error:', error);
  process.exit(1);
});