import { Router, Request, Response, NextFunction } from 'express';
import { FinancialDatabaseService } from '../../services/financial/database.service';
import { FinancialDashboardPrismaService } from '../../services/financial/financial-dashboard-prisma.service';
import { featureFlags } from '../../config/feature-flags';
import { authMiddleware } from '../../middleware/auth.middleware';
import { databaseRateLimit } from '../../middleware/express-rate-limit.middleware';
import { logger } from '../../utils/logger';

const router = Router();

// Database rate limiter is now imported directly from express-rate-limit.middleware

// Database service instances
let databaseService: FinancialDatabaseService;
let dashboardPrismaService: FinancialDashboardPrismaService;

// Initialize database services
const initializeServices = () => {
  if (!databaseService) {
    const dbConfig = {
      host: process.env.POSTGRES_HOST!,
      port: parseInt(process.env.POSTGRES_PORT!),
      database: process.env.POSTGRES_DB!,
      user: process.env.POSTGRES_USER!,
      password: process.env.POSTGRES_PASSWORD!
    };
    databaseService = new FinancialDatabaseService(dbConfig);
  }
  
  if (!dashboardPrismaService && featureFlags.isEnabled('USE_PRISMA_DASHBOARD')) {
    dashboardPrismaService = new FinancialDashboardPrismaService();
  }
};

// ============================================================================
// UNIFIED DASHBOARD METRICS ENDPOINT (NEW)
// ============================================================================

/**
 * GET /api/financial/dashboard/metrics
 * Get comprehensive dashboard metrics using Prisma (with feature flag)
 */
