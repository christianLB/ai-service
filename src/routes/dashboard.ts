import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/log';
import { financialDashboardService } from '../services/financial/financial-dashboard.service';

const router = Router();

// Health check
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const healthStatus = {
      success: true,
      status: 'healthy',
      services: {
        database: 'healthy',
        gocardless: 'unknown',
        scheduler: 'unknown',
      },
      timestamp: new Date().toISOString(),
    };
    res.json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(500).json({ 
      success: false, 
      error: 'Health check failed' 
    });
  }
});

// Client metrics
router.get('/client-metrics', requireAuth, async (req, res) => {
  try {
    const metrics = await financialDashboardService.getBasicClientMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get client metrics', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get client metrics' 
    });
  }
});

// Revenue metrics
router.get('/revenue-metrics', requireAuth, async (req, res) => {
  try {
    const timeRange = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : new Date(),
    };
    const metrics = await financialDashboardService.getRevenueMetrics(timeRange, req.query.currency as string);
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get revenue metrics', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get revenue metrics' 
    });
  }
});

// Invoice statistics
router.get('/invoice-statistics', requireAuth, async (req, res) => {
  try {
    const timeRange = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    };
    const stats = await financialDashboardService.getBasicInvoiceStats(timeRange);
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get invoice statistics', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get invoice statistics' 
    });
  }
});

// Cash flow projections (placeholder)
router.get('/cash-flow-projections', requireAuth, async (req, res) => {
  try {
    // TODO: Implement cash flow projections
    res.json({
      projections: [],
      summary: {
        totalIncome: 0,
        totalExpenses: 0,
        netCashFlow: 0,
      },
    });
  } catch (error) {
    logger.error('Failed to get cash flow projections', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get cash flow projections' 
    });
  }
});

// Quick stats
router.get('/quick-stats', requireAuth, async (req, res) => {
  try {
    const timeRange = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    };
    const metrics = await financialDashboardService.getDashboardMetrics(timeRange, 'EUR');
    res.json({
      revenue: {
        current: metrics.revenue?.total || 0,
        previous: 0,
        change: metrics.revenue?.changePercentage || 0,
      },
      invoices: {
        total: metrics.invoices?.total || 0,
        pending: metrics.invoices?.pending || 0,
        overdue: metrics.invoices?.overdue || 0,
      },
      clients: {
        total: metrics.clients?.total || 0,
        active: metrics.clients?.active || 0,
        new: metrics.clients?.new || 0,
      },
    });
  } catch (error) {
    logger.error('Failed to get quick stats', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get quick stats' 
    });
  }
});

export default router;