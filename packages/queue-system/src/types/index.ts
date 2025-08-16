import { z } from 'zod';

// ===== Base Job Types =====
export const BaseJobDataSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  userId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type BaseJobData = z.infer<typeof BaseJobDataSchema>;

// ===== Trading Job Types =====
export const StrategyExecutionJobSchema = BaseJobDataSchema.extend({
  strategyName: z.string(),
  exchange: z.string(),
  symbol: z.string(),
  parameters: z.record(z.unknown()),
  riskLimits: z.object({
    maxPositionSize: z.number(),
    maxLoss: z.number(),
    maxLeverage: z.number().optional(),
  }),
});

export const ArbitrageDetectionJobSchema = BaseJobDataSchema.extend({
  exchangePair: z.array(z.string()).min(2),
  symbol: z.string(),
  minProfitPercentage: z.number().min(0),
  maxVolume: z.number().optional(),
});

export const PositionMonitoringJobSchema = BaseJobDataSchema.extend({
  positionId: z.string(),
  exchange: z.string(),
  symbol: z.string(),
  monitoringType: z.enum(['stop_loss', 'take_profit', 'trailing_stop', 'risk_check']),
  thresholds: z.record(z.number()),
});

export const RiskAnalysisJobSchema = BaseJobDataSchema.extend({
  analysisType: z.enum(['portfolio', 'position', 'market', 'var']),
  scope: z.object({
    positions: z.array(z.string()).optional(),
    timeframe: z.string(),
    portfolioId: z.string().optional(),
  }),
  parameters: z.record(z.unknown()),
});

// ===== Financial Job Types =====
export const TransactionSyncJobSchema = BaseJobDataSchema.extend({
  accountId: z.string(),
  provider: z.enum(['gocardless', 'manual', 'api']),
  syncType: z.enum(['full', 'incremental', 'specific']),
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }).optional(),
  filters: z.record(z.unknown()).optional(),
});

export const AccountReconciliationJobSchema = BaseJobDataSchema.extend({
  accountId: z.string(),
  reconciliationType: z.enum(['daily', 'monthly', 'manual']),
  targetBalance: z.number().optional(),
  discrepancyThreshold: z.number().default(0.01),
});

export const ReportGenerationJobSchema = BaseJobDataSchema.extend({
  reportType: z.enum(['monthly_summary', 'tax_report', 'cash_flow', 'profit_loss', 'balance_sheet']),
  format: z.enum(['pdf', 'excel', 'json', 'csv']),
  parameters: z.object({
    dateRange: z.object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    }),
    filters: z.record(z.unknown()).optional(),
    template: z.string().optional(),
  }),
  deliveryMethod: z.enum(['email', 'storage', 'api']).optional(),
});

export const CategorizationJobSchema = BaseJobDataSchema.extend({
  transactionIds: z.array(z.string()),
  method: z.enum(['ai', 'rules', 'hybrid']),
  options: z.object({
    aiModel: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    userCategories: z.array(z.string()).optional(),
  }),
});

// ===== Job Type Union Types =====
export type TradingJobData = 
  | z.infer<typeof StrategyExecutionJobSchema>
  | z.infer<typeof ArbitrageDetectionJobSchema>
  | z.infer<typeof PositionMonitoringJobSchema>
  | z.infer<typeof RiskAnalysisJobSchema>;

export type FinancialJobData = 
  | z.infer<typeof TransactionSyncJobSchema>
  | z.infer<typeof AccountReconciliationJobSchema>
  | z.infer<typeof ReportGenerationJobSchema>
  | z.infer<typeof CategorizationJobSchema>;

// ===== Queue Names =====
export const QUEUE_NAMES = {
  // Trading queues
  STRATEGY_EXECUTION: 'strategy-execution',
  ARBITRAGE_DETECTION: 'arbitrage-detection',
  POSITION_MONITORING: 'position-monitoring',
  RISK_ANALYSIS: 'risk-analysis',
  
  // Financial queues
  TRANSACTION_SYNC: 'transaction-sync',
  ACCOUNT_RECONCILIATION: 'account-reconciliation',
  REPORT_GENERATION: 'report-generation',
  CATEGORIZATION: 'categorization',
  
  // Shared queues
  NOTIFICATIONS: 'notifications',
  DEAD_LETTER: 'dead-letter',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// ===== Job Priority Levels =====
export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  URGENT = 20,
  CRITICAL = 30,
}

// ===== Job Status =====
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
}

// ===== Job Options =====
export interface JobOptions {
  priority?: JobPriority;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: number | boolean;
  removeOnFail?: number | boolean;
  repeatJobKey?: string;
  repeat?: {
    pattern?: string; // cron pattern
    every?: number;    // milliseconds
    limit?: number;    // max repetitions
  };
}

// ===== Queue Configuration =====
export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  prefix?: string;
  defaultJobOptions?: JobOptions;
  settings?: {
    stalledInterval?: number;
    maxStalledCount?: number;
  };
}

// ===== Worker Configuration =====
export interface WorkerConfig {
  concurrency?: number;
  limiter?: {
    max: number;
    duration: number;
  };
  settings?: {
    stalledInterval?: number;
    drainDelay?: number;
  };
}

// ===== Event Types =====
export interface JobEvent {
  jobId: string;
  queueName: string;
  event: 'waiting' | 'active' | 'completed' | 'failed' | 'progress' | 'stalled';
  data?: unknown;
  error?: string;
  timestamp: string;
}

// ===== Result Types =====
export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    executionTime: number;
    retryCount: number;
    workerInfo: {
      id: string;
      version: string;
    };
  };
}

// ===== FSM States for Trading =====
export enum TradingState {
  IDLE = 'idle',
  ANALYZING = 'analyzing',
  PREPARING = 'preparing',
  EXECUTING = 'executing',
  MONITORING = 'monitoring',
  STOPPING = 'stopping',
  ERROR = 'error',
  COMPLETED = 'completed',
}

export enum TradingEvent {
  START = 'start',
  ANALYZE_COMPLETE = 'analyze_complete',
  PREPARE_COMPLETE = 'prepare_complete',
  EXECUTE_COMPLETE = 'execute_complete',
  MONITOR_COMPLETE = 'monitor_complete',
  STOP = 'stop',
  ERROR = 'error',
  COMPLETE = 'complete',
  RESET = 'reset',
}

export interface TradingStateData {
  strategyId: string;
  currentState: TradingState;
  progress: number;
  metadata: Record<string, unknown>;
  error?: string;
  lastUpdate: string;
}

// ===== Cross-Service Communication =====
export interface ServiceEvent {
  service: string;
  event: string;
  data: unknown;
  timestamp: string;
  correlationId?: string;
}

export const EVENT_CHANNELS = {
  TRADING_EVENTS: 'trading:events',
  FINANCIAL_EVENTS: 'financial:events',
  SYSTEM_EVENTS: 'system:events',
  WORKER_COORDINATION: 'worker:coordination',
} as const;