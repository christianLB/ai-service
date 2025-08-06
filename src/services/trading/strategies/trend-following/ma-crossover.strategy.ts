import { BaseStrategy, TradingSignal, StrategyConfig } from '../../strategy-engine.service';
import { marketDataService } from '../../market-data.service';
import { db } from '../../../database';
import { TRADING_FEATURE_FLAGS } from '../../../../types/trading';
import { PrismaClient, Prisma } from '@prisma/client';

interface MACrossoverParams {
  fastPeriod: number; // Fast MA period (e.g., 10)
  slowPeriod: number; // Slow MA period (e.g., 30)
  signalStrengthThreshold: number; // Minimum strength to generate signal
  timeframe: string; // Candle timeframe (e.g., '1h')
  stopLossPercentage: number; // Stop loss percentage
  takeProfitPercentage: number; // Take profit percentage
  useVolumeConfirmation: boolean; // Require volume confirmation
  minimumVolume: number; // Minimum 24h volume in USD
}

interface TechnicalIndicators {
  fastMA: number;
  slowMA: number;
  rsi: number;
  volume: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  momentum: number;
}

export class TrendFollowingStrategy extends BaseStrategy {
  private params: MACrossoverParams;
  private lastSignals: Map<string, 'buy' | 'sell' | null> = new Map();
  private indicators: Map<string, TechnicalIndicators> = new Map();
  private prisma: PrismaClient;

  constructor(config: StrategyConfig) {
    super(config);
    this.prisma = new PrismaClient();
    
    // Default parameters
    this.params = {
      fastPeriod: 10,
      slowPeriod: 30,
      signalStrengthThreshold: 0.7,
      timeframe: '1h',
      stopLossPercentage: 3,
      takeProfitPercentage: 6,
      useVolumeConfirmation: true,
      minimumVolume: 100000, // $100k daily volume
      ...config.parameters,
    };
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Trend Following Strategy', { params: this.params });
  }

  async cleanup(): Promise<void> {
    this.lastSignals.clear();
    this.indicators.clear();
  }

  async analyze(exchange: string, symbol: string, data?: any): Promise<TradingSignal | null> {
    try {
      // Get historical data
      const ohlcv = await marketDataService.getOHLCV(
        exchange,
        symbol,
        this.params.timeframe,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
        Math.max(this.params.slowPeriod * 2, 100)
      );

      if (ohlcv.length < this.params.slowPeriod) {
        this.logger.warn('Insufficient data for analysis', { symbol, dataPoints: ohlcv.length });
        return null;
      }

      // Calculate indicators
      const indicators = await this.calculateIndicators(ohlcv);
      this.indicators.set(`${exchange}:${symbol}`, indicators);

      // Check for crossover
      const signal = this.detectCrossover(exchange, symbol, indicators);
      
      if (!signal) {
        return null;
      }

      // Volume confirmation
      if (this.params.useVolumeConfirmation) {
        const volumeUSD = indicators.volume * ohlcv[ohlcv.length - 1].close;
        if (volumeUSD < this.params.minimumVolume) {
          this.logger.debug('Volume too low for signal', { symbol, volumeUSD });
          return null;
        }
      }

      // Calculate signal strength
      const strength = this.calculateSignalStrength(indicators, signal);
      
      if (strength < this.params.signalStrengthThreshold) {
        return null;
      }

      // Create trading signal
      const tradingSignal: TradingSignal = {
        strategyId: this.config.id,
        exchange,
        symbol,
        action: signal,
        strength,
        analysis: {
          indicators,
          timeframe: this.params.timeframe,
          stopLoss: this.calculateStopLoss(ohlcv[ohlcv.length - 1].close, signal),
          takeProfit: this.calculateTakeProfit(ohlcv[ohlcv.length - 1].close, signal),
          entryPrice: ohlcv[ohlcv.length - 1].close,
        },
        indicatorsUsed: ['moving_average', 'rsi', 'volume'],
        timestamp: new Date(),
      };

      // Store position entry for tracking
      if (signal === 'buy' || signal === 'sell') {
        await this.recordPositionEntry(exchange, symbol, tradingSignal);
      }

      await this.emitSignal(tradingSignal);
      return tradingSignal;
      
    } catch (error) {
      this.logger.error('Analysis failed', error);
      return null;
    }
  }

