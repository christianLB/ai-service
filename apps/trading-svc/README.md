# Trading Service

A comprehensive, isolated trading service that handles all trading-related functionality including strategies, positions, market data, and backtesting.

## 🏗️ Architecture

The trading service is designed as a microservice with its own database schema and isolated business logic:

- **Database**: PostgreSQL with `trading` schema namespace
- **ORM**: Prisma Client configured for trading schema
- **Runtime**: Node.js with Express.js REST API
- **Real-time**: EventEmitter-based market data streaming
- **Background Jobs**: Async backtest and optimization processing

## 📦 Core Modules

### 1. Strategies Service (`src/services/strategies.service.ts`)
- Manages trading strategies (Trend Following, Market Making, Arbitrage)
- Handles strategy lifecycle (start, stop, pause, parameter updates)
- Generates trading signals based on market data
- Tracks strategy performance and metrics

### 2. Positions Service (`src/services/positions.service.ts`)
- Position management (open, close, update)
- Risk management and portfolio tracking
- Stop-loss and take-profit automation
- Real-time P&L calculation and risk metrics

### 3. Market Data Service (`src/services/market-data.service.ts`)
- Multi-exchange market data aggregation
- Real-time price feeds and order books
- Technical indicators calculation
- Market alerts and notifications

### 4. Backtest Service (`src/services/backtest.service.ts`)
- Strategy backtesting engine
- Historical data analysis
- Performance metrics calculation
- Strategy optimization with parameter tuning

## 🗄️ Database Schema

The service uses a comprehensive Prisma schema with the `trading` namespace:

### Key Models:
- `Exchange` - Trading exchange configurations
- `TradingPair` - Trading symbols with metadata
- `Strategy` - Trading strategy definitions
- `Position` - Open/closed trading positions
- `Trade` - Individual trade executions
- `MarketData` - OHLCV price data
- `TechnicalIndicator` - Calculated indicators
- `Backtest` - Backtest configurations and results
- `Optimization` - Strategy optimization jobs

## 🚀 API Endpoints

### Health & Status
```
GET  /health                 - Service health check
GET  /api/trading/stats      - Service statistics
```

### Strategies
```
GET  /api/trading/strategies                 - List all strategies
GET  /api/trading/strategies/:id             - Get strategy details
GET  /api/trading/strategies/:id/performance - Strategy performance metrics
POST /api/trading/strategies/:id/start       - Start strategy
POST /api/trading/strategies/:id/stop        - Stop strategy
POST /api/trading/strategies/:id/pause       - Pause strategy
PUT  /api/trading/strategies/:id/params      - Update parameters
```

### Positions
```
GET  /api/trading/positions                  - List positions
GET  /api/trading/positions/:id              - Get position details
POST /api/trading/positions/close/:id        - Close specific position
POST /api/trading/positions/close-all        - Close all positions
PUT  /api/trading/positions/:id/sl-tp        - Update stop-loss/take-profit
GET  /api/trading/positions/portfolio/summary - Portfolio summary
```

### Market Data
```
GET  /api/trading/market-data/ticks          - Current price ticks
GET  /api/trading/market-data/candles        - Historical OHLCV data
GET  /api/trading/market-data/orderbook/:symbol - Order book data
GET  /api/trading/market-data/indicators     - Technical indicators
GET  /api/trading/market-data/exchanges      - Supported exchanges
GET  /api/trading/market-data/symbols        - Trading symbols
```

### Backtesting
```
POST /api/trading/backtest/run               - Start backtest
GET  /api/trading/backtest/results           - List backtest results
GET  /api/trading/backtest/results/:id       - Get backtest details
POST /api/trading/backtest/optimize          - Start optimization
GET  /api/trading/backtest/jobs              - List active jobs
POST /api/trading/backtest/jobs/:id/cancel   - Cancel job
```

## 🛠️ Development

### Setup
```bash
# Install dependencies
cd apps/trading-svc
npm install

# Setup database
export TRADING_DATABASE_URL="postgresql://user:pass@localhost:5432/trading"
npm run db:generate
npm run db:migrate
```

### Development Server
```bash
# Start with hot reload
npm run dev

# Start legacy service (with FSM)
npm run dev:legacy
```

### Database Operations
```bash
# Generate Prisma client
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Deploy to production
npm run db:deploy

# Open Prisma Studio
npm run db:studio
```

### Production Build
```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## 📊 Features

### Risk Management
- Portfolio-level risk controls
- Position sizing based on volatility
- Maximum drawdown protection
- Leverage and margin monitoring
- Real-time P&L tracking

### Strategy Types
- **Trend Following**: MA crossovers with momentum indicators
- **Market Making**: Liquidity provision with spread management
- **Arbitrage**: Cross-exchange price difference exploitation

### Market Data
- Multi-exchange support (Binance, Coinbase, Kraken)
- Real-time price feeds via WebSocket simulation
- Technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands)
- Order book depth analysis

### Backtesting Engine
- Historical data simulation
- Comprehensive performance metrics
- Parameter optimization
- Trade-by-trade analysis
- Equity curve visualization

## 🔧 Configuration

### Environment Variables
```bash
# Database
TRADING_DATABASE_URL="postgresql://localhost:5432/trading"

# Server
PORT=3003
NODE_ENV=development
CORS_ORIGIN=*

# Logging
LOG_QUERIES=false
```

### Strategy Parameters
Each strategy supports configurable parameters:

```typescript
// Trend Following
{
  fastMA: 20,           // Fast moving average period
  slowMA: 50,           // Slow moving average period
  rsiPeriod: 14,        // RSI calculation period
  stopLoss: 2,          // Stop loss percentage
  takeProfit: 5         // Take profit percentage
}
```

## 🚦 Health Monitoring

The service provides comprehensive health checks:

- Database connectivity
- Market data stream status
- Active job monitoring
- Memory and performance metrics

## 🔐 Security

- Input validation with Zod schemas
- SQL injection prevention via Prisma ORM
- Error handling and logging
- Graceful shutdown procedures

## 📈 Performance

- Non-blocking async operations
- Event-driven architecture
- Efficient database queries with indexes
- Connection pooling and caching
- Background job processing

## 🏃‍♂️ Quick Start

1. **Setup Database**:
   ```bash
   createdb trading
   export TRADING_DATABASE_URL="postgresql://localhost:5432/trading"
   ```

2. **Install & Migrate**:
   ```bash
   npm install
   npm run db:migrate
   ```

3. **Start Service**:
   ```bash
   npm run dev
   ```

4. **Test API**:
   ```bash
   curl http://localhost:3003/health
   curl http://localhost:3003/api/trading/strategies
   ```

The service will be available at `http://localhost:3003` with full API documentation accessible via the endpoints above.

## 🎯 Future Enhancements

- Real exchange API integrations
- Machine learning strategy optimization
- Advanced risk models
- Multi-timeframe analysis
- Social trading features
- Mobile app integration