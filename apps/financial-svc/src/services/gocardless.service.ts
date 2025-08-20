import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

// Initialize Prisma client configured for financial schema
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// GoCardless API types
type GcAccount = {
  id: string;
  iban?: string | null;
  currency?: string | null;
  name?: string | null;
  institution_id?: string | null;
  created?: string | null;
};

type GcTransaction = {
  id: string;
  amount: { value: string; currency: string };
  description?: string | null;
  booking_date?: string | null; // YYYY-MM-DD
  value_date?: string | null;
  status?: string | null;
  creditorName?: string | null;
  debtorName?: string | null;
  remittanceInformationUnstructured?: string | null;
};

type GcCredentials = {
  baseUrl: string;
  secretId: string;
  secretKey: string;
};

export class GoCardlessService {
  /**
   * Get GoCardless credentials from database
   */
  private async getCredentials(): Promise<{ baseUrl: string; accessToken: string }> {
    try {
      // Get credentials from integration_configs table
      const rows = await prisma.$queryRaw<Array<{ config_key: string; config_value: string }>>`
        SELECT config_key, config_value
        FROM financial.integration_configs
        WHERE integration_type = 'gocardless' AND is_global = true
      `;

      const configMap = new Map<string, string>(
        rows.map(r => [r.config_key, r.config_value])
      );

      const secretId = configMap.get('secret_id') || configMap.get('SECRET_ID');
      const secretKey = configMap.get('secret_key') || configMap.get('SECRET_KEY');
      const baseUrl = configMap.get('base_url') || 'https://bankaccountdata.gocardless.com/api/v2';

      if (!secretId || !secretKey) {
        throw new Error('GoCardless credentials not configured in integration configs');
      }

      // Get access token
      const accessToken = await this.getAccessToken(baseUrl, secretId, secretKey);

      return { baseUrl, accessToken };
    } catch (error) {
      console.error('Error getting GoCardless credentials:', error);
      throw error;
    }
  }

