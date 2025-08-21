# BullMQ Queue System Implementation

Complete BullMQ queue implementation for the AI Service with FSM integration, dead letter queues, and cross-service communication.

## Overview

This implementation provides a comprehensive queue system for managing trading and financial operations with:

- **Queue Management**: Centralized BullMQ queue management with TypeScript support
- **Trading FSM**: Finite State Machine for trading strategy execution
- **Dead Letter Queue**: Intelligent failure handling and recovery
- **Worker Services**: Specialized workers for trading and financial operations
- **Cross-Service Communication**: Redis pub/sub for event coordination
- **Monitoring**: Comprehensive metrics and observability

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   trading-svc   │    │ worker-trading  │    │ worker-financial│
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Trading FSM │ │    │ │Queue Workers│ │    │ │Queue Workers│ │
│ │             │ │    │ │             │ │    │ │             │ │
│ │ ┌─────────┐ │ │    │ │ ┌─────────┐ │ │    │ │ ┌─────────┐ │ │
│ │ │States   │ │ │    │ │ │Strategy │ │ │    │ │ │Trans    │ │ │
│ │ │Events   │ │ │    │ │ │Arbitrage│ │ │    │ │ │Reports  │ │ │
│ │ │Progress │ │ │    │ │ │Risk     │ │ │    │ │ │Recon    │ │ │
│ │ └─────────┘ │ │    │ │ │Monitor  │ │ │    │ │ │Category │ │ │
│ └─────────────┘ │    │ │ └─────────┘ │ │    │ │ └─────────┘ │ │
└─────────────────┘    │ └─────────────┘ │    │ └─────────────┘ │
         │              └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
    ┌─────────────────────────────────────────────────────────┐
    │                    Redis Pub/Sub                        │
    │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
    │ │Trading      │ │Financial    │ │System       │       │
    │ │Events       │ │Events       │ │Events       │       │
    │ └─────────────┘ └─────────────┘ └─────────────┘       │
    └─────────────────────────────────────────────────────────┘
                                 │
    ┌─────────────────────────────────────────────────────────┐
    │                   BullMQ Queues                         │
    │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
    │ │Strategy     │ │Transaction  │ │Dead Letter  │       │
    │ │Arbitrage    │ │Reports      │ │Queue        │       │
    │ │Risk         │ │Recon        │ │             │       │
    │ │Monitor      │ │Category     │ │             │       │
    │ └─────────────┘ └─────────────┘ └─────────────┘       │
    └─────────────────────────────────────────────────────────┘
```

## Package Structure

### `packages/queue-system/`

```
packages/queue-system/
├── src/
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces for all job types
│   ├── config/
│   │   └── index.ts           # Queue configuration and constants
│   ├── fsm/
│   │   └── trading-fsm.ts     # Trading Finite State Machine
│   ├── queue-manager.ts       # Main queue management class
│   ├── dead-letter-queue.ts   # Dead letter queue implementation
│   └── index.ts               # Package exports
├── package.json
└── tsconfig.json
```

## Core Components

### 1. Queue Manager (`queue-manager.ts`)

Central management for all BullMQ queues:

```typescript
const queueManager = new QueueManager(env.REDIS_URL);
await queueManager.initialize();

// Add jobs
await queueManager.addJob('strategy-execution', jobData, options);

// Create workers
queueManager.createWorker('strategy-execution', processorFunction);

// Get statistics
const stats = await queueManager.getAllQueueStats();
```

### 2. Trading FSM (`fsm/trading-fsm.ts`)

Finite State Machine for trading strategy execution:

```typescript
const fsm = new TradingFSM(strategyId, queueManager);

// Start strategy
await fsm.start(strategyConfig);

// Monitor state changes
fsm.on('stateChanged', (event) => {
  console.log(`State: ${event.previousState} → ${event.newState}`);
});

// Stop strategy
await fsm.stop('User requested');
```

**FSM States:**

- `IDLE` → `ANALYZING` → `PREPARING` → `EXECUTING` → `MONITORING` → `COMPLETED`
- Error handling: Any state → `ERROR` → `IDLE`
- Emergency stop: Any state → `STOPPING` → `COMPLETED`

### 3. Dead Letter Queue (`dead-letter-queue.ts`)

Intelligent failure handling:

```typescript
const dlq = new DeadLetterQueueManager(env.REDIS_URL);
await dlq.initialize();

