import { api } from './api';

interface SyncResponse {
  success: boolean;
  message?: string;
  data?: {
    results?: Array<{
      success: boolean;
      accountName?: string;
      error?: string;
      rateLimitInfo?: {
        status?: string;
      };
    }>;
    accountsSynced?: number;
    transactionsSynced?: number;
    errors?: string[];
  };
}

class GoCardlessService {
  /**
   * Sync GoCardless accounts
   * Calls the gateway endpoint to sync all accounts from GoCardless
   */
  async syncAccounts(): Promise<SyncResponse> {
    try {
      const response = await api.post('/api/financial/gocardless/sync/accounts');
      return response.data;
    } catch (error) {
      console.error('Error syncing GoCardless accounts:', error);
      throw error;
    }
  }

  /**
   * Sync GoCardless transactions for a specific account
   * @param accountId - The ID of the account to sync transactions for
   * @param days - Number of days of transactions to sync (optional, default handled by backend)
   */
  async syncTransactions(accountId?: string, days?: number): Promise<SyncResponse> {
    try {
      const body: { accountId?: string; days?: number } = {};
      if (accountId) body.accountId = accountId;
      if (days) body.days = days;

      const response = await api.post('/api/financial/gocardless/sync/transactions', body);
      return response.data;
    } catch (error) {
      console.error('Error syncing GoCardless transactions:', error);
      throw error;
    }
  }

  /**
   * Check if GoCardless credentials are configured
   * This checks the integration configs to see if GoCardless is set up
   */
  async isConfigured(): Promise<boolean> {
    try {
      const response = await api.get('/api/integrations/configs?integrationType=gocardless');
      const configs = response.data.data || [];

      // Check if we have both secret_id and secret_key configured
      const hasSecretId = configs.some((c: { configKey: string }) => c.configKey === 'secret_id');
      const hasSecretKey = configs.some((c: { configKey: string }) => c.configKey === 'secret_key');

      return hasSecretId && hasSecretKey;
    } catch (error) {
      console.error('Error checking GoCardless configuration:', error);
      return false;
    }
  }

  /**
   * Test GoCardless connection
   * This calls the refresh-auth endpoint to verify credentials work
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post('/api/financial/refresh-auth');
      const result = response.data;

      if (result.success) {
        return {
          success: true,
          message: 'GoCardless connection successful',
        };
      } else {
        return {
          success: false,
          message: result.details || 'Failed to connect to GoCardless',
        };
      }
    } catch (error) {
      const errorObj = error as { response?: { data?: { message?: string; error?: string } } };
      const message =
        errorObj.response?.data?.message ||
        errorObj.response?.data?.error ||
        'Connection test failed';
      return {
        success: false,
        message,
      };
    }
  }
}

const gocardlessService = new GoCardlessService();
export { gocardlessService };
export default gocardlessService;