  private async calculateIndicators(ohlcv: any[]): Promise<TechnicalIndicators> {
    const closes = ohlcv.map(c => c.close);
    const volumes = ohlcv.map(c => c.volume);
    
    // Calculate moving averages
    const fastMA = this.calculateSMA(closes, this.params.fastPeriod);
    const slowMA = this.calculateSMA(closes, this.params.slowPeriod);
    
    // Calculate RSI
    const rsi = this.calculateRSI(closes, 14);
    
    // Calculate average volume
    const avgVolume = volumes.slice(-24).reduce((a, b) => a + b, 0) / 24;
    
    // Determine trend
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (fastMA > slowMA * 1.001) {
      trend = 'bullish';
    } else if (fastMA < slowMA * 0.999) {
      trend = 'bearish';
    }
    
    // Calculate momentum
    const momentum = ((closes[closes.length - 1] - closes[closes.length - 10]) / closes[closes.length - 10]) * 100;
    
    return {
      fastMA,
      slowMA,
      rsi,
      volume: avgVolume,
      trend,
      momentum,
    };
  }

  private calculateSMA(values: number[], period: number): number {
    if (values.length < period) {
      return 0;
    }
    
    const relevantValues = values.slice(-period);
    return relevantValues.reduce((a, b) => a + b, 0) / period;
  }

