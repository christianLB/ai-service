// GoCardless Service - Complete API Integration
import axios, { AxiosInstance } from 'axios';
import { 
  GoCardlessConfig, 
  GoCardlessAccount, 
  GoCardlessTransaction, 
  GoCardlessRequisition,
  FinancialApiResponse,
  Account,
  Transaction
} from './types';
import { FinancialDatabaseService } from './database.service';

export class GoCardlessService {
  private api: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private db: FinancialDatabaseService;

  constructor(
    private config: GoCardlessConfig,
    database: FinancialDatabaseService
  ) {
    this.db = database;
    this.api = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

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
        console.error('GoCardless API Error:', {
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
      const response = await axios.post(`${this.config.baseUrl}/token/new/`, {
        secret_id: this.config.secretId,
        secret_key: this.config.secretKey
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
      const response = await this.api.post('/requisitions/', {
        institution_id: institutionId,
        redirect: this.config.redirectUri,
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

      const response = await this.api.get(url);
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

      // Create account in database
      const account = await this.db.createAccount({
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
          // Check if transaction already exists
          const existingTransaction = await this.db.query(
            'SELECT id FROM financial.transactions WHERE reference = $1',
            [gcTransaction.transaction_id]
          );

          if (existingTransaction.rows.length > 0) {
            continue; // Skip if already exists
          }

          // Create transaction in database
          const transaction = await this.db.createTransaction({
            accountId: dbAccountId,
            type: 'bank_transfer',
            status: gcTransaction.booking_date ? 'confirmed' : 'pending',
            amount: gcTransaction.transaction_amount.amount,
            currencyId: eurCurrency.id,
            description: gcTransaction.remittance_information_unstructured || 'Bank transaction',
            reference: gcTransaction.transaction_id,
            date: new Date(gcTransaction.booking_date || gcTransaction.value_date),
            gocardlessData: gcTransaction,
            counterpartyName: gcTransaction.creditor_name || gcTransaction.debtor_name,
            counterpartyAccount: gcTransaction.creditor_account?.iban || gcTransaction.debtor_account?.iban,
            metadata: {
              internal_transaction_id: gcTransaction.internal_transaction_id,
              bank_transaction_code: gcTransaction.bank_transaction_code,
              additional_information: gcTransaction.additional_information,
              sync_date: new Date().toISOString(),
              sync_batch: `initial-${days}days`
            }
          });

          syncedCount++;
          
          if (syncedCount % 10 === 0) {
            console.log(`Synced ${syncedCount}/${transactions.length} transactions`);
          }
        } catch (error) {
          console.error('Failed to sync individual transaction:', gcTransaction.transaction_id, error);
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
      // Create requisition for BBVA Spain
      const requisition = await this.createRequisition('BBVA_BBVAESMM', `bbva-setup-${Date.now()}`);
      
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
        data: accounts.rows
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get account status'
      };
    }
  }
}