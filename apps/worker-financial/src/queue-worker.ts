import { Job } from 'bullmq';
import { 
  QueueManager, 
  QUEUE_NAMES, 
  JobResult,
  FinancialJobData,
  TransactionSyncJobSchema,
  AccountReconciliationJobSchema,
  ReportGenerationJobSchema,
  CategorizationJobSchema,
  EVENT_CHANNELS,
  CRON_SCHEDULES
} from '@ai/queue-system';
import { env } from '@ai/config';

/**
 * Financial Worker Queue Implementation
 * Processes financial-related jobs with BullMQ
 */
export class FinancialQueueWorker {
  private queueManager: QueueManager;
  private isRunning = false;

  constructor() {
    this.queueManager = new QueueManager(env.REDIS_URL);
  }

  /**
   * Initialize the financial worker
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Financial Queue Worker...');
    
    await this.queueManager.initialize();
    
    // Create workers for each financial queue
    this.createTransactionSyncWorker();
    this.createAccountReconciliationWorker();
    this.createReportGenerationWorker();
    this.createCategorizationWorker();
    
    // Schedule recurring jobs
    await this.scheduleRecurringJobs();
    
    // Subscribe to coordination events
    await this.subscribeToEvents();
    
    this.isRunning = true;
    console.log('✅ Financial Queue Worker initialized');
  }

  /**
   * Transaction Sync Worker
   */
  private createTransactionSyncWorker(): void {
    this.queueManager.createWorker(
      QUEUE_NAMES.TRANSACTION_SYNC,
      async (job: Job<FinancialJobData>): Promise<JobResult> => {
        console.log(`💳 Processing transaction sync job: ${job.id}`);
        
        const validatedData = TransactionSyncJobSchema.parse(job.data);
        
        try {
          // Simulate transaction sync with realistic processing time
          const processingTime = Math.random() * 10000 + 5000; // 5-15 seconds
          await new Promise(resolve => setTimeout(resolve, processingTime));
          
          // Simulate transaction sync logic
          const transactionCount = Math.floor(Math.random() * 100) + 10;
          const success = Math.random() > 0.05; // 95% success rate
          
          if (!success) {
            throw new Error(`Transaction sync failed for account ${validatedData.accountId} using ${validatedData.provider}`);
          }
          
          const result = {
            syncId: validatedData.id,
            accountId: validatedData.accountId,
            provider: validatedData.provider,
            syncType: validatedData.syncType,
            syncResult: {
              transactionsProcessed: transactionCount,
              newTransactions: Math.floor(transactionCount * 0.3),
              updatedTransactions: Math.floor(transactionCount * 0.1),
              duplicatesSkipped: Math.floor(transactionCount * 0.05),
              errors: Math.floor(Math.random() * 3),
            },
            dateRange: validatedData.dateRange,
            statistics: {
              totalAmount: (Math.random() * 50000 + 5000).toFixed(2),
              categories: {
                'income': Math.floor(transactionCount * 0.2),
                'expenses': Math.floor(transactionCount * 0.6),
                'transfers': Math.floor(transactionCount * 0.2),
              },
              averageTransactionAmount: (Math.random() * 500 + 50).toFixed(2),
            },
            processingTime: processingTime,
            timestamp: new Date().toISOString(),
          };
          
          // Publish sync completion event
          await this.queueManager.publishEvent(EVENT_CHANNELS.FINANCIAL_EVENTS, {
            service: 'worker-financial',
            event: 'transaction_sync_completed',
            data: result,
            timestamp: new Date().toISOString(),
          });
          
          return {
            success: true,
            data: result,
          };
          
        } catch (error) {
          console.error('Transaction sync failed:', error);
          
          // Publish failure event
          await this.queueManager.publishEvent(EVENT_CHANNELS.FINANCIAL_EVENTS, {
            service: 'worker-financial',
            event: 'transaction_sync_failed',
            data: {
              syncId: validatedData.id,
              accountId: validatedData.accountId,
              error: error instanceof Error ? error.message : String(error),
            },
            timestamp: new Date().toISOString(),
          });
          
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    );
  }

  /**
   * Account Reconciliation Worker
   */
  private createAccountReconciliationWorker(): void {
    this.queueManager.createWorker(
      QUEUE_NAMES.ACCOUNT_RECONCILIATION,
      async (job: Job<FinancialJobData>): Promise<JobResult> => {
        console.log(`🔍 Processing account reconciliation job: ${job.id}`);
        
        const validatedData = AccountReconciliationJobSchema.parse(job.data);
        
        try {
          // Simulate reconciliation processing
          const processingTime = Math.random() * 15000 + 10000; // 10-25 seconds
          await new Promise(resolve => setTimeout(resolve, processingTime));
          
          const calculatedBalance = Math.random() * 100000 + 10000;
          const targetBalance = validatedData.targetBalance || calculatedBalance;
          const discrepancy = Math.abs(calculatedBalance - targetBalance);
          const isReconciled = discrepancy <= validatedData.discrepancyThreshold;
          
          const result = {
            reconciliationId: job.id,
            accountId: validatedData.accountId,
            reconciliationType: validatedData.reconciliationType,
            reconciliationResult: {
              isReconciled,
              calculatedBalance: calculatedBalance.toFixed(2),
              targetBalance: targetBalance.toFixed(2),
              discrepancy: discrepancy.toFixed(2),
              discrepancyPercentage: ((discrepancy / targetBalance) * 100).toFixed(3),
            },
            analysis: {
              transactionsAnalyzed: Math.floor(Math.random() * 500) + 100,
              pendingTransactions: Math.floor(Math.random() * 10),
              reconciledTransactions: Math.floor(Math.random() * 480) + 100,
              unreconciledTransactions: Math.floor(Math.random() * 10),
            },
            issues: isReconciled ? [] : [
              {
                type: 'balance_mismatch',
                description: `Balance discrepancy of ${discrepancy.toFixed(2)}`,
                severity: discrepancy > targetBalance * 0.01 ? 'high' : 'low',
                suggestedAction: 'Review recent transactions and bank statements',
              }
            ],
            recommendations: [
              'Schedule regular reconciliations',
              'Verify all pending transactions',
              'Check for missing bank fees or charges',
            ].slice(0, Math.floor(Math.random() * 2) + 1),
            processingTime: processingTime,
            timestamp: new Date().toISOString(),
          };
          
          // Publish reconciliation event
          await this.queueManager.publishEvent(EVENT_CHANNELS.FINANCIAL_EVENTS, {
            service: 'worker-financial',
            event: 'account_reconciliation_completed',
            data: {
              ...result,
              status: isReconciled ? 'reconciled' : 'discrepancy_found',
            },
            timestamp: new Date().toISOString(),
          });
          
          return {
            success: true,
            data: result,
          };
          
        } catch (error) {
          console.error('Account reconciliation failed:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    );
  }

  /**
   * Report Generation Worker
   */
  private createReportGenerationWorker(): void {
    this.queueManager.createWorker(
      QUEUE_NAMES.REPORT_GENERATION,
      async (job: Job<FinancialJobData>): Promise<JobResult> => {
        console.log(`📊 Processing report generation job: ${job.id}`);
        
        const validatedData = ReportGenerationJobSchema.parse(job.data);
        
        try {
          // Simulate report generation (longer processing time)
          const processingTime = Math.random() * 30000 + 15000; // 15-45 seconds
          await new Promise(resolve => setTimeout(resolve, processingTime));
          
          const fromDate = new Date(validatedData.parameters.dateRange.from);
          const toDate = new Date(validatedData.parameters.dateRange.to);
          const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
          
          const result = {
            reportId: job.id,
            reportType: validatedData.reportType,
            format: validatedData.format,
            dateRange: validatedData.parameters.dateRange,
            reportData: {
              summary: {
                totalTransactions: Math.floor(daysDiff * 5 + Math.random() * 50),
                totalIncome: (Math.random() * 10000 + 5000).toFixed(2),
                totalExpenses: (Math.random() * 8000 + 3000).toFixed(2),
                netCashFlow: null as string | null,
                averageDailySpend: null as string | null,
              },
              categories: [
                { name: 'Food & Dining', amount: (Math.random() * 2000 + 500).toFixed(2), percentage: null as number | null },
                { name: 'Transportation', amount: (Math.random() * 1500 + 300).toFixed(2), percentage: null as number | null },
                { name: 'Shopping', amount: (Math.random() * 1000 + 200).toFixed(2), percentage: null as number | null },
                { name: 'Utilities', amount: (Math.random() * 800 + 200).toFixed(2), percentage: null as number | null },
                { name: 'Entertainment', amount: (Math.random() * 600 + 100).toFixed(2), percentage: null as number | null },
              ],
              trends: {
                incomeGrowth: (Math.random() * 20 - 10).toFixed(1) + '%',
                expenseGrowth: (Math.random() * 15 - 5).toFixed(1) + '%',
                savingsRate: (Math.random() * 30 + 10).toFixed(1) + '%',
              },
            },
            fileInfo: {
              fileName: `${validatedData.reportType}_${fromDate.toISOString().split('T')[0]}_${toDate.toISOString().split('T')[0]}.${validatedData.format}`,
              fileSize: Math.floor(Math.random() * 1000000 + 100000), // bytes
              filePath: `/reports/${job.id}`,
            },
            processingTime: processingTime,
            timestamp: new Date().toISOString(),
          };
          
          // Calculate derived values
          const income = parseFloat(result.reportData.summary.totalIncome);
          const expenses = parseFloat(result.reportData.summary.totalExpenses);
          result.reportData.summary.netCashFlow = (income - expenses).toFixed(2);
          result.reportData.summary.averageDailySpend = (expenses / daysDiff).toFixed(2);
          
          // Calculate category percentages
          result.reportData.categories.forEach(category => {
            category.percentage = parseFloat(((parseFloat(category.amount) / expenses) * 100).toFixed(1));
          });
          
          // Publish report completion event
          await this.queueManager.publishEvent(EVENT_CHANNELS.FINANCIAL_EVENTS, {
            service: 'worker-financial',
            event: 'report_generated',
            data: {
              reportId: result.reportId,
              reportType: result.reportType,
              fileName: result.fileInfo.fileName,
              fileSize: result.fileInfo.fileSize,
            },
            timestamp: new Date().toISOString(),
          });
          
          return {
            success: true,
            data: result,
          };
          
        } catch (error) {
          console.error('Report generation failed:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    );
  }

  /**
   * Categorization Worker
   */
  private createCategorizationWorker(): void {
    this.queueManager.createWorker(
      QUEUE_NAMES.CATEGORIZATION,
      async (job: Job<FinancialJobData>): Promise<JobResult> => {
        console.log(`🏷️ Processing categorization job: ${job.id}`);
        
        const validatedData = CategorizationJobSchema.parse(job.data);
        
        try {
          // Simulate AI categorization processing
          const processingTime = Math.random() * 8000 + 2000; // 2-10 seconds
          await new Promise(resolve => setTimeout(resolve, processingTime));
          
          const categorizedTransactions = validatedData.transactionIds.map(transactionId => {
            const categories = [
              'Food & Dining', 'Transportation', 'Shopping', 'Utilities', 
              'Entertainment', 'Healthcare', 'Education', 'Income', 'Transfers'
            ];
            
            const confidence = Math.random() * 0.3 + 0.7; // 70-100% confidence
            const category = categories[Math.floor(Math.random() * categories.length)];
            
            return {
              transactionId,
              originalDescription: `Transaction ${transactionId.slice(-8)}`,
              suggestedCategory: category,
              confidence: parseFloat(confidence.toFixed(3)),
              method: validatedData.method,
              alternatives: categories
                .filter(c => c !== category)
                .slice(0, 2)
                .map(altCategory => ({
                  category: altCategory,
                  confidence: parseFloat((confidence * (0.7 + Math.random() * 0.2)).toFixed(3)),
                })),
            };
          });
          
          const avgConfidence = categorizedTransactions.reduce((sum, t) => sum + t.confidence, 0) / categorizedTransactions.length;
          const highConfidenceCount = categorizedTransactions.filter(t => t.confidence >= 0.9).length;
          
          const result = {
            categorizationId: job.id,
            method: validatedData.method,
            transactionCount: validatedData.transactionIds.length,
            results: categorizedTransactions,
            statistics: {
              averageConfidence: parseFloat(avgConfidence.toFixed(3)),
              highConfidenceCount,
              lowConfidenceCount: categorizedTransactions.filter(t => t.confidence < 0.8).length,
              categoriesUsed: [...new Set(categorizedTransactions.map(t => t.suggestedCategory))].length,
            },
            qualityMetrics: {
              modelAccuracy: parseFloat((Math.random() * 0.15 + 0.85).toFixed(3)), // 85-100%
              processingSpeed: `${(categorizedTransactions.length / (processingTime / 1000)).toFixed(1)} transactions/sec`,
              memoryUsage: `${Math.floor(Math.random() * 50 + 20)}MB`,
            },
            processingTime: processingTime,
            timestamp: new Date().toISOString(),
          };
          
          // Publish categorization completion event
          await this.queueManager.publishEvent(EVENT_CHANNELS.FINANCIAL_EVENTS, {
            service: 'worker-financial',
            event: 'categorization_completed',
            data: {
              categorizationId: result.categorizationId,
              transactionCount: result.transactionCount,
              averageConfidence: result.statistics.averageConfidence,
              method: result.method,
            },
            timestamp: new Date().toISOString(),
          });
          
          return {
            success: true,
            data: result,
          };
          
        } catch (error) {
          console.error('Categorization failed:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    );
  }

  /**
   * Schedule recurring financial jobs
   */
  private async scheduleRecurringJobs(): Promise<void> {
    console.log('📅 Scheduling recurring financial jobs...');
    
    const financialQueues = this.queueManager.getQueue(QUEUE_NAMES.TRANSACTION_SYNC);
    const reconciliationQueue = this.queueManager.getQueue(QUEUE_NAMES.ACCOUNT_RECONCILIATION);
    const reportQueue = this.queueManager.getQueue(QUEUE_NAMES.REPORT_GENERATION);
    const categorizationQueue = this.queueManager.getQueue(QUEUE_NAMES.CATEGORIZATION);
    
    if (!financialQueues || !reconciliationQueue || !reportQueue || !categorizationQueue) {
      throw new Error('Failed to get financial queues for scheduling');
    }
    
    // Daily transaction sync
    await financialQueues.add('daily-sync', {
      id: `daily-sync-${Date.now()}`,
      timestamp: new Date().toISOString(),
      accountId: 'all-accounts',
      provider: 'gocardless',
      syncType: 'incremental',
      dateRange: {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        to: new Date().toISOString(),
      },
    }, {
      repeat: { pattern: CRON_SCHEDULES.DAILY_SYNC },
      removeOnComplete: 10,
      removeOnFail: 5,
    });
    
    // Weekly reconciliation
    await reconciliationQueue.add('weekly-reconciliation', {
      id: `weekly-reconciliation-${Date.now()}`,
      timestamp: new Date().toISOString(),
      accountId: 'all-accounts',
      reconciliationType: 'weekly',
      discrepancyThreshold: 0.01,
    }, {
      repeat: { pattern: CRON_SCHEDULES.WEEKLY_RECONCILIATION },
      removeOnComplete: 5,
      removeOnFail: 3,
    });
    
    // Monthly report
    await reportQueue.add('monthly-report', {
      id: `monthly-report-${Date.now()}`,
      timestamp: new Date().toISOString(),
      reportType: 'monthly_summary',
      format: 'pdf',
      parameters: {
        dateRange: {
          from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString(),
          to: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString(),
        },
      },
    }, {
      repeat: { pattern: CRON_SCHEDULES.MONTHLY_REPORT },
      removeOnComplete: 12,
      removeOnFail: 3,
    });
    
    // Hourly categorization
    await categorizationQueue.add('hourly-categorization', {
      id: `hourly-categorization-${Date.now()}`,
      timestamp: new Date().toISOString(),
      transactionIds: [], // Will be populated with uncategorized transactions
      method: 'ai',
      options: {
        confidence: 0.8,
      },
    }, {
      repeat: { pattern: CRON_SCHEDULES.HOURLY_CATEGORIZATION },
      removeOnComplete: 24,
      removeOnFail: 12,
    });
    
    console.log('✅ Recurring financial jobs scheduled');
  }

  /**
   * Subscribe to coordination events
   */
  private async subscribeToEvents(): Promise<void> {
    await this.queueManager.subscribeToEvents(
      EVENT_CHANNELS.WORKER_COORDINATION,
      (event) => {
        console.log(`📡 Received coordination event: ${event.event} from ${event.service}`);
        
        // Handle coordination events
        switch (event.event) {
          case 'pause_workers':
            this.pauseAllQueues();
            break;
          case 'resume_workers':
            this.resumeAllQueues();
            break;
          case 'health_check':
            this.respondToHealthCheck(event);
            break;
        }
      }
    );
  }

  /**
   * Get queue statistics for all financial queues
   */
  async getQueueStats() {
    const financialQueues = [
      QUEUE_NAMES.TRANSACTION_SYNC,
      QUEUE_NAMES.ACCOUNT_RECONCILIATION,
      QUEUE_NAMES.REPORT_GENERATION,
      QUEUE_NAMES.CATEGORIZATION,
    ];
    
    const stats = await Promise.all(
      financialQueues.map(queueName => this.queueManager.getQueueStats(queueName))
    );
    
    return {
      service: 'worker-financial',
      queues: stats,
      isRunning: this.isRunning,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Pause all financial queues
   */
  async pauseAllQueues(): Promise<void> {
    const financialQueues = [
      QUEUE_NAMES.TRANSACTION_SYNC,
      QUEUE_NAMES.ACCOUNT_RECONCILIATION,
      QUEUE_NAMES.REPORT_GENERATION,
      QUEUE_NAMES.CATEGORIZATION,
    ];
    
    await Promise.all(
      financialQueues.map(queueName => this.queueManager.pauseQueue(queueName))
    );
    
    console.log('⏸️ All financial queues paused');
  }

  /**
   * Resume all financial queues
   */
  async resumeAllQueues(): Promise<void> {
    const financialQueues = [
      QUEUE_NAMES.TRANSACTION_SYNC,
      QUEUE_NAMES.ACCOUNT_RECONCILIATION,
      QUEUE_NAMES.REPORT_GENERATION,
      QUEUE_NAMES.CATEGORIZATION,
    ];
    
    await Promise.all(
      financialQueues.map(queueName => this.queueManager.resumeQueue(queueName))
    );
    
    console.log('▶️ All financial queues resumed');
  }

  /**
   * Respond to health check
   */
  private async respondToHealthCheck(event: any): Promise<void> {
    await this.queueManager.publishEvent(EVENT_CHANNELS.WORKER_COORDINATION, {
      service: 'worker-financial',
      event: 'health_check_response',
      data: {
        correlationId: event.correlationId,
        status: 'healthy',
        isRunning: this.isRunning,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Shutdown worker
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Financial Queue Worker...');
    this.isRunning = false;
    await this.queueManager.shutdown();
    console.log('✅ Financial Queue Worker shutdown complete');
  }
}