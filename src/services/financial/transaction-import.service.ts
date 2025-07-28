import { PrismaClient } from '@prisma/client';
import { Logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = new Logger('TransactionImportService');
const prisma = new PrismaClient();

export interface ImportTransactionData {
  transaction_id?: string;
  amount: string;
  currency_id?: string;
  type?: string;
  status?: string;
  description?: string;
  reference?: string | null;
  counterparty_name?: string | null;
  counterparty_account?: string | null;
  date: string;
  metadata?: any;
  tags?: string[];
  fee_amount?: string | null;
  fee_currency_id?: string | null;
  gocardless_data?: any;
  transaction_hash?: string | null;
  block_number?: number | null;
  gas_used?: string | null;
  gas_price?: string | null;
  from_address?: string | null;
  to_address?: string | null;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  duplicates: Array<{ row: number; transaction_id: string }>;
}

export class TransactionImportService {
  /**
   * Resolve currency code to UUID
   * @param currencyIdOrCode - Either a UUID or currency code
   * @param cache - Cache map to avoid repeated lookups
   * @returns The currency UUID
   */
  private async resolveCurrencyId(
    currencyIdOrCode: string | undefined,
    cache: Map<string, string>
  ): Promise<string | undefined> {
    if (!currencyIdOrCode) return undefined;
    
    // Check if it's already a UUID (36 chars with dashes)
    if (currencyIdOrCode.length === 36 && currencyIdOrCode.includes('-')) {
      return currencyIdOrCode;
    }
    
    // Check cache first
    if (cache.has(currencyIdOrCode)) {
      return cache.get(currencyIdOrCode);
    }
    
    // Look up by code
    const currency = await prisma.currencies.findUnique({
      where: { code: currencyIdOrCode }
    });
    
    if (currency) {
      cache.set(currencyIdOrCode, currency.id);
      return currency.id;
    }
    
    // If not found, return the original value (might be a UUID we couldn't validate)
    return currencyIdOrCode;
  }

  /**
   * Import transactions from JSON data
   * @param accountId - The account ID to import transactions for
   * @param transactions - Array of transaction data
   * @param userId - The user performing the import
   * @returns ImportResult with statistics
   */
  async importTransactions(
    accountId: string,
    transactions: ImportTransactionData[],
    userId: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
      duplicates: []
    };

    try {
      logger.info(`Starting import of ${transactions.length} transactions for account ${accountId} by user ${userId}`);

      // First, verify the account exists
      const account = await prisma.accounts.findUnique({
        where: { id: accountId },
        include: { currencies: true }
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Cache for currency lookups
      const currencyCache = new Map<string, string>();

      // Process transactions in batches for performance
      const batchSize = 100;
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        
        // Process each transaction in the batch
        for (let j = 0; j < batch.length; j++) {
          const row = i + j + 1; // 1-indexed row number
          const transaction = batch[j];
          
          try {
            // Generate unique transaction_id if not provided
            const transactionId = transaction.transaction_id || `IMP_${accountId}_${Date.now()}_${row}`;
            
            // Check for duplicates
            const existing = await prisma.transactions.findUnique({
              where: { transaction_id: transactionId }
            });
            
            if (existing) {
              result.duplicates.push({ row, transaction_id: transactionId });
              result.skipped++;
              continue;
            }
            
            // Resolve currency IDs
            const currencyId = await this.resolveCurrencyId(transaction.currency_id, currencyCache) || account.currency_id;
            const feeCurrencyId = transaction.fee_currency_id ? await this.resolveCurrencyId(transaction.fee_currency_id, currencyCache) : undefined;
            
            // Create the transaction
            await prisma.transactions.create({
              data: {
                id: uuidv4(),
                transaction_id: transactionId,
                account_id: accountId,
                amount: transaction.amount,
                currency_id: currencyId,
                type: transaction.type || 'bank_transfer',
                status: transaction.status || 'confirmed',
                description: transaction.description || '',
                reference: transaction.reference,
                counterparty_name: transaction.counterparty_name,
                counterparty_account: transaction.counterparty_account,
                date: new Date(transaction.date),
                metadata: transaction.metadata || {},
                tags: transaction.tags || [],
                fee_amount: transaction.fee_amount,
                fee_currency_id: feeCurrencyId,
                gocardless_data: transaction.gocardless_data,
                transaction_hash: transaction.transaction_hash,
                block_number: transaction.block_number,
                gas_used: transaction.gas_used,
                gas_price: transaction.gas_price,
                from_address: transaction.from_address,
                to_address: transaction.to_address
              }
            });
            
            result.imported++;
            
          } catch (error) {
            logger.error(`Error importing transaction at row ${row}:`, error);
            result.errors.push({
              row,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            result.skipped++;
          }
        }
      }

      logger.info(`Import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);
      
      return result;
      
    } catch (error) {
      logger.error('Import failed:', error);
      throw error;
    }
  }

  /**
   * Validate transaction data before import
   * @param transactions - Array of transaction data
   * @returns Array of validation errors
   */
  validateTransactions(transactions: ImportTransactionData[]): Array<{ row: number; error: string }> {
    const errors: Array<{ row: number; error: string }> = [];
    
    transactions.forEach((transaction, index) => {
      const row = index + 1;
      
      // Required fields validation
      if (!transaction.amount) {
        errors.push({ row, error: 'Amount is required' });
      }
      
      if (!transaction.date) {
        errors.push({ row, error: 'Date is required' });
      } else {
        // Validate date format
        const date = new Date(transaction.date);
        if (isNaN(date.getTime())) {
          errors.push({ row, error: 'Invalid date format' });
        }
      }
      
      // Validate amount is a valid number
      if (transaction.amount && isNaN(parseFloat(transaction.amount))) {
        errors.push({ row, error: 'Invalid amount format' });
      }
    });
    
    return errors;
  }

  /**
   * Get user accounts for selection
   * @param userId - The user ID
   * @returns Array of user accounts
   */
  async getUserAccounts(userId: string) {
    // Note: This assumes we have a way to link accounts to users
    // For now, return all accounts (will need to be updated when user-account relation is added)
    return prisma.accounts.findMany({
      select: {
        id: true,
        account_id: true,
        name: true,
        type: true,
        institution: true,
        iban: true,
        currency_id: true,
        currencies: {
          select: {
            code: true,
            symbol: true
          }
        }
      }
    });
  }
}

// Export singleton instance
export const transactionImportService = new TransactionImportService();