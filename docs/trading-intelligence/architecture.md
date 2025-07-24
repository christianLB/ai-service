# Trading Intelligence Architecture

## System Overview

The Trading Intelligence module is built on a microservices-inspired architecture within the monolithic AI Service application. It leverages multiple specialized databases and external services to provide real-time trading capabilities.

## Core Components

### 1. Trading Brain Service
**Location**: `src/services/trading/trading-brain.service.ts`

The heart of the trading system, responsible for:
- AI-powered market analysis using OpenAI GPT-4
- Technical indicator calculations
- Trading signal generation
- Decision making based on multiple factors

**Key Methods**:
- `analyzeMarket()` - Comprehensive market analysis
- `generateTradingSignal()` - Signal generation with confidence scores
- `optimizeStrategy()` - Strategy parameter optimization
- `learnFromTrade()` - ML feedback loop

### 2. Market Data Service
**Location**: `src/services/trading/market-data.service.ts`

Handles all market data operations:
- Real-time price feeds from exchanges
- Historical data management
- Technical indicator calculations
- Market volatility analysis

**Data Flow**:
```
Exchange APIs → Market Data Service → InfluxDB
                       ↓
                Trading Brain ← Technical Indicators
```

### 3. Exchange Integration Services

#### Base Exchange Service
**Location**: `src/services/trading/base-exchange.service.ts`

Abstract base class providing:
- Common exchange interface
- API key management
- Rate limiting
- Error handling

#### Exchange Implementations
- **Binance**: `binance-exchange.service.ts`
- **Coinbase**: `coinbase-exchange.service.ts`
- **Kraken**: `kraken-exchange.service.ts`

Each implementation handles:
- Exchange-specific API integration
- Order execution
- Balance queries
- Market data streaming

### 4. Strategy Services

**Location**: `src/services/trading/strategies/`

Multiple strategy implementations:
- `SimpleDCAStrategy` - Dollar Cost Averaging
- `GridTradingStrategy` - Grid-based trading
- `MomentumStrategy` - Momentum-based signals
- `AIHybridStrategy` - AI-enhanced trading

### 5. Risk Management Service
**Location**: `src/services/trading/risk-management.service.ts`

Critical safety component:
- Position size calculation
- Stop-loss/take-profit management
- Portfolio risk assessment
- Emergency stop functionality

## Data Architecture

### Primary Database (PostgreSQL)

**Schema**: `trading`

**Key Tables**:
```sql
-- Exchange configuration
trading.exchanges
trading.exchange_api_keys (encrypted)

-- Trading strategies
trading.strategies
trading.strategy_parameters
trading.strategy_performance

-- Trade execution
trading.trades
trading.positions
trading.orders

-- System configuration
trading.trading_config
trading.risk_parameters
```

### Time-Series Database (InfluxDB)

**Purpose**: High-performance market data storage

**Measurements**:
- `market_prices` - OHLCV data
- `order_book` - Order book snapshots
- `trades` - Real-time trade feed
- `indicators` - Calculated technical indicators

**Retention Policies**:
- Raw data: 7 days
- 1-minute aggregates: 30 days
- 1-hour aggregates: 1 year

### Vector Database (Qdrant)

**Purpose**: Pattern recognition and similarity search

**Collections**:
- `market_patterns` - Historical price patterns
- `trading_signals` - Signal embeddings
- `strategy_performance` - Performance vectors

## API Architecture

### REST API Endpoints

**Base Path**: `/api/trading`

**Key Endpoints**:
- `GET /positions` - Current positions
- `POST /trades/execute` - Execute trade
- `GET /strategies` - List strategies
- `POST /strategies/:id/activate` - Activate strategy
- `GET /performance` - Performance metrics
- `POST /emergency-stop` - Emergency shutdown

### WebSocket Connections

**Purpose**: Real-time updates

**Channels**:
- `/ws/market-data` - Live price feeds
- `/ws/positions` - Position updates
- `/ws/trades` - Trade executions
- `/ws/signals` - Trading signals

## Security Architecture

### API Key Management
- Encrypted storage using AES-256
- Key rotation support
- Access logging
- Rate limiting per API key

### Trading Safeguards
- Maximum position size limits
- Daily loss limits
- Require confirmation for large trades
- Automatic circuit breakers

### Audit Trail
- All trades logged with timestamps
- Decision reasoning stored
- Performance tracking
- Compliance reporting

## Integration Points

### MCP Bridge Integration
```yaml
Trading Tools:
  - execute_trade
  - get_trading_positions
  - analyze_market
  - get_trading_strategies
  - activate_trading_strategy
  - get_trading_performance
  - set_risk_parameters
  - backtest_strategy
  - get_market_data
  - optimize_strategy_parameters
  - get_trading_signals
  - emergency_stop_trading
```

### External Services
- **OpenAI API** - AI analysis
- **Exchange APIs** - Trading execution
- **Telegram Bot** - Notifications
- **MCP Bridge** - External access

## Scalability Considerations

### Current Limitations
- Single-threaded Node.js process
- Shared database connections
- Memory-based caching

### Future Improvements
- Horizontal scaling with Redis clustering
- Dedicated market data service
- Separate execution service
- Cloud-native deployment

## Monitoring and Observability

### Metrics Collection
- Trade execution latency
- API response times
- Strategy performance
- System resource usage

### Logging
- Structured logging with Winston
- Log aggregation ready
- Debug mode for development

### Alerting
- Telegram notifications
- Email alerts (planned)
- Dashboard warnings