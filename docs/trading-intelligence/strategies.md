# Trading Strategies Documentation

## Overview

The Trading Intelligence module supports multiple trading strategies, from simple rule-based approaches to sophisticated AI-enhanced strategies. Each strategy can be customized, backtested, and optimized for different market conditions.

## Available Strategies

### 1. Simple DCA (Dollar Cost Averaging)

**File**: `src/services/trading/strategies/simple-dca.strategy.ts`

**Description**: Systematically purchases assets at regular intervals regardless of price, reducing the impact of volatility.

**Parameters**:
```typescript
{
  symbol: string;         // Trading pair (e.g., "BTC/USDT")
  interval: string;       // Time interval ("5m", "1h", "1d")
  amount: number;         // Fixed amount per purchase
  maxPositions: number;   // Maximum open positions
  stopLoss?: number;      // Optional stop loss percentage
  takeProfit?: number;    // Optional take profit percentage
}
```

**Best Used For**:
- Long-term accumulation
- Reducing timing risk
- Volatile markets
- Beginners

**Example Configuration**:
```json
{
  "symbol": "BTC/USDT",
  "interval": "1d",
  "amount": 100,
  "maxPositions": 30,
  "stopLoss": 0.05,
  "takeProfit": 0.10
}
```

### 2. Grid Trading Strategy

**File**: `src/services/trading/strategies/grid-trading.strategy.ts`

**Description**: Places buy and sell orders at regular price intervals, profiting from market volatility within a range.

**Parameters**:
```typescript
{
  symbol: string;         // Trading pair
  gridLevels: number;     // Number of grid levels
  gridSpacing: number;    // Price spacing percentage
  upperBound: number;     // Upper price boundary
  lowerBound: number;     // Lower price boundary
  amountPerGrid: number;  // Amount per grid level
  takeProfitRatio: number; // Profit target per grid
}
```

**Best Used For**:
- Range-bound markets
- High volatility periods
- Automated profit-taking
- 24/7 operation

**Example Configuration**:
```json
{
  "symbol": "ETH/USDT",
  "gridLevels": 20,
  "gridSpacing": 0.01,
  "upperBound": 2500,
  "lowerBound": 2000,
  "amountPerGrid": 50,
  "takeProfitRatio": 0.02
}
```

### 3. Momentum Strategy

**File**: `src/services/trading/strategies/momentum.strategy.ts`

**Description**: Identifies and follows strong price trends using technical indicators and volume analysis.

**Parameters**:
```typescript
{
  symbol: string;              // Trading pair
  timeframe: string;           // Analysis timeframe
  momentumPeriod: number;      // Momentum calculation period
  rsiThreshold: {              // RSI boundaries
    oversold: number;
    overbought: number;
  };
  volumeMultiplier: number;    // Volume surge threshold
  trendStrength: number;       // Minimum trend strength
  stopLoss: number;            // Stop loss percentage
  trailingStop: boolean;       // Enable trailing stop
}
```

**Best Used For**:
- Trending markets
- Breakout trading
- Strong directional moves
- Active trading

**Example Configuration**:
```json
{
  "symbol": "BTC/USDT",
  "timeframe": "4h",
  "momentumPeriod": 14,
  "rsiThreshold": {
    "oversold": 30,
    "overbought": 70
  },
  "volumeMultiplier": 1.5,
  "trendStrength": 0.7,
  "stopLoss": 0.03,
  "trailingStop": true
}
```

### 4. AI Hybrid Strategy

**File**: `src/services/trading/strategies/ai-hybrid.strategy.ts`

**Description**: Combines traditional technical analysis with AI-powered market interpretation and sentiment analysis.

**Parameters**:
```typescript
{
  symbol: string;                // Trading pair
  baseStrategy: string;          // Underlying strategy type
  aiModel: string;               // AI model to use
  confidenceThreshold: number;   // Minimum AI confidence
  sentimentWeight: number;       // Sentiment influence (0-1)
  technicalWeight: number;       // Technical analysis weight
  fundamentalWeight: number;     // Fundamental analysis weight
  riskAdjustment: boolean;       // Dynamic risk adjustment
  learningEnabled: boolean;      // Enable strategy learning
}
```

**Best Used For**:
- Complex market conditions
- Multi-factor analysis
- Adaptive trading
- High-stakes decisions

**Example Configuration**:
```json
{
  "symbol": "BTC/USDT",
  "baseStrategy": "momentum",
  "aiModel": "gpt-4-turbo",
  "confidenceThreshold": 0.75,
  "sentimentWeight": 0.3,
  "technicalWeight": 0.5,
  "fundamentalWeight": 0.2,
  "riskAdjustment": true,
  "learningEnabled": true
}
```

