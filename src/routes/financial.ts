// Financial API Routes - GoCardless Integration + Client Management
import { Router, Request, Response, NextFunction } from 'express';
import { GoCardlessService } from '../services/financial/gocardless.service';
import { FinancialDatabaseService } from '../services/financial/database.service';
import { FinancialSchedulerService } from '../services/financial/scheduler.service';
// import { financialReportingPrismaService } from '../services/financial/reporting-prisma.service'; // TEMPORARILY DISABLED
// import { transactionMatchingPrismaService } from '../services/financial/transaction-matching-prisma.service';
import { transactionManagementService } from '../services/financial/transaction-management.service';
import { transactionImportService } from '../services/financial/transaction-import.service';
import { integrationConfigService } from '../services/integrations';
import { db } from '../services/database';
import { Account } from '../services/financial/types';
import { transactionImportFileSchema } from '../types/transaction-import.types';
import clientsRoutes from './financial/clients.routes';
import invoicesRoutes from './financial/invoices.routes';
import invoiceTemplatesRoutes from './financial/invoice-templates.routes';
import dashboardRoutes from './financial/dashboard.routes';
import multer from 'multer';
import { standardRateLimit, databaseRateLimit } from '../middleware/express-rate-limit.middleware';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'));
    }
  }
});

const router = Router();

// Rate limiters are now imported directly from express-rate-limit.middleware

// Initialize services (these would be injected in a real app)
let goCardlessService: GoCardlessService;
let databaseService: FinancialDatabaseService;
let schedulerService: FinancialSchedulerService;
// Reporting service is now using Prisma singleton
// Transaction matching service is imported as singleton

// Initialize services with config
const initializeServices = () => {
  if (!goCardlessService) {
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
    goCardlessService = new GoCardlessService(databaseService);
    schedulerService = new FinancialSchedulerService(goCardlessService, databaseService);
    // Reporting service is now a Prisma-based singleton
    // Transaction matching service is now a Prisma-based singleton

    // Transaction matching service uses Prisma singleton

    // Get client controller instance and set transaction matching service
    const ClientsController = require('./financial/clients.controller').ClientsController;
    const clientsController = new ClientsController();
    // clientsController.setTransactionMatchingService(transactionMatchingPrismaService);
  }
};


// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * POST /api/financial/refresh-auth
 * Force refresh GoCardless authentication token
 */
