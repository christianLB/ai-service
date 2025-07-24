# Trading Intelligence Configuration Guide

## Overview

This guide covers all configuration options for the Trading Intelligence module, including environment variables, database settings, exchange configurations, and strategy parameters.

## Environment Variables

### Core Trading Configuration

```env
# Trading Module Enable/Disable
TRADING_ENABLED=true                    # Enable trading module
TRADING_PAPER_MODE=true                 # Start with paper trading
TRADING_DEBUG=false                     # Debug logging
TRADING_VERBOSE_LOGS=false              # Verbose logging

# Trading Limits
TRADING_MAX_DAILY_LOSS=0.05            # 5% max daily loss
TRADING_MAX_POSITION_SIZE=0.10         # 10% max per position
TRADING_MAX_OPEN_POSITIONS=5           # Max concurrent positions
TRADING_MIN_BALANCE=100                # Minimum balance to trade
```

### AI Configuration

```env
# OpenAI Settings
OPENAI_API_KEY=sk-...                  # OpenAI API key
OPENAI_MODEL=gpt-4-turbo-preview       # Model for analysis
OPENAI_MAX_TOKENS=4000                 # Max tokens per request
OPENAI_TEMPERATURE=0.7                 # Creativity (0-1)
AI_FALLBACK_MODE=false                 # Use fallback if AI fails
```

### Database Configuration

```env
# PostgreSQL (Primary Database)
DATABASE_URL=postgresql://user:pass@localhost:5432/ai_service_db
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000

# InfluxDB (Time-Series Data)
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=your-influxdb-token
INFLUXDB_ORG=ai-service
INFLUXDB_BUCKET=market-data
INFLUXDB_RETENTION=30d                 # Data retention period

# Qdrant (Vector Database)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=optional-api-key
QDRANT_COLLECTION=trading_patterns
```

### Performance Configuration

```env
# Caching
ENABLE_MARKET_DATA_CACHE=true
CACHE_TTL=60                           # Cache TTL in seconds
REDIS_URL=redis://localhost:6379

# Rate Limiting
EXCHANGE_RATE_LIMIT=10                 # Requests per second
EXCHANGE_REQUEST_DELAY=100             # Delay between requests (ms)
WEBSOCKET_RECONNECT_DELAY=5000         # WebSocket reconnect delay

# Performance
MAX_CONCURRENT_ORDERS=3                # Parallel order execution
MARKET_DATA_BATCH_SIZE=100            # Batch size for data processing
ANALYSIS_TIMEOUT=30000                 # Analysis timeout (ms)
```

## Exchange Configuration

### Exchange API Settings

Each exchange can be configured through environment variables or the database:

```env
# Binance
BINANCE_API_URL=https://api.binance.com
BINANCE_TESTNET_URL=https://testnet.binance.vision
BINANCE_WS_URL=wss://stream.binance.com:9443
BINANCE_RATE_LIMIT=1200               # Requests per minute

# Coinbase
COINBASE_API_URL=https://api.exchange.coinbase.com
COINBASE_SANDBOX_URL=https://api-public.sandbox.exchange.coinbase.com
COINBASE_WS_URL=wss://ws-feed.exchange.coinbase.com
COINBASE_RATE_LIMIT=10                # Requests per second

# Kraken
KRAKEN_API_URL=https://api.kraken.com
KRAKEN_WS_URL=wss://ws.kraken.com
KRAKEN_RATE_LIMIT=1                   # Requests per second
```

### Database Exchange Configuration

Exchanges are stored in the database with encrypted credentials:

```sql
-- Exchange configuration table
CREATE TABLE trading.exchanges (
  id UUID PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  testnet BOOLEAN DEFAULT true,
  config JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exchange API keys (encrypted)
CREATE TABLE trading.exchange_api_keys (
  id UUID PRIMARY KEY,
  exchange_id UUID REFERENCES trading.exchanges(id),
  user_id UUID REFERENCES users(id),
  encrypted_key TEXT NOT NULL,
  encrypted_secret TEXT NOT NULL,
  permissions JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Strategy Configuration

### Global Strategy Settings

```typescript
interface GlobalStrategyConfig {
  // Execution
  enableAutoTrading: boolean;          // Auto-execute signals
  requireConfirmation: boolean;        // Manual confirmation
  confirmationTimeout: number;         // Timeout in seconds
  
