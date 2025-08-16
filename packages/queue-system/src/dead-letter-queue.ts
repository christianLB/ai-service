import { Queue, QueueEvents, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { 
  QueueName, 
  QUEUE_NAMES, 
  JobOptions, 
  JobResult, 
  ServiceEvent,
  EVENT_CHANNELS,
  TradingJobData,
  FinancialJobData
} from './types';
import { createQueueConnection } from './config';

/**
 * Dead Letter Queue Manager
 * Handles failed jobs that have exceeded retry attempts
 */
export class DeadLetterQueueManager {
  private deadLetterQueue!: Queue;
  private deadLetterQueueEvents!: QueueEvents;
  private deadLetterWorker!: Worker;
  private redis: Redis;
  private connection: any;

  constructor(private redisUrl: string) {
    this.connection = createQueueConnection(redisUrl);
    this.redis = new Redis(redisUrl);
  }

  /**
   * Initialize the dead letter queue system
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Dead Letter Queue Manager...');
    
    // Create dead letter queue
    this.deadLetterQueue = new Queue(QUEUE_NAMES.DEAD_LETTER, {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: 1000, // Keep more completed DLQ jobs for analysis
        removeOnFail: 500,
        attempts: 1, // Dead letter jobs don't get retried
      },
    });

    // Create queue events listener
    this.deadLetterQueueEvents = new QueueEvents(QUEUE_NAMES.DEAD_LETTER, {
      connection: this.connection,
    });

    // Create worker to process dead letter jobs
    this.createDeadLetterWorker();
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('✅ Dead Letter Queue Manager initialized');
  }

  /**
   * Create worker to process dead letter jobs
   */
  private createDeadLetterWorker(): void {
    this.deadLetterWorker = new Worker(
      QUEUE_NAMES.DEAD_LETTER,
      async (job: Job): Promise<JobResult> => {
        console.log(`💀 Processing dead letter job: ${job.id}`);
        
        try {
          const deadLetterData = job.data as DeadLetterJobData;
          
          // Analyze the failure
          const analysis = await this.analyzeFailure(deadLetterData);
          
          // Determine recovery action
          const recoveryAction = await this.determineRecoveryAction(deadLetterData, analysis);
          
          // Execute recovery if possible
          let recoveryResult = null;
          if (recoveryAction.action !== 'discard') {
            recoveryResult = await this.executeRecovery(deadLetterData, recoveryAction);
          }
          
          // Log the dead letter processing
          await this.logDeadLetterProcessing(deadLetterData, analysis, recoveryAction, recoveryResult);
          
          // Publish dead letter event
          await this.publishDeadLetterEvent(deadLetterData, analysis, recoveryAction);
          
          return {
            success: true,
            data: {
              analysis,
              recoveryAction,
              recoveryResult,
              processedAt: new Date().toISOString(),
            },
          };
          
        } catch (error) {
          console.error('Dead letter processing failed:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      {
        connection: this.connection,
        concurrency: 1, // Process one dead letter job at a time
      }
    );
  }

  /**
   * Add a job to the dead letter queue
   */
  async addToDeadLetterQueue(
    originalJob: Job,
    sourceQueue: QueueName,
    finalError: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const deadLetterData: DeadLetterJobData = {
      originalJobId: originalJob.id || 'unknown',
      originalJobName: originalJob.name,
      originalJobData: originalJob.data,
      sourceQueue,
      finalError,
      attemptsMade: originalJob.attemptsMade,
      failedAt: new Date().toISOString(),
      metadata: {
        ...metadata,
        originalTimestamp: originalJob.timestamp || 0,
        processedTime: originalJob.processedOn ? originalJob.processedOn - (originalJob.timestamp || 0) : 0,
      },
    };

    await this.deadLetterQueue.add('process-dead-letter', deadLetterData, {
      priority: this.calculateDeadLetterPriority(sourceQueue, finalError),
      attempts: 1,
    });

    console.log(`💀 Added job ${originalJob.id} to dead letter queue from ${sourceQueue}`);
  }

  /**
   * Analyze the failure to understand what went wrong
   */
  private async analyzeFailure(deadLetterData: DeadLetterJobData): Promise<FailureAnalysis> {
    const analysis: FailureAnalysis = {
      errorType: this.categorizeError(deadLetterData.finalError),
      isRetryable: this.isRetryableError(deadLetterData.finalError),
      riskLevel: this.assessRiskLevel(deadLetterData),
      patterns: await this.identifyFailurePatterns(deadLetterData),
      recommendations: [],
    };

    // Generate recommendations based on analysis
    analysis.recommendations = this.generateRecommendations(analysis, deadLetterData);

    return analysis;
  }

  /**
   * Categorize the error type
   */
  private categorizeError(error: string): string {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
      return 'timeout';
    }
    if (errorLower.includes('network') || errorLower.includes('connection')) {
      return 'network';
    }
    if (errorLower.includes('validation') || errorLower.includes('invalid')) {
      return 'validation';
    }
    if (errorLower.includes('permission') || errorLower.includes('auth')) {
      return 'authorization';
    }
    if (errorLower.includes('rate limit') || errorLower.includes('throttle')) {
      return 'rate_limit';
    }
    if (errorLower.includes('memory') || errorLower.includes('resource')) {
      return 'resource';
    }
    
    return 'unknown';
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: string): boolean {
    const retryableTypes = ['timeout', 'network', 'rate_limit', 'resource'];
    const errorType = this.categorizeError(error);
    return retryableTypes.includes(errorType);
  }

  /**
   * Assess risk level of the failure
   */
  private assessRiskLevel(deadLetterData: DeadLetterJobData): 'low' | 'medium' | 'high' | 'critical' {
    // Trading jobs have higher risk
    if (deadLetterData.sourceQueue.includes('strategy') || deadLetterData.sourceQueue.includes('arbitrage')) {
      return 'high';
    }
    
    // Position monitoring is critical
    if (deadLetterData.sourceQueue.includes('position')) {
      return 'critical';
    }
    
    // Financial transactions are important
    if (deadLetterData.sourceQueue.includes('transaction')) {
      return 'medium';
    }
    
    // Reports are lower risk
    if (deadLetterData.sourceQueue.includes('report')) {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * Identify failure patterns by analyzing recent dead letter jobs
   */
  private async identifyFailurePatterns(deadLetterData: DeadLetterJobData): Promise<string[]> {
    const patterns: string[] = [];
    
    try {
      // Get recent dead letter jobs to identify patterns
      const recentJobs = await this.deadLetterQueue.getCompleted(0, 50);
      
      // Count similar errors
      const similarErrors = recentJobs.filter(job => {
        const jobData = job.returnvalue?.data;
        return jobData && 
               jobData.analysis?.errorType === this.categorizeError(deadLetterData.finalError) &&
               jobData.sourceQueue === deadLetterData.sourceQueue;
      });
      
      if (similarErrors.length > 5) {
        patterns.push('recurring_error');
      }
      
      // Check for time-based patterns
      const recentErrorTimes = similarErrors.map(job => new Date(job.timestamp || 0));
      const now = new Date();
      const lastHour = recentErrorTimes.filter(time => 
        now.getTime() - time.getTime() < 60 * 60 * 1000
      );
      
      if (lastHour.length > 3) {
        patterns.push('spike');
      }
      
      // Check for queue-specific patterns
      const queueErrors = recentJobs.filter(job => 
        job.returnvalue?.data?.sourceQueue === deadLetterData.sourceQueue
      );
      
      if (queueErrors.length > 10) {
        patterns.push('queue_degradation');
      }
      
    } catch (error) {
      console.error('Failed to identify failure patterns:', error);
    }
    
    return patterns;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(analysis: FailureAnalysis, deadLetterData: DeadLetterJobData): string[] {
    const recommendations: string[] = [];
    
    if (analysis.errorType === 'timeout') {
      recommendations.push('Increase job timeout settings');
      recommendations.push('Check worker resource allocation');
    }
    
    if (analysis.errorType === 'network') {
      recommendations.push('Verify external service connectivity');
      recommendations.push('Implement circuit breaker pattern');
    }
    
    if (analysis.errorType === 'validation') {
      recommendations.push('Update job validation schemas');
      recommendations.push('Implement data sanitization');
    }
    
    if (analysis.errorType === 'rate_limit') {
      recommendations.push('Implement exponential backoff');
      recommendations.push('Add rate limiting to job dispatch');
    }
    
    if (analysis.patterns.includes('recurring_error')) {
      recommendations.push('Investigate root cause of recurring failures');
      recommendations.push('Consider disabling affected functionality');
    }
    
    if (analysis.patterns.includes('spike')) {
      recommendations.push('Check for system overload');
      recommendations.push('Implement load shedding');
    }
    
    if (analysis.riskLevel === 'critical') {
      recommendations.push('Immediate manual intervention required');
      recommendations.push('Alert on-call engineer');
    }
    
    return recommendations;
  }

  /**
   * Determine recovery action for the dead letter job
   */
  private async determineRecoveryAction(
    deadLetterData: DeadLetterJobData, 
    analysis: FailureAnalysis
  ): Promise<RecoveryAction> {
    // Critical risk jobs need manual review
    if (analysis.riskLevel === 'critical') {
      return {
        action: 'manual_review',
        reason: 'Critical risk level requires human intervention',
        delay: 0,
      };
    }
    
    // Non-retryable errors should be discarded or require manual review
    if (!analysis.isRetryable) {
      if (analysis.errorType === 'validation') {
        return {
          action: 'manual_review',
          reason: 'Validation errors require code changes',
          delay: 0,
        };
      }
      return {
        action: 'discard',
        reason: 'Non-retryable error type',
        delay: 0,
      };
    }
    
    // For retryable errors, decide based on patterns
    if (analysis.patterns.includes('spike')) {
      return {
        action: 'retry_delayed',
        reason: 'Wait for system recovery from spike',
        delay: 300000, // 5 minutes
      };
    }
    
    if (analysis.patterns.includes('recurring_error')) {
      return {
        action: 'manual_review',
        reason: 'Recurring error pattern detected',
        delay: 0,
      };
    }
    
    // Default retry with exponential backoff
    const delay = Math.min(60000 * Math.pow(2, deadLetterData.attemptsMade), 3600000); // Max 1 hour
    return {
      action: 'retry_delayed',
      reason: 'Retryable error with exponential backoff',
      delay,
    };
  }

  /**
   * Execute recovery action
   */
  private async executeRecovery(
    deadLetterData: DeadLetterJobData,
    recoveryAction: RecoveryAction
  ): Promise<any> {
    switch (recoveryAction.action) {
      case 'retry_delayed':
        return await this.retryJobDelayed(deadLetterData, recoveryAction.delay);
      
      case 'manual_review':
        return await this.flagForManualReview(deadLetterData, recoveryAction.reason);
      
      case 'discard':
        return await this.discardJob(deadLetterData, recoveryAction.reason);
      
      default:
        throw new Error(`Unknown recovery action: ${recoveryAction.action}`);
    }
  }

  /**
   * Retry job with delay
   */
  private async retryJobDelayed(deadLetterData: DeadLetterJobData, delay: number): Promise<any> {
    // Here you would add the job back to its original queue with delay
    // For now, we'll just log it
    console.log(`🔄 Scheduling retry for job ${deadLetterData.originalJobId} in ${delay}ms`);
    
    return {
      action: 'scheduled_retry',
      delay,
      scheduledFor: new Date(Date.now() + delay).toISOString(),
    };
  }

  /**
   * Flag job for manual review
   */
  private async flagForManualReview(deadLetterData: DeadLetterJobData, reason: string): Promise<any> {
    // Store in manual review queue or database
    console.log(`👥 Flagging job ${deadLetterData.originalJobId} for manual review: ${reason}`);
    
    // Publish alert for manual review
    await this.redis.publish('manual-review-alerts', JSON.stringify({
      jobId: deadLetterData.originalJobId,
      sourceQueue: deadLetterData.sourceQueue,
      reason,
      timestamp: new Date().toISOString(),
    }));
    
    return {
      action: 'flagged_for_review',
      reason,
      reviewUrl: `/admin/dead-letters/${deadLetterData.originalJobId}`,
    };
  }

  /**
   * Discard job permanently
   */
  private async discardJob(deadLetterData: DeadLetterJobData, reason: string): Promise<any> {
    console.log(`🗑️ Discarding job ${deadLetterData.originalJobId}: ${reason}`);
    
    return {
      action: 'discarded',
      reason,
      discardedAt: new Date().toISOString(),
    };
  }

  /**
   * Log dead letter processing for audit trail
   */
  private async logDeadLetterProcessing(
    deadLetterData: DeadLetterJobData,
    analysis: FailureAnalysis,
    recoveryAction: RecoveryAction,
    recoveryResult: any
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      originalJobId: deadLetterData.originalJobId,
      sourceQueue: deadLetterData.sourceQueue,
      finalError: deadLetterData.finalError,
      analysis,
      recoveryAction,
      recoveryResult,
    };
    
    // Log to Redis for audit trail (with TTL)
    await this.redis.setex(
      `dead-letter-log:${deadLetterData.originalJobId}`,
      30 * 24 * 60 * 60, // 30 days
      JSON.stringify(logEntry)
    );
    
    console.log(`📝 Logged dead letter processing for job ${deadLetterData.originalJobId}`);
  }

  /**
   * Publish dead letter event
   */
  private async publishDeadLetterEvent(
    deadLetterData: DeadLetterJobData,
    analysis: FailureAnalysis,
    recoveryAction: RecoveryAction
  ): Promise<void> {
    const event: ServiceEvent = {
      service: 'dead-letter-queue',
      event: 'job_processed',
      data: {
        originalJobId: deadLetterData.originalJobId,
        sourceQueue: deadLetterData.sourceQueue,
        errorType: analysis.errorType,
        riskLevel: analysis.riskLevel,
        recoveryAction: recoveryAction.action,
        patterns: analysis.patterns,
      },
      timestamp: new Date().toISOString(),
    };
    
    await this.redis.publish(EVENT_CHANNELS.SYSTEM_EVENTS, JSON.stringify(event));
  }

  /**
   * Calculate priority for dead letter jobs
   */
  private calculateDeadLetterPriority(sourceQueue: QueueName, error: string): number {
    let priority = 5; // Default priority
    
    // Higher priority for critical queues
    if (sourceQueue.includes('position') || sourceQueue.includes('risk')) {
      priority += 10;
    }
    
    // Higher priority for certain error types
    const errorType = this.categorizeError(error);
    if (errorType === 'timeout' || errorType === 'network') {
      priority += 5;
    }
    
    return priority;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.deadLetterQueueEvents.on('completed', ({ jobId }) => {
      console.log(`✅ Dead letter job ${jobId} processed`);
    });

    this.deadLetterQueueEvents.on('failed', ({ jobId, failedReason }) => {
      console.log(`❌ Dead letter job ${jobId} failed: ${failedReason}`);
    });
  }

  /**
   * Get dead letter queue statistics
   */
  async getStatistics() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.deadLetterQueue.getWaiting(),
      this.deadLetterQueue.getActive(),
      this.deadLetterQueue.getCompleted(),
      this.deadLetterQueue.getFailed(),
    ]);

    return {
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      },
      recentCompleted: completed.slice(0, 10),
      recentFailed: failed.slice(0, 10),
    };
  }

  /**
   * Shutdown dead letter queue
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Dead Letter Queue Manager...');
    
    if (this.deadLetterWorker) await this.deadLetterWorker.close();
    if (this.deadLetterQueueEvents) await this.deadLetterQueueEvents.close();
    if (this.deadLetterQueue) await this.deadLetterQueue.close();
    await this.redis.quit();
    
    console.log('✅ Dead Letter Queue Manager shutdown complete');
  }
}

// Types for dead letter queue
interface DeadLetterJobData {
  originalJobId: string;
  originalJobName: string;
  originalJobData: TradingJobData | FinancialJobData;
  sourceQueue: QueueName;
  finalError: string;
  attemptsMade: number;
  failedAt: string;
  metadata?: Record<string, unknown>;
}

interface FailureAnalysis {
  errorType: string;
  isRetryable: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  patterns: string[];
  recommendations: string[];
}

interface RecoveryAction {
  action: 'retry_delayed' | 'manual_review' | 'discard';
  reason: string;
  delay: number;
}