// Automatically handles failed jobs with:
// - Error categorization (timeout, network, validation, etc.)
// - Recovery strategies (retry, manual review, discard)
// - Pattern analysis (spikes, recurring errors)
// - Risk assessment (low, medium, high, critical)
```

## Queue Types

### Trading Queues

#### 1. Strategy Execution (`strategy-execution`)

Executes trading strategies with risk management:

```typescript
interface StrategyExecutionJob {
  id: string;
  strategyName: string;
  exchange: string;
  symbol: string;
  parameters: Record<string, unknown>;
  riskLimits: {
    maxPositionSize: number;
    maxLoss: number;
    maxLeverage?: number;
  };
}
```

#### 2. Arbitrage Detection (`arbitrage-detection`)

Scans for arbitrage opportunities across exchanges:

```typescript
interface ArbitrageDetectionJob {
  id: string;
  exchangePair: string[];
  symbol: string;
  minProfitPercentage: number;
  maxVolume?: number;
}
```

#### 3. Position Monitoring (`position-monitoring`)

Monitors positions for risk management:

```typescript
interface PositionMonitoringJob {
  id: string;
  positionId: string;
  exchange: string;
  symbol: string;
  monitoringType: 'stop_loss' | 'take_profit' | 'trailing_stop' | 'risk_check';
  thresholds: Record<string, number>;
}
```

#### 4. Risk Analysis (`risk-analysis`)

Comprehensive portfolio risk analysis:

```typescript
interface RiskAnalysisJob {
  id: string;
  analysisType: 'portfolio' | 'position' | 'market' | 'var';
  scope: {
    positions?: string[];
    timeframe: string;
    portfolioId?: string;
  };
  parameters: Record<string, unknown>;
}
```

### Financial Queues

#### 1. Transaction Sync (`transaction-sync`)

Synchronizes transactions from external providers:

```typescript
interface TransactionSyncJob {
  id: string;
  accountId: string;
  provider: 'gocardless' | 'manual' | 'api';
  syncType: 'full' | 'incremental' | 'specific';
  dateRange?: {
    from: string;
    to: string;
  };
}
```

#### 2. Account Reconciliation (`account-reconciliation`)

Reconciles account balances:

```typescript
interface AccountReconciliationJob {
  id: string;
  accountId: string;
  reconciliationType: 'daily' | 'monthly' | 'manual';
  targetBalance?: number;
  discrepancyThreshold: number;
}
```

#### 3. Report Generation (`report-generation`)

Generates financial reports:

```typescript
interface ReportGenerationJob {
  id: string;
  reportType: 'monthly_summary' | 'tax_report' | 'cash_flow' | 'profit_loss';
  format: 'pdf' | 'excel' | 'json' | 'csv';
  parameters: {
    dateRange: {
      from: string;
      to: string;
    };
    filters?: Record<string, unknown>;
  };
}
```

#### 4. Categorization (`categorization`)

AI-powered transaction categorization:

```typescript
interface CategorizationJob {
  id: string;
  transactionIds: string[];
  method: 'ai' | 'rules' | 'hybrid';
  options: {
    aiModel?: string;
    confidence?: number;
    userCategories?: string[];
  };
}
```

## Trading Service API

### Deploy Strategy

```http
POST /v1/trading/deploy
Content-Type: application/json

{
  "strategyName": "momentum",
  "exchange": "binance",
  "symbol": "BTC/USD",
  "parameters": {
    "timeframe": "1h",
    "indicator": "RSI"
  },
  "riskLimits": {
    "maxPositionSize": 1000,
    "maxLoss": 100
  }
}
```

**Response:**

```json
{
  "strategyId": "strategy_1640995200000_abc123",
  "strategyName": "momentum",
  "exchange": "binance",
  "symbol": "BTC/USD",
  "state": "analyzing",
  "progress": 0,
  "deployedAt": "2023-12-31T12:00:00.000Z",
  "endpoints": {
    "status": "/v1/trading/status/strategy_1640995200000_abc123",
    "stop": "/v1/trading/stop/strategy_1640995200000_abc123",
    "history": "/v1/trading/history/strategy_1640995200000_abc123"
  }
}
```

### Stop Strategy

```http
POST /v1/trading/stop/strategy_1640995200000_abc123
Content-Type: application/json

