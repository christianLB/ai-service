import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger';
import { 
  DashboardMetrics, 
  RevenueMetric, 
  InvoiceStats,
  ClientMetrics,
  TimeRange,
  CategoryBreakdown
} from '../../types/financial/dashboard.types';

export class FinancialDashboardPrismaService {
  private prisma: PrismaClient;
  private enableValidation: boolean;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.enableValidation = process.env.ENABLE_SQL_VALIDATION === 'true';
  }

  // ============================================================================
  // PURE PRISMA QUERIES - Simple aggregations and counts
  // ============================================================================

  async getBasicInvoiceStats(timeRange: TimeRange): Promise<InvoiceStats> {
    const { startDate, endDate } = timeRange;

    const [totalStats, paidStats, overdueStats] = await Promise.all([
      // Total invoices
      this.prisma.invoice.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: { id: true },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true }
      }),

      // Paid invoices
      this.prisma.invoice.aggregate({
        where: {
          status: 'PAID',
          paidDate: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: { id: true },
        _sum: { totalAmount: true }
      }),

      // Overdue invoices
      this.prisma.invoice.aggregate({
        where: {
          status: 'OVERDUE',
          dueDate: {
            lt: new Date()
          }
        },
        _count: { id: true },
        _sum: { totalAmount: true }
      })
    ]);

    return {
      total: totalStats._count.id || 0,
      totalAmount: totalStats._sum.totalAmount?.toNumber() || 0,
      averageAmount: totalStats._avg.totalAmount?.toNumber() || 0,
      paid: paidStats._count.id || 0,
      paidAmount: paidStats._sum.totalAmount?.toNumber() || 0,
      overdue: overdueStats._count.id || 0,
      overdueAmount: overdueStats._sum.totalAmount?.toNumber() || 0,
      pending: 0, // Will be calculated separately
      pendingAmount: 0
    };
  }

  async getBasicClientMetrics(): Promise<ClientMetrics> {
    const [totalClients, activeClients, newClients] = await Promise.all([
      this.prisma.client.count(),
      
      this.prisma.client.count({
        where: {
          invoices: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
              }
            }
          }
        }
      }),

      this.prisma.client.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ]);

    return {
      total: totalClients,
      active: activeClients,
      new: newClients,
      churned: 0, // Will be calculated with complex query
      averageRevenue: 0 // Will be calculated with complex query
    };
  }

  // ============================================================================
  // HYBRID QUERIES - Prisma with raw SQL for complex operations
  // ============================================================================

  async getRevenueMetrics(timeRange: TimeRange, currency: string = 'EUR'): Promise<RevenueMetric[]> {
    const { startDate, endDate } = timeRange;

    // Complex query with CTEs and window functions
    const result = await this.prisma.$queryRaw<RevenueMetric[]>`
      WITH monthly_revenue AS (
        SELECT 
          DATE_TRUNC('month', i."issueDate") as month,
          SUM(i."totalAmount") as revenue,
          COUNT(DISTINCT i."clientId") as unique_clients,
          COUNT(i.id) as invoice_count
        FROM financial.invoices i
        WHERE i."issueDate" >= ${startDate}
          AND i."issueDate" <= ${endDate}
          AND i."currencyCode" = ${currency}
          AND i.status IN ('PAID', 'PARTIALLY_PAID')
        GROUP BY DATE_TRUNC('month', i."issueDate")
      ),
      revenue_with_growth AS (
        SELECT 
          month,
          revenue,
          unique_clients,
          invoice_count,
          LAG(revenue, 1) OVER (ORDER BY month) as previous_revenue,
          LAG(revenue, 12) OVER (ORDER BY month) as year_ago_revenue
        FROM monthly_revenue
      )
      SELECT 
        month,
        revenue::DECIMAL as amount,
        unique_clients as "uniqueClients",
        invoice_count as "invoiceCount",
        CASE 
          WHEN previous_revenue IS NOT NULL AND previous_revenue > 0 
          THEN ((revenue - previous_revenue) / previous_revenue * 100)::DECIMAL
          ELSE 0 
        END as "monthOverMonthGrowth",
        CASE 
          WHEN year_ago_revenue IS NOT NULL AND year_ago_revenue > 0 
          THEN ((revenue - year_ago_revenue) / year_ago_revenue * 100)::DECIMAL
          ELSE 0 
        END as "yearOverYearGrowth"
      FROM revenue_with_growth
      ORDER BY month DESC
    `;

    return result;
  }

  async getCategoryBreakdown(timeRange: TimeRange): Promise<CategoryBreakdown[]> {
    const { startDate, endDate } = timeRange;

    // Complex aggregation with joins
    const result = await this.prisma.$queryRaw<CategoryBreakdown[]>`
      SELECT 
        c.name as category,
        c.color,
        COUNT(DISTINCT t.id) as "transactionCount",
        SUM(ABS(t.amount))::DECIMAL as "totalAmount",
        AVG(ABS(t.amount))::DECIMAL as "averageAmount",
        ROUND(
          SUM(ABS(t.amount)) * 100.0 / 
          NULLIF(SUM(SUM(ABS(t.amount))) OVER (), 0), 
          2
        )::DECIMAL as percentage
      FROM financial.transactions t
      INNER JOIN financial.categories c ON t."categoryId" = c.id
      WHERE t.date >= ${startDate}
        AND t.date <= ${endDate}
        AND t.type = 'EXPENSE'
      GROUP BY c.id, c.name, c.color
      ORDER BY "totalAmount" DESC
    `;

    return result;
  }

  async getTopClients(limit: number = 10): Promise<any[]> {
    // Complex query with aggregations and window functions
    const result = await this.prisma.$queryRaw`
      WITH client_revenue AS (
        SELECT 
          c.id,
          c.name,
          c.email,
          COUNT(i.id) as invoice_count,
          SUM(i."totalAmount") as total_revenue,
          MAX(i."issueDate") as last_invoice_date,
          MIN(i."issueDate") as first_invoice_date
        FROM financial.clients c
        INNER JOIN financial.invoices i ON c.id = i."clientId"
        WHERE i.status IN ('PAID', 'PARTIALLY_PAID')
        GROUP BY c.id, c.name, c.email
      ),
      ranked_clients AS (
        SELECT 
          *,
          DENSE_RANK() OVER (ORDER BY total_revenue DESC) as revenue_rank,
          EXTRACT(EPOCH FROM (last_invoice_date - first_invoice_date)) / 86400 as customer_lifetime_days
        FROM client_revenue
      )
      SELECT 
        id,
        name,
        email,
        invoice_count as "invoiceCount",
        total_revenue::DECIMAL as "totalRevenue",
        revenue_rank as "revenueRank",
        customer_lifetime_days::INTEGER as "customerLifetimeDays",
        CASE 
          WHEN customer_lifetime_days > 0 
          THEN (total_revenue / NULLIF(customer_lifetime_days, 0) * 30)::DECIMAL
          ELSE 0 
        END as "monthlyAverageRevenue"
      FROM ranked_clients
      WHERE revenue_rank <= ${limit}
      ORDER BY revenue_rank
    `;

    return result;
  }

  // ============================================================================
  // VALIDATION LAYER - Compare SQL vs Prisma results
  // ============================================================================

  private async validateResults<T>(
    operation: string,
    prismaResult: T,
    sqlResult: T
  ): Promise<boolean> {
    if (!this.enableValidation) return true;

    try {
      const prismaJson = JSON.stringify(prismaResult, null, 2);
      const sqlJson = JSON.stringify(sqlResult, null, 2);

      if (prismaJson !== sqlJson) {
        logger.error('Data validation failed', {
          operation,
          prismaResult: prismaResult,
          sqlResult: sqlResult,
          differences: this.findDifferences(prismaResult, sqlResult)
        });
        
        // In production, we might want to use SQL result as fallback
        if (process.env.NODE_ENV === 'production') {
          logger.warn('Using SQL result due to validation failure');
          return false;
        }
        
        throw new Error(`Data validation failed for operation: ${operation}`);
      }

      logger.info('Data validation passed', { operation });
      return true;
    } catch (error) {
      logger.error('Validation error', { operation, error });
      throw error;
    }
  }

  private findDifferences(obj1: any, obj2: any, path: string = ''): string[] {
    const differences: string[] = [];

    // Handle different types
    if (typeof obj1 !== typeof obj2) {
      differences.push(`Type mismatch at ${path}: ${typeof obj1} vs ${typeof obj2}`);
      return differences;
    }

    // Handle primitives
    if (typeof obj1 !== 'object' || obj1 === null) {
      if (obj1 !== obj2) {
        differences.push(`Value mismatch at ${path}: ${obj1} vs ${obj2}`);
      }
      return differences;
    }

    // Handle arrays
    if (Array.isArray(obj1)) {
      if (!Array.isArray(obj2)) {
        differences.push(`Type mismatch at ${path}: array vs non-array`);
        return differences;
      }
      if (obj1.length !== obj2.length) {
        differences.push(`Array length mismatch at ${path}: ${obj1.length} vs ${obj2.length}`);
      }
      for (let i = 0; i < Math.max(obj1.length, obj2.length); i++) {
        differences.push(...this.findDifferences(obj1[i], obj2[i], `${path}[${i}]`));
      }
      return differences;
    }

    // Handle objects
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    const allKeys = new Set([...keys1, ...keys2]);

    for (const key of allKeys) {
      if (!(key in obj1)) {
        differences.push(`Missing key in first object at ${path}.${key}`);
      } else if (!(key in obj2)) {
        differences.push(`Missing key in second object at ${path}.${key}`);
      } else {
        differences.push(...this.findDifferences(obj1[key], obj2[key], `${path}.${key}`));
      }
    }

    return differences;
  }

  // ============================================================================
  // MAIN DASHBOARD METHOD
  // ============================================================================

  async getDashboardMetrics(
    timeRange: TimeRange,
    currency: string = 'EUR'
  ): Promise<DashboardMetrics> {
    try {
      const [
        invoiceStats,
        clientMetrics,
        revenueMetrics,
        categoryBreakdown,
        topClients
      ] = await Promise.all([
        this.getBasicInvoiceStats(timeRange),
        this.getBasicClientMetrics(),
        this.getRevenueMetrics(timeRange, currency),
        this.getCategoryBreakdown(timeRange),
        this.getTopClients(10)
      ]);

      // Calculate pending invoices (complex status logic)
      const pendingStats = await this.prisma.invoice.aggregate({
        where: {
          status: {
            in: ['SENT', 'PARTIALLY_PAID']
          },
          dueDate: {
            gte: new Date()
          }
        },
        _count: { id: true },
        _sum: { totalAmount: true }
      });

      invoiceStats.pending = pendingStats._count.id || 0;
      invoiceStats.pendingAmount = pendingStats._sum.totalAmount?.toNumber() || 0;

      return {
        invoiceStats,
        clientMetrics,
        revenueMetrics,
        categoryBreakdown,
        topClients,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Failed to get dashboard metrics', { error });
      throw error;
    }
  }

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  async measureQueryPerformance<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = process.hrtime.bigint();
    
    try {
      const result = await queryFn();
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

      logger.info('Query performance', {
        query: queryName,
        duration: `${duration.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });

      // Alert if query is slow
      if (duration > 1000) {
        logger.warn('Slow query detected', {
          query: queryName,
          duration: `${duration.toFixed(2)}ms`,
          threshold: '1000ms'
        });
      }

      return { result, duration };
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000;

      logger.error('Query failed', {
        query: queryName,
        duration: `${duration.toFixed(2)}ms`,
        error
      });

      throw error;
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
export const financialDashboardPrismaService = new FinancialDashboardPrismaService();