  private calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) {
      return 50;
    }

    const gains = [];
    const losses = [];

    for (let i = 1; i < closes.length; i++) {
      const difference = closes[i] - closes[i - 1];
      if (difference > 0) {
        gains.push(difference);
        losses.push(0);
      } else {
        gains.push(0);
        losses.push(Math.abs(difference));
      }
    }

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  private detectCrossover(
    exchange: string,
    symbol: string,
    indicators: TechnicalIndicators
  ): 'buy' | 'sell' | 'close' | null {
    const key = `${exchange}:${symbol}`;
    const previousIndicators = this.indicators.get(key);
    
    if (!previousIndicators) {
      return null;
    }

    const lastSignal = this.lastSignals.get(key);
    
    // Golden cross: fast MA crosses above slow MA
    if (previousIndicators.fastMA <= previousIndicators.slowMA &&
        indicators.fastMA > indicators.slowMA) {
      this.lastSignals.set(key, 'buy');
      return 'buy';
    }
    
    // Death cross: fast MA crosses below slow MA
    if (previousIndicators.fastMA >= previousIndicators.slowMA &&
        indicators.fastMA < indicators.slowMA) {
      this.lastSignals.set(key, 'sell');
      
      // If we have an open long position, close it
      if (lastSignal === 'buy') {
        return 'close';
      }
      return 'sell';
    }

    // Check for exit conditions
    if (lastSignal === 'buy' && indicators.rsi > 70) {
      // Overbought, consider closing long
      return 'close';
    }
    
    if (lastSignal === 'sell' && indicators.rsi < 30) {
      // Oversold, consider closing short
      return 'close';
    }

    return null;
  }

  private calculateSignalStrength(
    indicators: TechnicalIndicators,
    signal: 'buy' | 'sell' | 'close'
  ): number {
    let strength = 0.5; // Base strength

    // MA divergence strength
    const maDivergence = Math.abs(indicators.fastMA - indicators.slowMA) / indicators.slowMA;
    strength += Math.min(maDivergence * 10, 0.2); // Max 0.2 contribution

    // RSI confirmation
    if (signal === 'buy' && indicators.rsi < 70 && indicators.rsi > 30) {
      strength += 0.1;
    } else if (signal === 'sell' && indicators.rsi > 30 && indicators.rsi < 70) {
      strength += 0.1;
    }

    // Momentum confirmation
    if ((signal === 'buy' && indicators.momentum > 0) ||
        (signal === 'sell' && indicators.momentum < 0)) {
      strength += 0.1;
    }

    // Trend alignment
    if ((signal === 'buy' && indicators.trend === 'bullish') ||
        (signal === 'sell' && indicators.trend === 'bearish')) {
      strength += 0.1;
    }

    return Math.min(strength, 1.0);
  }

  private calculateStopLoss(currentPrice: number, signal: 'buy' | 'sell' | 'close'): number {
    if (signal === 'buy') {
      return currentPrice * (1 - this.params.stopLossPercentage / 100);
    } else if (signal === 'sell') {
      return currentPrice * (1 + this.params.stopLossPercentage / 100);
    }
    return currentPrice;
  }

  private calculateTakeProfit(currentPrice: number, signal: 'buy' | 'sell' | 'close'): number {
    if (signal === 'buy') {
      return currentPrice * (1 + this.params.takeProfitPercentage / 100);
    } else if (signal === 'sell') {
      return currentPrice * (1 - this.params.takeProfitPercentage / 100);
    }
    return currentPrice;
  }

  private async recordPositionEntry(
    exchange: string,
    symbol: string,
    signal: TradingSignal
  ): Promise<void> {
    try {
      // Use Prisma if feature flag is enabled
      if (TRADING_FEATURE_FLAGS.USE_PRISMA_STRATEGY_ENGINE) {
        // First, get the exchange and trading pair records
        const exchangeRecord = await this.prisma.exchange.findUnique({
          where: { name: exchange }
        });

        if (!exchangeRecord) {
          this.logger.error(`Exchange ${exchange} not found`);
          return;
        }

        const tradingPair = await this.prisma.tradingPair.findFirst({
          where: {
            exchangeId: exchangeRecord.id,
            symbol: symbol
          }
        });

        if (!tradingPair) {
          this.logger.error(`Trading pair ${symbol} not found on ${exchange}`);
          return;
        }

        await this.prisma.position.create({
          data: {
            userId: '00000000-0000-0000-0000-000000000000', // TODO: Get actual user ID
            symbol: symbol,
            exchange: exchange,
            exchangeId: exchangeRecord.id,
            tradingPairId: tradingPair.id,
            strategyId: this.config.id,
            side: signal.action === 'buy' ? 'LONG' : 'SHORT',
            quantity: new Prisma.Decimal(0), // Quantity will be determined by risk manager
            avgEntryPrice: new Prisma.Decimal(signal.analysis.entryPrice),
            status: 'PENDING', // Will be updated when order is filled
            metadata: {
              currentPrice: signal.analysis.entryPrice,
              stopLoss: signal.analysis.stopLoss || null,
              takeProfit: signal.analysis.takeProfit || null,
              confidenceScore: signal.strength,
              indicators: signal.analysis.indicators,
              timeframe: signal.analysis.timeframe,
              strategyName: this.config.name
            }
          }
        });
      } else {
        // Original SQL implementation
        await db.pool.query(
          `INSERT INTO trading.positions 
           (user_id, exchange, symbol, side, quantity, entry_price, stop_loss, take_profit,
            strategy_id, strategy_name, confidence_score, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            null, // User ID from strategy config if needed
            exchange,
            symbol,
            signal.action === 'buy' ? 'long' : 'short',
            0, // Quantity will be determined by risk manager
            signal.analysis.entryPrice,
            signal.analysis.stopLoss,
            signal.analysis.takeProfit,
            this.config.id,
            this.config.name,
            signal.strength,
            JSON.stringify({
              indicators: signal.analysis.indicators,
              timeframe: signal.analysis.timeframe,
            }),
          ]
        );
      }
    } catch (error) {
      this.logger.error('Failed to record position entry', error);
    }
  }
}