import { Logger } from '../utils/logger';

const logger = new Logger('TradingStrategiesService');

export interface StrategyParameters {
  [key: string]: number | string | boolean;
}

export interface StrategyPerformance {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'stopped';
  parameters: StrategyParameters;
  parameterSchema: Record<string, any>;
  performance: StrategyPerformance;
  lastUpdate: Date;
  version: string;
}

export interface TradingSignal {
  strategyId: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  price: number;
  size: number;
  timestamp: Date;
  indicators: Record<string, number>;
}

export class TradingStrategiesService {
  private strategies: Map<string, Strategy> = new Map();
  private activeSignals: Map<string, TradingSignal[]> = new Map();

  constructor() {
    this.initializeDefaultStrategies();
  }

  private initializeDefaultStrategies(): void {
    const defaultStrategies: Strategy[] = [
      {
        id: 'trend-following',
        name: 'Trend Following',
        description: 'Follows market trends using MA crossovers and momentum indicators',
        status: 'stopped',
        parameters: {
          fastMA: 20,
          slowMA: 50,
          rsiPeriod: 14,
          stopLoss: 2,
          takeProfit: 5,
        },
        parameterSchema: {
          fastMA: { type: 'number', label: 'Fast MA Period', min: 5, max: 50, default: 20 },
          slowMA: { type: 'number', label: 'Slow MA Period', min: 20, max: 200, default: 50 },
          rsiPeriod: { type: 'number', label: 'RSI Period', min: 5, max: 30, default: 14 },
          stopLoss: {
            type: 'number',
            label: 'Stop Loss %',
            min: 0.5,
            max: 10,
            step: 0.1,
            default: 2,
          },
          takeProfit: {
            type: 'number',
            label: 'Take Profit %',
            min: 1,
            max: 20,
            step: 0.1,
            default: 5,
          },
        },
        performance: {
          totalTrades: 156,
          winRate: 0.62,
          totalPnL: 12500,
          sharpeRatio: 1.85,
          maxDrawdown: -8.5,
        },
        lastUpdate: new Date(),
        version: '1.0.0',
      },
      {
        id: 'market-making',
        name: 'Market Making',
        description: 'Provides liquidity by placing limit orders on both sides',
        status: 'stopped',
        parameters: {
          spread: 0.2,
          orderSize: 1000,
          orderRefreshInterval: 30000,
          maxExposure: 10000,
        },
        parameterSchema: {
          spread: {
            type: 'number',
            label: 'Spread %',
            min: 0.1,
            max: 1,
            step: 0.05,
            default: 0.2,
          },
          orderSize: {
            type: 'number',
            label: 'Order Size (USD)',
            min: 100,
            max: 10000,
            default: 1000,
          },
          orderRefreshInterval: {
            type: 'number',
            label: 'Refresh Interval (ms)',
            min: 5000,
            max: 60000,
            default: 30000,
          },
          maxExposure: {
            type: 'number',
            label: 'Max Exposure (USD)',
            min: 1000,
            max: 100000,
            default: 10000,
          },
        },
        performance: {
          totalTrades: 842,
          winRate: 0.58,
          totalPnL: 8200,
          sharpeRatio: 1.45,
          maxDrawdown: -5.2,
        },
        lastUpdate: new Date(),
        version: '1.2.1',
      },
      {
        id: 'arbitrage',
        name: 'Triangular Arbitrage',
        description: 'Exploits price differences across trading pairs',
        status: 'stopped',
        parameters: {
          minProfitThreshold: 0.1,
          maxPositionSize: 5000,
          maxLatency: 100,
          exchangePairs: JSON.stringify(['binance-coinbase', 'binance-kraken']),
        },
        parameterSchema: {
          minProfitThreshold: {
            type: 'number',
            label: 'Min Profit %',
            min: 0.05,
            max: 1,
            step: 0.05,
            default: 0.1,
          },
          maxPositionSize: {
            type: 'number',
            label: 'Max Position Size (USD)',
            min: 1000,
            max: 50000,
            default: 5000,
          },
          maxLatency: {
            type: 'number',
            label: 'Max Latency (ms)',
            min: 50,
            max: 500,
            default: 100,
          },
        },
        performance: {
          totalTrades: 45,
          winRate: 0.82,
          totalPnL: 3200,
          sharpeRatio: 2.1,
          maxDrawdown: -2.8,
        },
        lastUpdate: new Date(),
        version: '2.0.0',
      },
    ];

    defaultStrategies.forEach(strategy => {
      this.strategies.set(strategy.id, strategy);
    });

    logger.info(`Initialized ${defaultStrategies.length} default trading strategies`);
  }