## Strategy Implementation

### Base Strategy Class

All strategies inherit from the base strategy class:

```typescript
abstract class BaseStrategy {
  abstract analyze(marketData: MarketData): Promise<Signal>;
  abstract validateParameters(params: any): boolean;
  abstract optimizeParameters(historicalData: any[]): Promise<any>;
  
  // Common methods
  calculateIndicators(data: OHLCV[]): TechnicalIndicators;
  assessRisk(position: Position): RiskAssessment;
  generateSignal(analysis: Analysis): Signal;
}
```

### Signal Generation

Strategies generate signals with the following structure:

```typescript
interface Signal {
  action: 'buy' | 'sell' | 'hold';
  confidence: number;        // 0-1 confidence score
  symbol: string;
  price: number;
  amount: number;
  stopLoss?: number;
  takeProfit?: number;
  reasoning: string;
  metadata: {
    strategy: string;
    indicators: any;
    timestamp: Date;
  };
}
```

## Strategy Selection Guide

### Market Conditions Matrix

| Market Type | Recommended Strategy | Risk Level | Time Commitment |
|------------|---------------------|------------|-----------------|
| Trending Up | Momentum, AI Hybrid | Medium | High |
| Trending Down | DCA (accumulation) | Low | Low |
| Range-bound | Grid Trading | Low-Medium | Low |
| High Volatility | Grid, AI Hybrid | Medium-High | Medium |
| Low Volatility | DCA | Low | Low |
| Uncertain | AI Hybrid | Medium | Medium |

### Risk Profiles

**Conservative**:
- Simple DCA with small amounts
- Wide grid spacing
- High confidence thresholds
- Strict stop losses

**Moderate**:
- Momentum with trailing stops
- Standard grid trading
- Balanced AI hybrid
- Normal position sizes

**Aggressive**:
- Tight grid spacing
- Lower confidence thresholds
- Larger position sizes
- Multiple strategies

## Backtesting

All strategies support comprehensive backtesting:

```typescript
const backtest = await strategyService.backtest({
  strategy: 'momentum',
  parameters: { /* ... */ },
  startDate: '2023-01-01',
  endDate: '2023-12-31',
  initialBalance: 10000,
  feeRate: 0.001
});

// Results include:
{
  totalReturn: 0.45,        // 45% return
  sharpeRatio: 1.85,
  maxDrawdown: -0.15,       // 15% max drawdown
  winRate: 0.62,            // 62% win rate
  totalTrades: 156,
  profitFactor: 1.8,
  averageHoldTime: '3d',
  bestTrade: { /* ... */ },
  worstTrade: { /* ... */ }
}
```

## Optimization

### Parameter Optimization

Strategies can be automatically optimized:

```typescript
const optimized = await strategyService.optimize({
  strategy: 'grid',
  baseParameters: { /* ... */ },
  optimizationTarget: 'sharpe_ratio',
  constraints: {
    maxDrawdown: 0.20,
    minWinRate: 0.50
  }
});
```

### Machine Learning Enhancement

The AI Hybrid strategy continuously learns:

1. **Trade Outcome Analysis**: Records and analyzes all trades
2. **Pattern Recognition**: Identifies successful patterns
3. **Parameter Adjustment**: Adapts parameters based on performance
4. **Market Regime Detection**: Adjusts for different market conditions

## Risk Management

All strategies include built-in risk management:

### Position Sizing
```typescript
const positionSize = calculatePositionSize({
  balance: accountBalance,
  riskPerTrade: 0.02,      // 2% risk per trade
  stopLoss: 0.03,          // 3% stop loss
  leverage: 1              // No leverage
});
```

### Stop Loss Types
- **Fixed**: Set percentage below entry
- **Trailing**: Follows price upward
- **Dynamic**: Based on volatility
- **Time-based**: Exit after duration

### Portfolio Limits
- Maximum positions per strategy
- Maximum allocation per symbol
- Daily loss limits
- Correlation limits

## Performance Monitoring

### Real-time Metrics
- P&L tracking
- Win rate calculation
- Risk-adjusted returns
- Drawdown monitoring

### Strategy Comparison
```typescript
const comparison = await strategyService.compareStrategies([
  'momentum',
  'grid',
  'dca'
], {
  period: '30d',
  market: 'BTC/USDT'
});
```

## Best Practices

1. **Start Small**: Test with minimal amounts
2. **Paper Trade First**: Use paper trading mode
3. **Diversify**: Run multiple strategies
4. **Monitor Regularly**: Check performance daily
5. **Adjust Parameters**: Optimize based on results
6. **Risk First**: Never exceed risk limits
7. **Document Changes**: Track parameter modifications
8. **Learn Continuously**: Analyze both wins and losses