import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

const logger = new Logger('TradingBacktestService');

export interface BacktestRequest {
  strategyId: string;
  startDate: string;
  endDate: string;
  symbols: string[];
  initialCapital?: number;
  commission?: number;
  slippage?: number;
  maxPositions?: number;
  parameters?: Record<string, any>;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryDate: Date;
  exitDate: Date;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
  slippage: number;
  holdingPeriod: number; // in minutes
  runup: number; // max favorable excursion
  drawdown: number; // max adverse excursion
  reason: 'take_profit' | 'stop_loss' | 'signal' | 'timeout' | 'manual';
  metadata?: Record<string, any>;
}

export interface BacktestMetrics {
  // Return Metrics
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  cagr: number; // Compound Annual Growth Rate
  
  // Risk Metrics
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  maxDrawdownDuration: number; // days
  
  // Trade Statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  payoffRatio: number; // avgWin / avgLoss
  expectancy: number;
  
  // Win/Loss Analysis
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  
  // Time Analysis
  avgHoldingPeriod: number; // hours
  avgTimeBetweenTrades: number; // hours
  tradingDays: number;
  
  // Risk Analysis
  recoveryFactor: number; // totalReturn / maxDrawdown
  ulcerIndex: number;
  valueAtRisk: number; // 5% VaR
  conditionalVaR: number; // Expected Shortfall
  
  // Additional Metrics
  largestRunup: number;
  largestDrawdown: number;
  profitPerTrade: number;
  commission: number;
  slippage: number;
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  strategyName?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startDate: string;
  endDate: string;
  symbols: string[];
  initialCapital: number;
  finalCapital: number;
  parameters?: Record<string, any>;
  metrics?: BacktestMetrics;
  equityCurve: Array<{ date: string; value: number; drawdown: number }>;
  trades: BacktestTrade[];
  monthlyReturns: Array<{ month: string; return: number; benchmark?: number }>;
  tradeDistribution: Array<{ range: string; count: number; percentage: number }>;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface OptimizationRequest {
  strategyId: string;
  startDate: string;
  endDate: string;
  symbols: string[];
  initialCapital?: number;
  parameterRanges: Record<string, {
    min: number;
    max: number;
    step: number;
  }>;
  optimizationMetric?: 'sharpeRatio' | 'totalReturn' | 'profitFactor' | 'calmarRatio';
  maxIterations?: number;
}

export interface OptimizationResult {
  id: string;
  strategyId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  bestParameters: Record<string, any>;
  bestMetric: number;
  iterations: Array<{
    parameters: Record<string, any>;
    metrics: BacktestMetrics;
    score: number;
  }>;
  totalIterations: number;
  completedIterations: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export class TradingBacktestService extends EventEmitter {
  private backtests: Map<string, BacktestResult> = new Map();
  private optimizations: Map<string, OptimizationResult> = new Map();
  private activeJobs: Set<string> = new Set();
  private maxConcurrentJobs = 3;
  
  constructor() {
    super();
    this.initializeMockResults();
  }

  private initializeMockResults(): void {
    // Add some mock backtest results
    const mockResult: BacktestResult = {
      id: 'backtest-trend-2024-001',
      strategyId: 'trend-following',
      strategyName: 'Trend Following Strategy',
      status: 'completed',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      symbols: ['BTCUSDT', 'ETHUSDT'],
      initialCapital: 10000,
      finalCapital: 14520,
      parameters: {
        fastMA: 20,
        slowMA: 50,
        rsiPeriod: 14,
        stopLoss: 2,
        takeProfit: 5,
      },
      metrics: this.generateMockMetrics(),
      equityCurve: this.generateMockEquityCurve(10000, 14520),
      trades: this.generateMockTrades(),
      monthlyReturns: this.generateMockMonthlyReturns(),
      tradeDistribution: this.generateMockTradeDistribution(),
      createdAt: new Date('2024-01-15'),
      completedAt: new Date('2024-01-15T02:30:00'),
      metadata: {
        version: '1.0.0',
        environment: 'production',
        dataSource: 'binance',
      },
    };

    this.backtests.set(mockResult.id, mockResult);
    logger.info('Initialized backtest service with mock data');
  }

  private generateMockMetrics(): BacktestMetrics {
    return {
      totalReturn: 4520,
      totalReturnPercent: 45.2,
      annualizedReturn: 41.8,
      cagr: 41.2,
      volatility: 22.5,
      sharpeRatio: 1.85,
      sortinoRatio: 2.41,
      calmarRatio: 3.29,
      maxDrawdown: 1250,
      maxDrawdownPercent: 12.5,
      maxDrawdownDuration: 45,
      totalTrades: 156,
      winningTrades: 97,
      losingTrades: 59,
      winRate: 62.2,
      profitFactor: 2.1,
      payoffRatio: 2.14,
      expectancy: 125.5,
      avgWin: 450,
      avgLoss: -210,
      bestTrade: 1850,
      worstTrade: -850,
      maxConsecutiveWins: 8,
      maxConsecutiveLosses: 4,
      avgHoldingPeriod: 18.5,
      avgTimeBetweenTrades: 56.2,
      tradingDays: 252,
      recoveryFactor: 3.6,
      ulcerIndex: 8.2,
      valueAtRisk: -2.5,
      conditionalVaR: -4.1,
      largestRunup: 2100,
      largestDrawdown: -1250,
      profitPerTrade: 29.0,
      commission: 234.5,
      slippage: 78.2,
    };
  }

  private generateMockEquityCurve(initial: number, final: number): Array<{ date: string; value: number; drawdown: number }> {
    const curve: Array<{ date: string; value: number; drawdown: number }> = [];
    const days = 365;
    const dailyReturn = Math.pow(final / initial, 1 / days) - 1;
    
    let currentValue = initial;
    let peak = initial;
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(2023, 0, 1 + i);
      const volatility = 0.02 * (Math.random() - 0.5); // Daily volatility
      const expectedReturn = dailyReturn + volatility;
      
      currentValue *= (1 + expectedReturn);
      peak = Math.max(peak, currentValue);
      const drawdown = (peak - currentValue) / peak * 100;
      
      if (i % 7 === 0) { // Weekly data points
        curve.push({
          date: date.toISOString().split('T')[0],
          value: Math.round(currentValue),
          drawdown: -Math.round(drawdown * 100) / 100,
        });
      }
    }
    
    return curve;
  }

