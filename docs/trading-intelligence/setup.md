# Trading Intelligence Setup Guide

## Prerequisites

### System Requirements
- Node.js 20.x or higher
- PostgreSQL 15.x
- InfluxDB 2.x
- Qdrant vector database
- Redis 7.x
- Docker & Docker Compose (recommended)

### Exchange Accounts
- API keys from supported exchanges:
  - Binance
  - Coinbase Pro
  - Kraken

## Installation Steps

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-service.git
cd ai-service

# Install dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Database Setup

#### PostgreSQL Configuration

```bash
# Create the trading schema
psql -U postgres -d ai_service_db -c "CREATE SCHEMA IF NOT EXISTS trading;"

# Run Prisma migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate
```

#### InfluxDB Setup

```bash
# Using Docker
docker run -d \
  --name influxdb \
  -p 8086:8086 \
  -v influxdb-data:/var/lib/influxdb2 \
  influxdb:2.7

# Initial setup
influx setup \
  --username admin \
  --password your-secure-password \
  --org ai-service \
  --bucket market-data \
  --retention 30d
```

#### Qdrant Setup

```bash
# Using Docker
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -v qdrant-data:/qdrant/storage \
  qdrant/qdrant
```

### 3. Environment Configuration

Create `.env.local` file:

```bash
# Copy example environment
cp .env.example .env.local
```

Add trading-specific variables:

```env
# Trading Module Configuration
TRADING_ENABLED=true
TRADING_PAPER_MODE=true  # Start with paper trading!

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview

# InfluxDB Configuration
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=your-influxdb-token
INFLUXDB_ORG=ai-service
INFLUXDB_BUCKET=market-data

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=optional-api-key

# Exchange API Keys (encrypted in database)
# These are configured through the UI after setup
```

### 4. Initialize Trading Module

```bash
# Run the trading initialization script
npm run trading:init

# This will:
# - Create necessary database tables
# - Set up default strategies
# - Configure risk parameters
# - Create paper trading account
```

### 5. Configure Exchange APIs

#### Option A: Through the UI (Recommended)

1. Start the application:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/trading/settings`

3. Add exchange API keys:
   - Click "Add Exchange"
   - Select exchange (Binance, Coinbase, Kraken)
   - Enter API Key and Secret
   - Enable paper trading initially
   - Test connection

#### Option B: Through API

```bash
# Get auth token
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}' \
  | jq -r '.token')

# Add Binance API key
curl -X POST http://localhost:3001/api/trading/exchanges \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exchange": "binance",
    "apiKey": "your-api-key",
    "apiSecret": "your-api-secret",
    "testnet": true
  }'
```

### 6. Verify Installation

```bash
# Check all services are running
make dev-status

# Test trading module health
curl http://localhost:3001/api/trading/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "influxdb": "connected",
    "qdrant": "connected",
    "exchanges": {
      "binance": "connected",
      "coinbase": "not_configured",
      "kraken": "not_configured"
    }
  }
}
```

## Docker Setup (Recommended)

### Using Docker Compose

```bash
# Start all services
make dev-up

# This starts:
# - PostgreSQL with trading schema
# - InfluxDB with retention policies
# - Qdrant vector database
# - Redis for queuing
# - AI Service API
# - Frontend development server
```

### Docker Environment Variables

Create `.env.docker`:

```env
# Database
POSTGRES_PASSWORD=your-secure-password
DATABASE_URL=postgresql://postgres:your-secure-password@postgres:5432/ai_service_db

# InfluxDB
DOCKER_INFLUXDB_INIT_MODE=setup
DOCKER_INFLUXDB_INIT_USERNAME=admin
DOCKER_INFLUXDB_INIT_PASSWORD=your-secure-password
DOCKER_INFLUXDB_INIT_ORG=ai-service
DOCKER_INFLUXDB_INIT_BUCKET=market-data

# Trading
TRADING_ENABLED=true
TRADING_PAPER_MODE=true
```

## Initial Configuration

### 1. Risk Parameters

Configure risk management settings:

```javascript
// Default risk parameters (can be modified in UI)
{
  maxPositionSize: 0.1,        // 10% of portfolio
  maxDailyLoss: 0.05,          // 5% daily loss limit
  defaultStopLoss: 0.02,       // 2% stop loss
  defaultTakeProfit: 0.05,     // 5% take profit
  maxOpenPositions: 5,         // Maximum concurrent positions
  emergencyStopEnabled: true   // Emergency stop feature
}
```

### 2. Strategy Configuration

Available strategies:
- **Simple DCA**: Dollar Cost Averaging
- **Grid Trading**: Buy/sell at intervals
- **Momentum**: Follow market trends
- **AI Hybrid**: AI-enhanced decisions

### 3. Market Data Collection

Start collecting market data:

```bash
# Enable market data collection
curl -X POST http://localhost:3001/api/trading/market-data/start \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"symbols": ["BTC/USDT", "ETH/USDT"]}'
```

## Troubleshooting

### Common Issues

1. **InfluxDB Connection Failed**
   ```bash
   # Check InfluxDB is running
   docker ps | grep influxdb
   
   # View logs
   docker logs influxdb
   ```

2. **Exchange API Errors**
   - Verify API keys have trading permissions
   - Check IP whitelist on exchange
   - Ensure correct network (testnet vs mainnet)

3. **Database Migration Issues**
   ```bash
   # Reset migrations (DEVELOPMENT ONLY)
   npm run db:reset
   
   # Re-run migrations
   npm run db:migrate
   ```

### Debug Mode

Enable debug logging:

```env
# In .env.local
LOG_LEVEL=debug
TRADING_DEBUG=true
```

## Next Steps

1. **Paper Trading**: Start with paper trading to test strategies
2. **Strategy Selection**: Choose and configure trading strategies
3. **Risk Setup**: Configure risk parameters for your risk tolerance
4. **Monitoring**: Set up alerts and monitoring
5. **Go Live**: Switch to real trading when ready

⚠️ **Important**: Always start with paper trading and small amounts when going live!