{
  "reason": "User requested stop"
}
```

### Get Strategy Status

```http
GET /v1/trading/status/strategy_1640995200000_abc123
```

**Response:**

```json
{
  "strategyId": "strategy_1640995200000_abc123",
  "state": "executing",
  "stateData": {
    "currentState": "executing",
    "progress": 75,
    "metadata": {
      "strategyName": "momentum",
      "ordersPlaced": 3,
      "totalProfit": "150.25"
    },
    "lastUpdate": "2023-12-31T12:05:00.000Z"
  },
  "history": [...],
  "queueStatus": {
    "relatedQueues": [...],
    "totalRelatedJobs": 2
  }
}
```

### Get System Status

```http
GET /v1/trading/system-status
```

### Emergency Stop All

```http
POST /v1/trading/emergency-stop
Content-Type: application/json

{
  "reason": "Market volatility alert"
}
```

## Worker Services

### worker-trading (port 3102)

Processes trading-related jobs:

```bash
# Get queue status
curl http://localhost:3102/api/worker/queue-status

# Pause all queues
curl -X POST http://localhost:3102/api/worker/pause

# Resume all queues
curl -X POST http://localhost:3102/api/worker/resume
```

### worker-financial (port 3101)

Processes financial jobs with scheduled tasks:

**Scheduled Jobs:**

- **Daily Sync**: `0 6 * * *` (6 AM daily)
- **Weekly Reconciliation**: `0 8 * * 1` (Monday 8 AM)
- **Monthly Report**: `0 9 1 * *` (1st of month 9 AM)
- **Hourly Categorization**: `0 * * * *` (Every hour)

## Cross-Service Communication

### Event Channels

1. **`trading:events`** - Trading-related events
2. **`financial:events`** - Financial operation events
3. **`system:events`** - System-wide events
4. **`worker:coordination`** - Worker coordination

### Event Examples

**Strategy Execution Completed:**

```json
{
  "service": "worker-trading",
  "event": "strategy_execution_completed",
  "data": {
    "strategyId": "strategy_123",
    "profit": "150.25",
    "ordersPlaced": 3
  },
  "timestamp": "2023-12-31T12:00:00.000Z"
}
```

**Transaction Sync Completed:**

```json
{
  "service": "worker-financial",
  "event": "transaction_sync_completed",
  "data": {
    "accountId": "acc_123",
    "transactionsProcessed": 45,
    "newTransactions": 12
  },
  "timestamp": "2023-12-31T12:00:00.000Z"
}
```

## Monitoring and Metrics

### Queue Metrics

All services expose Prometheus metrics:

```
# Queue depth by queue and priority
queue_depth{queue_name="strategy-execution",priority="high"} 3

# Jobs processed by type and status
jobs_processed_total{job_type="strategy_execution",status="success"} 1250

# Job processing time
job_processing_seconds{job_type="arbitrage_detection"} 2.5

# Active jobs by type
active_jobs_total{job_type="position_monitoring"} 5
```

### Health Checks

```bash
# Check worker health
curl http://localhost:3102/health/ready
curl http://localhost:3101/health/ready

# Check trading service health
curl http://localhost:3002/health/ready
```

## Configuration

### Environment Variables

```bash
# Required
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Queue Configuration
QUEUE_PREFIX=ai-service
QUEUE_DEFAULT_REMOVE_ON_COMPLETE=true
QUEUE_DEFAULT_REMOVE_ON_FAIL=false

# Worker Configuration
WORKER_TRADING_CONCURRENCY=5
WORKER_FINANCIAL_CONCURRENCY=3
```

### Worker Concurrency

```typescript
const WORKER_CONFIGS = {
  'strategy-execution': { concurrency: 3, limiter: { max: 10, duration: 60000 } },
  'arbitrage-detection': { concurrency: 5, limiter: { max: 20, duration: 60000 } },
  'position-monitoring': { concurrency: 10, limiter: { max: 50, duration: 60000 } },
  'risk-analysis': { concurrency: 2, limiter: { max: 5, duration: 60000 } },
  'transaction-sync': { concurrency: 3, limiter: { max: 15, duration: 60000 } },
  'account-reconciliation': { concurrency: 2, limiter: { max: 5, duration: 300000 } },
  'report-generation': { concurrency: 1, limiter: { max: 3, duration: 300000 } },
  categorization: { concurrency: 5, limiter: { max: 25, duration: 60000 } },
};
```

## Deployment

### Docker Compose

The queue system integrates with the existing Docker Compose setup:

```yaml
services:
  redis:
    image: redis:7
    # ... existing config

  worker-trading:
    # ... existing config
    depends_on:
      redis:
        condition: service_healthy

  worker-financial:
    # ... existing config
    depends_on:
      redis:
        condition: service_healthy

  trading-svc:
    # ... existing config
    depends_on:
      redis:
        condition: service_healthy