  private generateMockTrades(): BacktestTrade[] {
    const trades: BacktestTrade[] = [];
    const symbols = ['BTCUSDT', 'ETHUSDT'];
    
    for (let i = 0; i < 20; i++) { // Sample trades
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const basePrice = symbol === 'BTCUSDT' ? 45000 : 3000;
      const side: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';
      
      const entryPrice = basePrice * (0.9 + Math.random() * 0.2);
      const priceChange = (Math.random() - 0.5) * 0.1; // -5% to +5%
      const exitPrice = entryPrice * (1 + priceChange);
      
      const quantity = Math.random() * 0.5 + 0.1;
      const entryDate = new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const holdingHours = Math.random() * 72 + 1; // 1-72 hours
      const exitDate = new Date(entryDate.getTime() + holdingHours * 60 * 60 * 1000);
      
      const pnl = side === 'buy' ? 
        (exitPrice - entryPrice) * quantity : 
        (entryPrice - exitPrice) * quantity;
      
      const commission = (entryPrice + exitPrice) * quantity * 0.001; // 0.1% commission
      const slippage = (entryPrice + exitPrice) * quantity * 0.0005; // 0.05% slippage
      
      trades.push({
        id: `trade-${i + 1}`,
        symbol,
        side,
        entryDate,
        exitDate,
        entryPrice: Math.round(entryPrice * 100) / 100,
        exitPrice: Math.round(exitPrice * 100) / 100,
        quantity: Math.round(quantity * 1000) / 1000,
        pnl: Math.round((pnl - commission - slippage) * 100) / 100,
        pnlPercent: Math.round((pnl / (entryPrice * quantity)) * 10000) / 100,
        commission: Math.round(commission * 100) / 100,
        slippage: Math.round(slippage * 100) / 100,
        holdingPeriod: Math.round(holdingHours * 60),
        runup: Math.round(Math.abs(pnl) * (1 + Math.random() * 0.5) * 100) / 100,
        drawdown: Math.round(Math.abs(pnl) * Math.random() * 100) / 100,
        reason: pnl > 0 ? 'take_profit' : 'stop_loss',
        metadata: {
          signal: side === 'buy' ? 'bullish_crossover' : 'bearish_crossover',
          confidence: Math.round(Math.random() * 40 + 60), // 60-100%
        },
      });
    }
    
    return trades.sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());
  }

  private generateMockMonthlyReturns(): Array<{ month: string; return: number; benchmark?: number }> {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    return months.map(month => ({
      month: `2023-${month}`,
      return: Math.round((Math.random() * 10 - 2) * 100) / 100, // -2% to +8%
      benchmark: Math.round((Math.random() * 6 - 1) * 100) / 100, // -1% to +5%
    }));
  }

