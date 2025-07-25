# Cross-Exchange Arbitrage - Quick Start Guide

## 🎯 Overview

We've implemented a powerful cross-exchange arbitrage system that monitors price differences across multiple exchanges and automatically executes profitable trades. This system supports both crypto exchanges (Binance, Coinbase, Kraken) and stocks/crypto via Alpaca Markets.

## 🚀 Features Implemented

### 1. **Alpaca Connector** ✅
- Full integration with Alpaca Markets API
- Support for US stocks and crypto trading
- Paper trading mode for testing
- Real-time WebSocket data streaming
- Location: `src/services/trading/connectors/alpaca.connector.ts`

### 2. **Cross-Exchange Arbitrage Strategy** ✅
- Monitors price differences across multiple exchanges
- Automatic opportunity detection and execution
- Fee-aware profit calculations
- Risk management with position limits
- Location: `src/services/trading/strategies/arbitrage/cross-exchange-arbitrage.strategy.ts`

### 3. **Enhanced Trading Connector Service** ✅
- Unified interface for CCXT and custom connectors
- Support for Alpaca alongside crypto exchanges
- Automatic format conversion between different exchange APIs
- Location: `src/services/trading/trading-connector.service.ts`

### 4. **API Endpoints** ✅

#### Connector Management
- `GET /api/connectors/available` - List all available connectors
- `POST /api/connectors/alpaca/configure` - Configure Alpaca credentials
- `POST /api/connectors/:exchangeId/test` - Test connector connection
- `GET /api/connectors/:exchangeId/status` - Get connector status
- `GET /api/connectors/alpaca/positions` - Get Alpaca positions

#### Arbitrage Management
- `GET /api/arbitrage/opportunities` - View arbitrage history
- `GET /api/arbitrage/status` - Check strategy status
- `POST /api/arbitrage/deploy` - Deploy arbitrage strategy
- `POST /api/arbitrage/stop/:strategyId` - Stop strategy
- `GET /api/arbitrage/profits` - Track profits

## 📋 Quick Setup

### 1. Configure Exchanges

First, configure your exchange API credentials:

```bash
# Configure Alpaca (for US stocks + crypto)
curl -X POST http://localhost:3001/api/connectors/alpaca/configure \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_ALPACA_API_KEY",
    "apiSecret": "YOUR_ALPACA_SECRET",
    "paper": true
  }'

# Test connection
curl -X POST http://localhost:3001/api/connectors/alpaca/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Deploy Arbitrage Strategy

Deploy the cross-exchange arbitrage bot:

```bash
curl -X POST http://localhost:3001/api/arbitrage/deploy \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exchanges": ["binance", "coinbase", "alpaca"],
    "symbols": ["BTC/USDT", "ETH/USDT"],
    "maxPositionSize": 1000,
    "minProfitThreshold": 0.5,
    "paperTrading": true
  }'
```

### 3. Monitor Performance

Check arbitrage opportunities and profits:

```bash
# Get current status
curl http://localhost:3001/api/arbitrage/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# View profit stats
curl http://localhost:3001/api/arbitrage/profits?period=24h \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 💰 Expected Returns

With proper configuration, the arbitrage bot targets:
- **Minimum profit per trade**: 0.5% after fees
- **Average daily trades**: 10-50 (depending on market volatility)
- **Monthly target**: $500-$1,000 in arbitrage profits

## 🔧 Configuration Options

### Strategy Parameters
```javascript
{
  minProfitThreshold: 0.5,      // Minimum profit % to trigger trade
  maxPositionSize: 5000,         // Max $ per trade
  exchangeFeePercentage: {       // Trading fees per exchange
    binance: 0.1,
    coinbase: 0.5,
    kraken: 0.26,
    alpaca: 0.25
  },
  slippagePercentage: 0.1,       // Expected slippage
  exchanges: ['binance', 'coinbase', 'alpaca'],
  symbols: ['BTC/USDT', 'ETH/USDT'],
  checkIntervalMs: 3000          // Check every 3 seconds
}
```

## 📊 Monitoring & Alerts

The arbitrage bot logs all opportunities to the console with emojis for easy monitoring:
- 🎯 Opportunity detected
- 💸 Executing trade
- ✅ Trade successful
- ❌ Trade failed

## 🛡️ Risk Management

1. **Position Limits**: Maximum $5,000 per trade
2. **Paper Trading**: Test with virtual money first
3. **Fee Calculation**: All fees are considered before execution
4. **Slippage Protection**: 0.1% slippage buffer
5. **Exchange Validation**: Only executes if exchanges are properly connected

## 🔍 Troubleshooting

### Common Issues

1. **"At least 2 exchanges must be connected"**
   - Solution: Configure API credentials for multiple exchanges
   - Check connection status: `GET /api/connectors/:exchangeId/status`

2. **"Insufficient balance"**
   - Solution: Ensure you have funds on both exchanges
   - For paper trading, Alpaca provides $100k virtual balance

3. **"No opportunities found"**
   - Normal during low volatility periods
   - Try adding more symbols or exchanges
   - Lower `minProfitThreshold` (but watch for fees!)

## 📈 Next Steps

1. **Add More Exchanges**: Configure Kraken, Gemini, etc.
2. **Expand Symbols**: Add more trading pairs
3. **Optimize Parameters**: Tune based on performance data
4. **Go Live**: Switch from paper trading when confident
5. **Scale Up**: Increase position sizes as profits grow

## 🎉 Quick Wins

The arbitrage bot is designed for immediate revenue generation:
- **Day 1**: Configure exchanges, deploy in paper mode
- **Week 1**: Validate performance, tune parameters
- **Week 2**: Switch to live trading with small positions
- **Month 1**: Target $500+ in arbitrage profits

## 🚀 Advanced Features

### Multi-Asset Arbitrage
With Alpaca integration, you can now arbitrage between:
- Crypto exchanges (BTC/USDT on Binance vs Coinbase)
- Stocks vs crypto (MSTR stock vs BTC)
- Cross-asset opportunities

### Triangular Arbitrage
The system also supports triangular arbitrage within a single exchange:
- BTC → ETH → USDT → BTC
- Automatic path finding and execution

## 📝 Important Notes

1. **Start Small**: Begin with $100-500 positions
2. **Monitor Closely**: Watch logs during first week
3. **Network Speed Matters**: Use fast, stable connection
4. **Tax Implications**: Track all trades for tax reporting
5. **Exchange Limits**: Be aware of rate limits and withdrawal limits

---

**Ready to start?** The arbitrage bot is now live and ready to find profitable opportunities across exchanges! 🚀💰