  async getAllStrategies(): Promise<Strategy[]> {
    return Array.from(this.strategies.values());
  }

  async getStrategy(id: string): Promise<Strategy | null> {
    return this.strategies.get(id) || null;
  }

  async getStrategyPerformance(id: string): Promise<StrategyPerformance | null> {
    const strategy = this.strategies.get(id);
    return strategy ? strategy.performance : null;
  }

  async startStrategy(id: string): Promise<{ success: boolean; message: string }> {
    const strategy = this.strategies.get(id);
    if (!strategy) {
      return { success: false, message: 'Strategy not found' };
    }

    if (strategy.status === 'active') {
      return { success: false, message: 'Strategy is already running' };
    }

    strategy.status = 'active';
    strategy.lastUpdate = new Date();

    logger.info(`Started strategy: ${id}`);
    
    // Initialize signal generation for active strategies
    this.activeSignals.set(id, []);

    return { success: true, message: 'Strategy started successfully' };
  }

  async stopStrategy(id: string): Promise<{ success: boolean; message: string }> {
    const strategy = this.strategies.get(id);
    if (!strategy) {
      return { success: false, message: 'Strategy not found' };
    }

    strategy.status = 'stopped';
    strategy.lastUpdate = new Date();

    logger.info(`Stopped strategy: ${id}`);
    
    // Clean up signals
    this.activeSignals.delete(id);

    return { success: true, message: 'Strategy stopped successfully' };
  }

  async pauseStrategy(id: string): Promise<{ success: boolean; message: string }> {
    const strategy = this.strategies.get(id);
    if (!strategy) {
      return { success: false, message: 'Strategy not found' };
    }

    if (strategy.status !== 'active') {
      return { success: false, message: 'Strategy is not currently running' };
    }

    strategy.status = 'paused';
    strategy.lastUpdate = new Date();

    logger.info(`Paused strategy: ${id}`);

    return { success: true, message: 'Strategy paused successfully' };
  }

  async updateStrategyParameters(
    id: string, 
    parameters: StrategyParameters
  ): Promise<{ success: boolean; message: string }> {
    const strategy = this.strategies.get(id);
    if (!strategy) {
      return { success: false, message: 'Strategy not found' };
    }

    // Validate parameters against schema
    const validation = this.validateParameters(parameters, strategy.parameterSchema);
    if (!validation.isValid) {
      return { success: false, message: validation.error || 'Invalid parameters' };
    }

    strategy.parameters = { ...strategy.parameters, ...parameters };
    strategy.lastUpdate = new Date();

    logger.info(`Updated parameters for strategy ${id}:`, parameters);

    return { success: true, message: 'Strategy parameters updated successfully' };
  }

  private validateParameters(
    parameters: StrategyParameters, 
    schema: Record<string, any>
  ): { isValid: boolean; error?: string } {
    for (const [key, value] of Object.entries(parameters)) {
      const paramSchema = schema[key];
      if (!paramSchema) {
        return { isValid: false, error: `Unknown parameter: ${key}` };
      }

      if (typeof value !== paramSchema.type) {
        return { isValid: false, error: `Invalid type for ${key}: expected ${paramSchema.type}` };
      }

      if (paramSchema.min !== undefined && typeof value === 'number' && value < paramSchema.min) {
        return { isValid: false, error: `${key} must be at least ${paramSchema.min}` };
      }

      if (paramSchema.max !== undefined && typeof value === 'number' && value > paramSchema.max) {
        return { isValid: false, error: `${key} must be at most ${paramSchema.max}` };
      }
    }

    return { isValid: true };
  }