  private generateMockTradeDistribution(): Array<{ range: string; count: number; percentage: number }> {
    const ranges = [
      '< -10%', '-10% to -5%', '-5% to -1%', '-1% to 0%',
      '0% to 1%', '1% to 5%', '5% to 10%', '> 10%'
    ];
    
    const distribution = ranges.map(range => {
      const count = Math.floor(Math.random() * 30 + 5);
      return { range, count, percentage: 0 };
    });
    
    const total = distribution.reduce((sum, item) => sum + item.count, 0);
    distribution.forEach(item => {
      item.percentage = Math.round((item.count / total) * 10000) / 100;
    });
    
    return distribution;
  }

  async runBacktest(request: BacktestRequest): Promise<{ taskId: string }> {
    const taskId = uuidv4();
    
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      throw new Error('Maximum concurrent backtest jobs reached. Please try again later.');
    }

    const result: BacktestResult = {
      id: taskId,
      strategyId: request.strategyId,
      status: 'pending',
      startDate: request.startDate,
      endDate: request.endDate,
      symbols: request.symbols,
      initialCapital: request.initialCapital || 10000,
      finalCapital: 0,
      parameters: request.parameters,
      equityCurve: [],
      trades: [],
      monthlyReturns: [],
      tradeDistribution: [],
      createdAt: new Date(),
      metadata: {
        commission: request.commission || 0.001,
        slippage: request.slippage || 0.0005,
        maxPositions: request.maxPositions || 5,
      },
    };

    this.backtests.set(taskId, result);
    this.activeJobs.add(taskId);

    // Simulate async processing
    this.processBacktestAsync(taskId);

