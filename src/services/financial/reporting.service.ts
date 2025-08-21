// Financial Reporting & Analytics Service
// Provides intelligent categorization and real-time financial metrics

import { Pool } from 'pg';
import {
  FinancialReport,
  RealtimeMetrics,
  CategorizedTransaction,
  CategorySummary,
  AccountInsights,
  ReportQueryParams,
  MetricsQueryParams,
  CategoryReportItem,
  SubcategoryReportItem,
  MonthlyTrend,
  TopCategoryItem,
  FinancialAlert,
  CategoryType,
  Category,
  Subcategory,
  AITag,
  TransactionCategorization,
  CategorizationMethod,
} from './types';

export class FinancialReportingService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ============================================================================
  // CATEGORIZATION SERVICES
  // ============================================================================

  /**
   * Get all categories with optional filtering
   */
  async getCategories(type?: CategoryType): Promise<Category[]> {
    const query = `
      SELECT id, name, description, color, icon, type, is_active as "isActive",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM financial.categories
      WHERE is_active = true
      ${type ? 'AND type = $1' : ''}
      ORDER BY type, name
    `;

    const params = type ? [type] : [];
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Get subcategories for a category
   */
  async getSubcategories(categoryId: string): Promise<Subcategory[]> {
    const query = `
      SELECT id, category_id as "categoryId", name, description, is_active as "isActive",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM financial.subcategories
      WHERE category_id = $1 AND is_active = true
      ORDER BY name
    `;

    const result = await this.pool.query(query, [categoryId]);
    return result.rows;
  }

  /**
   * Auto-categorize transactions using AI tags
   */
  async autoCategorizeTransactions(transactionIds?: string[]): Promise<number> {
    const whereClause = transactionIds?.length ? 'AND t.id = ANY($1)' : '';
    const params = transactionIds?.length ? [transactionIds] : [];

    // Get uncategorized transactions
    const uncategorizedQuery = `
      SELECT t.id, t.description, t.counterparty_name, t.amount, t.date
      FROM financial.transactions t
      LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
      WHERE tc.id IS NULL
      ${whereClause}
      ORDER BY t.date DESC
    `;

    const uncategorized = await this.pool.query(uncategorizedQuery, params);
    let categorizedCount = 0;

    // Get active AI tags
    const aiTagsQuery = `
      SELECT id, name, keywords, merchant_patterns, category_id, subcategory_id, confidence_score
      FROM financial.ai_tags
      WHERE is_active = true
      ORDER BY confidence_score DESC
    `;
    const aiTags = await this.pool.query(aiTagsQuery);

    // Process each uncategorized transaction
    for (const transaction of uncategorized.rows) {
      const match = this.findBestAIMatch(transaction, aiTags.rows);

      if (match) {
        await this.categorizeTransaction(
          transaction.id,
          match.category_id,
          match.subcategory_id,
          'ai_auto',
          match.confidence_score,
          match.id
        );
        categorizedCount++;
      }
    }

    return categorizedCount;
  }

  /**
   * Find best AI tag match for a transaction
   */
  private findBestAIMatch(transaction: any, aiTags: any[]): any | null {
    const description = (transaction.description || '').toLowerCase();
    const counterparty = (transaction.counterparty_name || '').toLowerCase();
    const searchText = `${description} ${counterparty}`;

    for (const tag of aiTags) {
      // Check keywords
      const keywordMatch = tag.keywords?.some((keyword: string) =>
        searchText.includes(keyword.toLowerCase())
      );

      // Check merchant patterns
      const patternMatch = tag.merchant_patterns?.some((pattern: string) => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(counterparty) || regex.test(description);
        } catch {
          return false;
        }
      });

      if (keywordMatch || patternMatch) {
        return tag;
      }
    }

    return null;
  }

  /**
   * Manually categorize a transaction
   */
  async categorizeTransaction(
    transactionId: string,
    categoryId?: string,
    subcategoryId?: string,
    method: CategorizationMethod = 'manual',
    confidenceScore?: number,
    aiTagId?: string,
    notes?: string
  ): Promise<TransactionCategorization> {
    const query = `
      INSERT INTO financial.transaction_categorizations 
      (transaction_id, category_id, subcategory_id, method, confidence_score, ai_tag_id, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (transaction_id) 
      DO UPDATE SET 
        category_id = EXCLUDED.category_id,
        subcategory_id = EXCLUDED.subcategory_id,
        method = EXCLUDED.method,
        confidence_score = EXCLUDED.confidence_score,
        ai_tag_id = EXCLUDED.ai_tag_id,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      transactionId,
      categoryId,
      subcategoryId,
      method,
      confidenceScore,
      aiTagId,
      notes,
    ]);

    return this.mapCategorizationRow(result.rows[0]);
  }

  // ============================================================================
  // REPORTING SERVICES
  // ============================================================================

  /**
   * Generate yearly financial report with income/expense matrix by category and month
   */
  async getYearlyFinancialReport(
    year: number,
    currency = 'EUR'
  ): Promise<{
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
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // Get all transactions for the year grouped by category and month
    const query = `
      SELECT 
        cat.id as category_id,
        cat.name as category_name,
        cat.type as category_type,
        cat.color as category_color,
        EXTRACT(MONTH FROM t.date)::text as month,
        SUM(t.amount) as amount
      FROM financial.transactions t
      JOIN financial.currencies c ON t.currency_id = c.id
      JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
      JOIN financial.categories cat ON tc.category_id = cat.id
      WHERE t.date >= $1 AND t.date <= $2 
        AND c.code = $3 
        AND t.status = 'confirmed'
        AND cat.type IN ('income', 'expense')
      GROUP BY cat.id, cat.name, cat.type, cat.color, EXTRACT(MONTH FROM t.date)
      ORDER BY cat.type, cat.name, EXTRACT(MONTH FROM t.date)
    `;

    const result = await this.pool.query(query, [startDate, endDate, currency]);

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
    for (const row of result.rows) {
      const categoryId = row.category_id;
      const amount = parseFloat(row.amount);
      const month = row.month;
      const isIncome = row.category_type === 'income';

      // Get or create category
      const categories = isIncome ? incomeCategories : expenseCategories;
      if (!categories.has(categoryId)) {
        categories.set(categoryId, {
          categoryId: row.category_id,
          categoryName: row.category_name,
          categoryColor: row.category_color,
          monthlyData: {},
          total: 0,
        });

        // Initialize all months with zero
        for (let m = 1; m <= 12; m++) {
          categories.get(categoryId).monthlyData[m.toString()] = '0.00';
        }
      }

      const category = categories.get(categoryId);
      category.monthlyData[month] = Math.abs(amount).toFixed(2);
      category.total += Math.abs(amount);

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
    incomeCategoriesArray.forEach((cat) => {
      yearIncomeTotal += cat.total;
    });
    expenseCategoriesArray.forEach((cat) => {
      yearExpenseTotal += cat.total;
    });

    // Add percentages and format totals
    incomeCategoriesArray.forEach((cat) => {
      cat.percentage = yearIncomeTotal > 0 ? (cat.total / yearIncomeTotal) * 100 : 0;
      cat.total = cat.total.toFixed(2);
    });
    expenseCategoriesArray.forEach((cat) => {
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
        expense: expenseCategoriesArray,
      },
      monthlyTotals: {
        income: formattedMonthlyIncome,
        expense: formattedMonthlyExpense,
        balance: monthlyBalance,
      },
      yearTotals: {
        income: yearIncomeTotal.toFixed(2),
        expense: yearExpenseTotal.toFixed(2),
        balance: (yearIncomeTotal - yearExpenseTotal).toFixed(2),
      },
    };
  }

  /**
   * Generate comprehensive financial report
   */
  async generateReport(params: ReportQueryParams): Promise<FinancialReport> {
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
        type: periodType,
      },
      summary,
      byCategory,
      trends,
      currency,
      generatedAt: new Date(),
    };
  }

  /**
   * Get real-time financial metrics
   */
  async getRealtimeMetrics(params: MetricsQueryParams = {}): Promise<RealtimeMetrics> {
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
    const topExpenseCategories = await this.getTopCategories(
      currentStart,
      currentEnd,
      'expense',
      currency
    );

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
      updatedAt: new Date(),
    };
  }

  /**
   * Get categorized transactions with pagination
   */
  async getCategorizedTransactions(params: ReportQueryParams): Promise<{
    transactions: CategorizedTransaction[];
    total: number;
  }> {
    const {
      startDate,
      endDate,
      categoryId,
      subcategoryId,
      accountId,
      currency,
      limit = 50,
      offset = 0,
    } = params;

    const whereConditions = ['1=1'];
    const queryParams: any[] = [limit, offset];
    let paramIndex = 2;

    if (startDate) {
      whereConditions.push(`t.date >= $${++paramIndex}`);
      queryParams.push(startDate);
    }
    if (endDate) {
      whereConditions.push(`t.date <= $${++paramIndex}`);
      queryParams.push(endDate);
    }
    if (categoryId) {
      whereConditions.push(`cat.id = $${++paramIndex}`);
      queryParams.push(categoryId);
    }
    if (subcategoryId) {
      whereConditions.push(`subcat.id = $${++paramIndex}`);
      queryParams.push(subcategoryId);
    }
    if (accountId) {
      whereConditions.push(`t.account_id = $${++paramIndex}`);
      queryParams.push(accountId);
    }
    if (currency) {
      whereConditions.push(`c.code = $${++paramIndex}`);
      queryParams.push(currency);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get transactions
    const query = `
      SELECT * FROM financial.categorized_transactions
      WHERE ${whereClause}
      ORDER BY date DESC
      LIMIT $1 OFFSET $2
    `;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM financial.categorized_transactions
      WHERE ${whereClause}
    `;

    const [transactions, countResult] = await Promise.all([
      this.pool.query(query, queryParams),
      this.pool.query(countQuery, queryParams.slice(2)), // Skip limit/offset for count
    ]);

    return {
      transactions: transactions.rows.map(this.mapCategorizedTransactionRow),
      total: parseInt(countResult.rows[0].total),
    };
  }

  /**
   * Get monthly category summaries
   */
  async getMonthlyCategorySummary(
    startDate: Date,
    endDate: Date,
    currency = 'EUR'
  ): Promise<CategorySummary[]> {
    const query = `
      SELECT * FROM financial.monthly_category_summary
      WHERE month >= $1 AND month <= $2 AND currency_code = $3
      ORDER BY month DESC, total_amount DESC
    `;

    const result = await this.pool.query(query, [startDate, endDate, currency]);
    return result.rows.map(this.mapCategorySummaryRow);
  }

  /**
   * Get account insights
   */
  async getAccountInsights(): Promise<AccountInsights[]> {
    const query = 'SELECT * FROM financial.account_insights ORDER BY balance DESC';
    const result = await this.pool.query(query);
    return result.rows.map(this.mapAccountInsightsRow);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getReportSummary(start: Date, end: Date, currency: string) {
    const query = `
      SELECT 
        cat.type,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COUNT(t.id) as transaction_count
      FROM financial.transactions t
      JOIN financial.currencies c ON t.currency_id = c.id
      LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
      LEFT JOIN financial.categories cat ON tc.category_id = cat.id
      WHERE t.date >= $1 AND t.date <= $2 AND c.code = $3 AND t.status = 'confirmed'
      GROUP BY cat.type
    `;

    const result = await this.pool.query(query, [start, end, currency]);

    let totalIncome = '0';
    let totalExpenses = '0';
    let totalTransactions = 0;

    for (const row of result.rows) {
      if (row.type === 'income') {
        totalIncome = row.total_amount;
      } else if (row.type === 'expense') {
        totalExpenses = Math.abs(parseFloat(row.total_amount)).toString();
      }
      totalTransactions += parseInt(row.transaction_count);
    }

    const netAmount = (parseFloat(totalIncome) - parseFloat(totalExpenses)).toString();

    return {
      totalIncome,
      totalExpenses,
      netAmount,
      transactionCount: totalTransactions,
    };
  }

  private async getCategoryBreakdown(start: Date, end: Date, currency: string) {
    const query = `
      SELECT 
        cat.id as category_id,
        cat.name as category_name,
        cat.type as category_type,
        subcat.id as subcategory_id,
        subcat.name as subcategory_name,
        SUM(ABS(t.amount)) as amount,
        COUNT(t.id) as transaction_count
      FROM financial.transactions t
      JOIN financial.currencies c ON t.currency_id = c.id
      JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
      JOIN financial.categories cat ON tc.category_id = cat.id
      LEFT JOIN financial.subcategories subcat ON tc.subcategory_id = subcat.id
      WHERE t.date >= $1 AND t.date <= $2 AND c.code = $3 AND t.status = 'confirmed'
      GROUP BY cat.id, cat.name, cat.type, subcat.id, subcat.name
      ORDER BY cat.type, amount DESC
    `;

    const result = await this.pool.query(query, [start, end, currency]);

    // Group by category type
    const income: CategoryReportItem[] = [];
    const expenses: CategoryReportItem[] = [];
    const transfers: CategoryReportItem[] = [];

    const categoryTotals = new Map<string, { amount: number; count: number }>();
    const categorySubcategories = new Map<string, SubcategoryReportItem[]>();

    // First pass: calculate totals and collect subcategories
    for (const row of result.rows) {
      const categoryId = row.category_id;
      const amount = parseFloat(row.amount);
      const count = parseInt(row.transaction_count);

      // Update category totals
      if (!categoryTotals.has(categoryId)) {
        categoryTotals.set(categoryId, { amount: 0, count: 0 });
      }
      const totals = categoryTotals.get(categoryId)!;
      totals.amount += amount;
      totals.count += count;

      // Add subcategory if exists
      if (row.subcategory_id) {
        if (!categorySubcategories.has(categoryId)) {
          categorySubcategories.set(categoryId, []);
        }
        categorySubcategories.get(categoryId)!.push({
          subcategoryId: row.subcategory_id,
          subcategoryName: row.subcategory_name,
          amount: amount.toString(),
          percentage: 0, // Will calculate after totals
          transactionCount: count,
        });
      }
    }

    // Calculate type totals for percentages
    const typeTotals = new Map<string, number>();
    for (const row of result.rows) {
      const type = row.category_type;
      const amount = parseFloat(row.amount);
      typeTotals.set(type, (typeTotals.get(type) || 0) + amount);
    }

    // Second pass: create category items
    const processedCategories = new Set<string>();
    for (const row of result.rows) {
      if (processedCategories.has(row.category_id)) {
        continue;
      }
      processedCategories.add(row.category_id);

      const categoryId = row.category_id;
      const totals = categoryTotals.get(categoryId)!;
      const typeTotal = typeTotals.get(row.category_type) || 1;

      const categoryItem: CategoryReportItem = {
        categoryId: row.category_id,
        categoryName: row.category_name,
        amount: totals.amount.toString(),
        percentage: (totals.amount / typeTotal) * 100,
        transactionCount: totals.count,
        subcategories: categorySubcategories.get(categoryId) || [],
      };

      // Update subcategory percentages
      if (categoryItem.subcategories) {
        categoryItem.subcategories.forEach((sub) => {
          sub.percentage = (parseFloat(sub.amount) / totals.amount) * 100;
        });
      }

      // Add to appropriate array
      switch (row.category_type) {
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
    }

    return { income, expenses, transfers };
  }

  private async getTrends(start: Date, end: Date, currency: string) {
    // Monthly income/expense trends
    const trendsQuery = `
      SELECT 
        DATE_TRUNC('month', t.date) as month,
        cat.type,
        SUM(ABS(t.amount)) as amount,
        COUNT(t.id) as transaction_count
      FROM financial.transactions t
      JOIN financial.currencies c ON t.currency_id = c.id
      LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
      LEFT JOIN financial.categories cat ON tc.category_id = cat.id
      WHERE t.date >= $1 AND t.date <= $2 AND c.code = $3 AND t.status = 'confirmed'
      GROUP BY DATE_TRUNC('month', t.date), cat.type
      ORDER BY month
    `;

    const trendsResult = await this.pool.query(trendsQuery, [start, end, currency]);

    const monthlyIncome: MonthlyTrend[] = [];
    const monthlyExpenses: MonthlyTrend[] = [];

    for (const row of trendsResult.rows) {
      const trend = {
        month: row.month,
        amount: row.amount,
        transactionCount: parseInt(row.transaction_count),
      };

      if (row.type === 'income') {
        monthlyIncome.push(trend);
      } else if (row.type === 'expense') {
        monthlyExpenses.push(trend);
      }
    }

    // Top categories
    const topCategories = await this.getTopCategories(start, end, undefined, currency);

    return {
      monthlyIncome,
      monthlyExpenses,
      topCategories,
    };
  }

  private async getTopCategories(
    start: Date,
    end: Date,
    type?: CategoryType,
    currency = 'EUR',
    limit = 5
  ): Promise<TopCategoryItem[]> {
    const query = `
      SELECT 
        cat.id as category_id,
        cat.name as category_name,
        SUM(ABS(t.amount)) as amount
      FROM financial.transactions t
      JOIN financial.currencies c ON t.currency_id = c.id
      JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
      JOIN financial.categories cat ON tc.category_id = cat.id
      WHERE t.date >= $1 AND t.date <= $2 AND c.code = $3 AND t.status = 'confirmed'
      ${type ? 'AND cat.type = $4' : ''}
      GROUP BY cat.id, cat.name
      ORDER BY amount DESC
      LIMIT ${limit}
    `;

    const params = type ? [start, end, currency, type] : [start, end, currency];
    const result = await this.pool.query(query, params);

    return result.rows.map((row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      amount: row.amount,
      trend: 'stable' as const, // TODO: Calculate actual trend
      trendPercentage: 0,
    }));
  }

  private async getPeriodMetrics(start: Date, end: Date, currency: string) {
    const query = `
      SELECT 
        cat.type,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COUNT(t.id) as transaction_count
      FROM financial.transactions t
      JOIN financial.currencies c ON t.currency_id = c.id
      LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
      LEFT JOIN financial.categories cat ON tc.category_id = cat.id
      WHERE t.date >= $1 AND t.date <= $2 AND c.code = $3 AND t.status = 'confirmed'
      GROUP BY cat.type
    `;

    const result = await this.pool.query(query, [start, end, currency]);

    let income = '0';
    let expenses = '0';
    let transactionCount = 0;

    for (const row of result.rows) {
      if (row.type === 'income') {
        income = row.total_amount;
      } else if (row.type === 'expense') {
        expenses = Math.abs(parseFloat(row.total_amount)).toString();
      }
      transactionCount += parseInt(row.transaction_count);
    }

    const balance = (parseFloat(income) - parseFloat(expenses)).toString();

    return {
      income,
      expenses,
      balance,
      transactionCount,
    };
  }

  private calculateTrends(current: any, previous: any) {
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return ((current - previous) / previous) * 100;
    };

    return {
      incomeChange: calculateChange(parseFloat(current.income), parseFloat(previous.income)),
      expenseChange: calculateChange(parseFloat(current.expenses), parseFloat(previous.expenses)),
      balanceChange: calculateChange(parseFloat(current.balance), parseFloat(previous.balance)),
    };
  }

  private async getRecentCategorizedTransactions(
    limit: number,
    currency?: string
  ): Promise<CategorizedTransaction[]> {
    const query = `
      SELECT * FROM financial.categorized_transactions
      ${currency ? 'WHERE currency_code = $2' : ''}
      ORDER BY date DESC
      LIMIT $1
    `;

    const params = currency ? [limit, currency] : [limit];
    const result = await this.pool.query(query, params);
    return result.rows.map(this.mapCategorizedTransactionRow);
  }

  private async getFinancialAlerts(currency?: string): Promise<FinancialAlert[]> {
    // For now, return empty array - alerts will be implemented later
    return [];
  }

  private determinePeriodType(start: Date, end: Date): 'month' | 'quarter' | 'year' | 'custom' {
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= 31) {
      return 'month';
    }
    if (diffDays <= 93) {
      return 'quarter';
    }
    if (diffDays <= 366) {
      return 'year';
    }
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
      confidenceScore: row.confidence_score,
      aiTagId: row.ai_tag_id,
      userConfirmed: row.user_confirmed,
      userCorrectedCategoryId: row.user_corrected_category_id,
      userCorrectedSubcategoryId: row.user_corrected_subcategory_id,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapCategorizedTransactionRow(row: any): CategorizedTransaction {
    return {
      id: row.id,
      accountId: row.account_id,
      accountName: row.account_name,
      type: row.type,
      amount: row.amount,
      currencyId: row.currency_id,
      currencyCode: row.currency_code,
      description: row.description,
      counterpartyName: row.counterparty_name,
      date: row.date,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryType: row.category_type,
      categoryColor: row.category_color,
      categoryIcon: row.category_icon,
      subcategoryId: row.subcategory_id,
      subcategoryName: row.subcategory_name,
      categorizationMethod: row.categorization_method,
      confidenceScore: row.confidence_score,
      userConfirmed: row.user_confirmed,
      createdAt: row.created_at,
    };
  }

  private mapCategorySummaryRow(row: any): CategorySummary {
    return {
      month: row.month,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryType: row.category_type,
      currencyCode: row.currency_code,
      transactionCount: parseInt(row.transaction_count),
      totalAmount: row.total_amount,
      avgAmount: row.avg_amount,
      minAmount: row.min_amount,
      maxAmount: row.max_amount,
    };
  }

  private mapAccountInsightsRow(row: any): AccountInsights {
    return {
      id: row.id,
      name: row.name,
      balance: row.balance,
      currencyCode: row.currency_code,
      transactions30d: parseInt(row.transactions_30d || '0'),
      income30d: row.income_30d,
      expenses30d: row.expenses_30d,
    };
  }
}
