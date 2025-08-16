import { ConnectionOptions } from 'bullmq';
import { QueueConfig, WorkerConfig, JobOptions, JobPriority } from '../types';

export function createQueueConnection(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  
  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
    db: url.pathname ? parseInt(url.pathname.slice(1)) : 0,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true,
  };
}

export const DEFAULT_QUEUE_CONFIG: Partial<QueueConfig> = {
  prefix: 'ai-service',
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
  settings: {
    stalledInterval: 30000,  // 30 seconds
    maxStalledCount: 1,
  },
};

export const WORKER_CONFIGS: Record<string, WorkerConfig> = {
  'strategy-execution': {
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 60000, // 1 minute
    },
    settings: {
      stalledInterval: 30000,
      drainDelay: 5,
    },
  },
  
  'arbitrage-detection': {
    concurrency: 5,
    limiter: {
      max: 20,
      duration: 60000,
    },
    settings: {
      stalledInterval: 15000,
      drainDelay: 2,
    },
  },
  
  'position-monitoring': {
    concurrency: 10,
    limiter: {
      max: 50,
      duration: 60000,
    },
    settings: {
      stalledInterval: 10000,
      drainDelay: 1,
    },
  },
  
  'risk-analysis': {
    concurrency: 2,
    limiter: {
      max: 5,
      duration: 60000,
    },
    settings: {
      stalledInterval: 60000,
      drainDelay: 10,
    },
  },
  
  'transaction-sync': {
    concurrency: 3,
    limiter: {
      max: 15,
      duration: 60000,
    },
    settings: {
      stalledInterval: 30000,
      drainDelay: 5,
    },
  },
  
  'account-reconciliation': {
    concurrency: 2,
    limiter: {
      max: 5,
      duration: 300000, // 5 minutes
    },
    settings: {
      stalledInterval: 60000,
      drainDelay: 10,
    },
  },
  
  'report-generation': {
    concurrency: 1,
    limiter: {
      max: 3,
      duration: 300000,
    },
    settings: {
      stalledInterval: 120000, // 2 minutes
      drainDelay: 30,
    },
  },
  
  'categorization': {
    concurrency: 5,
    limiter: {
      max: 25,
      duration: 60000,
    },
    settings: {
      stalledInterval: 20000,
      drainDelay: 3,
    },
  },
};

export const JOB_PRIORITIES: Record<string, JobPriority> = {
  // Trading priorities
  'strategy-execution': JobPriority.HIGH,
  'arbitrage-detection': JobPriority.URGENT,
  'position-monitoring': JobPriority.CRITICAL,
  'risk-analysis': JobPriority.HIGH,
  
  // Financial priorities
  'transaction-sync': JobPriority.NORMAL,
  'account-reconciliation': JobPriority.HIGH,
  'report-generation': JobPriority.LOW,
  'categorization': JobPriority.NORMAL,
};

export const CRON_SCHEDULES = {
  // Financial scheduled jobs
  DAILY_SYNC: '0 6 * * *',        // Daily at 6 AM
  WEEKLY_RECONCILIATION: '0 8 * * 1', // Weekly on Monday at 8 AM
  MONTHLY_REPORT: '0 9 1 * *',     // Monthly on 1st at 9 AM
  HOURLY_CATEGORIZATION: '0 * * * *', // Every hour
  
  // Trading scheduled jobs
  MARKET_ANALYSIS: '*/15 * * * *',  // Every 15 minutes
  RISK_CHECK: '*/5 * * * *',        // Every 5 minutes
  ARBITRAGE_SCAN: '* * * * *',      // Every minute
  PORTFOLIO_REBALANCE: '0 */4 * * *', // Every 4 hours
} as const;

export const RETRY_STRATEGIES = {
  EXPONENTIAL_BACKOFF: {
    type: 'exponential' as const,
    delay: 2000,
  },
  FIXED_DELAY: {
    type: 'fixed' as const,
    delay: 5000,
  },
  CUSTOM_TRADING: {
    type: 'exponential' as const,
    delay: 1000,
  },
  CUSTOM_FINANCIAL: {
    type: 'exponential' as const,
    delay: 3000,
  },
} as const;