  async generateSignal(strategyId: string, marketData: any): Promise<TradingSignal | null> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy || strategy.status !== 'active') {
      return null;
    }

    switch (strategyId) {
      case 'trend-following':
        return this.generateTrendFollowingSignal(strategy, marketData);
      case 'market-making':
        return this.generateMarketMakingSignal(strategy, marketData);
      case 'arbitrage':
        return this.generateArbitrageSignal(strategy, marketData);
      default:
        return null;
    }
  }

  private generateTrendFollowingSignal(strategy: Strategy, marketData: any): TradingSignal | null {
    // Simplified trend following logic
    const { fastMA, slowMA, rsiPeriod } = strategy.parameters;
    
    // Mock calculation - in real implementation, would use technical indicators
    const signal: TradingSignal = {
      strategyId: strategy.id,
      symbol: marketData.symbol || 'BTCUSDT',
      action: Math.random() > 0.5 ? 'buy' : 'sell',
      confidence: Math.random() * 0.4 + 0.6, // 0.6 - 1.0
      price: marketData.price || Math.random() * 50000,
      size: 0.01,
      timestamp: new Date(),
      indicators: {
        fastMA: Number(fastMA),
        slowMA: Number(slowMA),
        rsi: Math.random() * 100,
      }
    };

    return signal;
  }

  private generateMarketMakingSignal(strategy: Strategy, marketData: any): TradingSignal | null {
    const { spread, orderSize } = strategy.parameters;
    
    const signal: TradingSignal = {
      strategyId: strategy.id,
      symbol: marketData.symbol || 'BTCUSDT',
      action: 'hold', // Market making typically places both buy and sell orders
      confidence: 0.8,
      price: marketData.price || Math.random() * 50000,
      size: Number(orderSize) / (marketData.price || 50000),
      timestamp: new Date(),
      indicators: {
        spread: Number(spread),
        bidPrice: marketData.price * (1 - Number(spread) / 200),
        askPrice: marketData.price * (1 + Number(spread) / 200),
      }
    };

    return signal;
  }

  private generateArbitrageSignal(strategy: Strategy, marketData: any): TradingSignal | null {
    const { minProfitThreshold, maxPositionSize } = strategy.parameters;
    
    // Mock arbitrage opportunity detection
    const profitOpportunity = Math.random() * 0.5; // 0-0.5%
    
    if (profitOpportunity < Number(minProfitThreshold)) {
      return null; // No profitable arbitrage opportunity
    }

    const signal: TradingSignal = {
      strategyId: strategy.id,
      symbol: marketData.symbol || 'BTCUSDT',
      action: 'buy',
      confidence: 0.95,
      price: marketData.price || Math.random() * 50000,
      size: Math.min(Number(maxPositionSize) / (marketData.price || 50000), 1),
      timestamp: new Date(),
      indicators: {
        profitOpportunity,
        minThreshold: Number(minProfitThreshold),
      }
    };

    return signal;
  }

  async getActiveSignals(strategyId?: string): Promise<TradingSignal[]> {
    if (strategyId) {
      return this.activeSignals.get(strategyId) || [];
    }

    const allSignals: TradingSignal[] = [];
    for (const signals of this.activeSignals.values()) {
      allSignals.push(...signals);
    }

    return allSignals;
  }

  async getStrategyStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};
    
    for (const [id, strategy] of this.strategies.entries()) {
      status[id] = {
        status: strategy.status,
        lastUpdate: strategy.lastUpdate,
        activeSignals: this.activeSignals.get(id)?.length || 0,
      };
    }

    return status;
  }
}

export const tradingStrategiesService = new TradingStrategiesService();