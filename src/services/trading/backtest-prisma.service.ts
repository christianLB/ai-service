import { PrismaClient, Prisma } from '@prisma/client';
import { Logger } from '../../utils/logger';
import { TRADING_FEATURE_FLAGS } from '../../types/trading';
import { BaseStrategy, StrategyConfig } from './strategy-engine.service';
import { marketDataService, OHLCVData } from './market-data.service';
import { riskManagerService } from './risk-manager.service';

const logger = new Logger('BacktestPrismaService');

export interface BacktestConfig {
  strategyId: string;
  exchange: string;
  symbols: string[];
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  timeframe: string;
  includeFees: boolean;
  slippage: number; // Percentage
}

export interface BacktestTrade {
  timestamp: Date;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  fee: number;
  pnl: number;
  balance: number;
  signal: any;
}

export interface BacktestMetrics {
  totalReturn: number;
  totalReturnPercentage: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercentage: number;
  calmarRatio: number;
  recoveryFactor: number;
  expectancy: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  config: BacktestConfig;
  metrics: BacktestMetrics;
  trades: BacktestTrade[];
  equityCurve: { timestamp: Date; value: number }[];
  drawdownCurve: { timestamp: Date; value: number }[];
  completedAt: Date;
  duration: number; // milliseconds
}

export class BacktestPrismaService {
  private static instance: BacktestPrismaService;
  private prisma: PrismaClient;
  private runningBacktests: Map<string, boolean> = new Map();

  private constructor() {
    this.prisma = new PrismaClient();
  }