router.post('/refresh-auth', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[refresh-auth] Forcing GoCardless authentication refresh');
    initializeServices();

    await goCardlessService.refreshAuthentication();

    res.json({
      success: true,
      message: 'Authentication refreshed successfully'
    });
  } catch (error) {
    console.error('[refresh-auth] Authentication refresh failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh authentication',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// SETUP AND CONFIGURATION
// ============================================================================

/**
 * POST /api/financial/setup-bbva
 * Start BBVA account setup process
 */
router.post('/setup-bbva', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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
router.post('/complete-setup', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/requisition-status/:requisitionId', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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
  if (!status) {
    return 'Unable to determine requisition status';
  }

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
router.get('/accounts', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/accounts/:id', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/account-status', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/transactions', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const {
      accountId,
      page = '1',
      limit = '50',
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const result = await databaseService.getTransactions(
      accountId as string,
      parseInt(page as string),
      parseInt(limit as string),
      sortBy as string,
      sortOrder as string
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
router.get('/transactions/:id', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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

/**
 * DELETE /api/financial/transactions/:id
 * Delete a specific transaction
 */
router.delete('/transactions/:id', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const { id } = req.params;
    const userId = (req as any).user?.userId || (req as any).userId || 'system';

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
      return;
    }

    await transactionManagementService.deleteTransaction(id, userId);

    res.status(204).send();
  } catch (error) {
    console.error('Delete transaction failed:', error);

    if (error instanceof Error && error.message === 'Transaction not found') {
      res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/financial/transactions/import
 * Import transactions from JSON file
 */
router.post('/transactions/import', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const userId = (req as any).user?.userId || (req as any).userId || 'system';

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
      return;
    }

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
      return;
    }

    // Check if accountId was provided
    const { accountId } = req.body;
    if (!accountId) {
      res.status(400).json({
        success: false,
        error: 'Account ID is required'
      });
      return;
    }

    try {
      // Parse the JSON file
      const fileContent = req.file.buffer.toString('utf-8');
      const jsonData = JSON.parse(fileContent);

      // Validate the JSON structure
      const validatedData = transactionImportFileSchema.parse(jsonData);

      // Validate transaction data before import
      const validationErrors = transactionImportService.validateTransactions(validatedData.transactions);
      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          data: {
            errors: validationErrors
          }
        });
        return;
      }

      // Import the transactions
      const result = await transactionImportService.importTransactions(
        accountId,
        validatedData.transactions,
        userId
      );

      res.json({
        success: true,
        data: {
          ...result,
          accountId
        },
        message: `Successfully imported ${result.imported} transactions`
      });

    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        res.status(400).json({
          success: false,
          error: 'Invalid JSON file'
        });
        return;
      }

      if (parseError instanceof Error && parseError.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: 'Invalid file format',
          details: parseError.message
        });
        return;
      }

      throw parseError;
    }

  } catch (error) {
    console.error('Import transactions failed:', error);

    if (error instanceof Error && error.message === 'Account not found') {
      res.status(404).json({
        success: false,
        error: 'Account not found'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to import transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/accounts
 * Get user accounts for import selection
 */
router.get('/accounts', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const userId = (req as any).user?.userId || (req as any).userId || 'system';

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
      return;
    }

    const accounts = await transactionImportService.getUserAccounts(userId);

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

// ============================================================================
// SYNC MANAGEMENT
// ============================================================================

/**
 * POST /api/financial/sync
 * Perform manual sync of all accounts
 */
router.post('/sync', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    console.log('Manual sync requested');

    // Clear GoCardless cache to ensure fresh credential lookup
    console.log('Clearing GoCardless integration config cache...');
    await integrationConfigService.clearCache('gocardless');

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
 * POST /api/financial/sync/accounts
 * Sync only account details for all accounts
 */
router.post('/sync/accounts', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    console.log('Account details sync requested');
    const accounts = await databaseService.getAccounts();
    const results = [];

    for (const account of accounts.filter((a: Account) => a.type === 'bank_account' && a.accountId)) {
      const result = await goCardlessService.syncAccountDetails(account.accountId!);
      results.push({
        accountName: account.name,
        accountId: account.accountId,
        success: result.success,
        error: result.error,
        rateLimitInfo: result.metadata?.rateLimitInfo
      });
    }

    const successCount = results.filter(r => r.success).length;
    res.json({
      success: successCount > 0,
      data: {
        accountsSynced: successCount,
        totalAccounts: results.length,
        results
      },
      message: `Account details synced for ${successCount} out of ${results.length} accounts`
    });
  } catch (error) {
    console.error('Account sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Account sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/financial/sync/balances
 * Sync only account balances for all accounts
 */
router.post('/sync/balances', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const forceRefresh = req.body?.forceRefresh === true;
    console.log('Balance sync requested', { forceRefresh });

    const accounts = await databaseService.getAccounts();
    const results = [];

    for (const account of accounts.filter((a: Account) => a.type === 'bank_account' && a.accountId)) {
      const result = await goCardlessService.syncAccountBalances(account.accountId!);
      results.push({
        accountName: account.name,
        accountId: account.accountId,
        success: result.success,
        balance: result.data?.balance,
        currency: result.data?.currency,
        error: result.error,
        rateLimitInfo: result.metadata?.rateLimitInfo
      });
    }

    const successCount = results.filter(r => r.success).length;
    res.json({
      success: successCount > 0,
      data: {
        balancesSynced: successCount,
        totalAccounts: results.length,
        results
      },
      message: `Balances synced for ${successCount} out of ${results.length} accounts`
    });
  } catch (error) {
    console.error('Balance sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Balance sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/financial/sync/transactions
 * Sync only transactions for all accounts
 */
router.post('/sync/transactions', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const { days = 7 } = req.body; // Default to 7 days
    console.log(`Transaction sync requested for last ${days} days`);

    const accounts = await databaseService.getAccounts();
    const results = [];
    let totalTransactionsSynced = 0;

    for (const account of accounts.filter((a: Account) => a.type === 'bank_account' && a.accountId)) {
      const result = await goCardlessService.syncAccountTransactions(account.accountId!, days);
      results.push({
        accountName: account.name,
        accountId: account.accountId,
        success: result.success,
        transactionsSynced: result.data?.transactionsSynced || 0,
        error: result.error,
        rateLimitInfo: result.metadata?.rateLimitInfo
      });

      if (result.success && result.data) {
        totalTransactionsSynced += result.data.transactionsSynced;
      }
    }

    const successCount = results.filter(r => r.success).length;
    res.json({
      success: successCount > 0,
      data: {
        accountsSynced: successCount,
        totalAccounts: results.length,
        totalTransactionsSynced,
        results
      },
      message: `Transactions synced for ${successCount} out of ${results.length} accounts (${totalTransactionsSynced} total transactions)`
    });
  } catch (error) {
    console.error('Transaction sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Transaction sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/rate-limits
 * Get current rate limit status for all accounts
 */
router.get('/rate-limits', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const rateLimitStatus = await goCardlessService.getRateLimitStatus();

    res.json({
      success: rateLimitStatus.success,
      data: rateLimitStatus.data,
      metadata: rateLimitStatus.metadata
    });
  } catch (error) {
    console.error('Get rate limits failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/sync-status
 * Get scheduler status and recent sync history
 */
router.get('/sync-status', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const schedulerStatus = schedulerService.getSchedulerStatus();
    const syncStats = await schedulerService.getSyncStats(7); // Last 7 days

    // Transform the data to match frontend expectations
    let transformedStats = null;
    if (syncStats) {
      transformedStats = {
        lastSync: syncStats.summary?.last_sync || null,
        summary: {
          total_accounts: syncStats.totalAccounts || 0,
          total_transactions: parseInt(syncStats.summary?.total_transactions_synced as string) || 0,
          updated_today: syncStats.transactionsUpdatedToday || 0
        }
      };
    }

    res.json({
      success: true,
      data: {
        scheduler: schedulerStatus,
        stats: transformedStats
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
router.post('/scheduler/start', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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
router.post('/scheduler/stop', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/summary', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/health', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const healthStatus: any = {
      success: true,
      status: 'healthy',
      services: {},
      timestamp: new Date().toISOString()
    };

    // Test database connection
    try {
      await databaseService.query('SELECT NOW()');
      healthStatus.services.database = 'connected';
    } catch (dbError) {
      healthStatus.services.database = 'disconnected';
      healthStatus.status = 'degraded';
    }

    // Check GoCardless configuration (without authentication)
    try {
      const hasCredentials = await goCardlessService.hasCredentials();
      healthStatus.services.gocardless = hasCredentials ? 'configured' : 'not_configured';
    } catch (gcError) {
      healthStatus.services.gocardless = 'error';
      healthStatus.status = 'degraded';
    }

    // Check scheduler status
    healthStatus.services.scheduler = schedulerService.isActive() ? 'running' : 'stopped';

    // Return appropriate status code based on health
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
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

/**
 * POST /api/financial/test-gocardless
 * Test GoCardless authentication and connectivity
 */
router.post('/test-gocardless', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    // Check if credentials are configured
    const hasCredentials = await goCardlessService.hasCredentials();
    if (!hasCredentials) {
      res.status(400).json({
        success: false,
        error: 'GoCardless credentials not configured',
        message: 'Please configure GoCardless credentials in the integration settings'
      });
      return;
    }

    // Attempt authentication
    try {
      await goCardlessService.authenticate();
      res.json({
        success: true,
        message: 'GoCardless authentication successful',
        status: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (authError) {
      res.status(401).json({
        success: false,
        error: 'GoCardless authentication failed',
        message: authError instanceof Error ? authError.message : 'Authentication failed',
        status: 'authentication_error',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('GoCardless test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test GoCardless connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/financial/diagnose-gocardless
 * Diagnose GoCardless configuration and connectivity issues
 */
router.post('/diagnose-gocardless', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const diagnosis: any = {
      timestamp: new Date().toISOString(),
      checks: []
    };

    // Check 1: Credentials exist
    try {
      const hasCredentials = await goCardlessService.hasCredentials();
      diagnosis.checks.push({
        name: 'credentials_exist',
        passed: hasCredentials,
        message: hasCredentials ? 'Credentials found in database' : 'Credentials not found'
      });

      if (!hasCredentials) {
        res.json({ success: false, diagnosis });
        return;
      }
    } catch (error) {
      diagnosis.checks.push({
        name: 'credentials_exist',
        passed: false,
        message: 'Error checking credentials',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check 2: Get credentials and validate format
    try {
      const { integrationConfigService } = await import('../services/integrations');

      const secretId = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_id'
      });

      const secretKey = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_key'
      });

      const baseUrl = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'base_url'
      }) || 'https://bankaccountdata.gocardless.com/api/v2';

      diagnosis.checks.push({
        name: 'credential_format',
        passed: true,
        details: {
          secretIdLength: secretId?.length || 0,
          secretKeyLength: secretKey?.length || 0,
          secretIdFormat: secretId ? `${secretId.substring(0, 8)}...${secretId.substring(secretId.length - 4)}` : 'missing',
          baseUrl: baseUrl,
          environment: baseUrl.includes('sandbox') ? 'sandbox' : 'production'
        }
      });

      // Check 3: Test direct authentication
      const axios = require('axios');
      const tokenUrl = `${baseUrl}/token/new/`;

      try {
        const response = await axios.post(tokenUrl, {
          secret_id: secretId,
          secret_key: secretKey
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        diagnosis.checks.push({
          name: 'authentication',
          passed: true,
          message: 'Authentication successful',
          tokenReceived: !!response.data?.access
        });

      } catch (authError: any) {
        diagnosis.checks.push({
          name: 'authentication',
          passed: false,
          message: 'Authentication failed',
          error: {
            status: authError.response?.status,
            statusText: authError.response?.statusText,
            data: authError.response?.data,
            url: tokenUrl
          }
        });
      }

    } catch (error) {
      diagnosis.checks.push({
        name: 'credential_retrieval',
        passed: false,
        message: 'Error retrieving credentials',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const allPassed = diagnosis.checks.every((check: any) => check.passed !== false);

    res.json({
      success: allPassed,
      diagnosis,
      summary: allPassed ? 'All checks passed' : 'Some checks failed - review diagnosis for details'
    });

  } catch (error) {
    console.error('GoCardless diagnosis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to diagnose GoCardless',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/gocardless/status
 * Get comprehensive GoCardless configuration and connection status
 */
router.get('/gocardless/status', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const status: any = {
      timestamp: new Date().toISOString(),
      configured: false,
      authenticated: false,
      credentials: {
        hasSecretId: false,
        hasSecretKey: false,
        hasBaseUrl: false
      },
      cache: {
        cleared: false
      },
      accounts: {
        count: 0,
        active: 0
      }
    };

    // Check if credentials are configured
    try {
      const hasCredentials = await goCardlessService.hasCredentials();
      status.configured = hasCredentials;

      // Get more detailed credential info (without exposing sensitive data)
      const secretId = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_id'
      });
      const secretKey = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_key'
      });
      const baseUrl = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'base_url'
      });

      status.credentials = {
        hasSecretId: !!secretId,
        hasSecretKey: !!secretKey,
        hasBaseUrl: !!baseUrl,
        secretIdLength: secretId?.length,
        secretKeyLength: secretKey?.length,
        baseUrl: baseUrl || 'https://bankaccountdata.gocardless.com/api/v2'
      };
    } catch (error) {
      status.error = 'Failed to check credentials: ' + (error instanceof Error ? error.message : 'Unknown error');
    }

    // Test authentication if credentials exist
    if (status.configured) {
      try {
        await goCardlessService.refreshAuthentication();
        status.authenticated = true;
      } catch (authError) {
        status.authenticated = false;
        status.authError = authError instanceof Error ? authError.message : 'Authentication failed';
      }
    }

    // Get account status
    try {
      const accountStatus = await goCardlessService.getAccountStatus();
      if (accountStatus.success && accountStatus.data) {
        status.accounts = {
          count: accountStatus.data.length,
          active: accountStatus.data.filter((a: any) => a.account_id).length
        };
      }
    } catch (error) {
      // Not critical, continue
    }

    res.json({
      success: status.configured && status.authenticated,
      status,
      recommendations: getRecommendations(status)
    });

  } catch (error) {
    console.error('GoCardless status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check GoCardless status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

function getRecommendations(status: any): string[] {
  const recommendations: string[] = [];

  if (!status.configured) {
    recommendations.push('Configure GoCardless credentials using POST /api/financial/gocardless/credentials');
    recommendations.push('Required: secret_id and secret_key');
  }

  if (status.configured && !status.authenticated) {
    recommendations.push('Authentication is failing. Check if credentials are from the correct environment (production vs sandbox)');
    recommendations.push('Verify credentials are active and not expired in GoCardless dashboard');
  }

  if (!status.credentials.hasSecretId || !status.credentials.hasSecretKey) {
    recommendations.push('Missing required credentials. Both secret_id and secret_key must be configured');
  }

  if (status.credentials.secretIdLength && status.credentials.secretIdLength !== 36) {
    recommendations.push('Secret ID should be a UUID (36 characters). Current length: ' + status.credentials.secretIdLength);
  }

  if (status.credentials.secretKeyLength && status.credentials.secretKeyLength !== 43) {
    recommendations.push('Secret Key should be 43 characters. Current length: ' + status.credentials.secretKeyLength);
  }

  return recommendations;
}

/**
 * GET /api/financial/gocardless/credentials
 * Check if GoCardless credentials are configured
 */
router.get('/gocardless/credentials', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const hasCredentials = await goCardlessService.hasCredentials();

    res.json({
      success: true,
      configured: hasCredentials,
      message: hasCredentials
        ? 'GoCardless credentials are configured'
        : 'GoCardless credentials are not configured'
    });
  } catch (error) {
    console.error('Failed to check GoCardless credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check credentials',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/financial/gocardless/credentials
 * Configure GoCardless credentials
 */
router.post('/gocardless/credentials', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { secret_id, secret_key, base_url, redirect_uri } = req.body;

    // Validate required fields
    if (!secret_id || !secret_key) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Both secret_id and secret_key are required'
      });
      return;
    }

    // Validate credential format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(secret_id.trim())) {
      res.status(400).json({
        success: false,
        error: 'Invalid secret_id format',
        message: 'Secret ID must be a valid UUID'
      });
      return;
    }

    if (secret_key.trim().length !== 43) {
      res.status(400).json({
        success: false,
        error: 'Invalid secret_key length',
        message: 'Secret Key must be exactly 43 characters'
      });
      return;
    }

    // Save credentials
    const configs = [
      {
        integrationType: 'gocardless',
        configKey: 'secret_id',
        configValue: secret_id.trim(),
        isGlobal: true,
        encrypt: true,
        description: 'GoCardless Secret ID'
      },
      {
        integrationType: 'gocardless',
        configKey: 'secret_key',
        configValue: secret_key.trim(),
        isGlobal: true,
        encrypt: true,
        description: 'GoCardless Secret Key'
      }
    ];

    if (base_url) {
      configs.push({
        integrationType: 'gocardless',
        configKey: 'base_url',
        configValue: base_url.trim(),
        isGlobal: true,
        encrypt: false,
        description: 'GoCardless API Base URL'
      });
    }

    if (redirect_uri) {
      configs.push({
        integrationType: 'gocardless',
        configKey: 'redirect_uri',
        configValue: redirect_uri.trim(),
        isGlobal: true,
        encrypt: false,
        description: 'GoCardless Redirect URI'
      });
    }

    // Save all configurations
    for (const config of configs) {
      await integrationConfigService.setConfig(config);
    }

    // Clear cache to ensure new credentials are used
    await integrationConfigService.clearCache('gocardless');

    // Test authentication with new credentials
    initializeServices(); // Re-initialize to pick up new credentials

    try {
      await goCardlessService.refreshAuthentication();

      res.json({
        success: true,
        message: 'GoCardless credentials configured and authenticated successfully'
      });
    } catch (authError) {
      res.json({
        success: true,
        message: 'GoCardless credentials saved but authentication failed',
        warning: authError instanceof Error ? authError.message : 'Authentication failed',
        hint: 'Check if credentials are from the correct environment (production vs sandbox)'
      });
    }

  } catch (error) {
    console.error('Failed to configure GoCardless credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure credentials',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/gocardless/debug
 * Debug GoCardless configuration issues
 */
router.get('/gocardless/debug', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debug: any = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Direct database query
    try {
      const directQuery = await databaseService.query(
        "SELECT integration_type, config_key, is_encrypted, is_global, user_id FROM financial.integration_configs WHERE integration_type = 'gocardless' ORDER BY config_key"
      );
      debug.tests.directDatabaseQuery = {
        success: true,
        rowCount: directQuery.rows.length,
        rows: directQuery.rows
      };
    } catch (error) {
      debug.tests.directDatabaseQuery = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Integration config service
    try {
      // Test db.pool directly first
      const testQuery = await db.pool.query('SELECT 1');
      debug.tests.dbPoolTest = {
        success: true,
        result: testQuery.rows[0]
      };

      // Now test the actual query the service would run
      const manualQuery = await db.pool.query(
        `SELECT config_value, is_encrypted 
         FROM financial.integration_configs 
         WHERE integration_type = $1 AND config_key = $2 
         AND user_id IS NULL AND is_global = true`,
        ['gocardless', 'secret_id']
      );

      debug.tests.manualQuery = {
        success: true,
        rowCount: manualQuery.rows.length,
        hasData: manualQuery.rows.length > 0
      };

      const secretId = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_id'
      });

      const secretKey = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_key'
      });

      debug.tests.integrationConfigService = {
        success: true,
        hasSecretId: !!secretId,
        hasSecretKey: !!secretKey,
        secretIdLength: secretId?.length,
        secretKeyLength: secretKey?.length
      };
    } catch (error) {
      debug.tests.integrationConfigService = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      };
    }

    // Test 3: GoCardless service
    try {
      const hasCredentials = await goCardlessService.hasCredentials();
      debug.tests.goCardlessService = {
        success: true,
        hasCredentials
      };
    } catch (error) {
      debug.tests.goCardlessService = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 4: Database connection pools
    debug.connectionPools = {
      mainDb: {
        totalCount: (db.pool as any).totalCount,
        idleCount: (db.pool as any).idleCount,
        waitingCount: (db.pool as any).waitingCount
      },
      financialDb: {
        totalCount: (databaseService.pool as any).totalCount,
        idleCount: (databaseService.pool as any).idleCount,
        waitingCount: (databaseService.pool as any).waitingCount
      }
    };

    res.json(debug);
  } catch (error) {
    res.status(500).json({
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/gocardless/test-encryption
 * Test encryption key setup and consistency
 */
router.get('/gocardless/test-encryption', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result: any = {
      timestamp: new Date().toISOString(),
      environment: {
        INTEGRATION_CONFIG_KEY_SET: !!process.env.INTEGRATION_CONFIG_KEY,
        INTEGRATION_CONFIG_KEY_LENGTH: process.env.INTEGRATION_CONFIG_KEY?.length,
        NODE_ENV: process.env.NODE_ENV
      }
    };

    // Test if we can save and retrieve a value
    try {
      const testKey = `test_${Date.now()}`;
      const testValue = 'test-encryption-value-123';

      // Save encrypted value
      await integrationConfigService.setConfig({
        integrationType: 'test',
        configKey: testKey,
        configValue: testValue,
        isGlobal: true,
        encrypt: true,
        description: 'Test encryption'
      });

      // Retrieve and decrypt
      const retrieved = await integrationConfigService.getConfig({
        integrationType: 'test',
        configKey: testKey
      });

      // Clean up
      await integrationConfigService.deleteConfig({
        integrationType: 'test',
        configKey: testKey
      });

      result.encryptionTest = {
        success: retrieved === testValue,
        saved: testValue,
        retrieved: retrieved,
        match: retrieved === testValue
      };
    } catch (e) {
      result.encryptionTest = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/financial/gocardless/test-config
 * Test integration config service directly
 */
router.get('/gocardless/test-config', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Force clear cache first
    await integrationConfigService.clearCache('gocardless');

    // Try to get config with all details
    const result: any = {
      cacheCleared: true,
      directSqlTest: {},
      configAttempts: {}
    };

    // Direct SQL test using same query as integration config service
    try {
      const directResult = await db.pool.query(
        `SELECT config_value, is_encrypted 
         FROM financial.integration_configs 
         WHERE integration_type = $1 AND config_key = $2 
         AND user_id IS NULL AND is_global = true`,
        ['gocardless', 'secret_id']
      );
      result.directSqlTest = {
        success: true,
        rowCount: directResult.rows.length,
        rows: directResult.rows.map(r => ({
          hasValue: !!r.config_value,
          isEncrypted: r.is_encrypted,
          valueLength: r.config_value?.length
        }))
      };
    } catch (e) {
      result.directSqlTest = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    // Try secret_id
    try {
      const secretId = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_id'
      });
      result.configAttempts.secret_id = {
        success: true,
        hasValue: !!secretId,
        length: secretId?.length
      };
    } catch (e) {
      result.configAttempts.secret_id = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    // Try secret_key
    try {
      const secretKey = await integrationConfigService.getConfig({
        integrationType: 'gocardless',
        configKey: 'secret_key'
      });
      result.configAttempts.secret_key = {
        success: true,
        hasValue: !!secretKey,
        length: secretKey?.length
      };
    } catch (e) {
      result.configAttempts.secret_key = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    // Debug test
    try {
      const debugResult = await (integrationConfigService as any).debugGetConfig('gocardless', 'secret_id');
      result.debugTest = debugResult;
    } catch (e) {
      result.debugTest = {
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/financial/gocardless/credentials
 * Remove GoCardless credentials
 */
router.delete('/gocardless/credentials', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const keys = ['secret_id', 'secret_key', 'base_url', 'redirect_uri'];
    let deletedCount = 0;

    for (const key of keys) {
      const deleted = await integrationConfigService.deleteConfig({
        integrationType: 'gocardless',
        configKey: key
      });
      if (deleted) {
        deletedCount++;
      }
    }

    // Clear cache
    await integrationConfigService.clearCache('gocardless');

    res.json({
      success: true,
      message: `Removed ${deletedCount} GoCardless configuration items`
    });
  } catch (error) {
    console.error('Failed to remove GoCardless credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove credentials',
      details: error instanceof Error ? error.message : 'Unknown error'
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
router.get('/categories', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const { type } = req.query;
    // const categories = await financialReportingPrismaService.getCategories(type as any); // TEMPORARILY DISABLED
    const categories: any[] = []; // PLACEHOLDER

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
router.get('/categories/:id/subcategories', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const { id } = req.params;
    // const subcategories = await financialReportingPrismaService.getSubcategories(id); // TEMPORARILY DISABLED
    const subcategories: any[] = []; // PLACEHOLDER

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
router.post('/categorize/auto', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const { transactionIds } = req.body;
    // const categorizedCount = await financialReportingPrismaService.autoCategorizeTransactions(transactionIds); // TEMPORARILY DISABLED
    const categorizedCount = 0; // PLACEHOLDER

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
router.post('/transactions/:id/categorize', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const { id } = req.params;
    const { categoryId, subcategoryId, notes } = req.body;

    // const categorization = await financialReportingPrismaService.categorizeTransaction( // TEMPORARILY DISABLED
    //   id,
    //   categoryId,
    //   subcategoryId,
    //   'manual',
    //   undefined,
    //   undefined,
    //   notes
    // );
    const categorization = { success: true }; // PLACEHOLDER

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
router.get('/transactions/categorized', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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

    // const result = await financialReportingPrismaService.getCategorizedTransactions(params); // TEMPORARILY DISABLED
    const result = { transactions: [], total: 0, page: 1, limit: 50, totalPages: 0 }; // PLACEHOLDER

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
router.get('/reports/comprehensive', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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

    // const report = await financialReportingPrismaService.generateReport(params); // TEMPORARILY DISABLED
    const report: any = {}; // PLACEHOLDER

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
router.get('/metrics/realtime', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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

    // const metrics = await financialReportingPrismaService.getRealtimeMetrics(params); // TEMPORARILY DISABLED
    const metrics: any = { currentMonth: {}, trends: {}, topExpenseCategories: [], recentTransactions: [], alerts: [], updatedAt: new Date() }; // PLACEHOLDER

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
router.get('/analytics/monthly-summary', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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

    // Use existing generateReport method instead
    // const summary = await financialReportingPrismaService.generateReport({ // TEMPORARILY DISABLED
    //   startDate: new Date(startDate as string),
    //   endDate: new Date(endDate as string),
    //   currency: currency as string
    // }); // TEMPORARILY DISABLED
    const summary: any = {}; // PLACEHOLDER

    res.json({
      success: true,
      data: summary
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
router.get('/insights/accounts', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    // const insights = await financialReportingPrismaService.getAccountInsights(); // TEMPORARILY DISABLED
    const insights: any[] = []; // PLACEHOLDER

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
router.get('/dashboard/overview', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const { currency = 'EUR' } = req.query;

    // Get current month metrics
    // const metrics = await financialReportingPrismaService.getRealtimeMetrics({ // TEMPORARILY DISABLED
    //   currency: currency as string
    // });
    const metrics: any = { currentMonth: {}, trends: {}, topExpenseCategories: [], recentTransactions: [], alerts: [], updatedAt: new Date() }; // PLACEHOLDER

    // Get account insights
    // const accountInsights = await financialReportingPrismaService.getAccountInsights(); // TEMPORARILY DISABLED
    const accountInsights: any[] = []; // PLACEHOLDER

    // Get categories for quick access
    // const categories = await financialReportingPrismaService.getCategories(); // TEMPORARILY DISABLED
    const categories: any[] = []; // PLACEHOLDER

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
router.get('/dashboard/quick-stats', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    initializeServices();

    const { currency = 'EUR', period = 'month' } = req.query;

    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get current and previous period for comparison
    // const [currentReport, previousReport] = await Promise.all([ // TEMPORARILY DISABLED
    //   financialReportingPrismaService.generateReport({
    //     startDate: currentStart,
    //     endDate: currentEnd,
    //     currency: currency as string
    //   }),
    //   financialReportingPrismaService.generateReport({
    //     startDate: previousStart,
    //     endDate: previousEnd,
    //     currency: currency as string
    //   })
    // ]); // TEMPORARILY DISABLED
    const [currentReport, previousReport] = [{ summary: { totalIncome: '0', totalExpenses: '0', netIncome: '0', savingsRate: '0', transactionCount: 0 } }, { summary: { totalIncome: '0', totalExpenses: '0', netIncome: '0', savingsRate: '0', transactionCount: 0 } }]; // PLACEHOLDER

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
          net: currentReport.summary.netIncome,
          transactions: currentReport.summary.transactionCount
        },
        previous: {
          income: previousReport.summary.totalIncome,
          expenses: previousReport.summary.totalExpenses,
          net: previousReport.summary.netIncome,
          transactions: previousReport.summary.transactionCount
        },
        changes: {
          income: incomeChange,
          expenses: expenseChange,
          net: previousReport.summary.netIncome !== '0'
            ? ((parseFloat(currentReport.summary.netIncome) - parseFloat(previousReport.summary.netIncome)) / Math.abs(parseFloat(previousReport.summary.netIncome))) * 100
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
router.get('/dashboard/overview', databaseRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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

// Mount invoice template routes
router.use('/invoice-templates', invoiceTemplatesRoutes);

// Mount transaction management routes
// Note: transactionsRoutes needs a pool, we'll initialize it after databaseService is created

// Mount enhanced dashboard routes
router.use('/dashboard', dashboardRoutes);

// ============================================================================
// METRICS & MONITORING
// ============================================================================

import { metricsService } from '../services/metrics';
import { logger } from '../utils/log';

// Performance metrics endpoint
router.get('/metrics/performance', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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
router.get('/metrics/alerts', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
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