  /**
   * Exchange secret_id/secret_key for an access token
   */
  private async getAccessToken(baseUrl: string, secretId: string, secretKey: string): Promise<string> {
    const url = `${baseUrl}/token/new`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
    });

    if (!res.ok) {
      const text = await res.text();
      const error = new Error(`GoCardless token error ${res.status}: ${text}`);
      (error as any).statusCode = res.status;
      throw error;
    }

    const data = await res.json() as { access?: string };
    if (!data.access) {
      const error = new Error('Missing access token in GoCardless response');
      (error as any).statusCode = 502;
      throw error;
    }

    return data.access;
  }

  /**
   * Make authenticated requests to GoCardless API
   */
  private async gcFetch<T>(baseUrl: string, accessToken: string, path: string, init?: RequestInit): Promise<T> {
    if (!accessToken) {
      const error = new Error("GoCardless access token not configured");
      (error as any).statusCode = 400;
      throw error;
    }

    const url = `${baseUrl}${path}`;
    const res = await fetch(url, {
      ...(init || {}),
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      const error = new Error(`GoCardless API ${res.status}: ${text}`);
      (error as any).statusCode = res.status;
      throw error;
    }

    return res.json() as Promise<T>;
  }

  /**
   * List accounts from GoCardless
   */
  async listAccounts(): Promise<GcAccount[]> {
    try {
      const { baseUrl, accessToken } = await this.getCredentials();
      const data = await this.gcFetch<{ results: GcAccount[] }>(baseUrl, accessToken, `/accounts/`);
      return data.results || [];
    } catch (error) {
      console.error('Error listing GoCardless accounts:', error);
      throw error;
    }
  }

  /**
   * List transactions for a specific account from GoCardless
   */
  async listTransactions(accountId: string): Promise<GcTransaction[]> {
    try {
      const { baseUrl, accessToken } = await this.getCredentials();
      const data = await this.gcFetch<{ results: GcTransaction[] }>(
        baseUrl, 
        accessToken, 
        `/accounts/${encodeURIComponent(accountId)}/transactions/`
      );
      return data.results || [];
    } catch (error) {
      console.error('Error listing GoCardless transactions:', error);
      throw error;
    }
  }

  /**
   * Sync accounts from GoCardless to local database
   */
  async syncAccounts(): Promise<{ success: boolean; count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      const accounts = await this.listAccounts();

      for (const gcAccount of accounts) {
        try {
          // Try to find existing account by GoCardless account ID
          const existing = await prisma.accounts.findFirst({
            where: { account_id: gcAccount.id },
          });

          if (existing) {
            // Update existing account
            await prisma.accounts.update({
              where: { id: existing.id },
              data: {
                name: gcAccount.name ?? existing.name,
                institution: gcAccount.institution_id ?? existing.institution,
                iban: gcAccount.iban ?? existing.iban,
                updated_at: new Date(),
              },
            });
          } else {
            // Create new account
            await prisma.accounts.create({
              data: {
                id: randomUUID(),
                account_id: gcAccount.id,
                name: gcAccount.name ?? "GoCardless Account",
                type: "checking",
                institution: gcAccount.institution_id ?? "gocardless",
                iban: gcAccount.iban ?? null,
                created_at: gcAccount.created ? new Date(gcAccount.created) : new Date(),
              },
            });
          }
          count++;
        } catch (error) {
          const errorMsg = `Failed to sync account ${gcAccount.id}: ${(error as Error).message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return { success: true, count, errors };
    } catch (error) {
      console.error('Error syncing GoCardless accounts:', error);
      return { 
        success: false, 
        count: 0, 
        errors: [`Failed to sync accounts: ${(error as Error).message}`] 
      };
    }
  }

  /**
   * Sync transactions from GoCardless for a specific account
   */
  async syncTransactions(accountId: string): Promise<{ success: boolean; count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      // Ensure the account exists in our database
      let localAccount = await prisma.accounts.findFirst({
        where: { account_id: accountId },
      });

      if (!localAccount) {
        // Create a placeholder account
        localAccount = await prisma.accounts.create({
          data: {
            id: randomUUID(),
            account_id: accountId,
            name: "GoCardless Account",
            type: "checking",
            institution: "gocardless",
            created_at: new Date(),
          },
        });
      }

      // Fetch transactions from GoCardless
      const gcTransactions = await this.listTransactions(accountId);

      for (const gcTx of gcTransactions) {
        try {
          const bookingDate = gcTx.booking_date || gcTx.value_date || undefined;
          const amountNum = Number(gcTx.amount?.value ?? 0);
          const description = gcTx.remittanceInformationUnstructured ?? gcTx.description ?? null;
          const counterparty = gcTx.creditorName || gcTx.debtorName || null;

          // Check if transaction already exists
          const existing = await prisma.transactions.findFirst({
            where: { transaction_id: gcTx.id },
          });

          if (existing) {
            // Update existing transaction
            await prisma.transactions.update({
              where: { id: existing.id },
              data: {
                account_id: localAccount.account_id,
                amount: new Prisma.Decimal(isFinite(amountNum) ? amountNum : 0),
                description,
                counterparty_name: counterparty,
                date: bookingDate ? new Date(bookingDate) : new Date(),
                status: gcTx.status ?? existing.status,
                gocardless_data: gcTx as unknown as Prisma.InputJsonValue,
                updated_at: new Date(),
              },
            });
          } else {
            // Create new transaction
            await prisma.transactions.create({
              data: {
                id: randomUUID(),
                transaction_id: gcTx.id,
                account_id: localAccount.account_id,
                amount: new Prisma.Decimal(isFinite(amountNum) ? amountNum : 0),
                type: amountNum >= 0 ? "credit" : "debit",
                status: gcTx.status ?? "booked",
                description,
                counterparty_name: counterparty,
                date: bookingDate ? new Date(bookingDate) : new Date(),
                gocardless_data: gcTx as unknown as Prisma.InputJsonValue,
                created_at: new Date(),
              },
            });
          }
          count++;
        } catch (error) {
          const errorMsg = `Failed to sync transaction ${gcTx.id}: ${(error as Error).message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return { success: true, count, errors };
    } catch (error) {
      console.error('Error syncing GoCardless transactions:', error);
      return { 
        success: false, 
        count: 0, 
        errors: [`Failed to sync transactions: ${(error as Error).message}`] 
      };
    }
  }

  /**
   * Full sync: sync all accounts and their transactions
   */
  async fullSync(): Promise<{
    success: boolean;
    accountsCount: number;
    transactionsCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let accountsCount = 0;
    let transactionsCount = 0;

    try {
      // First sync accounts
      const accountsResult = await this.syncAccounts();
      accountsCount = accountsResult.count;
      errors.push(...accountsResult.errors);

      // Then sync transactions for each account
      const accounts = await this.listAccounts();
      
      for (const account of accounts) {
        try {
          const transactionsResult = await this.syncTransactions(account.id);
          transactionsCount += transactionsResult.count;
          errors.push(...transactionsResult.errors);
        } catch (error) {
          const errorMsg = `Failed to sync transactions for account ${account.id}: ${(error as Error).message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: true,
        accountsCount,
        transactionsCount,
        errors,
      };
    } catch (error) {
      console.error('Error during full GoCardless sync:', error);
      return {
        success: false,
        accountsCount: 0,
        transactionsCount: 0,
        errors: [`Full sync failed: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Test GoCardless connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const accounts = await this.listAccounts();
      
      return {
        success: true,
        message: `Successfully connected to GoCardless. Found ${accounts.length} accounts.`,
        data: {
          accountCount: accounts.length,
          accounts: accounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            institution: acc.institution_id,
            iban: acc.iban,
          })),
        },
      };
    } catch (error) {
      console.error('Error testing GoCardless connection:', error);
      return {
        success: false,
        message: `GoCardless connection failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalAccounts: number;
    totalTransactions: number;
    lastSyncDate?: Date;
    accountsWithTransactions: number;
  }> {
    try {
      const [
        totalAccounts,
        totalTransactions,
        accountsWithTransactions,
        lastSyncLog,
      ] = await Promise.all([
        prisma.accounts.count({
          where: { institution: "gocardless" },
        }),
        prisma.transactions.count({
          where: { gocardless_data: { not: undefined } },
        }),
        prisma.accounts.count({
          where: {
            institution: "gocardless",
            account_id: {
              in: await prisma.transactions.findMany({
                where: { gocardless_data: { not: undefined } },
                select: { account_id: true },
                distinct: ['account_id'],
              }).then(accounts => accounts.map(a => a.account_id)),
            },
          },
        }),
        prisma.sync_logs.findFirst({
          where: { operation_type: "gocardless_sync" },
          orderBy: { created_at: 'desc' },
        }),
      ]);

      return {
        totalAccounts,
        totalTransactions,
        lastSyncDate: lastSyncLog?.created_at || undefined,
        accountsWithTransactions,
      };
    } catch (error) {
      console.error('Error getting sync stats:', error);
      throw new Error('Failed to get sync statistics');
    }
  }

  /**
   * Log sync operation
   */
  private async logSyncOperation(
    operation: string,
    success: boolean,
    details: {
      accountsCount?: number;
      transactionsCount?: number;
      errors?: string[];
      duration?: number;
    }
  ) {
    try {
      await prisma.sync_logs.create({
        data: {
          operation_type: operation,
          success,
          accounts_synced: details.accountsCount || 0,
          transactions_synced: details.transactionsCount || 0,
          sync_duration_ms: details.duration,
          error: details.errors?.join('; ') || null,
          message: success 
            ? `Sync completed: ${details.accountsCount || 0} accounts, ${details.transactionsCount || 0} transactions`
            : `Sync failed: ${details.errors?.join('; ')}`,
        },
      });
    } catch (error) {
      console.error('Error logging sync operation:', error);
    }
  }
}

// Export singleton instance
export const goCardlessService = new GoCardlessService();