    logger.info(`Started backtest: ${taskId}`, request);
    return { taskId };
  }

  private async processBacktestAsync(taskId: string): Promise<void> {
    const result = this.backtests.get(taskId);
    if (!result) return;

    try {
      result.status = 'running';
      this.emit('backtest:started', { taskId });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

      // Generate realistic results
      const finalCapital = result.initialCapital * (0.8 + Math.random() * 0.8); // -20% to +60%
      
      result.status = 'completed';
      result.finalCapital = Math.round(finalCapital);
      result.metrics = this.calculateMetrics(result);
      result.equityCurve = this.generateMockEquityCurve(result.initialCapital, result.finalCapital);
      result.trades = this.generateMockTrades();
      result.monthlyReturns = this.generateMockMonthlyReturns();
      result.tradeDistribution = this.generateMockTradeDistribution();
      result.completedAt = new Date();

      this.emit('backtest:completed', { taskId, result });
      logger.info(`Completed backtest: ${taskId}`, { 
        return: result.metrics?.totalReturnPercent,
        trades: result.trades.length 
      });

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('backtest:failed', { taskId, error: result.error });
      logger.error(`Failed backtest: ${taskId}`, error);
    } finally {
      this.activeJobs.delete(taskId);
    }
  }

  private calculateMetrics(result: BacktestResult): BacktestMetrics {
    const returnPercent = ((result.finalCapital - result.initialCapital) / result.initialCapital) * 100;
    
    // Generate realistic metrics based on return
    return {
      totalReturn: result.finalCapital - result.initialCapital,
      totalReturnPercent: Math.round(returnPercent * 100) / 100,
      annualizedReturn: Math.round(returnPercent * 0.9 * 100) / 100,
      cagr: Math.round(returnPercent * 0.88 * 100) / 100,
      volatility: Math.round((15 + Math.random() * 15) * 100) / 100,
      sharpeRatio: Math.round((0.5 + Math.random() * 2) * 100) / 100,
      sortinoRatio: Math.round((0.8 + Math.random() * 2) * 100) / 100,
      calmarRatio: Math.round((0.5 + Math.random() * 2.5) * 100) / 100,
      maxDrawdown: Math.round(result.initialCapital * (0.05 + Math.random() * 0.15)),
      maxDrawdownPercent: Math.round((5 + Math.random() * 15) * 100) / 100,
      maxDrawdownDuration: Math.floor(15 + Math.random() * 60),
      totalTrades: Math.floor(50 + Math.random() * 200),
      winningTrades: 0, // Will be calculated
      losingTrades: 0, // Will be calculated
      winRate: Math.round((50 + Math.random() * 30) * 100) / 100,
      profitFactor: Math.round((1.2 + Math.random() * 1.8) * 100) / 100,
      payoffRatio: Math.round((1.5 + Math.random() * 1.5) * 100) / 100,
      expectancy: Math.round((returnPercent / 100 * result.initialCapital / 100) * 100) / 100,
      avgWin: Math.round((200 + Math.random() * 500) * 100) / 100,
      avgLoss: Math.round((-100 - Math.random() * 200) * 100) / 100,
      bestTrade: Math.round((500 + Math.random() * 1500) * 100) / 100,
      worstTrade: Math.round((-300 - Math.random() * 700) * 100) / 100,
      maxConsecutiveWins: Math.floor(3 + Math.random() * 8),
      maxConsecutiveLosses: Math.floor(2 + Math.random() * 5),
      avgHoldingPeriod: Math.round((12 + Math.random() * 36) * 100) / 100,
      avgTimeBetweenTrades: Math.round((24 + Math.random() * 72) * 100) / 100,
      tradingDays: this.calculateTradingDays(result.startDate, result.endDate),
      recoveryFactor: Math.round((2 + Math.random() * 3) * 100) / 100,
      ulcerIndex: Math.round((5 + Math.random() * 10) * 100) / 100,
      valueAtRisk: Math.round((-1 - Math.random() * 4) * 100) / 100,
      conditionalVaR: Math.round((-2 - Math.random() * 6) * 100) / 100,
      largestRunup: Math.round((800 + Math.random() * 1200) * 100) / 100,
      largestDrawdown: Math.round((-400 - Math.random() * 800) * 100) / 100,
      profitPerTrade: Math.round((returnPercent / 100 * result.initialCapital / 100) * 100) / 100,
      commission: Math.round(result.initialCapital * 0.01 * 100) / 100,
      slippage: Math.round(result.initialCapital * 0.005 * 100) / 100,
    };
  }

  private calculateTradingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  async getBacktestResults(limit: number = 10): Promise<BacktestResult[]> {
    const results = Array.from(this.backtests.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    
    return results;
  }

  async getBacktestResult(id: string): Promise<BacktestResult | null> {
    return this.backtests.get(id) || null;
  }

  async deleteBacktestResult(id: string): Promise<boolean> {
    return this.backtests.delete(id);
  }

  async optimizeStrategy(request: OptimizationRequest): Promise<{ taskId: string }> {
    const taskId = uuidv4();
    
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      throw new Error('Maximum concurrent optimization jobs reached. Please try again later.');
    }

    const optimization: OptimizationResult = {
      id: taskId,
      strategyId: request.strategyId,
      status: 'pending',
      bestParameters: {},
      bestMetric: 0,
      iterations: [],
      totalIterations: this.calculateTotalIterations(request.parameterRanges),
      completedIterations: 0,
      createdAt: new Date(),
    };

    this.optimizations.set(taskId, optimization);
    this.activeJobs.add(taskId);

    // Simulate async processing
    this.processOptimizationAsync(taskId, request);

    logger.info(`Started optimization: ${taskId}`, request);
    return { taskId };
  }

  private calculateTotalIterations(parameterRanges: Record<string, { min: number; max: number; step: number }>): number {
    let total = 1;
    for (const [, range] of Object.entries(parameterRanges)) {
      const steps = Math.floor((range.max - range.min) / range.step) + 1;
      total *= steps;
    }
    return Math.min(total, 1000); // Cap at 1000 iterations
  }

  private async processOptimizationAsync(taskId: string, request: OptimizationRequest): Promise<void> {
    const optimization = this.optimizations.get(taskId);
    if (!optimization) return;

    try {
      optimization.status = 'running';
      this.emit('optimization:started', { taskId });

      const metric = request.optimizationMetric || 'sharpeRatio';
      let bestScore = -Infinity;
      
      // Simulate optimization iterations
      for (let i = 0; i < optimization.totalIterations && i < 50; i++) {
        // Generate random parameters within ranges
        const parameters: Record<string, any> = {};
        for (const [param, range] of Object.entries(request.parameterRanges)) {
          const steps = Math.floor((range.max - range.min) / range.step);
          const randomStep = Math.floor(Math.random() * (steps + 1));
          parameters[param] = range.min + (randomStep * range.step);
        }

        // Simulate backtest with these parameters
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

        const mockMetrics = this.calculateMetrics({
          initialCapital: request.initialCapital || 10000,
          finalCapital: (request.initialCapital || 10000) * (0.8 + Math.random() * 0.8),
          startDate: request.startDate,
          endDate: request.endDate,
        } as BacktestResult);

        const score = this.getMetricValue(mockMetrics, metric);
        
        optimization.iterations.push({
          parameters,
          metrics: mockMetrics,
          score,
        });

        if (score > bestScore) {
          bestScore = score;
          optimization.bestParameters = { ...parameters };
          optimization.bestMetric = score;
        }

        optimization.completedIterations = i + 1;
        
        // Emit progress updates
        if (i % 10 === 0) {
          this.emit('optimization:progress', { 
            taskId, 
            progress: (i / optimization.totalIterations) * 100 
          });
        }
      }

      optimization.status = 'completed';
      optimization.completedAt = new Date();
      
      this.emit('optimization:completed', { taskId, result: optimization });
      logger.info(`Completed optimization: ${taskId}`, { 
        bestMetric: optimization.bestMetric,
        iterations: optimization.completedIterations
      });

    } catch (error) {
      optimization.status = 'failed';
      optimization.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('optimization:failed', { taskId, error: optimization.error });
      logger.error(`Failed optimization: ${taskId}`, error);
    } finally {
      this.activeJobs.delete(taskId);
    }
  }

  private getMetricValue(metrics: BacktestMetrics, metric: string): number {
    switch (metric) {
      case 'sharpeRatio':
        return metrics.sharpeRatio;
      case 'totalReturn':
        return metrics.totalReturnPercent;
      case 'profitFactor':
        return metrics.profitFactor;
      case 'calmarRatio':
        return metrics.calmarRatio;
      default:
        return metrics.sharpeRatio;
    }
  }

  async getOptimizationResult(id: string): Promise<OptimizationResult | null> {
    return this.optimizations.get(id) || null;
  }

  async getOptimizationResults(): Promise<OptimizationResult[]> {
    return Array.from(this.optimizations.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async cancelJob(taskId: string): Promise<{ success: boolean; message: string }> {
    if (!this.activeJobs.has(taskId)) {
      return { success: false, message: 'Job not found or already completed' };
    }

    this.activeJobs.delete(taskId);
    
    const backtest = this.backtests.get(taskId);
    if (backtest) {
      backtest.status = 'failed';
      backtest.error = 'Cancelled by user';
    }

    const optimization = this.optimizations.get(taskId);
    if (optimization) {
      optimization.status = 'failed';
      optimization.error = 'Cancelled by user';
    }

    this.emit('job:cancelled', { taskId });
    logger.info(`Cancelled job: ${taskId}`);

    return { success: true, message: 'Job cancelled successfully' };
  }

  async getJobStatus(taskId: string): Promise<{ status: string; progress?: number; error?: string } | null> {
    const backtest = this.backtests.get(taskId);
    if (backtest) {
      return {
        status: backtest.status,
        error: backtest.error,
      };
    }

    const optimization = this.optimizations.get(taskId);
    if (optimization) {
      const progress = optimization.totalIterations > 0 ? 
        (optimization.completedIterations / optimization.totalIterations) * 100 : 0;
      
      return {
        status: optimization.status,
        progress: Math.round(progress),
        error: optimization.error,
      };
    }

    return null;
  }

  async getActiveJobs(): Promise<Array<{ id: string; type: string; status: string; createdAt: Date }>> {
    const jobs: Array<{ id: string; type: string; status: string; createdAt: Date }> = [];
    
    for (const [id, backtest] of this.backtests.entries()) {
      if (this.activeJobs.has(id)) {
        jobs.push({
          id,
          type: 'backtest',
          status: backtest.status,
          createdAt: backtest.createdAt,
        });
      }
    }
    
    for (const [id, optimization] of this.optimizations.entries()) {
      if (this.activeJobs.has(id)) {
        jobs.push({
          id,
          type: 'optimization',
          status: optimization.status,
          createdAt: optimization.createdAt,
        });
      }
    }
    
    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getServiceStats(): Promise<Record<string, any>> {
    return {
      totalBacktests: this.backtests.size,
      totalOptimizations: this.optimizations.size,
      activeJobs: this.activeJobs.size,
      maxConcurrentJobs: this.maxConcurrentJobs,
      completedBacktests: Array.from(this.backtests.values()).filter(b => b.status === 'completed').length,
      failedBacktests: Array.from(this.backtests.values()).filter(b => b.status === 'failed').length,
      completedOptimizations: Array.from(this.optimizations.values()).filter(o => o.status === 'completed').length,
      failedOptimizations: Array.from(this.optimizations.values()).filter(o => o.status === 'failed').length,
    };
  }
}

export const tradingBacktestService = new TradingBacktestService();