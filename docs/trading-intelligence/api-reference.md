# Trading Intelligence API Reference

## Base URL

```
http://localhost:3001/api/trading
```

## Authentication

All endpoints require JWT authentication:

```http
Authorization: Bearer <jwt-token>
```

## Endpoints

### Exchange Management

#### List Exchanges
```http
GET /exchanges
```

**Response:**
```json
{
  "exchanges": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "binance",
      "enabled": true,
      "testnet": false,
      "connected": true,
      "balances": {
        "USDT": 10000.00,
        "BTC": 0.5
      }
    }
  ]
}
```

#### Add Exchange
```http
POST /exchanges
```

**Request Body:**
```json
{
  "exchange": "binance",
  "apiKey": "your-api-key",
  "apiSecret": "your-api-secret",
  "testnet": true
}
```

#### Update Exchange
```http
PUT /exchanges/:id
```

#### Delete Exchange
```http
DELETE /exchanges/:id
```

### Trading Operations

#### Execute Trade
```http
POST /trades/execute
```

**Request Body:**
```json
{
  "exchange": "binance",
  "symbol": "BTC/USDT",
  "side": "buy",
  "amount": 0.01,
  "type": "market",
  "price": null,
  "stopLoss": 45000,
  "takeProfit": 55000
}
```

**Response:**
```json
{
  "trade": {
    "id": "trade-123",
    "exchange": "binance",
    "symbol": "BTC/USDT",
    "side": "buy",
    "amount": 0.01,
    "price": 50000,
    "cost": 500,
    "status": "filled",
    "timestamp": "2024-01-20T10:30:00Z"
  }
}
```

#### Get Positions
```http
GET /positions
```

**Query Parameters:**
- `exchange` (optional): Filter by exchange
- `symbol` (optional): Filter by symbol
- `status` (optional): open, closed

**Response:**
```json
{
  "positions": [
    {
      "id": "pos-123",
      "exchange": "binance",
      "symbol": "BTC/USDT",
      "side": "long",
      "amount": 0.01,
      "entryPrice": 50000,
      "currentPrice": 51000,
      "pnl": 10,
      "pnlPercentage": 2,
      "stopLoss": 49000,
      "takeProfit": 52000,
      "status": "open"
    }
  ]
}
```

#### Close Position
```http
POST /positions/:id/close
```

**Request Body:**
```json
{
  "reason": "manual",
  "amount": 0.01  // Optional, partial close
}
```

### Strategy Management

#### List Strategies
```http
GET /strategies
```

**Response:**
```json
{
  "strategies": [
    {
      "id": "strat-123",
      "name": "Simple DCA",
      "type": "dca",
      "enabled": true,
      "parameters": {
        "interval": "1h",
        "amount": 100,
        "symbol": "BTC/USDT"
      },
      "performance": {
        "totalTrades": 150,
        "winRate": 0.65,
        "totalPnl": 1250.50
      }
    }
  ]
}
```

#### Create Strategy
```http
POST /strategies
```

**Request Body:**
```json
{
  "name": "My DCA Strategy",
  "type": "dca",
  "exchange": "binance",
  "parameters": {
    "symbol": "BTC/USDT",
    "interval": "1h",
    "amount": 100,
    "maxPositions": 10
  }
}
```

#### Activate/Deactivate Strategy
```http
PUT /strategies/:id/status
```

**Request Body:**
```json
{
  "enabled": true
}
```

#### Backtest Strategy
```http
POST /strategies/:id/backtest
```

