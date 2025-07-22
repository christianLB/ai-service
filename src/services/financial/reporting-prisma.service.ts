// Financial Reporting & Analytics Service with Prisma
// Provides intelligent categorization and real-time financial metrics

import { prisma } from '../../lib/prisma';
import type { Prisma } from '../../lib/prisma';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';
import { aiCategorizationPrismaService } from './ai-categorization-prisma.service';

export interface CategoryType {
  type: 'income' | 'expense' | 'transfer';
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  type: 'income' | 'expense' | 'transfer';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionCategorization {
  id: string;
  transactionId: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  method: string;
  confidenceScore?: number | null;
  aiTagId?: string | null;
  userConfirmed?: boolean | null;
  userCorrectedCategoryId?: string | null;
  userCorrectedSubcategoryId?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportQueryParams {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  subcategoryId?: string;
  accountId?: string;
  currency?: string;
  limit?: number;
  offset?: number;
}

export interface MetricsQueryParams {
  currency?: string;
  period?: 'month' | 'quarter' | 'year';
}

export interface FinancialReport {
  period: {
    start: Date;
    end: Date;
    type: 'month' | 'quarter' | 'year' | 'custom';
  };
  summary: {
    totalIncome: string;
    totalExpenses: string;
    netAmount: string;
    transactionCount: number;
  };
  byCategory: {
    income: CategoryReportItem[];
    expenses: CategoryReportItem[];
    transfers: CategoryReportItem[];
  };
  trends: {
    monthlyIncome: MonthlyTrend[];
    monthlyExpenses: MonthlyTrend[];
    topCategories: TopCategoryItem[];
  };
  currency: string;
  generatedAt: Date;
}

export interface CategoryReportItem {
  categoryId: string;
  categoryName: string;
  amount: string;
  percentage: number;
  transactionCount: number;
  subcategories?: SubcategoryReportItem[];
}

export interface SubcategoryReportItem {
  subcategoryId: string;
  subcategoryName: string;
  amount: string;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyTrend {
  month: Date;
  amount: string;
  transactionCount: number;
}

export interface TopCategoryItem {
  categoryId: string;
  categoryName: string;
  amount: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface RealtimeMetrics {
  currentMonth: PeriodMetrics;
  previousMonth: PeriodMetrics;
  trends: {
    incomeChange: number;
    expenseChange: number;
    balanceChange: number;
  };
  topExpenseCategories: TopCategoryItem[];
  recentTransactions: CategorizedTransaction[];
  alerts: FinancialAlert[];
  updatedAt: Date;
}

export interface PeriodMetrics {
  income: string;
  expenses: string;
  balance: string;
  transactionCount: number;
}

export interface CategorizedTransaction {
  id: string;
  accountId: string;
  accountName?: string;
  type: string;
  amount: string;
  currencyId: string;
  currencyCode: string;
  description?: string | null;
  counterpartyName?: string | null;
  date: Date;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryType?: string | null;
  categoryColor?: string | null;
  categoryIcon?: string | null;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  categorizationMethod?: string | null;
  confidenceScore?: number | null;
  userConfirmed?: boolean | null;
  createdAt: Date;
}

export interface FinancialAlert {
  id: string;
  type: 'overspend' | 'unusual' | 'recurring' | 'goal';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  categoryId?: string;
  amount?: string;
  createdAt: Date;
}

export interface CategorySummary {
  month: Date;
  categoryId: string;
  categoryName: string;
  categoryType: string;
  currencyCode: string;
  transactionCount: number;
  totalAmount: string;
  avgAmount: string;
  minAmount: string;
  maxAmount: string;
}

export interface AccountInsights {
  id: string;
  name: string;
  balance: string;
  currencyCode: string;
  transactions30d: number;
  income30d: string;
  expenses30d: string;
}

export class FinancialReportingPrismaService {
  // ============================================================================
  // CATEGORIZATION SERVICES
  // ============================================================================

  /**
   * Get all categories with optional filtering
   */
  async getCategories(type?: 'income' | 'expense' | 'transfer'): Promise<Category[]> {
    try {
      const categories = await prisma.categories.findMany({
        where: {
          is_active: true,
          ...(type && { type })
        },
        orderBy: [
          { type: 'asc' },
          { name: 'asc' }
        ]
      });

      return categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        color: cat.color,
        icon: cat.icon,
        type: cat.type as 'income' | 'expense' | 'transfer',
        isActive: cat.is_active,
        createdAt: cat.created_at,
        updatedAt: cat.updated_at
      }));
    } catch (error) {
      logger.error('Failed to get categories:', error);
      throw new AppError('Failed to get categories', 500);
    }
  }

  /**
   * Get subcategories for a category
   */
  async getSubcategories(categoryId: string): Promise<Subcategory[]> {
    try {
      const subcategories = await prisma.subcategories.findMany({
        where: {
          category_id: categoryId,
          is_active: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      return subcategories.map(sub => ({
        id: sub.id,
        categoryId: sub.category_id,
        name: sub.name,
        description: sub.description,
        isActive: sub.is_active,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at
      }));
    } catch (error) {
      logger.error('Failed to get subcategories:', error);
      throw new AppError('Failed to get subcategories', 500);
    }
  }

  /**
   * Auto-categorize transactions using AI tags
   */
  async autoCategorizeTransactions(transactionIds?: string[]): Promise<number> {
    try {
      // Get uncategorized transactions
      const uncategorized = await prisma.transactions.findMany({
        where: {
          ...(transactionIds?.length && { id: { in: transactionIds } }),
          transaction_categorizations: {
            none: {}
          }
        },
        orderBy: {
          date: 'desc'
        }
      });

      let categorizedCount = 0;

      // Process each uncategorized transaction
      for (const transaction of uncategorized) {
        const result = await aiCategorizationPrismaService.categorizeTransaction({
          id: transaction.id,
          description: transaction.description,
          counterpartyName: transaction.counterparty_name,
          amount: transaction.amount,
          date: transaction.date,
          accountId: transaction.account_id
        });
        
        if (result) {
          await this.categorizeTransaction(
            transaction.id,
            result.categoryId,
            result.subcategoryId,
            'ai_auto',
            result.confidence,
            result.aiTagId
          );
          categorizedCount++;
        }
      }

      return categorizedCount;
    } catch (error) {
      logger.error('Failed to auto-categorize transactions:', error);
      throw new AppError('Failed to auto-categorize transactions', 500);
    }
  }

  /**
   * Manually categorize a transaction
   */
  async categorizeTransaction(
    transactionId: string,
    categoryId?: string,
    subcategoryId?: string,
    method: string = 'manual',
    confidenceScore?: number,
    aiTagId?: string,
    notes?: string
  ): Promise<TransactionCategorization> {
    try {
      const existing = await prisma.transaction_categorizations.findUnique({
        where: { transaction_id: transactionId }
      });

      const data: Prisma.transaction_categorizationsCreateInput = {
        transactions: { connect: { id: transactionId } },
        ...(categoryId && { categories: { connect: { id: categoryId } } }),
        ...(subcategoryId && { subcategories: { connect: { id: subcategoryId } } }),
        method,
        confidence_score: confidenceScore,
        ...(aiTagId && { ai_tags: { connect: { id: aiTagId } } }),
        notes
      };

      let result;
      if (existing) {
        result = await prisma.transaction_categorizations.update({
          where: { transaction_id: transactionId },
          data: {
            category_id: categoryId,
            subcategory_id: subcategoryId,
            method,
            confidence_score: confidenceScore,
            ai_tag_id: aiTagId,
            notes,
            updated_at: new Date()
          }
        });
      } else {
        result = await prisma.transaction_categorizations.create({ data });
      }

      return this.mapCategorizationRow(result);
    } catch (error) {
      logger.error('Failed to categorize transaction:', error);
      throw new AppError('Failed to categorize transaction', 500);
    }
  }

  // ============================================================================
  // REPORTING SERVICES
  // ============================================================================

  /**
   * Generate yearly financial report with income/expense matrix by category and month
   */
  async getYearlyFinancialReport(year: number, currency = 'EUR'): Promise<{
    year: number;
    currency: string;
    categories: {
      income: Array<{
        categoryId: string;
        categoryName: string;
        categoryColor: string;
        monthlyData: Record<string, string>;
        total: string;
        percentage: number;
      }>;
      expense: Array<{
        categoryId: string;
        categoryName: string;
        categoryColor: string;
        monthlyData: Record<string, string>;
        total: string;
        percentage: number;
      }>;
    };
    monthlyTotals: {
      income: Record<string, string>;
      expense: Record<string, string>;
      balance: Record<string, string>;
    };
    yearTotals: {
      income: string;
      expense: string;
      balance: string;
    };
  }> {
    try {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      // Get all transactions for the year grouped by category and month
      const transactions = await prisma.transactions.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          },
          currencies_transactionsTocurrencies: {
            code: currency
          },
          status: 'confirmed',
          transaction_categorizations: {
            some: {
              categories: {
                type: { in: ['income', 'expense'] }
              }
            }
          }
        },
        include: {
          transaction_categorizations: {
            include: {
              categories: true
            }
          }
        }
      });

      // Initialize data structures
      const incomeCategories = new Map<string, any>();
      const expenseCategories = new Map<string, any>();
      const monthlyIncomeTotals: Record<string, number> = {};
      const monthlyExpenseTotals: Record<string, number> = {};
      
      // Initialize monthly totals
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString();
        monthlyIncomeTotals[monthStr] = 0;
        monthlyExpenseTotals[monthStr] = 0;
      }

      // Process results
      for (const tx of transactions) {
        const categorization = tx.transaction_categorizations[0];
        if (!categorization || !categorization.categories) continue;

        const category = categorization.categories;
        const amount = tx.amount.toNumber();
        const month = (tx.date.getMonth() + 1).toString();
        const isIncome = category.type === 'income';
        
        // Get or create category
        const categories = isIncome ? incomeCategories : expenseCategories;
        if (!categories.has(category.id)) {
          categories.set(category.id, {
            categoryId: category.id,
            categoryName: category.name,
            categoryColor: category.color || '#000000',
            monthlyData: {},
            total: 0
          });
          
          // Initialize all months with zero
          for (let m = 1; m <= 12; m++) {
            categories.get(category.id).monthlyData[m.toString()] = '0.00';
          }
        }
        
        const categoryData = categories.get(category.id);
        categoryData.monthlyData[month] = Math.abs(amount).toFixed(2);
        categoryData.total += Math.abs(amount);
        
        // Update monthly totals
        if (isIncome) {
          monthlyIncomeTotals[month] += amount;
        } else {
          monthlyExpenseTotals[month] += Math.abs(amount);
        }
      }

      // Calculate year totals
      let yearIncomeTotal = 0;
      let yearExpenseTotal = 0;
      
      // Convert to arrays and calculate percentages
      const incomeCategoriesArray = Array.from(incomeCategories.values());
      const expenseCategoriesArray = Array.from(expenseCategories.values());
      
      // Calculate total for percentages
      incomeCategoriesArray.forEach(cat => {
        yearIncomeTotal += cat.total;
      });
      expenseCategoriesArray.forEach(cat => {
        yearExpenseTotal += cat.total;
      });
      
      // Add percentages and format totals
      incomeCategoriesArray.forEach(cat => {
        cat.percentage = yearIncomeTotal > 0 ? (cat.total / yearIncomeTotal) * 100 : 0;
        cat.total = cat.total.toFixed(2);
      });
      expenseCategoriesArray.forEach(cat => {
        cat.percentage = yearExpenseTotal > 0 ? (cat.total / yearExpenseTotal) * 100 : 0;
        cat.total = cat.total.toFixed(2);
      });
      
      // Sort by total amount descending
      incomeCategoriesArray.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
      expenseCategoriesArray.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
      
      // Calculate monthly balances
      const monthlyBalance: Record<string, string> = {};
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString();
        const balance = monthlyIncomeTotals[monthStr] - monthlyExpenseTotals[monthStr];
        monthlyBalance[monthStr] = balance.toFixed(2);
      }
      