```

### Build and Start

```bash
# Build all services
npm run build

# Start infrastructure
docker-compose up -d redis db

# Start workers and services
docker-compose up -d worker-trading worker-financial trading-svc
```

## Usage Examples

### 1. Deploy a Trading Strategy

```typescript
const response = await fetch('http://localhost:3002/v1/trading/deploy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    strategyName: 'arbitrage',
    exchange: 'binance',
    symbol: 'BTC/USD',
    parameters: {
      exchanges: ['binance', 'coinbase'],
      minProfit: 0.5,
    },
    riskLimits: {
      maxPositionSize: 1000,
      maxLoss: 100,
    },
  }),
});

const strategy = await response.json();
console.log('Strategy deployed:', strategy.strategyId);
```

### 2. Monitor Strategy Progress

```typescript
const statusResponse = await fetch(
  `http://localhost:3002/v1/trading/status/${strategy.strategyId}`
);
const status = await statusResponse.json();

console.log(`Strategy state: ${status.state}`);
console.log(`Progress: ${status.stateData.progress}%`);
```

### 3. Queue Financial Job

```typescript
import { QueueManager, QUEUE_NAMES } from '@ai/queue-system';

const queueManager = new QueueManager(process.env.REDIS_URL);
await queueManager.initialize();

await queueManager.addJob(QUEUE_NAMES.TRANSACTION_SYNC, {
  id: `sync_${Date.now()}`,
  timestamp: new Date().toISOString(),
  accountId: 'acc_123',
  provider: 'gocardless',
  syncType: 'incremental',
  dateRange: {
    from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
  },
});
```

## Error Handling

### Dead Letter Queue

Failed jobs are automatically routed to the dead letter queue with:

- **Error categorization**: timeout, network, validation, authorization, rate_limit, resource
- **Risk assessment**: low, medium, high, critical
- **Recovery strategies**: retry_delayed, manual_review, discard
- **Pattern analysis**: recurring_error, spike, queue_degradation

### Monitoring Dead Letters

```bash
# Get dead letter statistics
curl http://localhost:3102/api/worker/dead-letter-stats

# Review failed jobs
curl http://localhost:3102/api/worker/dead-letter-review
```

## Testing

### Unit Tests

```bash
# Test queue operations
npm test packages/queue-system

# Test worker implementations
npm test apps/worker-trading
npm test apps/worker-financial
```

### Integration Tests

```bash
# Test full trading workflow
curl -X POST http://localhost:3002/v1/trading/deploy \
  -H "Content-Type: application/json" \
  -d '{"strategyName":"test","exchange":"binance","symbol":"BTC/USD"}'

# Monitor job processing
curl http://localhost:3102/api/worker/queue-status
```

## Troubleshooting

### Common Issues

1. **Redis Connection Issues**

   ```bash
   # Check Redis connectivity
   redis-cli -u $REDIS_URL ping
   ```

2. **Queue Stalling**

   ```bash
   # Check for stalled jobs
   curl http://localhost:3102/api/worker/queue-status | jq '.queues[] | select(.counts.active > 0)'
   ```

3. **High Memory Usage**
   ```bash
   # Check queue job retention
   curl http://localhost:3102/api/worker/queue-status | jq '.queues[].counts'
   ```

### Debug Mode

```bash
# Enable debug logging
DEBUG=bullmq:* npm start

# Monitor Redis commands
redis-cli monitor
```

## Performance Considerations

### Queue Optimization

- **Job Retention**: Configure `removeOnComplete` and `removeOnFail`
- **Concurrency**: Tune worker concurrency based on system resources
- **Priority**: Use job priorities for critical operations
- **Batching**: Group related operations for efficiency

### Resource Limits

- **Memory**: Monitor Redis memory usage with job retention
- **CPU**: Balance worker concurrency with available cores
- **Network**: Consider rate limits for external API calls
- **Disk**: Ensure adequate storage for job data and logs

## Future Enhancements

1. **Queue Monitoring Dashboard**: Web UI for queue visualization
2. **Advanced Retry Strategies**: Custom retry logic per job type
3. **Job Scheduling**: Cron-based job scheduling improvements
4. **Performance Analytics**: Detailed performance metrics and optimization
5. **Multi-Redis Support**: Redis cluster support for high availability

---

This implementation provides a robust, scalable queue system that supports the complex workflows of trading and financial operations while maintaining high reliability and observability.
