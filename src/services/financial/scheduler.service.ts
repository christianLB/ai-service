// Financial Scheduler Service - Automated Sync 2x/day
import { GoCardlessService } from './gocardless.service';
import { FinancialDatabaseService } from './database.service';

export class FinancialSchedulerService {
  private goCardless: GoCardlessService;
  private db: FinancialDatabaseService;
  private syncIntervals: NodeJS.Timeout[] = [];
  private isRunning = false;

  constructor(goCardless: GoCardlessService, database: FinancialDatabaseService) {
    this.goCardless = goCardless;
    this.db = database;
  }

  // ============================================================================
  // SCHEDULER MANAGEMENT
  // ============================================================================

  start(): void {
    if (this.isRunning) {
      console.log('Financial scheduler is already running');
      return;
    }

    console.log('Starting financial scheduler (2x/day sync)...');
    
    // Schedule sync twice daily: 8:00 AM and 8:00 PM
    this.scheduleDailySync();
    
    // Also run an initial sync if needed
    this.performInitialSyncCheck();
    
    this.isRunning = true;
    console.log('Financial scheduler started successfully');
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('Financial scheduler is not running');
      return;
    }

    console.log('Stopping financial scheduler...');
    
    // Clear all intervals
    this.syncIntervals.forEach(interval => clearInterval(interval));
    this.syncIntervals = [];
    
