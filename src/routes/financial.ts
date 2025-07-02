// Financial API Routes - GoCardless Integration
import { Router, Request, Response, NextFunction } from 'express';
import { GoCardlessService } from '../services/financial/gocardless.service';
import { FinancialDatabaseService } from '../services/financial/database.service';
import { FinancialSchedulerService } from '../services/financial/scheduler.service';

const router = Router();

// Initialize services (these would be injected in a real app)
let goCardlessService: GoCardlessService;
let databaseService: FinancialDatabaseService;
let schedulerService: FinancialSchedulerService;

// Initialize services with config
const initializeServices = () => {
  if (!goCardlessService) {
    const config = {
      secretId: process.env.GO_SECRET_ID || '',
      secretKey: process.env.GO_SECRET_KEY || '',
      baseUrl: 'https://bankaccountdata.gocardless.com/api/v2',
      redirectUri: process.env.GO_REDIRECT_URI || 'https://localhost:3000/callback'
    };

    const dbConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'ai_service',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres'
    };

    databaseService = new FinancialDatabaseService(dbConfig);
    goCardlessService = new GoCardlessService(config, databaseService);
    schedulerService = new FinancialSchedulerService(goCardlessService, databaseService);
  }
};

// ============================================================================
// SETUP AND CONFIGURATION
// ============================================================================

/**
 * POST /api/financial/setup-bbva
 * Start BBVA account setup process
 */
router.post('/setup-bbva', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const result = await goCardlessService.setupBBVAAccount();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'Visit the consentUrl to authorize access to your BBVA account',
        instructions: [
          '1. Open the consentUrl in your browser',
          '2. Login to your BBVA account',
          '3. Grant consent for account access',
          '4. Call POST /api/financial/complete-setup with the requisitionId'
        ]
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Setup BBVA failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup BBVA account',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/financial/complete-setup
 * Complete the setup after user consent
 */
router.post('/complete-setup', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { requisitionId } = req.body;
    
    if (!requisitionId) {
      res.status(400).json({
        success: false,
        error: 'requisitionId is required'
      });
      return;
    }

    console.log(`Completing setup for requisition: ${requisitionId}`);
    
    const result = await goCardlessService.completeSetup(requisitionId);
    
    if (result.success) {
      // Start the scheduler after successful setup
      if (!schedulerService.isActive()) {
        schedulerService.start();
      }
      
      res.json({
        success: true,
        data: result.data,
        message: `Setup completed! ${result.data!.accounts.length} accounts configured with ${result.data!.transactionsSynced} transactions synced`,
        schedulerStatus: 'Automatic sync started (2x/day)'
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Complete setup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete setup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ACCOUNT MANAGEMENT
// ============================================================================

/**
 * GET /api/financial/accounts
 * Get all financial accounts
 */
router.get('/accounts', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const accounts = await databaseService.getAccounts();
    
    res.json({
      success: true,
      data: accounts,
      count: accounts.length
    });
  } catch (error) {
    console.error('Get accounts failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get accounts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/accounts/:id
 * Get specific account details
 */
router.get('/accounts/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { id } = req.params;
    const account = await databaseService.getAccountById(id);
    
    if (!account) {
      res.status(404).json({
        success: false,
        error: 'Account not found'
      });
      return;
    }

    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Get account failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get account',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/account-status
 * Get status of all accounts including sync info
 */
router.get('/account-status', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const result = await goCardlessService.getAccountStatus();
    
    res.json(result);
  } catch (error) {
    console.error('Get account status failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get account status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// TRANSACTION MANAGEMENT
// ============================================================================

/**
 * GET /api/financial/transactions
 * Get transactions with optional account filter
 */
router.get('/transactions', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { accountId, page = '1', limit = '50' } = req.query;
    
    const result = await databaseService.getTransactions(
      accountId as string,
      parseInt(page as string),
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get transactions failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/transactions/:id
 * Get specific transaction details
 */
router.get('/transactions/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { id } = req.params;
    const transaction = await databaseService.getTransactionById(id);
    
    if (!transaction) {
      res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
      return;
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get transaction failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// SYNC MANAGEMENT
// ============================================================================

/**
 * POST /api/financial/sync
 * Perform manual sync of all accounts
 */
router.post('/sync', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    console.log('Manual sync requested');
    const result = await schedulerService.performManualSync();
    
    res.json({
      success: true,
      data: result.data,
      message: 'Manual sync completed successfully'
    });
  } catch (error) {
    console.error('Manual sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Manual sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/sync-status
 * Get scheduler status and recent sync history
 */
router.get('/sync-status', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const schedulerStatus = schedulerService.getSchedulerStatus();
    const syncStats = await schedulerService.getSyncStats(7); // Last 7 days
    
    res.json({
      success: true,
      data: {
        scheduler: schedulerStatus,
        stats: syncStats
      }
    });
  } catch (error) {
    console.error('Get sync status failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/financial/scheduler/start
 * Start the automatic scheduler
 */
router.post('/scheduler/start', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    if (schedulerService.isActive()) {
      res.json({
        success: true,
        message: 'Scheduler is already running'
      });
      return;
    }

    schedulerService.start();
    
    res.json({
      success: true,
      message: 'Scheduler started successfully',
      status: schedulerService.getSchedulerStatus()
    });
  } catch (error) {
    console.error('Start scheduler failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start scheduler',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/financial/scheduler/stop
 * Stop the automatic scheduler
 */
router.post('/scheduler/stop', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    if (!schedulerService.isActive()) {
      res.json({
        success: true,
        message: 'Scheduler is not running'
      });
      return;
    }

    schedulerService.stop();
    
    res.json({
      success: true,
      message: 'Scheduler stopped successfully',
      status: schedulerService.getSchedulerStatus()
    });
  } catch (error) {
    console.error('Stop scheduler failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop scheduler',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// REPORTING
// ============================================================================

/**
 * GET /api/financial/summary
 * Get financial summary
 */
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    // Get account summaries
    const accounts = await databaseService.getAccounts();
    const summaries = await Promise.all(
      accounts.map(account => databaseService.getAccountSummary(account.id))
    );

    // Get unpaid invoices
    const unpaidInvoices = await databaseService.getUnpaidInvoices();

    // Calculate totals
    const totalBalance = summaries.reduce((sum, summary) => {
      return sum + parseFloat(summary?.balance || '0');
    }, 0);

    const totalUnpaid = unpaidInvoices.reduce((sum, invoice) => {
      return sum + parseFloat(invoice.totalAmount) - parseFloat(invoice.amountPaid);
    }, 0);

    res.json({
      success: true,
      data: {
        accounts: {
          count: accounts.length,
          totalBalance: totalBalance.toFixed(2),
          summaries
        },
        invoices: {
          unpaidCount: unpaidInvoices.length,
          totalUnpaid: totalUnpaid.toFixed(2),
          unpaidInvoices
        },
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get financial summary failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get financial summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/financial/health
 * Health check for financial services
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    // Test database connection
    await databaseService.query('SELECT NOW()');
    
    // Test GoCardless authentication
    await goCardlessService.authenticate();
    
    res.json({
      success: true,
      status: 'healthy',
      services: {
        database: 'connected',
        gocardless: 'authenticated',
        scheduler: schedulerService.isActive() ? 'running' : 'stopped'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;