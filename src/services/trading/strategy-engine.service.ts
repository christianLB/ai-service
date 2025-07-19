import { Logger } from '../../utils/logger';
import { db } from '../database';
import { marketDataService } from './market-data.service';
import { tradingConnectorService } from './trading-connector.service';
import * as cron from 'node-cron';
import { EventEmitter } from 'events';

const logger = new Logger('StrategyEngineService');

export interface TradingSignal {
  strategyId: string;
  exchange: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold' | 'close';
  strength: number; // 0-1
  analysis: any;
  indicatorsUsed: string[];
  timestamp: Date;
}

export interface StrategyConfig {
  id: string;
  name: string;
  type: string;
  parameters: any;
  riskParameters: any;
  isActive: boolean;
  isPaperTrading: boolean;
}

export interface StrategyPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnl: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  winRate?: number;
}

export abstract class BaseStrategy extends EventEmitter {
  protected logger: Logger;
  protected config: StrategyConfig;
  protected performance: StrategyPerformance;
  protected isRunning: boolean = false;

  constructor(config: StrategyConfig) {
    super();
    this.config = config;
    this.logger = new Logger(`Strategy:${config.name}`);
    this.performance = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalPnl: 0,
    };
  }

  abstract async analyze(exchange: string, symbol: string, data: any): Promise<TradingSignal | null>;
  abstract async initialize(): Promise<void>;
  abstract async cleanup(): Promise<void>;

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Strategy already running');
      return;
    }

    try {
      await this.initialize();
      this.isRunning = true;
      this.logger.info('Strategy started');
      
      // Update database
      await this.updateStatus('active');
    } catch (error) {
      this.logger.error('Failed to start strategy', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.cleanup();
      this.isRunning = false;
      this.logger.info('Strategy stopped');
      
      // Update database
      await this.updateStatus('inactive');
    } catch (error) {
      this.logger.error('Failed to stop strategy', error);
      throw error;
    }
  }

  protected async emitSignal(signal: TradingSignal): Promise<void> {
    // Save to database
    await db.pool.query(
      `INSERT INTO trading.signals 
       (strategy_id, exchange, symbol, action, strength, analysis, indicators_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        this.config.id,
        signal.exchange,
        signal.symbol,
        signal.action,
        signal.strength,
        JSON.stringify(signal.analysis),
        JSON.stringify(signal.indicatorsUsed),
      ]
    );

    // Emit event
    this.emit('signal', signal);
    this.logger.info('Signal emitted', { signal });
  }

  protected async updatePerformance(trade: any): Promise<void> {
    this.performance.totalTrades++;
    
    if (trade.pnl > 0) {
      this.performance.winningTrades++;
    } else {
      this.performance.losingTrades++;
    }
    
    this.performance.totalPnl += trade.pnl;
    this.performance.winRate = this.performance.winningTrades / this.performance.totalTrades;

    // Update database
    await db.pool.query(
      `UPDATE trading.strategies
       SET total_trades = $1, winning_trades = $2, losing_trades = $3,
           total_pnl = $4, win_rate = $5, updated_at = NOW()
       WHERE id = $6`,
      [
        this.performance.totalTrades,
        this.performance.winningTrades,
        this.performance.losingTrades,
        this.performance.totalPnl,
        this.performance.winRate,
        this.config.id,
      ]
    );
  }

  private async updateStatus(status: string): Promise<void> {
    await db.pool.query(
      `UPDATE trading.strategies SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, this.config.id]
    );
  }

  getConfig(): StrategyConfig {
    return { ...this.config };
  }

  getPerformance(): StrategyPerformance {
    return { ...this.performance };
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

export class StrategyEngineService {
  private static instance: StrategyEngineService;
  private strategies: Map<string, BaseStrategy> = new Map();
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private signalHandlers: Map<string, (signal: TradingSignal) => Promise<void>> = new Map();

  private constructor() {}

  static getInstance(): StrategyEngineService {
    if (!StrategyEngineService.instance) {
      StrategyEngineService.instance = new StrategyEngineService();
    }
    return StrategyEngineService.instance;
  }

  async loadStrategies(userId?: string): Promise<void> {
    try {
      // Load active strategies from database
      const result = await db.pool.query(
        `SELECT * FROM trading.strategies 
         WHERE is_active = true 
         AND ($1::uuid IS NULL OR user_id = $1)`,
        [userId]
      );

      for (const row of result.rows) {
        const config: StrategyConfig = {
          id: row.id,
          name: row.name,
          type: row.type,
          parameters: row.parameters,
          riskParameters: row.risk_parameters,
          isActive: row.is_active,
          isPaperTrading: row.is_paper_trading,
        };

        // Create strategy instance based on type
        const strategy = await this.createStrategy(config);
        if (strategy) {
          await this.registerStrategy(strategy);
        }
      }

      logger.info(`Loaded ${this.strategies.size} strategies`);
    } catch (error) {
      logger.error('Failed to load strategies', error);
      throw error;
    }
  }

  private async createStrategy(config: StrategyConfig): Promise<BaseStrategy | null> {
    try {
      // Import strategy dynamically based on type
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
          const { TrendFollowingStrategy } = await import('./strategies/trend-following/ma-crossover.strategy');
          StrategyClass = TrendFollowingStrategy;
          break;
          
        default:
          logger.warn(`Unknown strategy type: ${config.type}`);
          return null;
      }

      return new StrategyClass(config);
    } catch (error) {
      logger.error(`Failed to create strategy: ${config.name}`, error);
      return null;
    }
  }

  async registerStrategy(strategy: BaseStrategy): Promise<void> {
    const config = strategy.getConfig();
    
    // Register signal handler
    strategy.on('signal', async (signal: TradingSignal) => {
      await this.handleSignal(signal);
    });

    // Store strategy
    this.strategies.set(config.id, strategy);
    
    // Start if active
    if (config.isActive) {
      await strategy.start();
    }

    logger.info(`Registered strategy: ${config.name}`);
  }

  async unregisterStrategy(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      return;
    }

    // Stop strategy
    await strategy.stop();
    
    // Remove from maps
    this.strategies.delete(strategyId);
    
    // Stop scheduled task if exists
    const task = this.scheduledTasks.get(strategyId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(strategyId);
    }

    logger.info(`Unregistered strategy: ${strategyId}`);
  }

  async startStrategy(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    await strategy.start();
  }

  async stopStrategy(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    await strategy.stop();
  }

  async runStrategy(
    strategyId: string,
    exchange: string,
    symbol: string,
    data?: any
  ): Promise<TradingSignal | null> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (!strategy.isActive()) {
      throw new Error(`Strategy not active: ${strategyId}`);
    }

    return await strategy.analyze(exchange, symbol, data);
  }

  async scheduleStrategy(
    strategyId: string,
    cronExpression: string,
    exchanges: string[],
    symbols: string[]
  ): Promise<void> {
    // Stop existing schedule if any
    const existingTask = this.scheduledTasks.get(strategyId);
    if (existingTask) {
      existingTask.stop();
    }

    // Create new scheduled task
    const task = cron.schedule(cronExpression, async () => {
      try {
        for (const exchange of exchanges) {
          for (const symbol of symbols) {
            await this.runStrategy(strategyId, exchange, symbol);
          }
        }
      } catch (error) {
        logger.error(`Scheduled strategy run failed: ${strategyId}`, error);
      }
    });

    task.start();
    this.scheduledTasks.set(strategyId, task);
    
    logger.info(`Scheduled strategy ${strategyId} with cron: ${cronExpression}`);
  }

  private async handleSignal(signal: TradingSignal): Promise<void> {
    try {
      // Get risk manager approval
      const approved = await this.validateSignalWithRiskManager(signal);
      if (!approved) {
        logger.warn('Signal rejected by risk manager', { signal });
        return;
      }

      // Execute custom handlers
      for (const [id, handler] of this.signalHandlers) {
        try {
          await handler(signal);
        } catch (error) {
          logger.error(`Signal handler ${id} failed`, error);
        }
      }

      // Default action: log and store
      logger.info('Trading signal processed', { signal });
    } catch (error) {
      logger.error('Failed to handle signal', error);
    }
  }

  private async validateSignalWithRiskManager(signal: TradingSignal): Promise<boolean> {
    // TODO: Integrate with RiskManagerService
    // For now, basic validation
    
    // Check signal strength
    if (signal.strength < 0.7) {
      return false;
    }

    // Check if we have too many open positions
    const openPositions = await db.pool.query(
      `SELECT COUNT(*) FROM trading.positions WHERE status = 'open'`
    );
    
    const maxPositions = 5; // TODO: Get from config
    if (parseInt(openPositions.rows[0].count) >= maxPositions) {
      return false;
    }

    return true;
  }

  registerSignalHandler(
    id: string,
    handler: (signal: TradingSignal) => Promise<void>
  ): void {
    this.signalHandlers.set(id, handler);
    logger.info(`Registered signal handler: ${id}`);
  }

  unregisterSignalHandler(id: string): void {
    this.signalHandlers.delete(id);
    logger.info(`Unregistered signal handler: ${id}`);
  }

  async getActiveStrategies(): Promise<StrategyConfig[]> {
    return Array.from(this.strategies.values())
      .filter(s => s.isActive())
      .map(s => s.getConfig());
  }

  async getStrategyPerformance(strategyId: string): Promise<StrategyPerformance | null> {
    const strategy = this.strategies.get(strategyId);
    return strategy ? strategy.getPerformance() : null;
  }

  async stopAllStrategies(): Promise<void> {
    logger.info('Stopping all strategies...');
    
    for (const [id, strategy] of this.strategies) {
      try {
        await strategy.stop();
      } catch (error) {
        logger.error(`Failed to stop strategy ${id}`, error);
      }
    }

    // Stop all scheduled tasks
    for (const [id, task] of this.scheduledTasks) {
      task.stop();
    }
    this.scheduledTasks.clear();
  }
}

export const strategyEngineService = StrategyEngineService.getInstance();