      // Format monthly totals
      const formattedMonthlyIncome: Record<string, string> = {};
      const formattedMonthlyExpense: Record<string, string> = {};
      
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString();
        formattedMonthlyIncome[monthStr] = monthlyIncomeTotals[monthStr].toFixed(2);
        formattedMonthlyExpense[monthStr] = monthlyExpenseTotals[monthStr].toFixed(2);
      }

      return {
        year,
        currency,
        categories: {
          income: incomeCategoriesArray,
          expense: expenseCategoriesArray
        },
        monthlyTotals: {
          income: formattedMonthlyIncome,
          expense: formattedMonthlyExpense,
          balance: monthlyBalance
        },
        yearTotals: {
          income: yearIncomeTotal.toFixed(2),
          expense: yearExpenseTotal.toFixed(2),
          balance: (yearIncomeTotal - yearExpenseTotal).toFixed(2)
        }
      };
    } catch (error) {
      logger.error('Failed to generate yearly financial report:', error);
      throw new AppError('Failed to generate yearly financial report', 500);
    }
  }

  /**
   * Generate comprehensive financial report
   */
  async generateReport(params: ReportQueryParams): Promise<FinancialReport> {
    try {
      const { startDate, endDate, currency = 'EUR' } = params;
      
      // Default to current month if no dates provided
      const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

      // Determine period type
      const periodType = this.determinePeriodType(start, end);

      // Get summary data
      const summary = await this.getReportSummary(start, end, currency);
      
      // Get category breakdowns
      const byCategory = await this.getCategoryBreakdown(start, end, currency);
      
      // Get trends
      const trends = await this.getTrends(start, end, currency);

      return {
        period: {
          start,
          end,
          type: periodType
        },
        summary,
        byCategory,
        trends,
        currency,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to generate report:', error);
      throw new AppError('Failed to generate report', 500);
    }
  }

  /**
   * Get real-time financial metrics
   */
  async getRealtimeMetrics(params: MetricsQueryParams = {}): Promise<RealtimeMetrics> {
    try {
      const { currency = 'EUR', period = 'month' } = params;
      
      const now = new Date();
      const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get current month metrics
      const currentMonth = await this.getPeriodMetrics(currentStart, currentEnd, currency);
      
      // Get previous month metrics
      const previousMonth = await this.getPeriodMetrics(previousStart, previousEnd, currency);
      
      // Calculate trends
      const trends = this.calculateTrends(currentMonth, previousMonth);
      
      // Get top expense categories
      const topExpenseCategories = await this.getTopCategories(currentStart, currentEnd, 'expense', currency);
      
      // Get recent transactions
      const recentTransactions = await this.getRecentCategorizedTransactions(10, currency);
      
      // Get alerts
      const alerts = await this.getFinancialAlerts(currency);

      return {
        currentMonth,
        previousMonth,
        trends,
        topExpenseCategories,
        recentTransactions,
        alerts,
        updatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to get realtime metrics:', error);
      throw new AppError('Failed to get realtime metrics', 500);
    }
  }

  /**
   * Get categorized transactions with pagination
   */
  async getCategorizedTransactions(params: ReportQueryParams): Promise<{
    transactions: CategorizedTransaction[];
    total: number;
  }> {
    try {
      const {
        startDate,
        endDate,
        categoryId,
        subcategoryId,
        accountId,
        currency,
        limit = 50,
        offset = 0
      } = params;

      const whereClause: Prisma.transactionsWhereInput = {
        ...(startDate && { date: { gte: startDate } }),
        ...(endDate && { date: { lte: endDate } }),
        ...(accountId && { account_id: accountId }),
        ...(currency && { currencies_transactionsTocurrencies: { code: currency } }),
        ...(categoryId && {
          transaction_categorizations: {
            some: { category_id: categoryId }
          }
        }),
        ...(subcategoryId && {
          transaction_categorizations: {
            some: { subcategory_id: subcategoryId }
          }
        })
      };

      // Get transactions
      const [transactions, total] = await Promise.all([
        prisma.transactions.findMany({
          where: whereClause,
          include: {
            accounts: true,
            currencies_transactionsTocurrencies: true,
            transaction_categorizations: {
              include: {
                categories: true,
                subcategories: true
              }
            }
          },
          orderBy: { date: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.transactions.count({ where: whereClause })
      ]);

      return {
        transactions: transactions.map(tx => this.mapCategorizedTransaction(tx)),
        total
      };
    } catch (error) {
      logger.error('Failed to get categorized transactions:', error);
      throw new AppError('Failed to get categorized transactions', 500);
    }
  }

  /**
   * Get account insights
   */
  async getAccountInsights(): Promise<AccountInsights[]> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const accounts = await prisma.accounts.findMany({
        include: {
          currencies: true,
          transactions: {
            where: {
              date: { gte: thirtyDaysAgo },
              status: 'confirmed'
            },
            include: {
              transaction_categorizations: {
                include: {
                  categories: true
                }
              }
            }
          }
        }
      });

      return accounts.map(account => {
        const transactions30d = account.transactions.length;
        let income30d = 0;
        let expenses30d = 0;

        account.transactions.forEach(tx => {
          const amount = tx.amount.toNumber();
          const categorization = tx.transaction_categorizations[0];
          if (categorization?.categories?.type === 'income') {
            income30d += amount;
          } else if (categorization?.categories?.type === 'expense') {
            expenses30d += Math.abs(amount);
          }
        });

        return {
          id: account.id,
          name: account.name,
          balance: account.balance.toFixed(2),
          currencyCode: account.currencies?.code || 'EUR',
          transactions30d,
          income30d: income30d.toFixed(2),
          expenses30d: expenses30d.toFixed(2)
        };
      });
    } catch (error) {
      logger.error('Failed to get account insights:', error);
      throw new AppError('Failed to get account insights', 500);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getReportSummary(start: Date, end: Date, currency: string) {
    const transactions = await prisma.transactions.findMany({
      where: {
        date: { gte: start, lte: end },
        currencies_transactionsTocurrencies: { code: currency },
        status: 'confirmed'
      },
      include: {
        transaction_categorizations: {
          include: {
            categories: true
          }
        }
      }
    });
    
    let totalIncome = 0;
    let totalExpenses = 0;
    const transactionCount = transactions.length;

    transactions.forEach(tx => {
      const amount = tx.amount.toNumber();
      const categorization = tx.transaction_categorizations[0];
      if (categorization?.categories?.type === 'income') {
        totalIncome += amount;
      } else if (categorization?.categories?.type === 'expense') {
        totalExpenses += Math.abs(amount);
      }
    });

    const netAmount = totalIncome - totalExpenses;

    return {
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netAmount: netAmount.toFixed(2),
      transactionCount
    };
  }

  private async getCategoryBreakdown(start: Date, end: Date, currency: string) {
    const transactions = await prisma.transactions.findMany({
      where: {
        date: { gte: start, lte: end },
        currencies_transactionsTocurrencies: { code: currency },
        status: 'confirmed',
        transaction_categorizations: {
          some: {}
        }
      },
      include: {
        transaction_categorizations: {
          include: {
            categories: true,
            subcategories: true
          }
        }
      }
    });
    
    // Group by category type
    const income: CategoryReportItem[] = [];
    const expenses: CategoryReportItem[] = [];
    const transfers: CategoryReportItem[] = [];

    const categoryTotals = new Map<string, { amount: number; count: number }>();
    const categorySubcategories = new Map<string, SubcategoryReportItem[]>();

    // First pass: calculate totals and collect subcategories
    transactions.forEach(tx => {
      const categorization = tx.transaction_categorizations[0];
      if (!categorization || !categorization.categories) return;

      const category = categorization.categories;
      const amount = Math.abs(tx.amount.toNumber());
      const categoryId = category.id;

      // Update category totals
      if (!categoryTotals.has(categoryId)) {
        categoryTotals.set(categoryId, { amount: 0, count: 0 });
      }
      const totals = categoryTotals.get(categoryId)!;
      totals.amount += amount;
      totals.count += 1;

      // Add subcategory if exists
      if (categorization.subcategories) {
        if (!categorySubcategories.has(categoryId)) {
          categorySubcategories.set(categoryId, []);
        }
        const subcategories = categorySubcategories.get(categoryId)!;
        const existingSub = subcategories.find(s => s.subcategoryId === categorization.subcategories!.id);
        
        if (existingSub) {
          existingSub.amount = (parseFloat(existingSub.amount) + amount).toFixed(2);
          existingSub.transactionCount += 1;
        } else {
          subcategories.push({
            subcategoryId: categorization.subcategories.id,
            subcategoryName: categorization.subcategories.name,
            amount: amount.toFixed(2),
            percentage: 0, // Will calculate after totals
            transactionCount: 1
          });
        }
      }
    });

    // Calculate type totals for percentages
    const typeTotals = new Map<string, number>();
    transactions.forEach(tx => {
      const categorization = tx.transaction_categorizations[0];
      if (!categorization || !categorization.categories) return;
      
      const type = categorization.categories.type;
      const amount = Math.abs(tx.amount.toNumber());
      typeTotals.set(type, (typeTotals.get(type) || 0) + amount);
    });

    // Second pass: create category items
    const processedCategories = new Set<string>();
    const categories = await prisma.categories.findMany({
      where: { is_active: true }
    });

    categories.forEach(category => {
      const totals = categoryTotals.get(category.id);
      if (!totals || totals.amount === 0) return;
      
      const typeTotal = typeTotals.get(category.type) || 1;
      
      const categoryItem: CategoryReportItem = {
        categoryId: category.id,
        categoryName: category.name,
        amount: totals.amount.toFixed(2),
        percentage: (totals.amount / typeTotal) * 100,
        transactionCount: totals.count,
        subcategories: categorySubcategories.get(category.id) || []
      };

      // Update subcategory percentages
      if (categoryItem.subcategories) {
        categoryItem.subcategories.forEach(sub => {
          sub.percentage = (parseFloat(sub.amount) / totals.amount) * 100;
        });
      }

      // Add to appropriate array
      switch (category.type) {
        case 'income':
          income.push(categoryItem);
          break;
        case 'expense':
          expenses.push(categoryItem);
          break;
        case 'transfer':
          transfers.push(categoryItem);
          break;
      }
    });

    return { income, expenses, transfers };
  }

  private async getTrends(start: Date, end: Date, currency: string) {
    // Monthly income/expense trends using raw SQL for date truncation
    const trendsResult = await prisma.$queryRaw<Array<{
      month: Date;
      type: string;
      amount: bigint;
      transaction_count: bigint;
    }>>`
      SELECT 
        DATE_TRUNC('month', t.date) as month,
        cat.type,
        SUM(ABS(t.amount)) as amount,
        COUNT(t.id) as transaction_count
      FROM transactions t
      JOIN currencies c ON t.currency_id = c.id
      LEFT JOIN transaction_categorizations tc ON t.id = tc.transaction_id
      LEFT JOIN categories cat ON tc.category_id = cat.id
      WHERE t.date >= ${start} AND t.date <= ${end} AND c.code = ${currency} AND t.status = 'confirmed'
      GROUP BY DATE_TRUNC('month', t.date), cat.type
      ORDER BY month
    `;
    
    const monthlyIncome: MonthlyTrend[] = [];
    const monthlyExpenses: MonthlyTrend[] = [];

    trendsResult.forEach(row => {
      const trend = {
        month: row.month,
        amount: row.amount.toString(),
        transactionCount: Number(row.transaction_count)
      };

      if (row.type === 'income') {
        monthlyIncome.push(trend);
      } else if (row.type === 'expense') {
        monthlyExpenses.push(trend);
      }
    });

    // Top categories
    const topCategories = await this.getTopCategories(start, end, undefined, currency);

    return {
      monthlyIncome,
      monthlyExpenses,
      topCategories
    };
  }

  private async getTopCategories(
    start: Date, 
    end: Date, 
    type?: 'income' | 'expense' | 'transfer', 
    currency = 'EUR',
    limit = 5
  ): Promise<TopCategoryItem[]> {
    const whereClause: Prisma.transactionsWhereInput = {
      date: { gte: start, lte: end },
      currencies_transactionsTocurrencies: { code: currency },
      status: 'confirmed',
      transaction_categorizations: {
        some: {
          ...(type && { categories: { type } })
        }
      }
    };

    const transactions = await prisma.transactions.findMany({
      where: whereClause,
      include: {
        transaction_categorizations: {
          include: {
            categories: true
          }
        }
      }
    });

    // Group by category
    const categoryAmounts = new Map<string, { name: string; amount: number }>();
    
    transactions.forEach(tx => {
      const categorization = tx.transaction_categorizations[0];
      if (!categorization || !categorization.categories) return;
      
      const category = categorization.categories;
      const amount = Math.abs(tx.amount.toNumber());
      
      if (!categoryAmounts.has(category.id)) {
        categoryAmounts.set(category.id, { name: category.name, amount: 0 });
      }
      categoryAmounts.get(category.id)!.amount += amount;
    });

    // Sort and limit
    const sorted = Array.from(categoryAmounts.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, limit);

    return sorted.map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      amount: data.amount.toFixed(2),
      trend: 'stable' as const, // TODO: Calculate actual trend
      trendPercentage: 0
    }));
  }

  private async getPeriodMetrics(start: Date, end: Date, currency: string): Promise<PeriodMetrics> {
    const transactions = await prisma.transactions.findMany({
      where: {
        date: { gte: start, lte: end },
        currencies_transactionsTocurrencies: { code: currency },
        status: 'confirmed'
      },
      include: {
        transaction_categorizations: {
          include: {
            categories: true
          }
        }
      }
    });
    
    let income = 0;
    let expenses = 0;
    const transactionCount = transactions.length;

    transactions.forEach(tx => {
      const amount = tx.amount.toNumber();
      const categorization = tx.transaction_categorizations[0];
      if (categorization?.categories?.type === 'income') {
        income += amount;
      } else if (categorization?.categories?.type === 'expense') {
        expenses += Math.abs(amount);
      }
    });

    const balance = income - expenses;

    return {
      income: income.toFixed(2),
      expenses: expenses.toFixed(2),
      balance: balance.toFixed(2),
      transactionCount
    };
  }

  private calculateTrends(current: PeriodMetrics, previous: PeriodMetrics) {
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      incomeChange: calculateChange(parseFloat(current.income), parseFloat(previous.income)),
      expenseChange: calculateChange(parseFloat(current.expenses), parseFloat(previous.expenses)),
      balanceChange: calculateChange(parseFloat(current.balance), parseFloat(previous.balance))
    };
  }

  private async getRecentCategorizedTransactions(limit: number, currency?: string): Promise<CategorizedTransaction[]> {
    const transactions = await prisma.transactions.findMany({
      where: {
        ...(currency && { currencies_transactionsTocurrencies: { code: currency } })
      },
      include: {
        accounts: true,
        currencies_transactionsTocurrencies: true,
        transaction_categorizations: {
          include: {
            categories: true,
            subcategories: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take: limit
    });

    return transactions.map(tx => this.mapCategorizedTransaction(tx));
  }

  private async getFinancialAlerts(currency?: string): Promise<FinancialAlert[]> {
    // For now, return empty array - alerts will be implemented later
    return [];
  }

  private determinePeriodType(start: Date, end: Date): 'month' | 'quarter' | 'year' | 'custom' {
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= 31) return 'month';
    if (diffDays <= 93) return 'quarter';
    if (diffDays <= 366) return 'year';
    return 'custom';
  }

  // ============================================================================
  // ROW MAPPING UTILITIES
  // ============================================================================

  private mapCategorizationRow(row: any): TransactionCategorization {
    return {
      id: row.id,
      transactionId: row.transaction_id,
      categoryId: row.category_id,
      subcategoryId: row.subcategory_id,
      method: row.method,
      confidenceScore: row.confidence_score?.toNumber(),
      aiTagId: row.ai_tag_id,
      userConfirmed: row.user_confirmed,
      userCorrectedCategoryId: row.user_corrected_category_id,
      userCorrectedSubcategoryId: row.user_corrected_subcategory_id,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapCategorizedTransaction(tx: any): CategorizedTransaction {
    const categorization = tx.transaction_categorizations?.[0];
    return {
      id: tx.id,
      accountId: tx.account_id,
      accountName: tx.accounts?.name,
      type: tx.type,
      amount: tx.amount.toFixed(2),
      currencyId: tx.currency_id,
      currencyCode: tx.currencies_transactionsTocurrencies?.code || 'EUR',
      description: tx.description,
      counterpartyName: tx.counterparty_name,
      date: tx.date,
      categoryId: categorization?.category_id,
      categoryName: categorization?.categories?.name,
      categoryType: categorization?.categories?.type,
      categoryColor: categorization?.categories?.color,
      categoryIcon: categorization?.categories?.icon,
      subcategoryId: categorization?.subcategory_id,
      subcategoryName: categorization?.subcategories?.name,
      categorizationMethod: categorization?.method,
      confidenceScore: categorization?.confidence_score?.toNumber(),
      userConfirmed: categorization?.user_confirmed,
      createdAt: tx.created_at
    };
  }
}

// Export singleton instance
export const financialReportingPrismaService = new FinancialReportingPrismaService();