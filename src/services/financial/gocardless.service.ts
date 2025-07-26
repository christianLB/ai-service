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

  constructor(database: FinancialDatabaseService) {
    this.db = database;
    
    // Initialize service
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Get base URL from configuration
      let baseUrl = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'base_url'
      }) || 'https://bankaccountdata.gocardless.com/api/v2';
      
      // Ensure base URL is properly formatted
      baseUrl = baseUrl.trim();
      if (!baseUrl.endsWith('/api/v2')) {
        baseUrl = baseUrl.replace(/\/$/, '') + '/api/v2';
      }
      
      logger.info(`Initializing GoCardless Service with URL: ${baseUrl}`);
      
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
      // Use default production URL
      const defaultUrl = 'https://bankaccountdata.gocardless.com/api/v2';
      logger.info(`Using default production URL: ${defaultUrl}`);
      
      this.api = axios.create({
        baseURL: defaultUrl,
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
      // Clear any cached token
      this.accessToken = null;
      this.tokenExpiresAt = null;
      
      // Get fresh credentials from database (no cache)
      let secretId = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_id'
      });

      let secretKey = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_key'
      });
      
      // Clean credentials - remove any whitespace
      if (secretId) secretId = secretId.trim();
      if (secretKey) secretKey = secretKey.trim();

      logger.info('Authenticating with GoCardless', { 
        hasSecretId: !!secretId,
        hasSecretKey: !!secretKey,
        secretIdLength: secretId?.length,
        secretKeyLength: secretKey?.length,
        baseURL: this.api.defaults.baseURL,
        // Log first/last chars to verify no whitespace
        secretIdFirstChar: secretId?.charAt(0),
        secretIdLastChar: secretId?.charAt(secretId.length - 1),
        environment: this.api.defaults.baseURL?.includes('sandbox') ? 'sandbox' : 'production'
      });

      if (!secretId || !secretKey) {
        throw new Error('GoCardless credentials not configured in database');
      }
      
      // Validate credential format
      const validation = this.validateCredentialFormat(secretId, secretKey);
      if (!validation.valid) {
        logger.error('Invalid credential format', { errors: validation.errors });
        throw new Error(`Invalid GoCardless credential format: ${validation.errors.join(', ')}`);
      }
      
      // Use the configured base URL for token generation
      const tokenUrl = `${this.api.defaults.baseURL}/token/new/`;
      
      logger.info(`Requesting token from: ${tokenUrl}`);
      
      // Log the request payload structure (without sensitive data)
      logger.debug('Token request payload structure', {
        hasSecretId: !!secretId,
        hasSecretKey: !!secretKey,
        payloadKeys: Object.keys({ secret_id: secretId, secret_key: secretKey })
      });
      
      const response = await axios.post(tokenUrl, {
        secret_id: secretId,
        secret_key: secretKey
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.data || !response.data.access) {
        logger.error('Invalid response from GoCardless token endpoint', response.data);
        throw new Error('Invalid response from GoCardless authentication');
      }

      const accessToken = response.data.access;
      this.accessToken = accessToken;
      // GoCardless tokens expire after 24 hours
      this.tokenExpiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000); // 23 hours to be safe
      
      logger.info('GoCardless authentication successful', {
        tokenLength: accessToken.length,
        expiresAt: this.tokenExpiresAt
      });
      
      return accessToken;
    } catch (error: any) {
      // Clear token on error
      this.accessToken = null;
      this.tokenExpiresAt = null;
      
      logger.error('GoCardless authentication failed', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      });
      
      if (error.response?.status === 401) {
        const errorDetail = error.response?.data?.detail || error.response?.data?.error || '';
        throw new Error(`Invalid GoCardless credentials (401). ${errorDetail}. Please verify:
1. Credentials are from the correct environment (production vs sandbox)
2. No extra whitespace in credentials
3. Credentials are active and not expired`);
      }
      
      throw new Error(`Failed to authenticate with GoCardless: ${error.message}`);
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

  // Force refresh authentication - useful when credentials are updated
  async refreshAuthentication(): Promise<void> {
    logger.info('Force refreshing GoCardless authentication');
    this.accessToken = null;
    this.tokenExpiresAt = null;
    
    // Clear the config cache to ensure fresh credentials
    await integrationConfigService.clearCache('gocardless');
    
    // Re-initialize the service to pick up any URL changes
    await this.initializeService();
    
    await this.authenticate();
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
            'SELECT id FROM financial.transactions WHERE transaction_id = $1',
            [gcTransaction.transactionId]
          );

          if (existingTransaction.rows.length > 0) {
            continue; // Skip if already exists
          }

          // Create transaction in database
          const transaction = await this.db.createTransaction({
            transactionId: gcTransaction.transactionId,  // Required field for unique identifier
            accountId: dbAccountId,
            type: 'bank_transfer',
            status: gcTransaction.bookingDate ? 'confirmed' : 'pending',
            amount: gcTransaction.transactionAmount.amount,
            currencyId: eurCurrency.id,
            description: gcTransaction.remittanceInformationUnstructured || 'Bank transaction',
            reference: gcTransaction.transactionId,  // Also store in reference for backwards compatibility
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
      // Always use real BBVA institution
      const institutionId = 'BBVA_BBVAESMM';
      const reference = `bbva-setup-${Date.now()}`;
      
      console.log(`Setting up BBVA account with institution: ${institutionId}`);
      
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
          message: 'Visit the consent URL to authorize access to your BBVA account',
          nextSteps: 'After consent, call completeSetup with the requisition ID'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup BBVA account'
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
  // RATE LIMIT MANAGEMENT
  // ============================================================================

  private async checkRateLimit(accountId: string, endpointType: string): Promise<{
    canSync: boolean;
    callsRemaining: number;
    windowResetAt: Date;
    retryAfter?: Date;
  }> {
    try {
      const result = await this.db.query(
        'SELECT * FROM financial.get_rate_limit_status($1, $2)',
        [accountId, endpointType]
      );
      
      const status = result.rows[0];
      return {
        canSync: status.can_sync,
        callsRemaining: status.calls_remaining,
        windowResetAt: new Date(status.window_reset_at),
        retryAfter: status.retry_after ? new Date(status.retry_after) : undefined
      };
    } catch (error) {
      logger.error('Failed to check rate limit', error);
      // Default to allowing sync if rate limit check fails
      return {
        canSync: true,
        callsRemaining: 4,
        windowResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    }
  }

  private async recordApiCall(accountId: string, endpointType: string, retryAfter?: Date): Promise<void> {
    try {
      await this.db.query(
        'SELECT financial.record_api_call($1, $2, $3)',
        [accountId, endpointType, retryAfter || null]
      );
    } catch (error) {
      logger.error('Failed to record API call', error);
    }
  }

  // ============================================================================
  // SPLIT SYNC OPERATIONS
  // ============================================================================

  async syncAccountDetails(accountId: string): Promise<FinancialApiResponse<Account>> {
    try {
      // Check rate limit
      const rateLimit = await this.checkRateLimit(accountId, 'accounts');
      if (!rateLimit.canSync) {
        const waitTime = rateLimit.retryAfter 
          ? Math.ceil((rateLimit.retryAfter.getTime() - Date.now()) / 1000 / 60)
          : Math.ceil((rateLimit.windowResetAt.getTime() - Date.now()) / 1000 / 60);
        
        return {
          success: false,
          error: `Rate limit exceeded. Please wait ${waitTime} minutes before syncing account details.`,
          metadata: {
            rateLimitInfo: rateLimit
          }
        };
      }

      // Get account details
      const accountDetails = await this.getAccountDetails(accountId);
      
      // Record API call
      await this.recordApiCall(accountId, 'accounts');
      
      // Update account details in database
      const account = await this.db.query(
        `UPDATE financial.accounts 
         SET metadata = metadata || $1::jsonb,
             last_sync = NOW()
         WHERE account_id = $2
         RETURNING *`,
        [
          JSON.stringify({
            account_details: accountDetails,
            last_sync_type: 'accounts',
            last_sync: new Date().toISOString()
          }),
          accountId
        ]
      );

      // Log sync operation
      await this.db.logSync({
        accountId: account.rows[0].id,
        status: 'success',
        syncedTransactions: 0,
        message: 'Account details synced successfully',
        operationType: 'accounts'
      });

      return {
        success: true,
        data: account.rows[0],
        metadata: {
          rateLimitInfo: {
            callsRemaining: rateLimit.callsRemaining - 1,
            windowResetAt: rateLimit.windowResetAt
          }
        }
      };
    } catch (error: any) {
      // Handle rate limit error
      if (error.response?.status === 429) {
        const retryAfter = this.parseRetryAfter(error.response);
        await this.recordApiCall(accountId, 'accounts', retryAfter);
        
        return {
          success: false,
          error: `GoCardless rate limit exceeded. Next sync available in ${Math.round((retryAfter.getTime() - Date.now()) / 1000 / 60 / 60)} hours.`,
          metadata: {
            retryAfter
          }
        };
      }

      logger.error('Failed to sync account details', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync account details'
      };
    }
  }

  async syncAccountBalances(accountId: string): Promise<FinancialApiResponse<{
    balance: string;
    currency: string;
  }>> {
    try {
      // Check rate limit
      const rateLimit = await this.checkRateLimit(accountId, 'balances');
      if (!rateLimit.canSync) {
        const waitTime = rateLimit.retryAfter 
          ? Math.ceil((rateLimit.retryAfter.getTime() - Date.now()) / 1000 / 60)
          : Math.ceil((rateLimit.windowResetAt.getTime() - Date.now()) / 1000 / 60);
        
        return {
          success: false,
          error: `Rate limit exceeded. Please wait ${waitTime} minutes before syncing balances.`,
          metadata: {
            rateLimitInfo: rateLimit
          }
        };
      }

      // Get balances
      const balances = await this.getAccountBalances(accountId);
      
      // Record API call
      await this.recordApiCall(accountId, 'balances');
      
      const currentBalance = balances[0]?.balanceAmount?.amount || '0';
      const currency = balances[0]?.balanceAmount?.currency || 'EUR';
      
      // Update balance in database
      await this.db.query(
        `UPDATE financial.accounts 
         SET balance = $1,
             metadata = metadata || $2::jsonb,
             last_sync = NOW()
         WHERE account_id = $3`,
        [
          currentBalance,
          JSON.stringify({
            last_balance_sync: new Date().toISOString(),
            last_sync_type: 'balances'
          }),
          accountId
        ]
      );

      // Get account ID for logging
      const account = await this.db.query(
        'SELECT id FROM financial.accounts WHERE account_id = $1',
        [accountId]
      );

      // Log sync operation
      await this.db.logSync({
        accountId: account.rows[0].id,
        status: 'success',
        syncedTransactions: 0,
        message: 'Account balance synced successfully',
        operationType: 'balances'
      });

      return {
        success: true,
        data: {
          balance: currentBalance,
          currency: currency
        },
        metadata: {
          rateLimitInfo: {
            callsRemaining: rateLimit.callsRemaining - 1,
            windowResetAt: rateLimit.windowResetAt
          }
        }
      };
    } catch (error: any) {
      // Handle rate limit error
      if (error.response?.status === 429) {
        const retryAfter = this.parseRetryAfter(error.response);
        await this.recordApiCall(accountId, 'balances', retryAfter);
        
        return {
          success: false,
          error: `GoCardless rate limit exceeded. Next sync available in ${Math.round((retryAfter.getTime() - Date.now()) / 1000 / 60 / 60)} hours.`,
          metadata: {
            retryAfter
          }
        };
      }

      logger.error('Failed to sync account balances', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync account balances'
      };
    }
  }

  async syncAccountTransactions(accountId: string, days = 7): Promise<FinancialApiResponse<{
    transactionsSynced: number;
  }>> {
    try {
      // Check rate limit
      const rateLimit = await this.checkRateLimit(accountId, 'transactions');
      if (!rateLimit.canSync) {
        const waitTime = rateLimit.retryAfter 
          ? Math.ceil((rateLimit.retryAfter.getTime() - Date.now()) / 1000 / 60)
          : Math.ceil((rateLimit.windowResetAt.getTime() - Date.now()) / 1000 / 60);
        
        return {
          success: false,
          error: `Rate limit exceeded. Please wait ${waitTime} minutes before syncing transactions.`,
          metadata: {
            rateLimitInfo: rateLimit
          }
        };
      }

      // Get account database ID
      const account = await this.db.query(
        'SELECT id FROM financial.accounts WHERE account_id = $1',
        [accountId]
      );

      if (account.rows.length === 0) {
        return {
          success: false,
          error: 'Account not found in database'
        };
      }

      const dbAccountId = account.rows[0].id;

      // Sync transactions
      const transactionCount = await this.syncTransactionsToDatabase(accountId, dbAccountId, days);
      
      // Record API call (syncTransactionsToDatabase already handles rate limit errors)
      await this.recordApiCall(accountId, 'transactions');

      // Log sync operation
      await this.db.logSync({
        accountId: dbAccountId,
        status: 'success',
        syncedTransactions: transactionCount,
        message: `Synced ${transactionCount} transactions from last ${days} days`,
        operationType: 'transactions'
      });

      return {
        success: true,
        data: {
          transactionsSynced: transactionCount
        },
        metadata: {
          rateLimitInfo: {
            callsRemaining: rateLimit.callsRemaining - 1,
            windowResetAt: rateLimit.windowResetAt
          }
        }
      };
    } catch (error: any) {
      // Handle rate limit error if thrown by syncTransactionsToDatabase
      if (error.message?.includes('rate limit exceeded')) {
        return {
          success: false,
          error: error.message
        };
      }

      logger.error('Failed to sync account transactions', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync account transactions'
      };
    }
  }

  private parseRetryAfter(response: any): Date {
    const retryAfterHeader = response.headers?.['retry-after'];
    const detailMessage = response.data?.detail;
    
    let retrySeconds = 3600; // Default 1 hour
    
    if (retryAfterHeader) {
      retrySeconds = parseInt(retryAfterHeader);
    } else if (detailMessage) {
      const match = detailMessage.match(/(\d+) seconds/);
      if (match) {
        retrySeconds = parseInt(match[1]);
      }
    }
    
    return new Date(Date.now() + retrySeconds * 1000);
  }

  // ============================================================================
  // PERIODIC SYNC
  // ============================================================================

  async performPeriodicSync(): Promise<FinancialApiResponse<{
    accountsSynced: number;
    transactionsSynced: number;
    balancesSynced: number;
    errors: string[];
  }>> {
    try {
      console.log('=== GOCARDLESS PERIODIC SYNC ===');
      console.log('Starting periodic sync of GoCardless accounts (balances and transactions only)...');
      
      // Get all active bank accounts
      const accounts = await this.db.query(`
        SELECT id, account_id, name, metadata->'last_sync' as last_sync
        FROM financial.accounts 
        WHERE type = 'bank_account' AND is_active = true AND account_id IS NOT NULL
      `);
      
      console.log(`Found ${accounts.rows.length} active bank accounts to sync`);

      let accountsSynced = 0;
      let totalTransactionsSynced = 0;
      let balancesSynced = 0;
      const errors: string[] = [];

      for (const account of accounts.rows) {
        try {
          console.log(`Syncing account: ${account.name} (${account.account_id})`);
          
          // Sync balance
          const balanceResult = await this.syncAccountBalances(account.account_id);
          if (balanceResult.success) {
            balancesSynced++;
            console.log(`✓ Balance synced for ${account.name}`);
          } else {
            console.error(`✗ Balance sync failed for ${account.name}: ${balanceResult.error}`);
            errors.push(`${account.name} balance: ${balanceResult.error}`);
          }
          
          // Sync transactions from last 7 days
          const transactionResult = await this.syncAccountTransactions(account.account_id, 7);
          if (transactionResult.success) {
            totalTransactionsSynced += transactionResult.data!.transactionsSynced;
            console.log(`✓ Transactions synced for ${account.name}: ${transactionResult.data!.transactionsSynced} new`);
          } else {
            console.error(`✗ Transaction sync failed for ${account.name}: ${transactionResult.error}`);
            errors.push(`${account.name} transactions: ${transactionResult.error}`);
          }

          accountsSynced++;
          
        } catch (error) {
          console.error(`Failed to sync account ${account.name}:`, error);
          errors.push(`${account.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log(`Periodic sync completed: ${accountsSynced} accounts processed, ${balancesSynced} balances synced, ${totalTransactionsSynced} transactions synced`);
      if (errors.length > 0) {
        console.log('Sync errors:', errors);
      }

      return {
        success: true,
        data: {
          accountsSynced,
          transactionsSynced: totalTransactionsSynced,
          balancesSynced,
          errors
        },
        metadata: {
          syncTime: new Date().toISOString(),
          accountsProcessed: accounts.rows.length,
          hasErrors: errors.length > 0
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

  private validateCredentialFormat(secretId: string | null, secretKey: string | null): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!secretId || !secretKey) {
      errors.push('Missing credentials');
      return { valid: false, errors };
    }
    
    // GoCardless secret_id is typically a UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(secretId)) {
      errors.push('Secret ID does not match expected UUID format');
    }
    
    // GoCardless secret_key can be 43 or 128 characters long
    if (secretKey.length !== 43 && secretKey.length !== 128) {
      errors.push(`Secret Key length is ${secretKey.length}, expected 43 or 128 characters`);
    }
    
    // Check for common issues
    if (secretId !== secretId.trim() || secretKey !== secretKey.trim()) {
      errors.push('Credentials contain whitespace');
    }
    
    return { valid: errors.length === 0, errors };
  }

  async hasCredentials(): Promise<boolean> {
    try {
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

      // Add rate limit info for each account
      for (const account of accounts.rows) {
        if (account.account_id) {
          const rateLimits = {
            accounts: await this.checkRateLimit(account.account_id, 'accounts'),
            balances: await this.checkRateLimit(account.account_id, 'balances'),
            transactions: await this.checkRateLimit(account.account_id, 'transactions')
          };
          account.rateLimits = rateLimits;
        }
      }

      return {
        success: true,
        data: accounts.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get account status'
      };
    }
  }

  async getRateLimitStatus(): Promise<FinancialApiResponse<any[]>> {
    try {
      const result = await this.db.query(`
        SELECT 
          rls.account_id,
          a.name as account_name,
          rls.endpoint_type,
          rls.calls_made,
          rls.calls_limit,
          rls.window_start,
          rls.window_end,
          rls.retry_after,
          rls.last_call_at,
          CASE 
            WHEN rls.calls_made >= rls.calls_limit THEN 'exhausted'
            WHEN rls.retry_after IS NOT NULL AND rls.retry_after > NOW() THEN 'rate_limited'
            ELSE 'available'
          END as status,
          GREATEST(0, rls.calls_limit - rls.calls_made) as calls_remaining
        FROM financial.rate_limit_status rls
        JOIN financial.accounts a ON a.account_id = rls.account_id
        WHERE NOW() BETWEEN rls.window_start AND rls.window_end
        ORDER BY a.name, rls.endpoint_type
      `);

      return {
        success: true,
        data: result.rows,
        metadata: {
          currentTime: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get rate limit status'
      };
    }
  }

}