router.get('/metrics', authMiddleware, databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();
    
    // Check if Prisma dashboard is enabled
    if (featureFlags.isEnabled('USE_PRISMA_DASHBOARD')) {
      const { 
        startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        endDate = new Date().toISOString(),
        currency = 'EUR'
      } = req.query;
      
      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      };
      
      logger.info('Using Prisma dashboard service', { 
        featureFlag: 'USE_PRISMA_DASHBOARD',
        timeRange,
        currency 
      });
      
      const metrics = await dashboardPrismaService.getDashboardMetrics(timeRange, currency as string);
      
      res.json({
        success: true,
        data: metrics,
        service: 'prisma'
      });
    } else {
      // Fallback to legacy endpoints
      res.status(501).json({
        success: false,
        error: 'Unified metrics endpoint requires Prisma dashboard to be enabled',
        hint: 'Use individual endpoints or enable USE_PRISMA_DASHBOARD feature flag'
      });
    }
  } catch (error) {
    logger.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// REVENUE METRICS ENDPOINT
// ============================================================================

/**
 * GET /api/financial/dashboard/revenue-metrics
 * Get comprehensive revenue metrics with trends and comparisons
 */
router.get('/revenue-metrics', authMiddleware, databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();
    
    const { 
      period = 'monthly', 
      currency = 'EUR', 
      startDate, 
      endDate 
    } = req.query;

    // Use Prisma service if enabled
    if (featureFlags.isEnabled('USE_PRISMA_DASHBOARD')) {
      logger.info('Using Prisma for revenue-metrics', { period, currency });
      
      // Convert period-based query to time range
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      let timeRange;
      if (period === 'monthly') {
        timeRange = {
          startDate: new Date(currentYear, currentMonth, 1),
          endDate: new Date(currentYear, currentMonth + 1, 0)
        };
      } else if (period === 'quarterly') {
        const currentQuarter = Math.floor(currentMonth / 3);
        timeRange = {
          startDate: new Date(currentYear, currentQuarter * 3, 1),
          endDate: new Date(currentYear, (currentQuarter + 1) * 3, 0)
        };
      } else if (period === 'yearly') {
        timeRange = {
          startDate: new Date(currentYear, 0, 1),
          endDate: new Date(currentYear, 11, 31)
        };
      } else {
        timeRange = {
          startDate: startDate ? new Date(startDate as string) : new Date(currentYear, currentMonth, 1),
          endDate: endDate ? new Date(endDate as string) : new Date(currentYear, currentMonth + 1, 0)
        };
      }
      
      const metrics = await dashboardPrismaService.getRevenueMetrics(timeRange, currency as string);
      
      // Format response to match existing API
      res.json({
        success: true,
        data: {
          period: {
            type: period,
            current: {
              start: timeRange.startDate.toISOString(),
              end: timeRange.endDate.toISOString()
            }
          },
          revenueMetrics: metrics,
          currency,
          generatedAt: new Date().toISOString(),
          service: 'prisma'
        }
      });
      
      return;
    }

    // Original SQL implementation below...
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Calculate date ranges based on period
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;
    
    if (period === 'monthly') {
      currentPeriodStart = new Date(currentYear, currentMonth, 1);
      currentPeriodEnd = new Date(currentYear, currentMonth + 1, 0);
      previousPeriodStart = new Date(currentYear, currentMonth - 1, 1);
      previousPeriodEnd = new Date(currentYear, currentMonth, 0);
    } else if (period === 'quarterly') {
      const currentQuarter = Math.floor(currentMonth / 3);
      currentPeriodStart = new Date(currentYear, currentQuarter * 3, 1);
      currentPeriodEnd = new Date(currentYear, (currentQuarter + 1) * 3, 0);
      previousPeriodStart = new Date(currentYear, (currentQuarter - 1) * 3, 1);
      previousPeriodEnd = new Date(currentYear, currentQuarter * 3, 0);
    } else if (period === 'yearly') {
      currentPeriodStart = new Date(currentYear, 0, 1);
      currentPeriodEnd = new Date(currentYear, 11, 31);
      previousPeriodStart = new Date(currentYear - 1, 0, 1);
      previousPeriodEnd = new Date(currentYear - 1, 11, 31);
    } else {
      // Custom date range
      currentPeriodStart = startDate ? new Date(startDate as string) : new Date(currentYear, currentMonth, 1);
      currentPeriodEnd = endDate ? new Date(endDate as string) : new Date(currentYear, currentMonth + 1, 0);
      const daysDiff = Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
      previousPeriodStart = new Date(currentPeriodStart.getTime() - (daysDiff * 24 * 60 * 60 * 1000));
      previousPeriodEnd = new Date(currentPeriodStart.getTime() - (1 * 24 * 60 * 60 * 1000));
    }

    // Current period revenue metrics
    const currentRevenueQuery = `
      SELECT 
        COALESCE(SUM(i.total), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END), 0) as paid_revenue,
        COALESCE(SUM(CASE WHEN i.status IN ('sent', 'viewed') THEN i.total ELSE 0 END), 0) as pending_revenue,
        COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN i.total ELSE 0 END), 0) as overdue_revenue,
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_invoices,
        AVG(i.total) as average_invoice_amount,
        COUNT(DISTINCT i.client_id) as unique_clients
      FROM financial.invoices i
      WHERE i.issue_date >= $1 AND i.issue_date <= $2
        AND i.currency = $3
        AND i.status != 'cancelled'
    `;

    const [currentResult, previousResult] = await Promise.all([
      databaseService.pool.query(currentRevenueQuery, [currentPeriodStart, currentPeriodEnd, currency]),
      databaseService.pool.query(currentRevenueQuery, [previousPeriodStart, previousPeriodEnd, currency])
    ]);

    const current = currentResult.rows[0];
    const previous = previousResult.rows[0];

    // Calculate growth rates
    const revenueGrowth = previous.total_revenue > 0 
      ? ((current.total_revenue - previous.total_revenue) / previous.total_revenue) * 100 
      : 0;
    
    const invoiceGrowth = previous.total_invoices > 0 
      ? ((current.total_invoices - previous.total_invoices) / previous.total_invoices) * 100 
      : 0;

    // Monthly trend data (last 12 months)
    const monthlyTrendQuery = `
      SELECT 
        DATE_TRUNC('month', i.issue_date) as month,
        SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END) as revenue,
        COUNT(*) as invoices
      FROM financial.invoices i
      WHERE i.issue_date >= $1 
        AND i.currency = $2
        AND i.status != 'cancelled'
      GROUP BY DATE_TRUNC('month', i.issue_date)
      ORDER BY month ASC
    `;

    const twelveMonthsAgo = new Date(currentYear, currentMonth - 11, 1);
    const trendResult = await databaseService.pool.query(monthlyTrendQuery, [twelveMonthsAgo, currency]);

    // Top performing clients
    const topClientsQuery = `
      SELECT 
        c.id,
        c.name,
        c.business_name,
        SUM(i.total) as total_revenue,
        COUNT(i.id) as total_invoices,
        AVG(i.total) as avg_invoice_amount
      FROM financial.clients c
      JOIN financial.invoices i ON c.id = i.client_id
      WHERE i.issue_date >= $1 AND i.issue_date <= $2
        AND i.currency = $3
        AND i.status = 'paid'
      GROUP BY c.id, c.name, c.business_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `;

    const topClientsResult = await databaseService.pool.query(topClientsQuery, [currentPeriodStart, currentPeriodEnd, currency]);

    res.json({
      success: true,
      data: {
        period: {
          type: period,
          current: {
            start: currentPeriodStart.toISOString(),
            end: currentPeriodEnd.toISOString()
          },
          previous: {
            start: previousPeriodStart.toISOString(),
            end: previousPeriodEnd.toISOString()
          }
        },
        currentPeriod: {
          totalRevenue: parseFloat(current.total_revenue).toFixed(2),
          paidRevenue: parseFloat(current.paid_revenue).toFixed(2),
          pendingRevenue: parseFloat(current.pending_revenue).toFixed(2),
          overdueRevenue: parseFloat(current.overdue_revenue).toFixed(2),
          totalInvoices: parseInt(current.total_invoices),
          paidInvoices: parseInt(current.paid_invoices),
          averageInvoiceAmount: parseFloat(current.average_invoice_amount || 0).toFixed(2),
          uniqueClients: parseInt(current.unique_clients)
        },
        previousPeriod: {
          totalRevenue: parseFloat(previous.total_revenue).toFixed(2),
          paidRevenue: parseFloat(previous.paid_revenue).toFixed(2),
          pendingRevenue: parseFloat(previous.pending_revenue).toFixed(2),
          overdueRevenue: parseFloat(previous.overdue_revenue).toFixed(2),
          totalInvoices: parseInt(previous.total_invoices),
          paidInvoices: parseInt(previous.paid_invoices),
          averageInvoiceAmount: parseFloat(previous.average_invoice_amount || 0).toFixed(2),
          uniqueClients: parseInt(previous.unique_clients)
        },
        growth: {
          revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
          invoiceGrowth: parseFloat(invoiceGrowth.toFixed(2))
        },
        trends: {
          monthlyRevenue: trendResult.rows.map(row => ({
            month: row.month,
            revenue: parseFloat(row.revenue).toFixed(2),
            invoices: parseInt(row.invoices)
          }))
        },
        topClients: topClientsResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          businessName: row.business_name,
          totalRevenue: parseFloat(row.total_revenue).toFixed(2),
          totalInvoices: parseInt(row.total_invoices),
          avgInvoiceAmount: parseFloat(row.avg_invoice_amount).toFixed(2)
        })),
        currency,
        generatedAt: new Date().toISOString(),
        service: 'sql'
      }
    });

  } catch (error) {
    console.error('Revenue metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get revenue metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// INVOICE STATISTICS ENDPOINT
// ============================================================================

/**
 * GET /api/financial/dashboard/invoice-stats
 * Get detailed invoice statistics with status breakdown and aging analysis
 */
router.get('/invoice-stats', authMiddleware, databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();
    
    const { currency = 'EUR', includeAging = 'true' } = req.query;

    // Use Prisma service if enabled
    if (featureFlags.isEnabled('USE_PRISMA_DASHBOARD')) {
      logger.info('Using Prisma for invoice-stats', { currency, includeAging });
      
      const timeRange = {
        startDate: new Date(new Date().getFullYear() - 1, 0, 1), // Last year
        endDate: new Date()
      };
      
      const stats = await dashboardPrismaService.getBasicInvoiceStats(timeRange);
      
      // Format response to match existing API
      res.json({
        success: true,
        data: {
          overview: {
            totalInvoices: stats.total,
            totalAmount: stats.totalAmount.toFixed(2),
            paidInvoices: stats.paid,
            paidAmount: stats.paidAmount.toFixed(2),
            pendingInvoices: stats.pending,
            pendingAmount: stats.pendingAmount.toFixed(2),
            overdueInvoices: stats.overdue,
            overdueAmount: stats.overdueAmount.toFixed(2),
            averageInvoiceAmount: stats.averageAmount.toFixed(2)
          },
          currency,
          generatedAt: new Date().toISOString(),
          service: 'prisma'
        }
      });
      
      return;
    }

    // Original SQL implementation below...
    // Overall invoice statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_invoices,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_invoices,
        COUNT(CASE WHEN status = 'viewed' THEN 1 END) as viewed_invoices,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_invoices,
        SUM(total) as total_amount,
        SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status IN ('sent', 'viewed') THEN total ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END) as overdue_amount,
        AVG(total) as average_invoice_amount,
        AVG(CASE WHEN status = 'paid' AND paid_date IS NOT NULL 
             THEN (paid_date - issue_date) END) as average_payment_days
      FROM financial.invoices
      WHERE currency = $1 AND status != 'cancelled'
    `;

    const statsResult = await databaseService.pool.query(statsQuery, [currency]);
    const stats = statsResult.rows[0];

    // Payment behavior analysis
    const paymentBehaviorQuery = `
      SELECT 
        CASE 
          WHEN paid_date IS NULL THEN 'unpaid'
          WHEN paid_date <= due_date THEN 'on_time'
          WHEN paid_date <= due_date + INTERVAL '7 days' THEN 'late_7_days'
          WHEN paid_date <= due_date + INTERVAL '30 days' THEN 'late_30_days'
          ELSE 'very_late'
        END as payment_category,
        COUNT(*) as count,
        SUM(total) as amount
      FROM financial.invoices
      WHERE currency = $1 AND status != 'cancelled'
      GROUP BY payment_category
    `;

    const paymentBehaviorResult = await databaseService.pool.query(paymentBehaviorQuery, [currency]);

    // Aging analysis if requested
    let agingAnalysis = null;
    if (includeAging === 'true') {
      const agingQuery = `
        SELECT 
          CASE 
            WHEN due_date >= CURRENT_DATE THEN 'not_due'
            WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1_30_days'
            WHEN due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31_60_days'
            WHEN due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61_90_days'
            ELSE 'over_90_days'
          END as aging_bucket,
          COUNT(*) as count,
          SUM(total) as amount
        FROM financial.invoices
        WHERE currency = $1 AND status IN ('sent', 'viewed', 'overdue')
        GROUP BY 1
        ORDER BY 1
      `;

      const agingResult = await databaseService.pool.query(agingQuery, [currency]);
      agingAnalysis = agingResult.rows;
    }

    // Monthly invoice creation trend
    const monthlyTrendQuery = `
      SELECT 
        DATE_TRUNC('month', issue_date) as month,
        COUNT(*) as invoices_created,
        SUM(total) as total_amount
      FROM financial.invoices
      WHERE currency = $1 
        AND issue_date >= $2
        AND status != 'cancelled'
      GROUP BY DATE_TRUNC('month', issue_date)
      ORDER BY month ASC
    `;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const trendResult = await databaseService.pool.query(monthlyTrendQuery, [currency, sixMonthsAgo]);

    // Top overdue invoices
    const overdueQuery = `
      SELECT 
        i.id,
        i.invoice_number,
        i.client_name,
        i.total,
        i.due_date,
        (CURRENT_DATE - i.due_date) as days_overdue
      FROM financial.invoices i
      WHERE i.currency = $1 AND i.status = 'overdue'
      ORDER BY days_overdue DESC, i.total DESC
      LIMIT 10
    `;

    const overdueResult = await databaseService.pool.query(overdueQuery, [currency]);

    res.json({
      success: true,
      data: {
        overview: {
          totalInvoices: parseInt(stats.total_invoices),
          draftInvoices: parseInt(stats.draft_invoices),
          sentInvoices: parseInt(stats.sent_invoices),
          viewedInvoices: parseInt(stats.viewed_invoices),
          paidInvoices: parseInt(stats.paid_invoices),
          overdueInvoices: parseInt(stats.overdue_invoices),
          cancelledInvoices: parseInt(stats.cancelled_invoices),
          totalAmount: parseFloat(stats.total_amount || 0).toFixed(2),
          paidAmount: parseFloat(stats.paid_amount || 0).toFixed(2),
          pendingAmount: parseFloat(stats.pending_amount || 0).toFixed(2),
          overdueAmount: parseFloat(stats.overdue_amount || 0).toFixed(2),
          averageInvoiceAmount: parseFloat(stats.average_invoice_amount || 0).toFixed(2),
          averagePaymentDays: parseFloat(stats.average_payment_days || 0).toFixed(1)
        },
        paymentBehavior: paymentBehaviorResult.rows.map(row => ({
          category: row.payment_category,
          count: parseInt(row.count),
          amount: parseFloat(row.amount).toFixed(2)
        })),
        agingAnalysis: agingAnalysis ? agingAnalysis.map(row => ({
          bucket: row.aging_bucket,
          count: parseInt(row.count),
          amount: parseFloat(row.amount).toFixed(2)
        })) : null,
        trends: {
          monthlyCreation: trendResult.rows.map(row => ({
            month: row.month,
            invoicesCreated: parseInt(row.invoices_created),
            totalAmount: parseFloat(row.total_amount).toFixed(2)
          }))
        },
        topOverdueInvoices: overdueResult.rows.map(row => ({
          id: row.id,
          invoiceNumber: row.invoice_number,
          clientName: row.client_name,
          total: parseFloat(row.total).toFixed(2),
          dueDate: row.due_date,
          daysOverdue: parseInt(row.days_overdue)
        })),
        currency,
        generatedAt: new Date().toISOString(),
        service: 'sql'
      }
    });

  } catch (error) {
    console.error('Invoice stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get invoice statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// CLIENT PERFORMANCE METRICS ENDPOINT
// ============================================================================

/**
 * GET /api/financial/dashboard/client-metrics
 * Get client performance metrics including payment behavior and revenue analysis
 */
router.get('/client-metrics', authMiddleware, databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();
    
    const { 
      currency = 'EUR', 
      limit = '20',
      sortBy = 'total_revenue',
      includeInactive = 'false'
    } = req.query;

    // Use Prisma service if enabled
    if (featureFlags.isEnabled('USE_PRISMA_DASHBOARD')) {
      logger.info('Using Prisma for client-metrics', { currency, limit });
      
      const [clientMetrics, topClients] = await Promise.all([
        dashboardPrismaService.getBasicClientMetrics(),
        dashboardPrismaService.getTopClients(parseInt(limit as string))
      ]);
      
      // Format response to match existing API
      res.json({
        success: true,
        data: {
          summary: {
            totalClients: clientMetrics.total,
            activeClients: clientMetrics.active,
            newClients: clientMetrics.new
          },
          topRevenueClients: topClients.map(client => ({
            id: client.id,
            name: client.name,
            totalRevenue: client.totalRevenue.toFixed(2),
            totalInvoices: client.invoiceCount,
            monthlyAverageRevenue: client.monthlyAverageRevenue.toFixed(2)
          })),
          currency,
          generatedAt: new Date().toISOString(),
          service: 'prisma'
        }
      });
      
      return;
    }

    // Original SQL implementation below...
    // Client performance metrics with statistics
    const clientMetricsQuery = `
      SELECT 
        c.id,
        c.name,
        c.business_name,
        c.email,
        c.status,
        c.total_revenue,
        c.total_invoices,
        c.outstanding_balance,
        c.last_invoice_date,
        c.average_invoice_amount,
        c.payment_terms,
        cs.paid_invoices,
        cs.pending_invoices,
        cs.overdue_invoices,
        cs.average_payment_days,
        cs.last_payment_date,
        cs.risk_score,
        COUNT(DISTINCT i.id) as total_invoices_current,
        SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END) as paid_amount_current,
        SUM(CASE WHEN i.status IN ('sent', 'viewed', 'overdue') THEN i.total ELSE 0 END) as outstanding_amount_current
      FROM financial.clients c
      LEFT JOIN financial.client_statistics cs ON c.id = cs.client_id
      LEFT JOIN financial.invoices i ON c.id = i.client_id AND i.currency = $1
      WHERE ($2 = 'true' OR c.status = 'active')
      GROUP BY c.id, c.name, c.business_name, c.email, c.status, c.total_revenue, 
               c.total_invoices, c.outstanding_balance, c.last_invoice_date, 
               c.average_invoice_amount, c.payment_terms, cs.paid_invoices, 
               cs.pending_invoices, cs.overdue_invoices, cs.average_payment_days, 
               cs.last_payment_date, cs.risk_score
      ORDER BY 
        CASE WHEN $3 = 'total_revenue' THEN c.total_revenue END DESC,
        CASE WHEN $3 = 'outstanding_balance' THEN c.outstanding_balance END DESC,
        CASE WHEN $3 = 'risk_score' THEN 
          CASE cs.risk_score 
            WHEN 'high' THEN 3 
            WHEN 'medium' THEN 2 
            WHEN 'low' THEN 1 
            ELSE 0 
          END 
        END DESC,
        CASE WHEN $3 = 'last_invoice_date' THEN c.last_invoice_date END DESC
      LIMIT $4
    `;

    const clientMetricsResult = await databaseService.pool.query(clientMetricsQuery, [
      currency, 
      includeInactive, 
      sortBy, 
      parseInt(limit as string)
    ]);

    // Summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_clients,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_clients,
        COUNT(CASE WHEN status = 'prospect' THEN 1 END) as prospect_clients,
        AVG(total_revenue) as avg_client_revenue,
        AVG(outstanding_balance) as avg_outstanding_balance,
        SUM(total_revenue) as total_client_revenue,
        SUM(outstanding_balance) as total_outstanding_balance
      FROM financial.clients
    `;

    const summaryResult = await databaseService.pool.query(summaryQuery);
    const summary = summaryResult.rows[0];

    // Risk distribution
    const riskDistributionQuery = `
      SELECT 
        risk_score,
        COUNT(*) as count,
        SUM(c.total_revenue) as total_revenue,
        SUM(c.outstanding_balance) as total_outstanding
      FROM financial.client_statistics cs
      JOIN financial.clients c ON cs.client_id = c.id
      WHERE c.status = 'active'
      GROUP BY risk_score
    `;

    const riskDistributionResult = await databaseService.pool.query(riskDistributionQuery);

    // Payment behavior analysis
    const paymentBehaviorQuery = `
      SELECT 
        CASE 
          WHEN cs.average_payment_days <= c.payment_terms THEN 'on_time'
          WHEN cs.average_payment_days <= c.payment_terms + 7 THEN 'late_7_days'
          WHEN cs.average_payment_days <= c.payment_terms + 30 THEN 'late_30_days'
          ELSE 'very_late'
        END as payment_category,
        COUNT(*) as client_count,
        AVG(c.total_revenue) as avg_revenue
      FROM financial.clients c
      JOIN financial.client_statistics cs ON c.id = cs.client_id
      WHERE c.status = 'active' AND cs.average_payment_days IS NOT NULL
      GROUP BY payment_category
    `;

    const paymentBehaviorResult = await databaseService.pool.query(paymentBehaviorQuery);

    // Top revenue generating clients
    const topRevenueQuery = `
      SELECT 
        c.id,
        c.name,
        c.business_name,
        c.total_revenue,
        c.total_invoices,
        c.status,
        (c.total_revenue / tr.total_revenue * 100) as revenue_percentage
      FROM financial.clients c,
           (SELECT SUM(total_revenue) as total_revenue FROM financial.clients WHERE status = 'active') tr
      WHERE c.status = 'active' AND c.total_revenue > 0
      ORDER BY c.total_revenue DESC
      LIMIT 10
    `;

    const topRevenueResult = await databaseService.pool.query(topRevenueQuery);

    res.json({
      success: true,
      data: {
        summary: {
          totalClients: parseInt(summary.total_clients),
          activeClients: parseInt(summary.active_clients),
          inactiveClients: parseInt(summary.inactive_clients),
          suspendedClients: parseInt(summary.suspended_clients),
          prospectClients: parseInt(summary.prospect_clients),
          avgClientRevenue: parseFloat(summary.avg_client_revenue || 0).toFixed(2),
          avgOutstandingBalance: parseFloat(summary.avg_outstanding_balance || 0).toFixed(2),
          totalClientRevenue: parseFloat(summary.total_client_revenue || 0).toFixed(2),
          totalOutstandingBalance: parseFloat(summary.total_outstanding_balance || 0).toFixed(2)
        },
        clients: clientMetricsResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          businessName: row.business_name,
          email: row.email,
          status: row.status,
          totalRevenue: parseFloat(row.total_revenue || 0).toFixed(2),
          totalInvoices: parseInt(row.total_invoices || 0),
          outstandingBalance: parseFloat(row.outstanding_balance || 0).toFixed(2),
          lastInvoiceDate: row.last_invoice_date,
          averageInvoiceAmount: parseFloat(row.average_invoice_amount || 0).toFixed(2),
          paymentTerms: parseInt(row.payment_terms || 30),
          paidInvoices: parseInt(row.paid_invoices || 0),
          pendingInvoices: parseInt(row.pending_invoices || 0),
          overdueInvoices: parseInt(row.overdue_invoices || 0),
          averagePaymentDays: parseFloat(row.average_payment_days || 0).toFixed(1),
          lastPaymentDate: row.last_payment_date,
          riskScore: row.risk_score || 'low'
        })),
        riskDistribution: riskDistributionResult.rows.map(row => ({
          riskScore: row.risk_score,
          count: parseInt(row.count),
          totalRevenue: parseFloat(row.total_revenue || 0).toFixed(2),
          totalOutstanding: parseFloat(row.total_outstanding || 0).toFixed(2)
        })),
        paymentBehavior: paymentBehaviorResult.rows.map(row => ({
          category: row.payment_category,
          clientCount: parseInt(row.client_count),
          avgRevenue: parseFloat(row.avg_revenue || 0).toFixed(2)
        })),
        topRevenueClients: topRevenueResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          businessName: row.business_name,
          totalRevenue: parseFloat(row.total_revenue).toFixed(2),
          totalInvoices: parseInt(row.total_invoices),
          status: row.status,
          revenuePercentage: parseFloat(row.revenue_percentage || 0).toFixed(2)
        })),
        currency,
        generatedAt: new Date().toISOString(),
        service: 'sql'
      }
    });

  } catch (error) {
    console.error('Client metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get client metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// CASH FLOW PROJECTIONS ENDPOINT
// ============================================================================

/**
 * GET /api/financial/dashboard/cash-flow
 * Get cash flow projections based on outstanding invoices and payment history
 */
router.get('/cash-flow', authMiddleware, databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();
    
    const { 
      currency = 'EUR', 
      daysAhead = '90',
      includeTransactions = 'true'
    } = req.query;

    const projectionDays = parseInt(daysAhead as string);
    const today = new Date();
    const projectionEnd = new Date(today.getTime() + (projectionDays * 24 * 60 * 60 * 1000));

    // Current cash position from bank accounts
    const currentCashQuery = `
      SELECT 
        SUM(balance) as current_cash_balance
      FROM financial.accounts
      WHERE currency_id = (SELECT id FROM financial.currencies WHERE code = $1)
        AND is_active = true
        AND type = 'bank_account'
    `;

    const currentCashResult = await databaseService.pool.query(currentCashQuery, [currency]);
    const currentCash = parseFloat(currentCashResult.rows[0]?.current_cash_balance || 0);

    // Outstanding invoices projection
    const outstandingInvoicesQuery = `
      SELECT 
        i.id,
        i.invoice_number,
        i.client_name,
        i.total,
        i.due_date,
        i.status,
        c.payment_terms,
        cs.average_payment_days,
        cs.risk_score,
        -- Estimated payment date based on client payment history
        CASE 
          WHEN cs.average_payment_days IS NOT NULL THEN 
            i.issue_date + (cs.average_payment_days || ' days')::interval
          ELSE 
            i.due_date
        END as estimated_payment_date,
        -- Payment probability based on risk score and days overdue
        CASE 
          WHEN i.due_date < CURRENT_DATE THEN 
            CASE cs.risk_score 
              WHEN 'high' THEN 0.3 
              WHEN 'medium' THEN 0.6 
              ELSE 0.8 
            END
          ELSE 
            CASE cs.risk_score 
              WHEN 'high' THEN 0.7 
              WHEN 'medium' THEN 0.85 
              ELSE 0.95 
            END
        END as payment_probability
      FROM financial.invoices i
      JOIN financial.clients c ON i.client_id = c.id
      LEFT JOIN financial.client_statistics cs ON c.id = cs.client_id
      WHERE i.currency = $1 
        AND i.status IN ('sent', 'viewed', 'overdue')
        AND i.due_date <= $2
      ORDER BY i.due_date ASC
    `;

    const outstandingResult = await databaseService.pool.query(outstandingInvoicesQuery, [currency, projectionEnd]);

    // Recent transaction-based cash flow (if requested)
    let recentTransactions = [];
    if (includeTransactions === 'true') {
      const transactionsQuery = `
        SELECT 
          t.amount,
          t.date,
          t.description,
          t.counterparty_name,
          t.type
        FROM financial.transactions t
        JOIN financial.accounts a ON t.account_id = a.account_id
        WHERE a.currency_id = (SELECT id FROM financial.currencies WHERE code = $1)
          AND t.date >= $2
          AND t.status = 'confirmed'
        ORDER BY t.date DESC
        LIMIT 50
      `;

      const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
      const transactionsResult = await databaseService.pool.query(transactionsQuery, [currency, thirtyDaysAgo]);
      recentTransactions = transactionsResult.rows;
    }

    // Weekly cash flow projections
    const weeklyProjections = [];
    let runningBalance = currentCash;
    
    for (let week = 0; week < Math.ceil(projectionDays / 7); week++) {
      const weekStart = new Date(today.getTime() + (week * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(today.getTime() + ((week + 1) * 7 * 24 * 60 * 60 * 1000));
      
      // Calculate expected receipts for this week
      const weeklyInvoices = outstandingResult.rows.filter(invoice => {
        const paymentDate = new Date(invoice.estimated_payment_date);
        return paymentDate >= weekStart && paymentDate < weekEnd;
      });
      
      const expectedReceipts = weeklyInvoices.reduce((sum, invoice) => {
        return sum + (parseFloat(invoice.total) * parseFloat(invoice.payment_probability));
      }, 0);
      
      runningBalance += expectedReceipts;
      
      weeklyProjections.push({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        expectedReceipts: expectedReceipts.toFixed(2),
        projectedBalance: runningBalance.toFixed(2),
        invoicesCount: weeklyInvoices.length
      });
    }

    // Summary statistics
    const totalOutstanding = outstandingResult.rows.reduce((sum, invoice) => sum + parseFloat(invoice.total), 0);
    const expectedCollections = outstandingResult.rows.reduce((sum, invoice) => {
      return sum + (parseFloat(invoice.total) * parseFloat(invoice.payment_probability));
    }, 0);

    // Risk analysis
    const riskAnalysis = {
      highRisk: {
        count: outstandingResult.rows.filter(i => i.risk_score === 'high').length,
        amount: outstandingResult.rows
          .filter(i => i.risk_score === 'high')
          .reduce((sum, i) => sum + parseFloat(i.total), 0)
      },
      mediumRisk: {
        count: outstandingResult.rows.filter(i => i.risk_score === 'medium').length,
        amount: outstandingResult.rows
          .filter(i => i.risk_score === 'medium')
          .reduce((sum, i) => sum + parseFloat(i.total), 0)
      },
      lowRisk: {
        count: outstandingResult.rows.filter(i => i.risk_score === 'low' || !i.risk_score).length,
        amount: outstandingResult.rows
          .filter(i => i.risk_score === 'low' || !i.risk_score)
          .reduce((sum, i) => sum + parseFloat(i.total), 0)
      }
    };

    res.json({
      success: true,
      data: {
        currentPosition: {
          currentCashBalance: currentCash.toFixed(2),
          totalOutstanding: totalOutstanding.toFixed(2),
          expectedCollections: expectedCollections.toFixed(2),
          collectionRate: totalOutstanding > 0 ? ((expectedCollections / totalOutstanding) * 100).toFixed(2) : '0.00'
        },
        projectionPeriod: {
          daysAhead: projectionDays,
          startDate: today.toISOString(),
          endDate: projectionEnd.toISOString()
        },
        weeklyProjections,
        outstandingInvoices: outstandingResult.rows.map(row => ({
          id: row.id,
          invoiceNumber: row.invoice_number,
          clientName: row.client_name,
          total: parseFloat(row.total).toFixed(2),
          dueDate: row.due_date,
          status: row.status,
          estimatedPaymentDate: row.estimated_payment_date,
          paymentProbability: parseFloat(row.payment_probability).toFixed(2),
          riskScore: row.risk_score || 'low'
        })),
        riskAnalysis: {
          highRisk: {
            count: riskAnalysis.highRisk.count,
            amount: riskAnalysis.highRisk.amount.toFixed(2)
          },
          mediumRisk: {
            count: riskAnalysis.mediumRisk.count,
            amount: riskAnalysis.mediumRisk.amount.toFixed(2)
          },
          lowRisk: {
            count: riskAnalysis.lowRisk.count,
            amount: riskAnalysis.lowRisk.amount.toFixed(2)
          }
        },
        recentTransactions: recentTransactions.map(tx => ({
          amount: parseFloat(tx.amount).toFixed(2),
          date: tx.date,
          description: tx.description,
          counterpartyName: tx.counterparty_name,
          type: tx.type
        })),
        currency,
        generatedAt: new Date().toISOString(),
        service: 'sql'
      }
    });

  } catch (error) {
    console.error('Cash flow projection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cash flow projections',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// YEARLY FINANCIAL REPORT ENDPOINT
// ============================================================================

/**
 * GET /api/financial/dashboard/yearly-report
 * Get yearly financial report with income/expense matrix by category and month
 */
router.get('/yearly-report', authMiddleware, databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();
    
    const { 
      year = new Date().getFullYear().toString(), 
      currency = 'EUR' 
    } = req.query;

    // Import reporting service
    const { FinancialReportingService } = await import('../../services/financial/reporting.service');
    
    // Create reporting service instance with database pool
    const reportingService = new FinancialReportingService(databaseService.pool);
    
    // Get yearly report
    const yearlyReport = await reportingService.getYearlyFinancialReport(
      parseInt(year as string), 
      currency as string
    );

    res.json({
      success: true,
      data: yearlyReport,
      service: 'sql'
    });

  } catch (error) {
    console.error('Yearly report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate yearly financial report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/financial/dashboard/health
 * Health check for dashboard endpoints
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();
    
    // Test database connection
    await databaseService.pool.query('SELECT NOW()');
    
    // Check feature flags
    const featureStatus = {
      prismaEnabled: featureFlags.isEnabled('USE_PRISMA_DASHBOARD'),
      validationEnabled: featureFlags.isEnabled('ENABLE_SQL_VALIDATION'),
      performanceLoggingEnabled: featureFlags.isEnabled('LOG_QUERY_PERFORMANCE')
    };
    
    res.json({
      success: true,
      status: 'healthy',
      services: {
        database: 'connected',
        prisma: featureStatus.prismaEnabled ? 'enabled' : 'disabled',
        endpoints: [
          'metrics',
          'revenue-metrics',
          'invoice-stats', 
          'client-metrics',
          'cash-flow',
          'yearly-report'
        ]
      },
      featureFlags: featureStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;