// Financial API Routes - GoCardless Integration + Client Management
import { Router, Request, Response, NextFunction } from 'express';
import { GoCardlessService } from '../services/financial/gocardless.service';
import { FinancialDatabaseService } from '../services/financial/database.service';
import { FinancialSchedulerService } from '../services/financial/scheduler.service';
import { FinancialReportingService } from '../services/financial/reporting.service';
import { TransactionMatchingService } from '../services/financial/transaction-matching.service';
import clientsRoutes from './financial/clients.routes';
import invoicesRoutes from './financial/invoices.routes';
import transactionsRoutes, { setDatabaseService as setTransactionDbService } from './financial/transactions.routes';
import dashboardRoutes from './financial/dashboard.routes';

const router = Router();

// Initialize services (these would be injected in a real app)
let goCardlessService: GoCardlessService;
let databaseService: FinancialDatabaseService;
let schedulerService: FinancialSchedulerService;
let reportingService: FinancialReportingService;
let transactionMatchingService: TransactionMatchingService;

// Initialize services with config
const initializeServices = () => {
  if (!goCardlessService) {
    const config = {
      secretId: process.env.GO_SECRET_ID || '',
      secretKey: process.env.GO_SECRET_KEY || '',
      baseUrl: 'https://bankaccountdata.gocardless.com/api/v2',
      redirectUri: process.env.GO_REDIRECT_URI || 'https://localhost:3000/callback'
    };

    // Validate required environment variables
    const requiredEnvVars = ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}. Please set them in .env.local`);
    }

    const dbConfig = {
      host: process.env.POSTGRES_HOST!,
      port: parseInt(process.env.POSTGRES_PORT!),
      database: process.env.POSTGRES_DB!,
      user: process.env.POSTGRES_USER!,
      password: process.env.POSTGRES_PASSWORD!
    };

    databaseService = new FinancialDatabaseService(dbConfig);
    goCardlessService = new GoCardlessService(config, databaseService);
    schedulerService = new FinancialSchedulerService(goCardlessService, databaseService);
    reportingService = new FinancialReportingService(databaseService.pool);
    transactionMatchingService = new TransactionMatchingService(databaseService.pool);
    
    // Set transaction matching service in controllers
    setTransactionDbService(databaseService);
    
    // Get client controller instance and set transaction matching service
    const ClientsController = require('./financial/clients.controller').ClientsController;
    const clientsController = new ClientsController();
    clientsController.setTransactionMatchingService(transactionMatchingService);
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
    console.log('[setup-bbva] Initializing BBVA account setup process');
    initializeServices();
    
    const result = await goCardlessService.setupBBVAAccount();
    
    if (result.success) {
      console.log(`[setup-bbva] Setup initiated successfully. Requisition ID: ${result.data?.requisitionId}`);
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
      console.error(`[setup-bbva] Setup failed: ${result.error}`);
      res.status(400).json({
        ...result,
        message: 'Failed to initiate BBVA account setup. Please check your configuration and try again.'
      });
    }
  } catch (error) {
    console.error('[setup-bbva] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup BBVA account',
      details: error instanceof Error ? error.message : 'Unknown error',
      message: 'An unexpected error occurred while setting up your BBVA account. Please try again later.'
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
      console.error('[complete-setup] Missing requisitionId in request body');
      res.status(400).json({
        success: false,
        error: 'requisitionId is required',
        message: 'Please provide a valid requisitionId in the request body'
      });
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(requisitionId)) {
      console.error(`[complete-setup] Invalid requisitionId format: ${requisitionId}`);
      res.status(400).json({
        success: false,
        error: 'Invalid requisitionId format',
        message: 'The requisitionId must be a valid UUID (e.g., 123e4567-e89b-12d3-a456-426614174000)'
      });
      return;
    }

    console.log(`[complete-setup] Starting setup completion for requisition: ${requisitionId}`);
    
    const result = await goCardlessService.completeSetup(requisitionId);
    
    if (result.success) {
      console.log(`[complete-setup] Setup completed successfully. Accounts: ${result.data!.accounts.length}, Transactions: ${result.data!.transactionsSynced}`);
      
      // Start the scheduler after successful setup
      if (!schedulerService.isActive()) {
        console.log('[complete-setup] Starting scheduler service...');
        schedulerService.start();
      }
      
      res.json({
        success: true,
        data: result.data,
        message: `Setup completed! ${result.data!.accounts.length} accounts configured with ${result.data!.transactionsSynced} transactions synced`,
        schedulerStatus: 'Automatic sync started (2x/day)'
      });
    } else {
      console.error(`[complete-setup] Setup failed: ${result.error}`);
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[complete-setup] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete setup',
      details: error instanceof Error ? error.message : 'Unknown error',
      message: 'An unexpected error occurred while completing the setup. Please try again later.'
    });
  }
});

/**
 * GET /api/financial/requisition-status/:requisitionId
 * Check the status of a requisition including consent status and linked accounts
 */
router.get('/requisition-status/:requisitionId', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { requisitionId } = req.params;
    
    if (!requisitionId) {
      console.error('[requisition-status] Missing requisitionId in URL parameters');
      res.status(400).json({
        success: false,
        error: 'requisitionId is required',
        message: 'Please provide a valid requisitionId in the URL path'
      });
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(requisitionId)) {
      console.error(`[requisition-status] Invalid requisitionId format: ${requisitionId}`);
      res.status(400).json({
        success: false,
        error: 'Invalid requisitionId format',
        message: 'The requisitionId must be a valid UUID (e.g., 123e4567-e89b-12d3-a456-426614174000)'
      });
      return;
    }

    console.log(`[requisition-status] Checking status for requisition: ${requisitionId}`);
    
    // Get requisition status from GoCardless
    const requisitionStatus = await goCardlessService.getRequisitionStatus(requisitionId);
    
    if (!requisitionStatus.success) {
      console.error(`[requisition-status] Failed to get requisition status: ${requisitionStatus.error}`);
      res.status(404).json({
        success: false,
        error: requisitionStatus.error || 'Requisition not found',
        message: 'Unable to retrieve requisition status. It may not exist or may have expired.'
      });
      return;
    }

    console.log(`[requisition-status] Retrieved status successfully. Status: ${requisitionStatus.data?.status}, Accounts: ${requisitionStatus.data?.accounts?.length || 0}`);
    
    // Check if requisition exists in our database
    let isSetupComplete = false;
    let localAccountsCount = 0;
    
    try {
      const dbCheckQuery = `
        SELECT COUNT(DISTINCT a.id) as account_count
        FROM financial.accounts a
        WHERE a.requisition_id = $1
      `;
      const dbResult = await databaseService.pool.query(dbCheckQuery, [requisitionId]);
      localAccountsCount = parseInt(dbResult.rows[0].account_count);
      isSetupComplete = localAccountsCount > 0;
      
      console.log(`[requisition-status] Database check - Accounts found: ${localAccountsCount}, Setup complete: ${isSetupComplete}`);
    } catch (dbError) {
      console.error('[requisition-status] Database check failed:', dbError);
      // Continue without database info
    }

    // Build comprehensive status response
    const response = {
      success: true,
      data: {
        requisitionId: requisitionId,
        status: requisitionStatus.data?.status || 'unknown',
        consentGiven: requisitionStatus.data?.status === 'LN' || requisitionStatus.data?.status === 'LINKED',
        consentUrl: requisitionStatus.data?.link || null,
        accounts: requisitionStatus.data?.accounts || [],
        accountsCount: requisitionStatus.data?.accounts?.length || 0,
        createdAt: null, // GoCardless doesn't provide creation date in the response
        statusDetails: {
          isExpired: requisitionStatus.data?.status === 'EX',
          isGivingConsent: requisitionStatus.data?.status === 'GC',
          isUndergoingAuthentication: requisitionStatus.data?.status === 'UA',
          isLinked: requisitionStatus.data?.status === 'LN' || requisitionStatus.data?.status === 'LINKED',
          isRejected: requisitionStatus.data?.status === 'RJ',
          isSuspended: requisitionStatus.data?.status === 'SU'
        },
        setupStatus: {
          isSetupComplete: isSetupComplete,
          localAccountsCount: localAccountsCount,
          requiresSetup: requisitionStatus.data?.status === 'LN' && !isSetupComplete
        }
      },
      message: getStatusMessage(requisitionStatus.data?.status, isSetupComplete)
    };

    res.json(response);
  } catch (error) {
    console.error('[requisition-status] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check requisition status',
      details: error instanceof Error ? error.message : 'Unknown error',
      message: 'An unexpected error occurred while checking the requisition status. Please try again later.'
    });
  }
});

/**
 * Helper function to generate user-friendly status messages
 */
function getStatusMessage(status: string | undefined, isSetupComplete: boolean): string {
  if (!status) return 'Unable to determine requisition status';
  
  const statusMessages: { [key: string]: string } = {
    'CR': 'Requisition created. Please visit the consent URL to authorize account access.',
    'GC': 'Currently giving consent. Please complete the authorization process.',
    'UA': 'Undergoing authentication. Please complete the bank authentication.',
    'LN': isSetupComplete 
      ? 'Account is linked and setup is complete. You can now access your financial data.'
      : 'Account is linked but setup is not complete. Please call /complete-setup to finish configuration.',
    'LINKED': isSetupComplete 
      ? 'Account is linked and setup is complete. You can now access your financial data.'
      : 'Account is linked but setup is not complete. Please call /complete-setup to finish configuration.',
    'EX': 'Requisition has expired. Please create a new requisition.',
    'RJ': 'Consent was rejected. Please create a new requisition and grant the necessary permissions.',
    'SU': 'Account access is suspended. Please contact support or create a new requisition.'
  };
  
  return statusMessages[status] || `Unknown status: ${status}`;
}

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

// ============================================================================
// CATEGORIZATION & AI
// ============================================================================

/**
 * GET /api/financial/categories
 * Get all categories with optional filtering by type
 */
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { type } = req.query;
    const categories = await reportingService.getCategories(type as any);
    
    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('Get categories failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/categories/:id/subcategories
 * Get subcategories for a specific category
 */
router.get('/categories/:id/subcategories', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { id } = req.params;
    const subcategories = await reportingService.getSubcategories(id);
    
    res.json({
      success: true,
      data: subcategories,
      count: subcategories.length
    });
  } catch (error) {
    console.error('Get subcategories failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subcategories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/financial/categorize/auto
 * Auto-categorize uncategorized transactions using AI
 */
router.post('/categorize/auto', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { transactionIds } = req.body;
    const categorizedCount = await reportingService.autoCategorizeTransactions(transactionIds);
    
    res.json({
      success: true,
      data: {
        categorizedCount,
        message: `Successfully categorized ${categorizedCount} transactions`
      }
    });
  } catch (error) {
    console.error('Auto-categorization failed:', error);
    res.status(500).json({
      success: false,
      error: 'Auto-categorization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/financial/transactions/:id/categorize
 * Manually categorize a specific transaction
 */
router.post('/transactions/:id/categorize', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { id } = req.params;
    const { categoryId, subcategoryId, notes } = req.body;
    
    const categorization = await reportingService.categorizeTransaction(
      id,
      categoryId,
      subcategoryId,
      'manual',
      undefined,
      undefined,
      notes
    );
    
    res.json({
      success: true,
      data: categorization,
      message: 'Transaction categorized successfully'
    });
  } catch (error) {
    console.error('Manual categorization failed:', error);
    res.status(500).json({
      success: false,
      error: 'Manual categorization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/transactions/categorized
 * Get categorized transactions with advanced filtering
 */
router.get('/transactions/categorized', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const {
      startDate,
      endDate,
      categoryId,
      subcategoryId,
      accountId,
      currency,
      page = '1',
      limit = '50'
    } = req.query;

    const params = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      categoryId: categoryId as string,
      subcategoryId: subcategoryId as string,
      accountId: accountId as string,
      currency: currency as string,
      limit: parseInt(limit as string),
      offset: (parseInt(page as string) - 1) * parseInt(limit as string)
    };

    const result = await reportingService.getCategorizedTransactions(params);
    
    res.json({
      success: true,
      data: {
        transactions: result.transactions,
        pagination: {
          total: result.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          hasNext: result.total > params.offset + params.limit,
          hasPrev: params.offset > 0
        }
      }
    });
  } catch (error) {
    console.error('Get categorized transactions failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categorized transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// REPORTING & ANALYTICS
// ============================================================================

/**
 * GET /api/financial/reports/comprehensive
 * Generate comprehensive financial report
 */
router.get('/reports/comprehensive', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const {
      startDate,
      endDate,
      currency = 'EUR',
      categoryId,
      subcategoryId,
      accountId
    } = req.query;

    const params = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      currency: currency as string,
      categoryId: categoryId as string,
      subcategoryId: subcategoryId as string,
      accountId: accountId as string
    };

    const report = await reportingService.generateReport(params);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Generate report failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/metrics/realtime
 * Get real-time financial metrics and dashboard data
 */
router.get('/metrics/realtime', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const {
      period = 'month',
      currency = 'EUR',
      includeProjections = 'false',
      includeTrends = 'true'
    } = req.query;

    const params = {
      period: period as any,
      currency: currency as string,
      includeProjections: includeProjections === 'true',
      includeTrends: includeTrends === 'true'
    };

    const metrics = await reportingService.getRealtimeMetrics(params);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get realtime metrics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get realtime metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/analytics/monthly-summary
 * Get monthly category summaries for a date range
 */
router.get('/analytics/monthly-summary', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const {
      startDate,
      endDate,
      currency = 'EUR'
    } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
      return;
    }

    const summary = await reportingService.getMonthlyCategorySummary(
      new Date(startDate as string),
      new Date(endDate as string),
      currency as string
    );
    
    res.json({
      success: true,
      data: summary,
      count: summary.length
    });
  } catch (error) {
    console.error('Get monthly summary failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get monthly summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/insights/accounts
 * Get account insights with 30-day activity metrics
 */
router.get('/insights/accounts', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const insights = await reportingService.getAccountInsights();
    
    res.json({
      success: true,
      data: insights,
      count: insights.length
    });
  } catch (error) {
    console.error('Get account insights failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get account insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// QUICK REPORTS FOR DASHBOARD
// ============================================================================

/**
 * GET /api/financial/dashboard/overview
 * Get dashboard overview with key metrics
 */
router.get('/dashboard/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { currency = 'EUR' } = req.query;
    
    // Get current month metrics
    const metrics = await reportingService.getRealtimeMetrics({ 
      currency: currency as string 
    });
    
    // Get account insights
    const accountInsights = await reportingService.getAccountInsights();
    
    // Get categories for quick access
    const categories = await reportingService.getCategories();
    
    res.json({
      success: true,
      data: {
        metrics: {
          currentMonth: metrics.currentMonth,
          trends: metrics.trends,
          topExpenseCategories: metrics.topExpenseCategories.slice(0, 5)
        },
        accounts: {
          total: accountInsights.length,
          totalBalance: accountInsights.reduce((sum, acc) => 
            sum + parseFloat(acc.balance), 0
          ).toFixed(2),
          insights: accountInsights.slice(0, 3) // Top 3 accounts
        },
        categories: {
          income: categories.filter(c => c.type === 'income').length,
          expense: categories.filter(c => c.type === 'expense').length,
          transfer: categories.filter(c => c.type === 'transfer').length
        },
        recentTransactions: metrics.recentTransactions.slice(0, 10),
        alerts: metrics.alerts,
        lastUpdated: metrics.updatedAt
      }
    });
  } catch (error) {
    console.error('Get dashboard overview failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard overview',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/dashboard/quick-stats
 * Get quick financial statistics for widgets
 */
router.get('/dashboard/quick-stats', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    const { currency = 'EUR', period = 'month' } = req.query;
    
    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Get current and previous period for comparison
    const [currentReport, previousReport] = await Promise.all([
      reportingService.generateReport({
        startDate: currentStart,
        endDate: currentEnd,
        currency: currency as string
      }),
      reportingService.generateReport({
        startDate: previousStart,
        endDate: previousEnd,
        currency: currency as string
      })
    ]);
    
    // Calculate changes
    const incomeChange = previousReport.summary.totalIncome !== '0' 
      ? ((parseFloat(currentReport.summary.totalIncome) - parseFloat(previousReport.summary.totalIncome)) / parseFloat(previousReport.summary.totalIncome)) * 100
      : 0;
      
    const expenseChange = previousReport.summary.totalExpenses !== '0'
      ? ((parseFloat(currentReport.summary.totalExpenses) - parseFloat(previousReport.summary.totalExpenses)) / parseFloat(previousReport.summary.totalExpenses)) * 100
      : 0;
    
    res.json({
      success: true,
      data: {
        current: {
          income: currentReport.summary.totalIncome,
          expenses: currentReport.summary.totalExpenses,
          net: currentReport.summary.netAmount,
          transactions: currentReport.summary.transactionCount
        },
        previous: {
          income: previousReport.summary.totalIncome,
          expenses: previousReport.summary.totalExpenses,
          net: previousReport.summary.netAmount,
          transactions: previousReport.summary.transactionCount
        },
        changes: {
          income: incomeChange,
          expenses: expenseChange,
          net: previousReport.summary.netAmount !== '0' 
            ? ((parseFloat(currentReport.summary.netAmount) - parseFloat(previousReport.summary.netAmount)) / Math.abs(parseFloat(previousReport.summary.netAmount))) * 100
            : 0
        },
        period: {
          current: { start: currentStart, end: currentEnd },
          previous: { start: previousStart, end: previousEnd }
        },
        currency: currency as string,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Get quick stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get quick stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// DASHBOARD INTEGRATION
// ============================================================================

/**
 * GET /api/financial/dashboard/overview
 * Get comprehensive dashboard data for web interface
 */
router.get('/dashboard/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    initializeServices();
    
    // Current month calculations
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Get current month metrics
    const currentMetricsQuery = `
        SELECT 
            COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) as expenses,
            COUNT(*) as transaction_count
        FROM financial.transactions t
        WHERE t.date >= $1 AND t.date <= $2 AND t.status = 'confirmed'
    `;
    
    const [currentResult, previousResult] = await Promise.all([
        databaseService.pool.query(currentMetricsQuery, [currentMonthStart, currentMonthEnd]),
        databaseService.pool.query(currentMetricsQuery, [previousMonthStart, previousMonthEnd])
    ]);
    
    const current = currentResult.rows[0];
    const previous = previousResult.rows[0];
    
    const currentIncome = parseFloat(current.income);
    const currentExpenses = parseFloat(current.expenses);
    const currentBalance = currentIncome - currentExpenses;
    
    const previousIncome = parseFloat(previous.income);
    const previousExpenses = parseFloat(previous.expenses);
    const previousBalance = previousIncome - previousExpenses;
    
    // Calculate trends
    const incomeChange = previousIncome > 0 ? ((currentIncome - previousIncome) / previousIncome) * 100 : 0;
    const expenseChange = previousExpenses > 0 ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 : 0;
    const balanceChange = previousBalance !== 0 ? ((currentBalance - previousBalance) / Math.abs(previousBalance)) * 100 : 0;
    
    // Get top expense categories
    const topCategoriesQuery = `
        SELECT 
            c.name as category_name,
            SUM(ABS(t.amount)) as amount
        FROM financial.transactions t
        JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
        JOIN financial.categories c ON tc.category_id = c.id
        WHERE t.date >= $1 AND t.date <= $2 
            AND t.amount < 0 
            AND t.status = 'confirmed'
            AND c.type = 'expense'
        GROUP BY c.id, c.name
        ORDER BY amount DESC
        LIMIT 5
    `;
    
    const topCategoriesResult = await databaseService.pool.query(topCategoriesQuery, [currentMonthStart, currentMonthEnd]);
    
    // Get recent transactions
    const recentTransactionsQuery = `
        SELECT 
            t.id,
            t.description,
            t.counterparty_name,
            t.amount,
            t.date,
            c.name as category_name,
            c.type as category_type
        FROM financial.transactions t
        LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
        LEFT JOIN financial.categories c ON tc.category_id = c.id
        WHERE t.status = 'confirmed'
        ORDER BY t.date DESC
        LIMIT 10
    `;
    
    const recentTransactionsResult = await databaseService.pool.query(recentTransactionsQuery);
    
    // Get account balances
    const accountsQuery = `
        SELECT 
            COUNT(*) as total_accounts,
            SUM(balance) as total_balance
        FROM financial.accounts
        WHERE is_active = true
    `;
    
    const accountsResult = await databaseService.pool.query(accountsQuery);
    const accounts = accountsResult.rows[0];
    
    // Build dashboard response
    res.json({
      success: true,
      data: {
        metrics: {
          currentMonth: {
            income: currentIncome.toFixed(2),
            expenses: currentExpenses.toFixed(2),
            balance: currentBalance.toFixed(2),
            transactionCount: parseInt(current.transaction_count)
          },
          trends: {
            incomeChange: parseFloat(incomeChange.toFixed(1)),
            expenseChange: parseFloat(expenseChange.toFixed(1)),
            balanceChange: parseFloat(balanceChange.toFixed(1))
          },
          topExpenseCategories: topCategoriesResult.rows.map(row => ({
            categoryName: row.category_name,
            amount: parseFloat(row.amount).toFixed(2)
          }))
        },
        accounts: {
          total: parseInt(accounts.total_accounts),
          totalBalance: parseFloat(accounts.total_balance).toFixed(2)
        },
        recentTransactions: recentTransactionsResult.rows.map(row => ({
          id: row.id,
          counterpartyName: row.counterparty_name || 'Transferencia',
          description: row.description ? row.description.substring(0, 50) + '...' : 'N/A',
          amount: parseFloat(row.amount).toFixed(2),
          date: row.date.toISOString(),
          categoryName: row.category_name
        })),
        alerts: [],
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Dashboard overview failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// CLIENT & INVOICE MANAGEMENT
// ============================================================================

// Mount client management routes
router.use('/clients', clientsRoutes);

// Mount invoice management routes
router.use('/invoices', invoicesRoutes);

// Mount transaction management routes
router.use('/transactions', transactionsRoutes);

// Mount enhanced dashboard routes
router.use('/dashboard', dashboardRoutes);

// ============================================================================
// METRICS & MONITORING
// ============================================================================

import { metricsService } from '../services/metrics';
import { logger } from '../utils/log';

// Performance metrics endpoint
router.get('/metrics/performance', async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const report = await metricsService.getPerformanceReport(hours);
    res.json(report);
  } catch (error: any) {
    logger.error('Error getting performance report:', error);
    res.status(500).json({
      error: 'Failed to get performance report',
      message: error.message
    });
  }
});

// Alerts endpoint
router.get('/metrics/alerts', async (req: Request, res: Response) => {
  try {
    const alerts = await metricsService.checkAlerts();
    res.json({
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error checking alerts:', error);
    res.status(500).json({
      error: 'Failed to check alerts',
      message: error.message
    });
  }
});

export default router;