    this.isRunning = false;
    console.log('Financial scheduler stopped');
  }

  isActive(): boolean {
    return this.isRunning;
  }

  // ============================================================================
  // SCHEDULING LOGIC
  // ============================================================================

  private scheduleDailySync(): void {
    // Calculate milliseconds until next 8:00 AM
    const now = new Date();
    const next8AM = new Date();
    next8AM.setHours(8, 0, 0, 0);
    
    if (now > next8AM) {
      next8AM.setDate(next8AM.getDate() + 1);
    }
    
    const msUntil8AM = next8AM.getTime() - now.getTime();
    
    // Calculate milliseconds until next 8:00 PM
    const next8PM = new Date();
    next8PM.setHours(20, 0, 0, 0);
    
    if (now > next8PM) {
      next8PM.setDate(next8PM.getDate() + 1);
    }
    
    const msUntil8PM = next8PM.getTime() - now.getTime();

    console.log(`Next sync scheduled for: ${next8AM.toLocaleString()}`);
    console.log(`Following sync scheduled for: ${next8PM.toLocaleString()}`);

    // Schedule first sync (whichever comes first)
    const firstSyncDelay = Math.min(msUntil8AM, msUntil8PM);
    const firstSyncTime = msUntil8AM < msUntil8PM ? '8:00 AM' : '8:00 PM';
    
    setTimeout(() => {
      this.executeSyncWithRetry();
      // After first sync, schedule regular 12-hour intervals
      this.scheduleRegularSync();
    }, firstSyncDelay);

    console.log(`First sync will run in ${Math.round(firstSyncDelay / 1000 / 60)} minutes at ${firstSyncTime}`);
  }

  private scheduleRegularSync(): void {
    // Schedule sync every 12 hours (2x/day)
    const twelveHours = 12 * 60 * 60 * 1000;
    
    const interval = setInterval(() => {
      this.executeSyncWithRetry();
    }, twelveHours);
    
    this.syncIntervals.push(interval);
    console.log('Regular 12-hour sync interval scheduled');
  }

  // ============================================================================
  // SYNC EXECUTION
  // ============================================================================

  private async performInitialSyncCheck(): Promise<void> {
    try {
      console.log('Initial sync check disabled due to GoCardless rate limit.');
      console.log('Rate limit will reset tomorrow. Automatic sync will resume then.');
      return;
      
      console.log('Checking if initial sync is needed...');
      
      // Check if we have any accounts
      const accounts = await this.db.query(`
        SELECT COUNT(*) as count 
        FROM financial.accounts 
        WHERE type = 'bank_account' AND is_active = true
      `);
      
      const accountCount = parseInt(accounts.rows[0].count);
      
      if (accountCount === 0) {
        console.log('No bank accounts found. Initial setup required.');
        console.log('Use /api/financial/setup-bbva to start the setup process');
        return;
      }

      // Check if any account needs initial sync (no transactions)
      const accountsNeedingSync = await this.db.query(`
        SELECT a.id, a.name, a.account_id
        FROM financial.accounts a
        LEFT JOIN financial.transactions t ON a.account_id = t.account_id
        WHERE a.type = 'bank_account' AND a.is_active = true
        GROUP BY a.id, a.name, a.account_id
        HAVING COUNT(t.id) = 0
      `);

      if (accountsNeedingSync.rows.length > 0) {
        console.log(`Found ${accountsNeedingSync.rows.length} accounts needing initial sync`);
        console.log('Performing initial 90-day sync...');
        
        for (const account of accountsNeedingSync.rows) {
          try {
            const syncResult = await this.goCardless.syncTransactionsToDatabase(
              account.account_id,
              account.id,
              90
            );
            console.log(`Initial sync completed for ${account.name}: ${syncResult} transactions`);
          } catch (error) {
            console.error(`Initial sync failed for ${account.name}:`, error);
          }
        }
      }

      // Check for accounts with old syncs (> 1 day ago)
      const accountsWithOldSync = await this.db.query(`
        SELECT a.id, a.name, a.account_id, a.metadata->'last_sync' as last_sync
        FROM financial.accounts a
        WHERE a.type = 'bank_account' AND a.is_active = true
        AND (
          a.metadata->'last_sync' IS NULL OR 
          (a.metadata->>'last_sync')::timestamp < NOW() - INTERVAL '1 day'
        )
      `);

      if (accountsWithOldSync.rows.length > 0) {
        console.log(`Found ${accountsWithOldSync.rows.length} accounts with outdated sync`);
        await this.executeSyncWithRetry();
      }

    } catch (error) {
      console.error('Initial sync check failed:', error);
    }
  }

  private async executeSyncWithRetry(maxRetries = 3): Promise<void> {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        attempts++;
        console.log(`Starting sync attempt ${attempts}/${maxRetries} at ${new Date().toISOString()}`);
        
        const result = await this.goCardless.performPeriodicSync();
        
        if (result.success) {
          console.log('Sync completed successfully:', result.data);
          
          // Log sync metrics to database
          await this.logSyncMetrics({
            accountsSynced: result.data!.accountsSynced,
            transactionsSynced: result.data!.transactionsSynced,
            balancesSynced: result.data!.balancesSynced,
            success: true,
            attempts,
            errors: result.data!.errors
          });
          
          return; // Success, exit retry loop
        } else {
          console.error(`Sync attempt ${attempts} failed:`, result.error);
          
          if (attempts === maxRetries) {
            await this.logSyncMetrics({
              accountsSynced: 0,
              transactionsSynced: 0,
              balancesSynced: 0,
              success: false,
              attempts,
              error: result.error
            });
          }
        }
      } catch (error) {
        console.error(`Sync attempt ${attempts} failed with error:`, error);
        
        if (attempts === maxRetries) {
          await this.logSyncMetrics({
            accountsSynced: 0,
            transactionsSynced: 0,
            balancesSynced: 0,
            success: false,
            attempts,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Wait before retry (exponential backoff)
      if (attempts < maxRetries) {
        const delay = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.error(`All ${maxRetries} sync attempts failed`);
  }

  // ============================================================================
  // METRICS AND LOGGING
  // ============================================================================

  private async logSyncMetrics(metrics: {
    accountsSynced: number;
    transactionsSynced: number;
    balancesSynced?: number;
    success: boolean;
    attempts: number;
    error?: string;
    errors?: string[];
  }): Promise<void> {
    try {
      // Create sync_logs table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS financial.sync_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          accounts_synced INTEGER NOT NULL,
          transactions_synced INTEGER NOT NULL,
          success BOOLEAN NOT NULL,
          attempts INTEGER NOT NULL,
          error TEXT,
          sync_duration_ms INTEGER,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Insert sync log
      await this.db.query(`
        INSERT INTO financial.sync_logs 
        (accounts_synced, transactions_synced, success, attempts, error)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        metrics.accountsSynced,
        metrics.transactionsSynced,
        metrics.success,
        metrics.attempts,
        metrics.error
      ]);

      console.log('Sync metrics logged successfully');
    } catch (error) {
      console.error('Failed to log sync metrics:', error);
    }
  }

  async getSyncStats(days = 7): Promise<any> {
    try {
      const stats = await this.db.query(`
        SELECT 
          COUNT(*) as total_syncs,
          COUNT(CASE WHEN success THEN 1 END) as successful_syncs,
          COUNT(CASE WHEN NOT success THEN 1 END) as failed_syncs,
          SUM(accounts_synced) as total_accounts_synced,
          SUM(transactions_synced) as total_transactions_synced,
          AVG(attempts) as avg_attempts,
          MAX(created_at) as last_sync
        FROM financial.sync_logs
        WHERE created_at > NOW() - INTERVAL '${days} days'
      `);

      const recentSyncs = await this.db.query(`
        SELECT 
          accounts_synced,
          transactions_synced,
          success,
          attempts,
          error,
          created_at
        FROM financial.sync_logs
        WHERE created_at > NOW() - INTERVAL '${days} days'
        ORDER BY created_at DESC
        LIMIT 10
      `);

      return {
        summary: stats.rows[0],
        recentSyncs: recentSyncs.rows
      };
    } catch (error) {
      console.error('Failed to get sync stats:', error);
      return null;
    }
  }

  // ============================================================================
  // MANUAL OPERATIONS
  // ============================================================================

  async performManualSync(): Promise<any> {
    console.log('=== MANUAL SYNC STARTED ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    try {
      // Pre-flight check: Verify GoCardless credentials are configured
      console.log('Performing pre-flight checks...');
      const hasCredentials = await this.goCardless.hasCredentials();
      
      if (!hasCredentials) {
        const error = 'GoCardless credentials not configured. Please configure secret_id and secret_key in integration settings.';
        console.error(error);
        
        await this.logSyncMetrics({
          accountsSynced: 0,
          transactionsSynced: 0,
          balancesSynced: 0,
          success: false,
          attempts: 1,
          error: error
        });
        
        return {
          success: false,
          error: error,
          data: null
        };
      }
      
      // Pre-flight check: Test authentication
      console.log('Testing GoCardless authentication...');
      try {
        await this.goCardless.refreshAuthentication();
        console.log('Authentication successful');
      } catch (authError) {
        const error = `GoCardless authentication failed: ${authError instanceof Error ? authError.message : 'Unknown error'}`;
        console.error(error);
        
        await this.logSyncMetrics({
          accountsSynced: 0,
          transactionsSynced: 0,
          balancesSynced: 0,
          success: false,
          attempts: 1,
          error: error
        });
        
        return {
          success: false,
          error: error,
          data: null
        };
      }
      
      console.log('Pre-flight checks passed, calling GoCardless performPeriodicSync...');
      const result = await this.goCardless.performPeriodicSync();
      console.log('GoCardless sync result:', JSON.stringify(result, null, 2));
      
      await this.logSyncMetrics({
        accountsSynced: result.data?.accountsSynced || 0,
        transactionsSynced: result.data?.transactionsSynced || 0,
        balancesSynced: result.data?.balancesSynced || 0,
        success: result.success,
        attempts: 1,
        error: result.error,
        errors: result.data?.errors
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Manual sync failed';
      
      await this.logSyncMetrics({
        accountsSynced: 0,
        transactionsSynced: 0,
        balancesSynced: 0,
        success: false,
        attempts: 1,
        error: errorMessage
      });

      throw error;
    }
  }

  getSchedulerStatus(): any {
    return {
      isRunning: this.isRunning,
      activeIntervals: this.syncIntervals.length,
      nextSyncEstimate: this.getNextSyncEstimate(),
      startedAt: this.isRunning ? new Date().toISOString() : null
    };
  }

  private getNextSyncEstimate(): string {
    const now = new Date();
    const next8AM = new Date();
    next8AM.setHours(8, 0, 0, 0);
    
    const next8PM = new Date();
    next8PM.setHours(20, 0, 0, 0);
    
    // If current time is past both times today, move to tomorrow
    if (now.getHours() >= 20) {
      next8AM.setDate(next8AM.getDate() + 1);
      return next8AM.toISOString();
    } else if (now.getHours() >= 8) {
      return next8PM.toISOString();
    } else {
      return next8AM.toISOString();
    }
  }
}