  static getInstance(): BacktestPrismaService {
    if (!BacktestPrismaService.instance) {
      BacktestPrismaService.instance = new BacktestPrismaService();
    }
    return BacktestPrismaService.instance;
  }

  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    const startTime = Date.now();
    const backtestId = `bt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('Starting backtest', { backtestId, config });
    this.runningBacktests.set(backtestId, true);

    try {
      // Load strategy
      const strategy = await this.loadStrategy(config.strategyId);
      if (!strategy) {
        throw new Error(`Strategy not found: ${config.strategyId}`);
      }

      // Initialize backtest state
      let balance = config.initialCapital;
      const trades: BacktestTrade[] = [];
      const equityCurve: { timestamp: Date; value: number }[] = [];
      const positions: Map<string, any> = new Map();
      let peakBalance = balance;
      let maxDrawdown = 0;

      // Process each symbol
      for (const symbol of config.symbols) {
        logger.info(`Backtesting ${symbol}...`);
        
        // Get historical data
        const historicalData = await this.getHistoricalData(
          config.exchange,
          symbol,
          config.timeframe,
          config.startDate,
          config.endDate
        );

        if (historicalData.length === 0) {
          logger.warn(`No data available for ${symbol}`);
          continue;
        }

        // Process each candle
        for (let i = 50; i < historicalData.length; i++) { // Start at 50 for indicator warmup
          if (!this.runningBacktests.get(backtestId)) {
            throw new Error('Backtest cancelled');
          }

          const currentCandle = historicalData[i];
          const marketData = historicalData.slice(0, i + 1);
          
          // Check for exit signals on open positions
          const position = positions.get(symbol);
          if (position) {
            const exitSignal = await this.checkExitConditions(
              position,
              currentCandle,
              marketData
            );

            if (exitSignal) {
              const trade = this.executeBacktestTrade(
                symbol,
                exitSignal,
                currentCandle,
                balance,
                config,
                position
              );
              
              balance = trade.balance;
              trades.push(trade);
              positions.delete(symbol);
            }
          }

          // Get strategy signal
          const signal = await strategy.analyze(config.exchange, symbol, {
            ohlcv: marketData,
            currentIndex: i,
          });

          if (signal && signal.action !== 'hold' && !positions.has(symbol)) {
            // Validate with risk manager (simplified for backtest)
            const validation = this.validateBacktestTrade(
              signal,
              balance,
              positions.size
            );

            if (validation.approved) {
              const trade = this.executeBacktestTrade(
                symbol,
                signal.action === 'close' ? 'sell' : signal.action,
                currentCandle,
                balance,
                config
              );
              
              balance = trade.balance;
              trades.push(trade);
              
              // Store position
              positions.set(symbol, {
                entryPrice: currentCandle.close,
                entryTime: currentCandle.timestamp,
                quantity: trade.quantity,
                side: signal.action,
                stopLoss: signal.analysis?.stopLoss,
                takeProfit: signal.analysis?.takeProfit,
              });
            }
          }

          // Update equity curve
          const currentEquity = this.calculateEquity(balance, positions, currentCandle);
          equityCurve.push({
            timestamp: currentCandle.timestamp,
            value: currentEquity,
          });

          // Update peak and drawdown
          if (currentEquity > peakBalance) {
            peakBalance = currentEquity;
          }
          const drawdown = peakBalance - currentEquity;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
        }
      }

      // Close any remaining positions at end price
      for (const [symbol, position] of positions) {
        const lastCandle = await this.getLastCandle(config.exchange, symbol, config.endDate);
        const trade = this.executeBacktestTrade(
          symbol,
          position.side === 'buy' ? 'sell' : 'buy',
          lastCandle,
          balance,
          config,
          position
        );
        
        balance = trade.balance;
        trades.push(trade);
      }

      // Calculate metrics
      const metrics = this.calculateMetrics(
        trades,
        equityCurve,
        config.initialCapital,
        balance
      );

      // Generate drawdown curve
      const drawdownCurve = this.calculateDrawdownCurve(equityCurve);

      // Save results to database
      const result: BacktestResult = {
        id: backtestId,
        strategyId: config.strategyId,
        config,
        metrics,
        trades,
        equityCurve,
        drawdownCurve,
        completedAt: new Date(),
        duration: Date.now() - startTime,
      };

      await this.saveBacktestResult(result);
      
      logger.info('Backtest completed', { 
        backtestId, 
        duration: result.duration,
        totalReturn: metrics.totalReturnPercentage.toFixed(2) + '%',
      });

      return result;
      
    } catch (error) {
      logger.error('Backtest failed', error);
      throw error;
    } finally {
      this.runningBacktests.delete(backtestId);
    }
  }

  private async loadStrategy(strategyId: string): Promise<BaseStrategy | null> {
    try {
      const strategyRecord = await this.prisma.strategy.findUnique({
        where: { id: strategyId },
        include: {
          StrategyTradingPair: {
            include: {
              tradingPair: true
            }
          }
        }
      });

      if (!strategyRecord) {
        return null;
      }

      const config: StrategyConfig = {
        id: strategyRecord.id,
        name: strategyRecord.name,
        type: strategyRecord.type,
        parameters: (strategyRecord.config as Record<string, any>) || {},
        riskParameters: {
          maxPositionSize: Number((strategyRecord.metadata as any)?.risk || 0.02),
          maxDrawdown: Number((strategyRecord.metadata as any)?.maxDrawdown || 0.1),
          stopLoss: 0.02, // Default 2%
          takeProfit: 0.05, // Default 5%
        },
        isActive: false, // Always inactive for backtesting
        isPaperTrading: true, // Always paper trading for backtesting
      };

      // Dynamically import and create strategy instance
      let StrategyClass: any;
      
      switch (config.type) {
        case 'arbitrage':
          const { TriangularArbitrageStrategy } = await import('./strategies/arbitrage/triangular-arbitrage.strategy');
          StrategyClass = TriangularArbitrageStrategy;
          break;
          
        case 'market_making':
          const { SimpleMarketMakingStrategy } = await import('./strategies/market-making/simple-mm.strategy');
          StrategyClass = SimpleMarketMakingStrategy;
          break;
          
        case 'trend_following':
        case 'MA_CROSSOVER':
          const { TrendFollowingStrategy } = await import('./strategies/trend-following/ma-crossover.strategy');
          StrategyClass = TrendFollowingStrategy;
          break;
          
        default:
          logger.warn(`Unknown strategy type: ${config.type}`);
          return null;
      }

      return new StrategyClass(config);
      
    } catch (error) {
      logger.error('Failed to load strategy', error);
      return null;
    }
  }

  private async getHistoricalData(
    exchange: string,
    symbol: string,
    timeframe: string,
    startDate: Date,
    endDate: Date
  ): Promise<OHLCVData[]> {
    try {
      // First try to get from Prisma cache
      const marketData = await this.prisma.marketData.findMany({
        where: {
          exchange: { name: exchange },
          tradingPair: { symbol },
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { timestamp: 'asc' },
        include: {
          tradingPair: true
        }
      });

      if (marketData.length > 0) {
        // Group by timeframe and convert to OHLCV
        return this.convertToOHLCV(marketData, timeframe);
      }

      // If not in cache, fetch from market data service
      return await marketDataService.getOHLCV(
        exchange,
        symbol,
        timeframe,
        startDate,
        500 // Limit
      );
      
    } catch (error) {
      logger.error('Failed to get historical data', error);
      return [];
    }
  }

  private convertToOHLCV(marketData: any[], timeframe: string): OHLCVData[] {
    // Simple conversion - in production, would group by timeframe
    const ohlcv: OHLCVData[] = [];
    
    for (const data of marketData) {
      ohlcv.push({
        timestamp: data.timestamp,
        open: Number(data.price), // Simplified - would use actual OHLCV calculation
        high: Number(data.high24h || data.price),
        low: Number(data.low24h || data.price),
        close: Number(data.price),
        volume: Number(data.volume)
      });
    }
    
    return ohlcv;
  }

  private async checkExitConditions(
    position: any,
    currentCandle: OHLCVData,
    marketData: OHLCVData[]
  ): Promise<'sell' | 'buy' | null> {
    const currentPrice = currentCandle.close;
    
    // Check stop loss
    if (position.stopLoss) {
      if (position.side === 'buy' && currentPrice <= position.stopLoss) {
        return 'sell';
      } else if (position.side === 'sell' && currentPrice >= position.stopLoss) {
        return 'buy';
      }
    }

    // Check take profit
    if (position.takeProfit) {
      if (position.side === 'buy' && currentPrice >= position.takeProfit) {
        return 'sell';
      } else if (position.side === 'sell' && currentPrice <= position.takeProfit) {
        return 'buy';
      }
    }

    // Check time-based exit (e.g., hold for max 7 days)
    const holdingTime = currentCandle.timestamp.getTime() - position.entryTime.getTime();
    const maxHoldingTime = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    if (holdingTime > maxHoldingTime) {
      return position.side === 'buy' ? 'sell' : 'buy';
    }

    return null;
  }

  private validateBacktestTrade(
    signal: any,
    balance: number,
    openPositions: number
  ): { approved: boolean; size?: number } {
    // Simplified risk validation for backtesting
    const maxPositions = 5;
    const maxPositionSize = balance * 0.2; // 20% of balance
    
    if (openPositions >= maxPositions) {
      return { approved: false };
    }

    if (signal.strength < 0.6) {
      return { approved: false };
    }

    return {
      approved: true,
      size: maxPositionSize,
    };
  }

  private executeBacktestTrade(
    symbol: string,
    side: 'buy' | 'sell',
    candle: OHLCVData,
    balance: number,
    config: BacktestConfig,
    position?: any
  ): BacktestTrade {
    const price = candle.close * (1 + (config.slippage / 100) * (side === 'buy' ? 1 : -1));
    let quantity: number;
    let pnl = 0;
    
    if (position) {
      // Closing position
      quantity = position.quantity;
      
      if (position.side === 'buy') {
        pnl = (price - position.entryPrice) * quantity;
      } else {
        pnl = (position.entryPrice - price) * quantity;
      }
    } else {
      // Opening position
      const positionSize = balance * 0.2; // 20% of balance
      quantity = positionSize / price;
    }

    const fee = config.includeFees ? (price * quantity * 0.001) : 0; // 0.1% fee
    const netPnl = pnl - fee;
    const newBalance = balance + netPnl;

    return {
      timestamp: candle.timestamp,
      symbol,
      side,
      price,
      quantity,
      fee,
      pnl: netPnl,
      balance: newBalance,
      signal: position ? 'exit' : 'entry',
    };
  }

  private calculateEquity(
    balance: number,
    positions: Map<string, any>,
    currentCandle: OHLCVData
  ): number {
    let equity = balance;
    
    // Add unrealized PnL from open positions
    for (const [symbol, position] of positions) {
      const currentPrice = currentCandle.close;
      let unrealizedPnl: number;
      
      if (position.side === 'buy') {
        unrealizedPnl = (currentPrice - position.entryPrice) * position.quantity;
      } else {
        unrealizedPnl = (position.entryPrice - currentPrice) * position.quantity;
      }
      
      equity += unrealizedPnl;
    }
    
    return equity;
  }

  private async getLastCandle(
    exchange: string,
    symbol: string,
    date: Date
  ): Promise<OHLCVData> {
    const data = await marketDataService.getOHLCV(exchange, symbol, '1d', date, 1);
    return data[0] || {
      timestamp: date,
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      volume: 0,
    };
  }

  private calculateMetrics(
    trades: BacktestTrade[],
    equityCurve: { timestamp: Date; value: number }[],
    initialCapital: number,
    finalBalance: number
  ): BacktestMetrics {
    const totalReturn = finalBalance - initialCapital;
    const totalReturnPercentage = (totalReturn / initialCapital) * 100;
    
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    const averageWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length 
      : 0;
    const averageLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
      : 0;
    
    const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0;
    
    // Calculate Sharpe Ratio
    const returns = this.calculateReturns(equityCurve);
    const sharpeRatio = this.calculateSharpeRatio(returns);
    
    // Calculate Sortino Ratio
    const sortinoRatio = this.calculateSortinoRatio(returns);
    
    // Calculate max drawdown
    const { maxDrawdown, maxDrawdownPercentage } = this.calculateMaxDrawdown(equityCurve);
    
    // Calculate other metrics
    const calmarRatio = maxDrawdownPercentage > 0 
      ? totalReturnPercentage / maxDrawdownPercentage 
      : 0;
    
    const recoveryFactor = maxDrawdown > 0 ? totalReturn / maxDrawdown : 0;
    
    const expectancy = trades.length > 0
      ? trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length
      : 0;
    
    // Count consecutive wins/losses
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let isWinStreak = true;
    
    for (const trade of trades) {
      if (trade.pnl > 0) {
        if (isWinStreak) {
          currentStreak++;
        } else {
          currentStreak = 1;
          isWinStreak = true;
        }
        maxWinStreak = Math.max(maxWinStreak, currentStreak);
      } else {
        if (!isWinStreak) {
          currentStreak++;
        } else {
          currentStreak = 1;
          isWinStreak = false;
        }
        maxLossStreak = Math.max(maxLossStreak, currentStreak);
      }
    }

    return {
      totalReturn,
      totalReturnPercentage,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      averageWin,
      averageLoss,
      profitFactor,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownPercentage,
      calmarRatio,
      recoveryFactor,
      expectancy,
      consecutiveWins: maxWinStreak,
      consecutiveLosses: maxLossStreak,
    };
  }

  private calculateReturns(equityCurve: { timestamp: Date; value: number }[]): number[] {
    const returns = [];
    
    for (let i = 1; i < equityCurve.length; i++) {
      const dailyReturn = (equityCurve[i].value - equityCurve[i-1].value) / equityCurve[i-1].value;
      returns.push(dailyReturn);
    }
    
    return returns;
  }

  private calculateSharpeRatio(returns: number[], riskFreeRate: number = 0): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const excessReturns = returns.map(r => r - riskFreeRate);
    const stdDev = this.calculateStdDev(excessReturns);
    
    return stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev * Math.sqrt(252) : 0; // Annualized
  }

  private calculateSortinoRatio(returns: number[], targetReturn: number = 0): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const downside = returns.filter(r => r < targetReturn);
    
    if (downside.length === 0) return 0;
    
    const downsideDeviation = Math.sqrt(
      downside.reduce((sum, r) => sum + Math.pow(r - targetReturn, 2), 0) / downside.length
    );
    
    return downsideDeviation > 0 
      ? (avgReturn - targetReturn) / downsideDeviation * Math.sqrt(252) 
      : 0;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private calculateMaxDrawdown(
    equityCurve: { timestamp: Date; value: number }[]
  ): { maxDrawdown: number; maxDrawdownPercentage: number } {
    let peak = equityCurve[0]?.value || 0;
    let maxDrawdown = 0;
    let maxDrawdownPercentage = 0;
    
    for (const point of equityCurve) {
      if (point.value > peak) {
        peak = point.value;
      }
      
      const drawdown = peak - point.value;
      const drawdownPercentage = peak > 0 ? (drawdown / peak) * 100 : 0;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercentage = drawdownPercentage;
      }
    }
    
    return { maxDrawdown, maxDrawdownPercentage };
  }

  private calculateDrawdownCurve(
    equityCurve: { timestamp: Date; value: number }[]
  ): { timestamp: Date; value: number }[] {
    const drawdownCurve = [];
    let peak = equityCurve[0]?.value || 0;
    
    for (const point of equityCurve) {
      if (point.value > peak) {
        peak = point.value;
      }
      
      const drawdownPercentage = peak > 0 ? ((peak - point.value) / peak) * 100 : 0;
      
      drawdownCurve.push({
        timestamp: point.timestamp,
        value: drawdownPercentage,
      });
    }
    
    return drawdownCurve;
  }

  private async saveBacktestResult(result: BacktestResult): Promise<void> {
    try {
      await this.prisma.backtestResult.create({
        data: {
          id: result.id,
          strategyId: result.strategyId,
          name: `Backtest ${result.config.symbols.join(',')} ${result.config.startDate.toISOString().split('T')[0]}`,
          startDate: result.config.startDate,
          endDate: result.config.endDate,
          initialCapital: new Prisma.Decimal(result.config.initialCapital),
          finalCapital: new Prisma.Decimal(result.trades[result.trades.length - 1]?.balance || result.config.initialCapital),
          totalReturn: new Prisma.Decimal(result.metrics.totalReturn),
          totalTrades: result.metrics.totalTrades,
          winningTrades: result.metrics.winningTrades,
          losingTrades: result.metrics.losingTrades,
          winRate: new Prisma.Decimal(result.metrics.winRate),
          sharpeRatio: result.metrics.sharpeRatio ? new Prisma.Decimal(result.metrics.sharpeRatio) : null,
          sortinoRatio: result.metrics.sortinoRatio ? new Prisma.Decimal(result.metrics.sortinoRatio) : null,
          maxDrawdown: new Prisma.Decimal(result.metrics.maxDrawdown),
          profitFactor: result.metrics.profitFactor ? new Prisma.Decimal(result.metrics.profitFactor) : null,
          parameters: result.config as any,
          metadata: {
            config: result.config,
            metrics: result.metrics,
            trades: result.trades,
            equityCurve: result.equityCurve,
            drawdownCurve: result.drawdownCurve,
            duration: result.duration
          } as any,
          completedAt: result.completedAt
        }
      });
      
      logger.info('Backtest result saved', { backtestId: result.id });
    } catch (error) {
      logger.error('Failed to save backtest result', error);
      throw error;
    }
  }

  async getBacktestResults(strategyId?: string): Promise<any[]> {
    try {
      const results = await this.prisma.backtestResult.findMany({
        where: strategyId ? { strategyId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: strategyId ? undefined : 50,
        include: {
          strategy: {
            select: {
              name: true,
              type: true
            }
          }
        }
      });
      
      return results;
    } catch (error) {
      logger.error('Failed to get backtest results', error);
      return [];
    }
  }

  async cancelBacktest(backtestId: string): Promise<void> {
    this.runningBacktests.set(backtestId, false);
    logger.info('Backtest cancelled', { backtestId });
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const backtestPrismaService = BacktestPrismaService.getInstance();