  // Risk Management
  maxStrategiesPerUser: number;        // Limit strategies
  defaultStopLoss: number;             // Default SL percentage
  defaultTakeProfit: number;           // Default TP percentage
  
  // Performance
  backtestDataDays: number;            // Days of data for backtest
  optimizationIterations: number;      // Optimization cycles
  minBacktestTrades: number;           // Min trades for valid backtest
}
```

### Strategy-Specific Configuration

Each strategy type has its own configuration:

#### DCA Strategy Config
```json
{
  "type": "dca",
  "parameters": {
    "interval": "1h",           // Purchase interval
    "amount": 100,              // Amount per purchase
    "maxPositions": 10,         // Max DCA positions
    "priceDropTrigger": 0.02,   // Optional: Buy on 2% drop
    "takeProfitEnabled": true,
    "takeProfitPercentage": 0.05,
    "stopLossEnabled": true,
    "stopLossPercentage": 0.10
  }
}
```

#### Grid Trading Config
```json
{
  "type": "grid",
  "parameters": {
    "gridLevels": 20,           // Number of grid levels
    "gridSpacing": 0.01,        // 1% spacing
    "upperBound": 55000,        // Upper price bound
    "lowerBound": 45000,        // Lower price bound
    "amountPerGrid": 50,        // Amount per level
    "takeProfitRatio": 0.02,    // TP per grid
    "compoundProfits": true,    // Reinvest profits
    "trailingGrid": false       // Move grid with price
  }
}
```

#### Momentum Strategy Config
```json
{
  "type": "momentum",
  "parameters": {
    "timeframe": "4h",
    "lookbackPeriod": 20,
    "momentumThreshold": 0.02,
    "volumeConfirmation": true,
    "volumeMultiplier": 1.5,
    "rsi": {
      "enabled": true,
      "period": 14,
      "oversold": 30,
      "overbought": 70
    },
    "macd": {
      "enabled": true,
      "fast": 12,
      "slow": 26,
      "signal": 9
    },
    "stopLoss": {
      "type": "trailing",
      "initial": 0.02,
      "trailing": 0.01
    }
  }
}
```

#### AI Hybrid Config
```json
{
  "type": "ai_hybrid",
  "parameters": {
    "baseStrategy": "momentum",
    "aiModel": "gpt-4-turbo",
    "analysisDepth": "comprehensive",
    "factors": {
      "technical": 0.4,
      "sentiment": 0.3,
      "fundamental": 0.2,
      "pattern": 0.1
    },
    "confidenceThreshold": 0.75,
    "learningEnabled": true,
    "adaptationRate": 0.1,
    "riskAdjustment": {
      "enabled": true,
      "method": "dynamic",
      "baseRisk": 0.02,
      "maxRisk": 0.05
    }
  }
}
```

## Risk Management Configuration

### Risk Parameters

```typescript
interface RiskConfig {
  // Position Limits
  maxPositionSizePercent: number;      // Default: 10%
  maxTotalExposurePercent: number;     // Default: 50%
  maxOpenPositions: number;            // Default: 5
  maxCorrelatedPositions: number;      // Default: 3
  correlationThreshold: number;        // Default: 0.7
  
  // Loss Limits
  maxDailyLossPercent: number;         // Default: 5%
  maxWeeklyLossPercent: number;        // Default: 10%
  maxMonthlyLossPercent: number;       // Default: 15%
  maxDrawdownPercent: number;          // Default: 20%
  
  // Order Validation
  minOrderSize: number;                // Minimum order size
  maxSlippagePercent: number;          // Max acceptable slippage
  requireStopLoss: boolean;            // Force stop loss
  maxLeverage: number;                 // Max leverage allowed
  
  // Emergency Controls
  emergencyStopEnabled: boolean;       // Emergency stop feature
  autoStopOnErrors: boolean;           // Stop on system errors
  errorThreshold: number;              // Error count threshold
  cooldownPeriod: number;              // Minutes after emergency
}
```

### Risk Profiles

Pre-configured risk profiles:

```typescript
const RISK_PROFILES = {
  conservative: {
    maxPositionSizePercent: 5,
    maxTotalExposurePercent: 25,
    maxDailyLossPercent: 2,
    defaultStopLoss: 1,
    maxLeverage: 1
  },
  moderate: {
    maxPositionSizePercent: 10,
    maxTotalExposurePercent: 50,
    maxDailyLossPercent: 5,
    defaultStopLoss: 2,
    maxLeverage: 2
  },
  aggressive: {
    maxPositionSizePercent: 20,
    maxTotalExposurePercent: 80,
    maxDailyLossPercent: 10,
    defaultStopLoss: 3,
    maxLeverage: 3
  }
};
```

## Market Data Configuration

### Data Collection Settings

```typescript
interface MarketDataConfig {
  // Collection
  symbols: string[];                   // Symbols to track
  exchanges: string[];                 // Exchanges to monitor
  timeframes: string[];                // Candle timeframes
  
