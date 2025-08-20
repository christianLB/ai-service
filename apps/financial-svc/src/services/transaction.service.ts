import { PrismaClient, Prisma } from '@prisma/client';
import type { transactions } from '@prisma/client';

// Initialize Prisma client configured for financial schema
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export interface TransactionData {
  transaction_id: string;
  account_id: string;
  amount: number;
  currency_id?: string;
  type: string;
  status?: string;
  description?: string;
  reference?: string;
  counterparty_name?: string;
  counterparty_account?: string;
  date: Date | string;
  metadata?: any;
  tags?: string[];
  fee_amount?: number;
  fee_currency_id?: string;
  gocardless_data?: any;
  transaction_hash?: string;
  block_number?: number;
  gas_used?: string;
  gas_price?: string;
  from_address?: string;
  to_address?: string;
}

export interface TransactionQuery {
  accountId?: string;
  type?: string;
  status?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class TransactionService {
  /**
   * Get all transactions with pagination and filtering
   */
  async getTransactions(params: TransactionQuery = {}) {
    const {
      accountId,
      type,
      status,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      search,
      limit = 20,
      offset = 0,
      sortBy = 'date',
      sortOrder = 'DESC',
    } = params;

    try {
      // Build where clause
      const where: Prisma.transactionsWhereInput = {
        ...(accountId && { account_id: accountId }),
        ...(type && { type }),
        ...(status && { status }),
        ...(dateFrom || dateTo ? {
          date: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        } : {}),
        ...(minAmount !== undefined || maxAmount !== undefined ? {
          amount: {
            ...(minAmount !== undefined && { gte: new Prisma.Decimal(minAmount) }),
            ...(maxAmount !== undefined && { lte: new Prisma.Decimal(maxAmount) }),
          },
        } : {}),
        ...(search && {
          OR: [
            { description: { contains: search, mode: 'insensitive' } },
            { counterparty_name: { contains: search, mode: 'insensitive' } },
            { reference: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      // Get total count
      const total = await prisma.transactions.count({ where });

      // Get transactions
      const transactions = await prisma.transactions.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() as any },
        include: {
          currencies_transactions_currency_idTocurrencies: {
            select: { code: true, symbol: true, name: true },
          },
          currencies_transactions_fee_currency_idTocurrencies: {
            select: { code: true, symbol: true, name: true },
          },
          transaction_categorizations: {
            include: {
              categories: {
                select: { id: true, name: true, type: true, color: true, icon: true },
              },
            },
          },
          client_transaction_links: {
            select: {
              client_id: true,
              match_type: true,
              match_confidence: true,
              matched_at: true,
            },
          },
        },
      });

      // Calculate summary statistics
      const [totalIncome, totalExpenses] = await Promise.all([
        prisma.transactions.aggregate({
          where: { ...where, type: 'credit' },
          _sum: { amount: true },
        }),
        prisma.transactions.aggregate({
          where: { ...where, type: 'debit' },
          _sum: { amount: true },
        }),
      ]);

      return {
        success: true,
        data: {
          transactions: transactions.map(t => ({
            ...t,
            amount: Number(t.amount),
            fee_amount: t.fee_amount ? Number(t.fee_amount) : null,
            currency: t.currencies_transactions_currency_idTocurrencies?.code,
            fee_currency: t.currencies_transactions_fee_currency_idTocurrencies?.code,
          })),
          total,
          limit,
          offset,
          summary: {
            totalIncome: totalIncome._sum.amount ? Number(totalIncome._sum.amount) : 0,
            totalExpenses: totalExpenses._sum.amount ? Number(totalExpenses._sum.amount) : 0,
          },
        },
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  /**
   * Get a single transaction by ID
   */
  async getTransactionById(transactionId: string) {
    try {
      const transaction = await prisma.transactions.findUnique({
        where: { id: transactionId },
        include: {
          currencies_transactions_currency_idTocurrencies: {
            select: { code: true, symbol: true, name: true },
          },
          currencies_transactions_fee_currency_idTocurrencies: {
            select: { code: true, symbol: true, name: true },
          },
          transaction_categorizations: {
            include: {
              categories: {
                select: { id: true, name: true, type: true, color: true, icon: true },
              },
            },
          },
          client_transaction_links: {
            select: {
              client_id: true,
              match_type: true,
              match_confidence: true,
              matched_at: true,
            },
          },
        },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return {
        success: true,
        data: {
          transaction: {
            ...transaction,
            amount: Number(transaction.amount),
            fee_amount: transaction.fee_amount ? Number(transaction.fee_amount) : null,
            currency: transaction.currencies_transactions_currency_idTocurrencies?.code,
            fee_currency: transaction.currencies_transactions_fee_currency_idTocurrencies?.code,
          },
        },
      };
    } catch (error) {
      console.error('Error fetching transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction by external transaction ID
   */
  async getTransactionByExternalId(transactionId: string) {
    try {
      const transaction = await prisma.transactions.findFirst({
        where: { transaction_id: transactionId },
        include: {
          currencies_transactions_currency_idTocurrencies: {
            select: { code: true, symbol: true, name: true },
          },
          transaction_categorizations: {
            include: {
              categories: {
                select: { id: true, name: true, type: true },
              },
            },
          },
        },
      });

      if (!transaction) {
        return null;
      }

      return {
        success: true,
        data: {
          transaction: {
            ...transaction,
            amount: Number(transaction.amount),
            fee_amount: transaction.fee_amount ? Number(transaction.fee_amount) : null,
            currency: transaction.currencies_transactions_currency_idTocurrencies?.code,
          },
        },
      };
    } catch (error) {
      console.error('Error fetching transaction by external ID:', error);
      throw new Error('Failed to fetch transaction');
    }
  }

  /**
   * Create a new transaction
   */
  async createTransaction(data: TransactionData) {
    try {
      // Check if transaction already exists
      const existing = await this.getTransactionByExternalId(data.transaction_id);
      if (existing) {
        throw new Error('Transaction with this ID already exists');
      }

      // Get or create currency
      let currencyId = data.currency_id;
      if (!currencyId && data.currency_id) {
        const currency = await prisma.currencies.findFirst({
          where: { code: data.currency_id },
        });
        currencyId = currency?.id;
      }

      const transaction = await prisma.transactions.create({
        data: {
          transaction_id: data.transaction_id,
          account_id: data.account_id,
          amount: new Prisma.Decimal(data.amount),
          currency_id: currencyId,
          type: data.type,
          status: data.status || 'confirmed',
          description: data.description,
          reference: data.reference,
          counterparty_name: data.counterparty_name,
          counterparty_account: data.counterparty_account,
          date: new Date(data.date),
          metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : {},
          tags: data.tags || [],
          fee_amount: data.fee_amount ? new Prisma.Decimal(data.fee_amount) : null,
          fee_currency_id: data.fee_currency_id,
          gocardless_data: data.gocardless_data ? JSON.parse(JSON.stringify(data.gocardless_data)) : null,
          transaction_hash: data.transaction_hash,
          block_number: data.block_number,
          gas_used: data.gas_used,
          gas_price: data.gas_price,
          from_address: data.from_address,
          to_address: data.to_address,
        },
        include: {
          currencies_transactions_currency_idTocurrencies: {
            select: { code: true, symbol: true, name: true },
          },
        },
      });

      console.log(`Transaction created: ${transaction.transaction_id}`);

      return {
        success: true,
        data: {
          transaction: {
            ...transaction,
            amount: Number(transaction.amount),
            fee_amount: transaction.fee_amount ? Number(transaction.fee_amount) : null,
            currency: transaction.currencies_transactions_currency_idTocurrencies?.code,
          },
        },
        message: 'Transaction created successfully',
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      if ((error as any).code === 'P2002') {
        throw new Error('Transaction with this ID already exists');
      }
      throw new Error('Failed to create transaction');
    }
  }

  /**
   * Update a transaction
   */
  async updateTransaction(transactionId: string, updates: Partial<TransactionData>) {
    try {
      // Check if transaction exists
      const existing = await this.getTransactionById(transactionId);
      if (!existing) {
        throw new Error('Transaction not found');
      }

      const transaction = await prisma.transactions.update({
        where: { id: transactionId },
        data: {
          ...(updates.amount !== undefined && { amount: new Prisma.Decimal(updates.amount) }),
          ...(updates.currency_id && { currency_id: updates.currency_id }),
          ...(updates.type && { type: updates.type }),
          ...(updates.status && { status: updates.status }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.reference !== undefined && { reference: updates.reference }),
          ...(updates.counterparty_name !== undefined && { counterparty_name: updates.counterparty_name }),
          ...(updates.counterparty_account !== undefined && { counterparty_account: updates.counterparty_account }),
          ...(updates.date && { date: new Date(updates.date) }),
          ...(updates.metadata && { metadata: JSON.parse(JSON.stringify(updates.metadata)) }),
          ...(updates.tags && { tags: updates.tags }),
          ...(updates.fee_amount !== undefined && { 
            fee_amount: updates.fee_amount ? new Prisma.Decimal(updates.fee_amount) : null 
          }),
          ...(updates.fee_currency_id && { fee_currency_id: updates.fee_currency_id }),
          ...(updates.gocardless_data && { 
            gocardless_data: JSON.parse(JSON.stringify(updates.gocardless_data)) 
          }),
          updated_at: new Date(),
        },
        include: {
          currencies_transactions_currency_idTocurrencies: {
            select: { code: true, symbol: true, name: true },
          },
        },
      });

      console.log(`Transaction updated: ${transactionId}`);

      return {
        success: true,
        data: {
          transaction: {
            ...transaction,
            amount: Number(transaction.amount),
            fee_amount: transaction.fee_amount ? Number(transaction.fee_amount) : null,
            currency: transaction.currencies_transactions_currency_idTocurrencies?.code,
          },
        },
        message: 'Transaction updated successfully',
      };
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(transactionId: string) {
    try {
      // Check if transaction exists
      const existing = await this.getTransactionById(transactionId);
      if (!existing) {
        throw new Error('Transaction not found');
      }

      await prisma.transactions.delete({
        where: { id: transactionId },
      });

      console.log(`Transaction deleted: ${transactionId}`);

      return {
        success: true,
        message: 'Transaction deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  /**
   * Get transactions by account
   */
  async getTransactionsByAccount(accountId: string, params: Omit<TransactionQuery, 'accountId'> = {}) {
    return this.getTransactions({ ...params, accountId });
  }

  /**
   * Get transaction statistics by account
   */
  async getTransactionStatsByAccount(accountId: string, params?: {
    startDate?: Date | string;
    endDate?: Date | string;
    currency?: string;
  }) {
    try {
      const { startDate, endDate, currency } = params || {};

      const where: Prisma.transactionsWhereInput = {
        account_id: accountId,
        ...(startDate || endDate ? {
          date: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
          },
        } : {}),
        ...(currency && {
          currencies_transactions_currency_idTocurrencies: {
            code: currency,
          },
        }),
      };

      const [
        totalTransactions,
        incomeStats,
        expenseStats,
        typeCounts,
        statusCounts,
      ] = await Promise.all([
        // Total count
        prisma.transactions.count({ where }),

        // Income statistics
        prisma.transactions.aggregate({
          where: { ...where, type: 'credit' },
          _count: { id: true },
          _sum: { amount: true },
          _avg: { amount: true },
        }),

        // Expense statistics
        prisma.transactions.aggregate({
          where: { ...where, type: 'debit' },
          _count: { id: true },
          _sum: { amount: true },
          _avg: { amount: true },
        }),

        // Count by type
        prisma.transactions.groupBy({
          by: ['type'],
          where,
          _count: { id: true },
          _sum: { amount: true },
        }),

        // Count by status
        prisma.transactions.groupBy({
          by: ['status'],
          where,
          _count: { id: true },
        }),
      ]);

      return {
        success: true,
        data: {
          overview: {
            totalTransactions,
            totalIncome: incomeStats._sum.amount ? Number(incomeStats._sum.amount) : 0,
            totalExpenses: expenseStats._sum.amount ? Number(expenseStats._sum.amount) : 0,
            avgIncome: incomeStats._avg.amount ? Number(incomeStats._avg.amount) : 0,
            avgExpense: expenseStats._avg.amount ? Number(expenseStats._avg.amount) : 0,
            incomeTransactions: incomeStats._count.id,
            expenseTransactions: expenseStats._count.id,
          },
          breakdowns: {
            byType: typeCounts.map(item => ({
              type: item.type,
              count: item._count.id,
              total: item._sum.amount ? Number(item._sum.amount) : 0,
            })),
            byStatus: statusCounts.map(item => ({
              status: item.status || 'unknown',
              count: item._count.id,
            })),
          },
        },
      };
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
      throw new Error('Failed to fetch transaction statistics');
    }
  }

  /**
   * Bulk create transactions
   */
  async bulkCreateTransactions(transactions: TransactionData[]) {
    try {
      const results = [];
      const errors = [];

      for (const transactionData of transactions) {
        try {
          const result = await this.createTransaction(transactionData);
          results.push(result.data.transaction);
        } catch (error) {
          errors.push({
            transaction_id: transactionData.transaction_id,
            error: (error as Error).message,
          });
        }
      }

      console.log(`Bulk created ${results.length} transactions, ${errors.length} errors`);

      return {
        success: true,
        data: {
          created: results,
          errors,
          summary: {
            total: transactions.length,
            created: results.length,
            failed: errors.length,
          },
        },
      };
    } catch (error) {
      console.error('Error bulk creating transactions:', error);
      throw new Error('Failed to bulk create transactions');
    }
  }

  /**
   * Export transactions to CSV format
   */
  async exportTransactions(params: TransactionQuery = {}, format: 'csv' | 'json' = 'csv') {
    try {
      const { data } = await this.getTransactions({ ...params, limit: 10000 });

      if (format === 'json') {
        return {
          success: true,
          data: data.transactions,
          format: 'json',
        };
      }

      // CSV format
      const headers = [
        'Date',
        'Description',
        'Amount',
        'Currency',
        'Type',
        'Status',
        'Reference',
        'Counterparty',
        'Account ID',
      ];

      const rows = data.transactions.map(t => [
        t.date.toISOString().split('T')[0],
        t.description || '',
        t.amount.toString(),
        t.currency || 'EUR',
        t.type,
        t.status || 'confirmed',
        t.reference || '',
        t.counterparty_name || '',
        t.account_id,
      ]);

      const csv = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return {
        success: true,
        data: csv,
        format: 'csv',
        contentType: 'text/csv',
        filename: `transactions_${new Date().toISOString().split('T')[0]}.csv`,
      };
    } catch (error) {
      console.error('Error exporting transactions:', error);
      throw new Error('Failed to export transactions');
    }
  }
}

// Export singleton instance
export const transactionService = new TransactionService();