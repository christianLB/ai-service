// GoCardless Sandbox Test Helper Utilities
// Provides helper functions for testing with GoCardless sandbox environment

import axios from 'axios';

export interface SandboxTestConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface SandboxTestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class SandboxTestHelper {
  private config: SandboxTestConfig;

  constructor(config: SandboxTestConfig) {
    this.config = config;
  }

  /**
   * Check if sandbox mode is active
   */
  async checkSandboxStatus(): Promise<SandboxTestResult> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/financial/sandbox-status`);
      const data = response.data;

      if (data.success && data.data.enabled) {
        return {
          success: true,
          message: '🧪 Sandbox mode is active',
          data: data.data
        };
      } else {
        return {
          success: false,
          message: '❌ Sandbox mode is not enabled',
          data: data.data
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to check sandbox status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Initialize sandbox account setup
   */
  async setupSandboxAccount(): Promise<SandboxTestResult> {
    try {
      const response = await axios.post(`${this.config.baseUrl}/api/financial/setup-sandbox`);
      const data = response.data;

      if (data.success) {
        return {
          success: true,
          message: '🧪 Sandbox account setup initiated',
          data: {
            requisitionId: data.data.requisitionId,
            consentUrl: data.data.consentUrl,
            instructions: data.instructions
          }
        };
      } else {
        return {
          success: false,
          message: 'Failed to setup sandbox account',
          error: data.error
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to setup sandbox account',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check requisition status
   */
  async checkRequisitionStatus(requisitionId: string): Promise<SandboxTestResult> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/api/financial/requisition-status/${requisitionId}`
      );
      const data = response.data;

      if (data.success) {
        return {
          success: true,
          message: `Requisition status: ${data.data.status}`,
          data: data.data
        };
      } else {
        return {
          success: false,
          message: 'Failed to get requisition status',
          error: data.error
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get requisition status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Complete sandbox setup after authorization
   */
  async completeSandboxSetup(requisitionId: string): Promise<SandboxTestResult> {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/api/financial/complete-setup`,
        { requisitionId },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const data = response.data;

      if (data.success) {
        return {
          success: true,
          message: '🧪 Sandbox setup completed successfully',
          data: {
            accounts: data.data.accounts,
            transactionsSynced: data.data.transactionsSynced
          }
        };
      } else {
        return {
          success: false,
          message: 'Failed to complete sandbox setup',
          error: data.error
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to complete sandbox setup',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get sandbox accounts
   */
  async getSandboxAccounts(): Promise<SandboxTestResult> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/financial/accounts`);
      const data = response.data;

      if (data.success) {
        const sandboxAccounts = data.data.filter((account: any) => 
          account.metadata?.sandboxMode || 
          account.institution_id === 'SANDBOXFINANCE_SFIN0000'
        );

        return {
          success: true,
          message: `Found ${sandboxAccounts.length} sandbox accounts`,
          data: sandboxAccounts
        };
      } else {
        return {
          success: false,
          message: 'Failed to get accounts',
          error: data.error
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get accounts',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Reset sandbox data
   */
  async resetSandboxData(): Promise<SandboxTestResult> {
    try {
      const response = await axios.post(`${this.config.baseUrl}/api/financial/sandbox-reset`);
      const data = response.data;

      if (data.success) {
        return {
          success: true,
          message: '🧪 Sandbox data reset successfully',
          data: data.data
        };
      } else {
        return {
          success: false,
          message: 'Failed to reset sandbox data',
          error: data.error
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to reset sandbox data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run a complete sandbox test flow
   */
  async runCompleteTestFlow(): Promise<SandboxTestResult> {
    console.log('🧪 Starting complete sandbox test flow...\n');

    try {
      // 1. Check sandbox status
      console.log('1. Checking sandbox status...');
      const statusResult = await this.checkSandboxStatus();
      if (!statusResult.success) {
        return statusResult;
      }
      console.log('✅ ' + statusResult.message);

      // 2. Reset existing sandbox data
      console.log('\n2. Resetting existing sandbox data...');
      const resetResult = await this.resetSandboxData();
      console.log(resetResult.success ? '✅ ' + resetResult.message : '⚠️  ' + resetResult.message);

      // 3. Setup sandbox account
      console.log('\n3. Setting up sandbox account...');
      const setupResult = await this.setupSandboxAccount();
      if (!setupResult.success) {
        return setupResult;
      }
      console.log('✅ ' + setupResult.message);
      console.log('📋 Requisition ID:', setupResult.data.requisitionId);
      console.log('🔗 Consent URL:', setupResult.data.consentUrl);

      // 4. Instructions for manual step
      console.log('\n⚠️  MANUAL STEP REQUIRED:');
      console.log('Please visit the consent URL above and complete the authorization flow.');
      console.log('After authorization, the requisition status will change to "LN" (Linked).');
      console.log('\nTo continue the test, run:');
      console.log(`completeSandboxSetup('${setupResult.data.requisitionId}')`);

      return {
        success: true,
        message: 'Sandbox test flow initiated. Manual authorization required.',
        data: {
          requisitionId: setupResult.data.requisitionId,
          consentUrl: setupResult.data.consentUrl,
          nextStep: 'Complete authorization and run completeSandboxSetup'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Test flow failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate mock transaction data for testing
   */
  generateMockTransactions(count: number = 10): any[] {
    const merchants = [
      'Sandbox Grocery Store',
      'Mock Coffee Shop',
      'Test Restaurant',
      'Sample Gas Station',
      'Demo Online Store',
      'Fake Utility Company',
      'Mock Subscription Service',
      'Test Department Store'
    ];

    const transactions = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);

      const isExpense = Math.random() > 0.2; // 80% expenses, 20% income
      const amount = isExpense 
        ? -(Math.random() * 200 + 10) // -10 to -210
        : (Math.random() * 1000 + 100); // 100 to 1100

      transactions.push({
        id: `sandbox-tx-${Date.now()}-${i}`,
        date: date.toISOString(),
        amount: amount.toFixed(2),
        currency: 'EUR',
        description: merchants[Math.floor(Math.random() * merchants.length)],
        type: isExpense ? 'expense' : 'income',
        category: isExpense ? 'Shopping' : 'Salary',
        status: 'completed'
      });
    }

    return transactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
}

// Export a default instance for convenience
export const sandboxTester = new SandboxTestHelper({
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000'
});