  // Storage
  retentionPolicy: {
    raw: '7d',                        // Raw tick data
    '1m': '30d',                      // 1-minute candles
    '1h': '180d',                     // 1-hour candles
    '1d': '5y'                        // Daily candles
  };
  
  // Performance
  batchSize: number;                   // Processing batch size
  compressionEnabled: boolean;         // Enable compression
  aggregationInterval: number;         // Aggregation interval (ms)
}
```

### WebSocket Configuration

```typescript
interface WebSocketConfig {
  // Connection
  reconnectEnabled: boolean;           // Auto-reconnect
  reconnectDelay: number;              // Reconnect delay (ms)
  maxReconnectAttempts: number;        // Max reconnect tries
  
  // Subscriptions
  maxSubscriptions: number;            // Max subscriptions
  heartbeatInterval: number;           // Heartbeat interval (ms)
  messageQueueSize: number;            // Message buffer size
  
  // Performance
  compressionEnabled: boolean;         // Enable compression
  binaryMessaging: boolean;            // Use binary format
}
```

## Notification Configuration

### Alert Settings

```env
# Telegram Notifications
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
TELEGRAM_ALERTS_ENABLED=true

# Email Notifications (Future)
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_FROM=alerts@ai-service.com
EMAIL_TO=admin@example.com

# Webhook Notifications
WEBHOOK_URL=https://your-webhook.com/trading-alerts
WEBHOOK_SECRET=your-webhook-secret
```

### Alert Types Configuration

```typescript
interface AlertConfig {
  // Trade Alerts
  tradeExecuted: boolean;
  largeTrade: boolean;                // > 5% of portfolio
  stopLossHit: boolean;
  takeProfitHit: boolean;
  
  // Risk Alerts
  dailyLossWarning: boolean;          // At 80% of limit
  emergencyStop: boolean;
  riskLimitExceeded: boolean;
  
  // System Alerts
  connectionLost: boolean;
  systemError: boolean;
  strategyError: boolean;
  
  // Performance Alerts
  newHighWaterMark: boolean;
  significantDrawdown: boolean;       // > 10%
  strategyPerformance: boolean;        // Daily summary
}
```

## Security Configuration

### Authentication Settings

```env
# JWT Configuration
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# MFA Settings
MFA_ENABLED=true
MFA_ISSUER=AI-Service-Trading

# Session Management
SESSION_TIMEOUT=1800                   # 30 minutes
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900                   # 15 minutes
```

### Encryption Settings

```env
# Encryption Keys
MASTER_ENCRYPTION_KEY=your-32-byte-key
KEY_ROTATION_ENABLED=true
KEY_ROTATION_DAYS=90

# API Security
API_RATE_LIMIT=100                    # Requests per minute
IP_WHITELIST_ENABLED=false
ALLOWED_IPS=192.168.1.1,10.0.0.1
```

## Deployment Configuration

### Production Settings

```env
# Node.js
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=4096"

# Clustering
CLUSTER_ENABLED=true
WORKER_COUNT=4

# Monitoring
MONITORING_ENABLED=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000
```

### Docker Configuration

```yaml
# docker-compose.yml
services:
  trading-api:
    environment:
      - NODE_ENV=production
      - TRADING_ENABLED=true
      - TRADING_PAPER_MODE=false
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

## Configuration Best Practices

1. **Environment-Specific Files**
   - `.env.development` - Development settings
   - `.env.staging` - Staging settings
   - `.env.production` - Production settings

2. **Secret Management**
   - Use secret management tools
   - Never commit secrets
   - Rotate keys regularly

3. **Configuration Validation**
   ```typescript
   npm run config:validate
   ```

4. **Configuration Backup**
   ```bash
   npm run config:backup
   ```

5. **Regular Reviews**
   - Weekly: Check rate limits
   - Monthly: Review risk parameters
   - Quarterly: Security audit