**Request Body:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "initialBalance": 10000
}
```

### Market Analysis

#### Analyze Market
```http
POST /analysis/market
```

**Request Body:**
```json
{
  "symbol": "BTC/USDT",
  "exchange": "binance",
  "timeframe": "1h",
  "indicators": ["rsi", "macd", "bollinger"]
}
```

**Response:**
```json
{
  "analysis": {
    "symbol": "BTC/USDT",
    "timestamp": "2024-01-20T10:30:00Z",
    "price": 50000,
    "trend": "bullish",
    "volatility": "medium",
    "indicators": {
      "rsi": 65,
      "macd": {
        "macd": 125.5,
        "signal": 120.3,
        "histogram": 5.2
      },
      "bollinger": {
        "upper": 52000,
        "middle": 50000,
        "lower": 48000
      }
    },
    "aiAnalysis": {
      "sentiment": "positive",
      "confidence": 0.75,
      "recommendation": "hold",
      "reasoning": "Strong upward momentum but approaching overbought conditions"
    }
  }
}
```

#### Get Trading Signals
```http
GET /signals
```

**Query Parameters:**
- `symbol` (optional): Filter by symbol
- `strategy` (optional): Filter by strategy
- `limit` (optional): Number of signals

**Response:**
```json
{
  "signals": [
    {
      "id": "sig-123",
      "timestamp": "2024-01-20T10:30:00Z",
      "symbol": "BTC/USDT",
      "action": "buy",
      "confidence": 0.85,
      "price": 50000,
      "stopLoss": 49000,
      "takeProfit": 52000,
      "reasoning": "Breakout above resistance with strong volume"
    }
  ]
}
```

### Performance Metrics

#### Get Performance
```http
GET /performance
```

**Query Parameters:**
- `period` (optional): 1d, 7d, 30d, all
- `exchange` (optional): Filter by exchange
- `strategy` (optional): Filter by strategy

**Response:**
```json
{
  "performance": {
    "period": "30d",
    "totalTrades": 145,
    "winningTrades": 89,
    "losingTrades": 56,
    "winRate": 0.613,
    "totalPnl": 2456.78,
    "pnlPercentage": 24.57,
    "sharpeRatio": 1.85,
    "maxDrawdown": -8.5,
    "averageWin": 45.67,
    "averageLoss": -28.34,
    "bestTrade": {
      "symbol": "ETH/USDT",
      "pnl": 234.56,
      "percentage": 15.2
    },
    "worstTrade": {
      "symbol": "BTC/USDT",
      "pnl": -125.34,
      "percentage": -5.8
    }
  }
}
```

### Risk Management

#### Get Risk Parameters
```http
GET /risk/parameters
```

**Response:**
```json
{
  "parameters": {
    "maxPositionSize": 0.1,
    "maxDailyLoss": 0.05,
    "defaultStopLoss": 0.02,
    "defaultTakeProfit": 0.05,
    "maxOpenPositions": 5,
    "emergencyStopEnabled": true
  }
}
```

#### Update Risk Parameters
```http
PUT /risk/parameters
```

**Request Body:**
```json
{
  "maxPositionSize": 0.15,
  "maxDailyLoss": 0.03
}
```

#### Emergency Stop
```http
POST /emergency-stop
```

**Request Body:**
```json
{
  "reason": "Market crash detected",
  "closePositions": true,
  "disableStrategies": true
}
```

### Market Data

#### Get Market Data
```http
GET /market-data/:symbol
```

**Query Parameters:**
- `exchange`: Exchange name
- `timeframe`: 1m, 5m, 15m, 1h, 4h, 1d
- `limit`: Number of candles (default: 100)

**Response:**
```json
{
  "symbol": "BTC/USDT",
  "timeframe": "1h",
  "data": [
    {
      "timestamp": "2024-01-20T10:00:00Z",
      "open": 49800,
      "high": 50200,
      "low": 49700,
      "close": 50000,
      "volume": 125.5
    }
  ]
}
```

## WebSocket API

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3001/ws/trading');
ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token'
  }));
});
```

### Subscribe to Channels

#### Market Data
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'market-data',
  symbols: ['BTC/USDT', 'ETH/USDT']
}));
```

#### Positions
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'positions'
}));
```

#### Trading Signals
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'signals',
  strategies: ['strategy-id-1', 'strategy-id-2']
}));
```

### Message Format

**Market Update:**
```json
{
  "type": "market-update",
  "data": {
    "symbol": "BTC/USDT",
    "price": 50000,
    "timestamp": "2024-01-20T10:30:00Z"
  }
}
```

**Position Update:**
```json
{
  "type": "position-update",
  "data": {
    "id": "pos-123",
    "status": "closed",
    "pnl": 125.50
  }
}
```

**Signal Alert:**
```json
{
  "type": "signal",
  "data": {
    "symbol": "BTC/USDT",
    "action": "buy",
    "confidence": 0.85
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance for trade",
    "details": {
      "required": 500,
      "available": 450
    }
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` - Invalid or missing token
- `EXCHANGE_NOT_FOUND` - Exchange not configured
- `INSUFFICIENT_BALANCE` - Not enough funds
- `POSITION_NOT_FOUND` - Position doesn't exist
- `STRATEGY_NOT_FOUND` - Strategy doesn't exist
- `RISK_LIMIT_EXCEEDED` - Risk parameters exceeded
- `MARKET_CLOSED` - Market is closed
- `RATE_LIMIT_EXCEEDED` - Too many requests