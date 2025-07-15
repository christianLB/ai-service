// GoCardless Service - Complete API Integration
import axios, { AxiosInstance } from 'axios';
import { 
  GoCardlessAccount, 
  GoCardlessTransaction, 
  GoCardlessRequisition,
  FinancialApiResponse,
  Account,
  Transaction
} from './types';
import { FinancialDatabaseService } from './database.service';
import { integrationConfigService } from '../integrations';
import { Logger } from '../../utils/logger';

const logger = new Logger('GoCardlessService');

export class GoCardlessService {
  private api: AxiosInstance = null as any;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private db: FinancialDatabaseService;
  private isSandboxMode: boolean = false;
  private sandboxInstitutionId: string = '';

  constructor(database: FinancialDatabaseService) {
    this.db = database;
    
    // Initialize service
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Get configuration from integration service
      const sandboxMode = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'sandbox_mode'
      });
      
      this.isSandboxMode = sandboxMode === 'true';
      
      // Get sandbox institution ID
      const sandboxInstitutionId = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'sandbox_institution_id'
      });
      
      this.sandboxInstitutionId = sandboxInstitutionId || 'SANDBOXFINANCE_SFIN0000';
      
      if (this.isSandboxMode) {
        logger.info('🧪 GoCardless Service running in SANDBOX MODE');
        logger.info(`🏦 Using sandbox institution: ${this.sandboxInstitutionId}`);
      }
      
      // Get base URL - GoCardless uses the same URL for both sandbox and production
      const baseUrl = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'base_url'
      }) || 'https://bankaccountdata.gocardless.com/api/v2';
      
      logger.info(`Using GoCardless API URL: ${baseUrl}`);
      
      this.api = axios.create({
        baseURL: baseUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    } catch (error) {
      logger.error('Failed to initialize GoCardless service', error);
      // Fallback to default production URL
      this.api = axios.create({
        baseURL: 'https://bankaccountdata.gocardless.com/api/v2',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    }
    
    // Request interceptor to add auth token
    this.api.interceptors.request.use(async (config) => {
      await this.ensureValidToken();
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('GoCardless API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data
        });
        throw error;
      }
    );
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  async authenticate(): Promise<string> {
    try {
      if (this.isSandboxMode) {
        const sandboxToken = await integrationConfigService.getConfig({
          integrationType: 'gocardless',
          configKey: 'sandbox_access_token'
        });

        if (sandboxToken) {
          this.accessToken = sandboxToken;
          this.tokenExpiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000);
          logger.info('Using provided sandbox access token');
          return this.accessToken;
        }
      }

      // Get credentials from integration config only
      const secretId = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_id'
      });

      const secretKey = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_key'
      });

      if (!secretId || !secretKey) {
        throw new Error('GoCardless credentials not configured in database');
      }
      
      // Use the configured base URL for token generation
      const tokenUrl = this.api.defaults.baseURL;
      
      const response = await axios.post(`${tokenUrl}/token/new/`, {
        secret_id: secretId,
        secret_key: secretKey
      });

      this.accessToken = response.data.access;
      // GoCardless tokens expire after 24 hours
      this.tokenExpiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000); // 23 hours to be safe
      
      console.log('GoCardless authentication successful');
      return this.accessToken!;
    } catch (error) {
      console.error('GoCardless authentication failed:', error);
      throw new Error('Failed to authenticate with GoCardless');
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiresAt || new Date() >= this.tokenExpiresAt) {
      // Check if credentials are configured before attempting authentication
      const hasCredentials = await this.hasCredentials();
      if (!hasCredentials) {
        throw new Error('GoCardless credentials not configured');
      }
      await this.authenticate();
    }
  }

  // ============================================================================
  // INSTITUTIONS
  // ============================================================================

  async getInstitutions(country = 'ES'): Promise<any[]> {
    try {
      const response = await this.api.get(`/institutions/?country=${country}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get institutions:', error);
      throw error;
    }
  }

  async getInstitutionById(id: string): Promise<any> {
    try {
      const response = await this.api.get(`/institutions/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Failed to get institution:', error);
      throw error;
    }
  }

  // ============================================================================
  // REQUISITIONS (CONSENT MANAGEMENT)
  // ============================================================================

  async createRequisition(institutionId: string, reference?: string): Promise<GoCardlessRequisition> {
    try {
      // Get redirect URI from database configuration
      const redirectUri = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'redirect_uri'
      }) || 'https://localhost:3000/financial/callback';
      
      const response = await this.api.post('/requisitions/', {
        institution_id: institutionId,
        redirect: redirectUri,
        reference: reference || `req-${Date.now()}`
      });

      const requisition = response.data;
      console.log('Requisition created:', {
        id: requisition.id,
        institution_id: requisition.institution_id,
        link: requisition.link
      });

      return requisition;
    } catch (error) {
      console.error('Failed to create requisition:', error);
      throw error;
    }
  }

  async getRequisition(requisitionId: string): Promise<GoCardlessRequisition> {
    try {
      const response = await this.api.get(`/requisitions/${requisitionId}/`);
      return response.data;
    } catch (error) {
      console.error('Failed to get requisition:', error);
      throw error;
    }
  }

  async getRequisitionStatus(requisitionId: string): Promise<FinancialApiResponse<GoCardlessRequisition>> {
    try {
      console.log(`[getRequisitionStatus] Fetching status for requisition: ${requisitionId}`);
      
      const response = await this.api.get(`/requisitions/${requisitionId}/`);
      const requisition = response.data;
      
      console.log(`[getRequisitionStatus] Requisition status retrieved:`, {
        id: requisition.id,
        status: requisition.status,
        accounts: requisition.accounts?.length || 0,
        created: requisition.created
      });
      
      return {
        success: true,
        data: requisition,
        metadata: {
          retrievedAt: new Date().toISOString()
        }
      };
    } catch (error: any) {
      console.error('[getRequisitionStatus] Failed to get requisition status:', error);
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Requisition not found - The requisition ID does not exist or has been deleted'
        };
      }
      
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication failed - Unable to authenticate with GoCardless API'
        };
      }
      
      return {
        success: false,
        error: `Failed to get requisition status: ${error.message || 'Unknown error occurred'}`
      };
    }
  }

  async deleteRequisition(requisitionId: string): Promise<void> {
    try {
      await this.api.delete(`/requisitions/${requisitionId}/`);
      console.log('Requisition deleted:', requisitionId);
    } catch (error) {
      console.error('Failed to delete requisition:', error);
      throw error;
    }
  }

  // ============================================================================
  // ACCOUNTS
  // ============================================================================

  async getAccountsByRequisition(requisitionId: string): Promise<string[]> {
    try {
      const response = await this.api.get(`/requisitions/${requisitionId}/`);
      return response.data.accounts || [];
    } catch (error) {
      console.error('Failed to get accounts by requisition:', error);
      throw error;
    }
  }

  async getAccountDetails(accountId: string): Promise<GoCardlessAccount> {
    try {
      const response = await this.api.get(`/accounts/${accountId}/details/`);
      return response.data.account;
    } catch (error) {
      console.error('Failed to get account details:', error);
      throw error;
    }
  }

  async getAccountBalances(accountId: string): Promise<any> {
    try {
      const response = await this.api.get(`/accounts/${accountId}/balances/`);
      return response.data.balances;
    } catch (error) {
      console.error('Failed to get account balances:', error);
      throw error;
    }
  }

  // ============================================================================
  // TRANSACTIONS
  // ============================================================================

  async getAccountTransactions(accountId: string, dateFrom?: Date, dateTo?: Date): Promise<GoCardlessTransaction[]> {
    try {
      let url = `/accounts/${accountId}/transactions/`;
      const params = new URLSearchParams();
      
      if (dateFrom) {
        params.append('date_from', dateFrom.toISOString().split('T')[0]);
      }
      if (dateTo) {
        params.append('date_to', dateTo.toISOString().split('T')[0]);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }

      let response;
      try {
        response = await this.api.get(url);
      } catch (apiError: any) {
        // Handle rate limit (429) gracefully
        if (apiError.response?.status === 429) {
          const retryAfter = apiError.response.data?.detail?.match(/(\d+) seconds/)?.[1];
          const waitTime = retryAfter ? parseInt(retryAfter) : 3600; // Default 1 hour
          
          console.log(`Rate limit exceeded for account ${accountId}. Must wait ${Math.round(waitTime/3600)} hours.`);
          throw new Error(`GoCardless rate limit exceeded. Next sync available in ${Math.round(waitTime/3600)} hours.`);
        }
        throw apiError;
      }
      const transactions = response.data.transactions;
      
      // Combine booked and pending transactions
      const allTransactions = [
        ...(transactions.booked || []),
        ...(transactions.pending || [])
      ];

      return allTransactions;
    } catch (error) {
      console.error('Failed to get account transactions:', error);
      throw error;
    }
  }

  // ============================================================================
  // DATABASE INTEGRATION
  // ============================================================================

  async syncAccountToDatabase(accountId: string, requisitionId: string): Promise<Account> {
    try {
      // Get account details from GoCardless
      const accountDetails = await this.getAccountDetails(accountId);
      const balances = await this.getAccountBalances(accountId);
      
      // Get EUR currency (assuming BBVA España)
      const eurCurrency = await this.db.getCurrencyByCode('EUR');
      if (!eurCurrency) {
        throw new Error('EUR currency not found in database');
      }

      // Check if account already exists
      const existingAccount = await this.db.query(
        'SELECT * FROM financial.accounts WHERE account_id = $1',
        [accountId]
      );

      let account;
      if (existingAccount.rows.length > 0) {
        // Account exists, update balance and metadata
        console.log('Account already exists, updating balance...');
        account = existingAccount.rows[0];
        
        await this.db.query(
          `UPDATE financial.accounts 
           SET balance = $1, metadata = $2, last_sync = NOW() 
           WHERE account_id = $3`,
          [
            balances[0]?.balanceAmount?.amount || '0',
            JSON.stringify({
              gocardless_account_id: accountId,
              account_details: accountDetails,
              last_sync: new Date().toISOString()
            }),
            accountId
          ]
        );
      } else {
        // Create new account
        account = await this.db.createAccount({
          name: `BBVA Account ${accountDetails.iban?.slice(-4) || accountId.slice(-4)}`,
          type: 'bank_account',
          currencyId: eurCurrency.id,
          accountId: accountId,
          institutionId: accountDetails.institution_id,
          requisitionId: requisitionId,
          iban: accountDetails.iban,
          balance: balances[0]?.balanceAmount?.amount || '0',
          isActive: true,
          metadata: {
            gocardless_account_id: accountId,
            account_details: accountDetails,
            last_sync: new Date().toISOString()
          }
        });
      }

      console.log('Account synced to database:', account.id);
      return account;
    } catch (error) {
      console.error('Failed to sync account to database:', error);
      throw error;
    }
  }

  async syncTransactionsToDatabase(accountId: string, dbAccountId: string, days = 90): Promise<number> {
    try {
      // Calculate date range (last 90 days)
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateTo.getDate() - days);

      console.log(`Syncing transactions for account ${accountId} from ${dateFrom.toISOString().split('T')[0]} to ${dateTo.toISOString().split('T')[0]}`);

      // Get transactions from GoCardless
      const transactions = await this.getAccountTransactions(accountId, dateFrom, dateTo);
      
      console.log(`Found ${transactions.length} transactions to sync`);

      // Get EUR currency
      const eurCurrency = await this.db.getCurrencyByCode('EUR');
      if (!eurCurrency) {
        throw new Error('EUR currency not found in database');
      }

      let syncedCount = 0;

      // Process each transaction
      for (const gcTransaction of transactions) {
        try {
          // Validate transaction has required data
          if (!gcTransaction.transactionAmount?.amount) {
            console.log('Skipping transaction without amount:', gcTransaction.transactionId);
            continue;
          }

          // Check if transaction already exists
          const existingTransaction = await this.db.query(
            'SELECT id FROM financial.transactions WHERE reference = $1',
            [gcTransaction.transactionId]
          );

          if (existingTransaction.rows.length > 0) {
            continue; // Skip if already exists
          }

          // Create transaction in database
          const transaction = await this.db.createTransaction({
            accountId: dbAccountId,
            type: 'bank_transfer',
            status: gcTransaction.bookingDate ? 'confirmed' : 'pending',
            amount: gcTransaction.transactionAmount.amount,
            currencyId: eurCurrency.id,
            description: gcTransaction.remittanceInformationUnstructured || 'Bank transaction',
            reference: gcTransaction.transactionId,
            date: new Date(gcTransaction.bookingDate || gcTransaction.valueDate),
            gocardlessData: gcTransaction,
            counterpartyName: gcTransaction.creditorName || gcTransaction.debtorName,
            counterpartyAccount: gcTransaction.creditorAccount?.iban || gcTransaction.debtorAccount?.iban,
            metadata: {
              internal_transaction_id: gcTransaction.internalTransactionId,
              bank_transaction_code: gcTransaction.bankTransactionCode,
              additional_information: gcTransaction.additionalInformation,
              sync_date: new Date().toISOString(),
              sync_batch: `initial-${days}days`
            }
          });

          syncedCount++;
          
          if (syncedCount % 10 === 0) {
            console.log(`Synced ${syncedCount}/${transactions.length} transactions`);
          }
        } catch (error) {
          console.error('Failed to sync individual transaction:', gcTransaction.transactionId, error);
          // Continue with next transaction
        }
      }

      // Update account balance
      if (transactions.length > 0) {
        const balances = await this.getAccountBalances(accountId);
        const currentBalance = balances[0]?.balanceAmount?.amount || '0';
        await this.db.updateAccountBalance(dbAccountId, currentBalance);
      }

      console.log(`Successfully synced ${syncedCount} transactions for account ${accountId}`);
      return syncedCount;
    } catch (error) {
      console.error('Failed to sync transactions to database:', error);
      throw error;
    }
  }

  // ============================================================================
  // COMPLETE SETUP FLOW
  // ============================================================================

  async setupBBVAAccount(): Promise<FinancialApiResponse<{
    requisition: GoCardlessRequisition;
    consentUrl: string;
    requisitionId: string;
  }>> {
    try {
      // Use sandbox institution if in sandbox mode
      const institutionId = this.isSandboxMode ? this.sandboxInstitutionId : 'BBVA_BBVAESMM';
      const reference = this.isSandboxMode ? `sandbox-setup-${Date.now()}` : `bbva-setup-${Date.now()}`;
      
      if (this.isSandboxMode) {
        console.log(`🧪 Setting up SANDBOX account with institution: ${institutionId}`);
      }
      
      // Create requisition
      const requisition = await this.createRequisition(institutionId, reference);
      
      return {
        success: true,
        data: {
          requisition,
          consentUrl: requisition.link,
          requisitionId: requisition.id
        },
        metadata: {
          message: this.isSandboxMode 
            ? '🧪 SANDBOX MODE: Visit the consent URL to authorize access to the mock bank account'
            : 'Visit the consent URL to authorize access to your BBVA account',
          nextSteps: 'After consent, call completeSetup with the requisition ID',
          sandboxMode: this.isSandboxMode
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup BBVA account'
      };
    }
  }

  async setupSandboxAccount(): Promise<FinancialApiResponse<{
    requisition: GoCardlessRequisition;
    consentUrl: string;
    requisitionId: string;
  }>> {
    if (!this.isSandboxMode) {
      return {
        success: false,
        error: 'Sandbox mode is not enabled. Please configure sandbox_mode in the integration settings.'
      };
    }

    try {
      console.log(`🧪 Setting up Sandbox Finance test account`);
      
      // Create requisition for Sandbox Finance
      const requisition = await this.createRequisition(
        this.sandboxInstitutionId, 
        `sandbox-test-${Date.now()}`
      );
      
      return {
        success: true,
        data: {
          requisition,
          consentUrl: requisition.link,
          requisitionId: requisition.id
        },
        metadata: {
          message: '🧪 SANDBOX MODE: Visit the consent URL to test with Sandbox Finance mock bank',
          institution: 'Sandbox Finance (Mock Bank)',
          institutionId: this.sandboxInstitutionId,
          nextSteps: 'Complete the mock authorization flow and then call completeSetup',
          testCredentials: 'Use any mock credentials provided by GoCardless sandbox'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup sandbox account'
      };
    }
  }

  async completeSetup(requisitionId: string): Promise<FinancialApiResponse<{
    accounts: Account[];
    transactionsSynced: number;
  }>> {
    try {
      // Check requisition status
      const requisition = await this.getRequisition(requisitionId);
      
      if (requisition.status !== 'LN') { // LN = Linked
        return {
          success: false,
          error: `Requisition not ready. Status: ${requisition.status}. Please complete the consent process first.`
        };
      }

      // Get accounts from requisition
      const accountIds = await this.getAccountsByRequisition(requisitionId);
      
      if (accountIds.length === 0) {
        return {
          success: false,
          error: 'No accounts found in requisition'
        };
      }

      const accounts: Account[] = [];
      let totalTransactionsSynced = 0;

      // Process each account
      for (const accountId of accountIds) {
        try {
          // Sync account to database
          const account = await this.syncAccountToDatabase(accountId, requisitionId);
          accounts.push(account);

          // Sync transactions (last 90 days)
          const transactionCount = await this.syncTransactionsToDatabase(accountId, account.id, 90);
          totalTransactionsSynced += transactionCount;

          console.log(`Account ${accountId} setup complete: ${transactionCount} transactions synced`);
        } catch (error) {
          console.error(`Failed to setup account ${accountId}:`, error);
          // Continue with other accounts
        }
      }

      return {
        success: true,
        data: {
          accounts,
          transactionsSynced: totalTransactionsSynced
        },
        metadata: {
          message: `Successfully setup ${accounts.length} accounts with ${totalTransactionsSynced} transactions`,
          requisitionId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete setup'
      };
    }
  }

  // ============================================================================
  // PERIODIC SYNC
  // ============================================================================

  async performPeriodicSync(): Promise<FinancialApiResponse<{
    accountsSynced: number;
    transactionsSynced: number;
  }>> {
    try {
      console.log('=== GOCARDLESS PERIODIC SYNC ===');
      console.log('Starting periodic sync of GoCardless accounts...');
      
      // Get all active bank accounts
      const accounts = await this.db.query(`
        SELECT id, account_id, name, metadata->'last_sync' as last_sync
        FROM financial.accounts 
        WHERE type = 'bank_account' AND is_active = true AND account_id IS NOT NULL
      `);
      
      console.log(`Found ${accounts.rows.length} active bank accounts to sync`);

      let accountsSynced = 0;
      let totalTransactionsSynced = 0;

      for (const account of accounts.rows) {
        try {
          console.log(`Syncing account: ${account.name} (${account.account_id})`);
          
          // Sync transactions from last 7 days (to catch any missed transactions)
          const transactionCount = await this.syncTransactionsToDatabase(
            account.account_id, 
            account.id, 
            7
          );
          
          // Update last sync timestamp
          await this.db.query(`
            UPDATE financial.accounts 
            SET metadata = metadata || '{"last_sync": $1}'::jsonb
            WHERE id = $2
          `, [new Date().toISOString(), account.id]);

          accountsSynced++;
          totalTransactionsSynced += transactionCount;
          
          console.log(`Account ${account.name} synced: ${transactionCount} new transactions`);
        } catch (error) {
          console.error(`Failed to sync account ${account.name}:`, error);
          // Continue with other accounts
        }
      }

      console.log(`Periodic sync completed: ${accountsSynced} accounts, ${totalTransactionsSynced} transactions`);

      return {
        success: true,
        data: {
          accountsSynced,
          transactionsSynced: totalTransactionsSynced
        },
        metadata: {
          syncTime: new Date().toISOString(),
          accountsProcessed: accounts.rows.length
        }
      };
    } catch (error) {
      console.error('Periodic sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Periodic sync failed'
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async hasCredentials(): Promise<boolean> {
    try {
      if (this.isSandboxMode) {
        const sandboxToken = await integrationConfigService.getConfig({
          integrationType: 'gocardless',
          configKey: 'sandbox_access_token'
        });
        if (sandboxToken) {
          return true;
        }
      }

      const secretId = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_id'
      });
      
      const secretKey = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_key'
      });

      return !!(secretId && secretKey);
    } catch (error) {
      logger.error('Failed to check credentials', error);
      return false;
    }
  }

  async getAccountStatus(): Promise<FinancialApiResponse<any[]>> {
    try {
      const accounts = await this.db.query(`
        SELECT 
          a.id,
          a.name,
          a.account_id,
          a.balance,
          c.code as currency,
          a.metadata->'last_sync' as last_sync,
          COUNT(t.id) as transaction_count,
          MAX(t.date) as last_transaction_date
        FROM financial.accounts a
        LEFT JOIN financial.currencies c ON a.currency_id = c.id
        LEFT JOIN financial.transactions t ON a.id = t.account_id
        WHERE a.type = 'bank_account' AND a.is_active = true
        GROUP BY a.id, a.name, a.account_id, a.balance, c.code, a.metadata
        ORDER BY a.created_at DESC
      `);

      return {
        success: true,
        data: accounts.rows,
        metadata: {
          sandboxMode: this.isSandboxMode
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get account status'
      };
    }
  }

  // ============================================================================
  // SANDBOX UTILITIES
  // ============================================================================

  async getSandboxStatus(): Promise<FinancialApiResponse<{
    enabled: boolean;
    institutionId: string;
    institutionName: string;
    environment: string;
    baseUrl: string;
    testAccountsAvailable: boolean;
  }>> {
    try {
      return {
        success: true,
        data: {
          enabled: this.isSandboxMode,
          institutionId: this.sandboxInstitutionId,
          institutionName: 'Sandbox Finance (Mock Bank)',
          environment: process.env.NODE_ENV || 'unknown',
          baseUrl: this.api.defaults.baseURL || '',
          testAccountsAvailable: this.isSandboxMode
        },
        metadata: {
          message: this.isSandboxMode 
            ? '🧪 Sandbox mode is ACTIVE - using mock bank data'
            : '🏦 Production mode - using real bank connections',
          instructions: this.isSandboxMode 
            ? 'You can test with mock data without real bank accounts'
            : 'Configure sandbox_mode in integration settings to enable sandbox testing'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sandbox status'
      };
    }
  }

  async resetSandboxData(): Promise<FinancialApiResponse<{
    accountsDeleted: number;
    transactionsDeleted: number;
  }>> {
    if (!this.isSandboxMode) {
      return {
        success: false,
        error: 'Cannot reset data - sandbox mode is not enabled'
      };
    }

    try {
      // Start a transaction
      await this.db.query('BEGIN');

      // Delete sandbox transactions
      const transactionsResult = await this.db.query(`
        DELETE FROM financial.transactions t
        USING financial.accounts a
        WHERE t.account_id = a.id 
        AND a.institution_id = $1
        RETURNING t.id
      `, [this.sandboxInstitutionId]);

      // Delete sandbox accounts
      const accountsResult = await this.db.query(`
        DELETE FROM financial.accounts
        WHERE institution_id = $1
        RETURNING id
      `, [this.sandboxInstitutionId]);

      await this.db.query('COMMIT');

      return {
        success: true,
        data: {
          accountsDeleted: accountsResult.rowCount || 0,
          transactionsDeleted: transactionsResult.rowCount || 0
        },
        metadata: {
          message: '🧪 Sandbox data has been reset successfully'
        }
      };
    } catch (error) {
      await this.db.query('ROLLBACK');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset sandbox data'
      };
    }
  }
}