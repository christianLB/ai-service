import { Logger } from '../../utils/logger';
import { db } from '../database';
import { TradingSignal } from './strategy-engine.service';
import { marketDataService } from './market-data.service';
import { tradingConnectorService } from './trading-connector.service';
import { TRADING_FEATURE_FLAGS } from '../../types/trading';
import { riskManagerPrismaService, RiskManagerPrismaService } from './risk-manager-prisma.service';

const logger = new Logger('RiskManagerService');

export interface RiskParameters {
  maxPositionSizeUSD: number;
  maxOpenPositions: number;
  riskPerTradePercentage: number;
  maxDailyLossPercentage: number;
  maxDrawdownPercentage: number;
  stopLossPercentage: number;
  minConfidenceScore: number;
  correlationLimit: number;
  marginOfSafety: number;
}

export interface PositionSizeCalculation {
  positionSize: number;
  riskAmount: number;
  stopLossPrice: number;
  maxLossAmount: number;
  leverage: number;
}

export interface RiskMetrics {
  totalExposure: number;
  openPositions: number;
  dailyPnL: number;
  currentDrawdown: number;
  riskUtilization: number;
  correlationScore: number;
  marginUsed: number;
  availableCapital: number;
}

export interface TradeValidation {
  approved: boolean;
  reason?: string;
  adjustedSize?: number;
  riskScore: number;
  warnings: string[];
}

export class RiskManagerService {
  private static instance: RiskManagerService;
  private defaultParams: RiskParameters;
  private dailyPnL: Map<string, number> = new Map();
  private peakBalance: number = 0;
  private prismaService: RiskManagerPrismaService;

  private constructor() {
    this.prismaService = riskManagerPrismaService;
    this.defaultParams = {
      maxPositionSizeUSD: 1000,
      maxOpenPositions: 5,
      riskPerTradePercentage: 2, // 2% risk per trade
      maxDailyLossPercentage: 5, // 5% max daily loss
      maxDrawdownPercentage: 10, // 10% max drawdown
      stopLossPercentage: 5, // Default 5% stop loss
      minConfidenceScore: 0.7,
      correlationLimit: 0.7, // Max correlation between positions
      marginOfSafety: 0.2, // 20% safety margin
    };
  }

  static getInstance(): RiskManagerService {
    if (!RiskManagerService.instance) {
      RiskManagerService.instance = new RiskManagerService();
    }
    return RiskManagerService.instance;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Risk Manager Service');
    
    // Load user-specific risk parameters from database
    await this.loadRiskParameters();
    
    // Calculate initial metrics
    await this.updatePeakBalance();
    
    // Start daily PnL tracking
    this.startDailyTracking();
  }

  private async loadRiskParameters(userId?: string): Promise<RiskParameters> {
    try {
      const result = await db.pool.query(
        `SELECT config_key, config_value FROM trading.config 
         WHERE ($1::uuid IS NULL OR user_id = $1)
         AND config_key LIKE 'risk.%'`,
        [userId]
      );

      const params = { ...this.defaultParams };
      
      for (const row of result.rows) {
        const key = row.config_key.replace('risk.', '');
        if (key in params) {
          params[key as keyof RiskParameters] = parseFloat(row.config_value);
        }
      }

      return params;
    } catch (error) {
      logger.error('Failed to load risk parameters', error);
      return this.defaultParams;
    }
  }

  async validateTrade(signal: TradingSignal, userId?: string): Promise<TradeValidation> {
    // Use Prisma if feature flag is enabled
    if (TRADING_FEATURE_FLAGS.USE_PRISMA_RISK_MANAGER) {
      return await this.prismaService.validateTrade(signal, userId);
    }

    // Original SQL implementation
    const warnings: string[] = [];
    let riskScore = 0;

    try {
      // Load user-specific parameters
      const params = await this.loadRiskParameters(userId);
      
      // Get current risk metrics
      const metrics = await this.getCurrentRiskMetrics(userId);
      
      // 1. Check confidence score
      if (signal.strength < params.minConfidenceScore) {
        return {
          approved: false,
          reason: `Confidence score too low: ${signal.strength.toFixed(2)} < ${params.minConfidenceScore}`,
          riskScore: 0,
          warnings,
        };
      }
      riskScore += signal.strength * 20;

      // 2. Check open positions limit
      if (metrics.openPositions >= params.maxOpenPositions) {
        return {
          approved: false,
          reason: `Maximum open positions reached: ${metrics.openPositions}/${params.maxOpenPositions}`,
          riskScore,
          warnings,
        };
      }

      // 3. Check daily loss limit
      const dailyLossLimit = params.maxDailyLossPercentage;
      const currentDailyLoss = (metrics.dailyPnL / metrics.availableCapital) * 100;
      
      if (currentDailyLoss <= -dailyLossLimit) {
        return {
          approved: false,
          reason: `Daily loss limit reached: ${currentDailyLoss.toFixed(2)}%`,
          riskScore,
          warnings,
        };
      }
      
      if (currentDailyLoss <= -dailyLossLimit * 0.8) {
        warnings.push(`Approaching daily loss limit: ${currentDailyLoss.toFixed(2)}%`);
        riskScore -= 10;
      }

      // 4. Check drawdown
      if (metrics.currentDrawdown > params.maxDrawdownPercentage) {
        return {
          approved: false,
          reason: `Maximum drawdown exceeded: ${metrics.currentDrawdown.toFixed(2)}%`,
          riskScore,
          warnings,
        };
      }
      
      if (metrics.currentDrawdown > params.maxDrawdownPercentage * 0.8) {
        warnings.push(`High drawdown warning: ${metrics.currentDrawdown.toFixed(2)}%`);
        riskScore -= 15;
      }

      // 5. Calculate position size
      const positionCalc = await this.calculatePositionSize(
        signal,
        params,
        metrics.availableCapital,
        userId
      );

      // 6. Check correlation with existing positions
      const correlation = await this.checkCorrelation(signal, userId);
      if (correlation > params.correlationLimit) {
        warnings.push(`High correlation with existing positions: ${correlation.toFixed(2)}`);
        riskScore -= 20;
      }

      // 7. Volatility check
      const volatility = await this.getMarketVolatility(signal.exchange, signal.symbol);
      if (volatility > 5) { // 5% volatility threshold
        warnings.push(`High market volatility: ${volatility.toFixed(2)}%`);
        riskScore -= 10;
      }

      // 8. Final risk score calculation
      riskScore = Math.max(0, Math.min(100, riskScore + 50)); // Base score 50

      // Adjust position size based on risk score
      const adjustedSize = positionCalc.positionSize * (riskScore / 100);

      return {
        approved: true,
        adjustedSize,
        riskScore,
        warnings,
      };
      
    } catch (error) {
      logger.error('Trade validation failed', error);
      return {
        approved: false,
        reason: 'Risk validation error',
        riskScore: 0,
        warnings: ['System error during validation'],
      };
    }
  }

  async calculatePositionSize(
    signal: TradingSignal,
    params: RiskParameters,
    availableCapital: number,
    userId?: string
  ): Promise<PositionSizeCalculation> {
    // Use Prisma if feature flag is enabled
    if (TRADING_FEATURE_FLAGS.USE_PRISMA_RISK_MANAGER) {
      // Note: Prisma version has slightly different signature, adapting here
      const accountBalance = availableCapital;
      return await this.prismaService.calculatePositionSize(signal, accountBalance, params);
    }

    // Original SQL implementation
    try {
      // Get current price
      const currentPrice = await marketDataService.getLatestPrice(
        signal.exchange,
        signal.symbol
      );

      // Calculate risk amount (percentage of capital)
      const riskAmount = availableCapital * (params.riskPerTradePercentage / 100);
      
      // Determine stop loss price
      let stopLossPrice: number;
      if (signal.analysis?.stopLoss) {
        stopLossPrice = signal.analysis.stopLoss;
      } else {
        // Default stop loss based on signal direction
        if (signal.action === 'buy') {
          stopLossPrice = currentPrice * (1 - params.stopLossPercentage / 100);
        } else {
          stopLossPrice = currentPrice * (1 + params.stopLossPercentage / 100);
        }
      }

      // Calculate position size based on risk
      const riskPerUnit = Math.abs(currentPrice - stopLossPrice);
      let positionSize = riskAmount / riskPerUnit;

      // Apply position size limits
      const maxPositionValue = Math.min(
        params.maxPositionSizeUSD,
        availableCapital * 0.2 // Max 20% of capital per position
      );
      
      positionSize = Math.min(positionSize, maxPositionValue / currentPrice);

      // Calculate max loss amount
      const maxLossAmount = positionSize * riskPerUnit;

      // Default leverage (spot trading)
      const leverage = 1;

      return {
        positionSize,
        riskAmount,
        stopLossPrice,
        maxLossAmount,
        leverage,
      };
      
    } catch (error) {
      logger.error('Position size calculation failed', error);
      throw error;
    }
  }

  async getCurrentRiskMetrics(userId?: string): Promise<RiskMetrics> {
    // Use Prisma if feature flag is enabled
    if (TRADING_FEATURE_FLAGS.USE_PRISMA_RISK_MANAGER) {
      return await this.prismaService.getCurrentRiskMetrics(userId);
    }

    // Original SQL implementation
    try {
      // Get open positions
      const positions = await db.pool.query(
        `SELECT COUNT(*) as count, 
                SUM(quantity * current_price) as total_exposure,
                SUM(unrealized_pnl) as unrealized_pnl
         FROM trading.positions
         WHERE status = 'open'
         AND ($1::uuid IS NULL OR user_id = $1)`,
        [userId]
      );

      // Get daily PnL
      const dailyPnL = await this.getDailyPnL(userId);
      
      // Get account balance
      const balance = await this.getAccountBalance(userId);
      
      // Calculate metrics
      const openPositions = parseInt(positions.rows[0].count || 0);
      const totalExposure = parseFloat(positions.rows[0].total_exposure || 0);
      const unrealizedPnL = parseFloat(positions.rows[0].unrealized_pnl || 0);
      
      // Calculate drawdown
      const currentBalance = balance + unrealizedPnL;
      const drawdown = this.peakBalance > 0 
        ? ((this.peakBalance - currentBalance) / this.peakBalance) * 100
        : 0;

      // Risk utilization (exposure / balance)
      const riskUtilization = balance > 0 ? (totalExposure / balance) * 100 : 0;

      return {
        totalExposure,
        openPositions,
        dailyPnL,
        currentDrawdown: Math.max(0, drawdown),
        riskUtilization,
        correlationScore: 0, // TODO: Implement correlation calculation
        marginUsed: totalExposure, // For spot trading
        availableCapital: Math.max(0, balance - totalExposure),
      };
      
    } catch (error) {
      logger.error('Failed to get risk metrics', error);
      throw error;
    }
  }

  private async getDailyPnL(userId?: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const cached = this.dailyPnL.get(`${today}:${userId || 'global'}`);
    
    if (cached !== undefined) {
      return cached;
    }

    try {
      const result = await db.pool.query(
        `SELECT SUM(realized_pnl + fees) as daily_pnl
         FROM trading.positions
         WHERE DATE(closed_at) = CURRENT_DATE
         AND status = 'closed'
         AND ($1::uuid IS NULL OR user_id = $1)`,
        [userId]
      );

      const pnl = parseFloat(result.rows[0]?.daily_pnl || 0);
      this.dailyPnL.set(`${today}:${userId || 'global'}`, pnl);
      
      return pnl;
    } catch (error) {
      logger.error('Failed to calculate daily PnL', error);
      return 0;
    }
  }

  private async getAccountBalance(userId?: string): Promise<number> {
    // TODO: Integrate with actual exchange balances
    // For now, return a default value
    try {
      const config = await db.pool.query(
        `SELECT config_value FROM trading.config
         WHERE config_key = 'account.balance'
         AND ($1::uuid IS NULL OR user_id = $1)
         ORDER BY user_id DESC NULLS LAST LIMIT 1`,
        [userId]
      );

      return parseFloat(config.rows[0]?.config_value || '10000');
    } catch (error) {
      logger.error('Failed to get account balance', error);
      return 10000; // Default $10k
    }
  }

  private async updatePeakBalance(): Promise<void> {
    try {
      const balance = await this.getAccountBalance();
      if (balance > this.peakBalance) {
        this.peakBalance = balance;
      }
    } catch (error) {
      logger.error('Failed to update peak balance', error);
    }
  }

  private async checkCorrelation(signal: TradingSignal, userId?: string): Promise<number> {
    try {
      // Get open positions
      const positions = await db.pool.query(
        `SELECT symbol FROM trading.positions
         WHERE status = 'open'
         AND ($1::uuid IS NULL OR user_id = $1)`,
        [userId]
      );

      if (positions.rows.length === 0) {
        return 0;
      }

      // Simple correlation check based on base currency
      const [signalBase] = signal.symbol.split('/');
      let correlationCount = 0;

      for (const pos of positions.rows) {
        const [posBase] = pos.symbol.split('/');
        if (posBase === signalBase) {
          correlationCount++;
        }
      }

      return correlationCount / positions.rows.length;
      
    } catch (error) {
      logger.error('Failed to check correlation', error);
      return 0;
    }
  }

  private async getMarketVolatility(exchange: string, symbol: string): Promise<number> {
    try {
      // Get recent price data
      const ohlcv = await marketDataService.getOHLCV(
        exchange,
        symbol,
        '1h',
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        24
      );

      if (ohlcv.length < 2) {
        return 0;
      }

      // Calculate volatility as standard deviation of returns
      const returns = [];
      for (let i = 1; i < ohlcv.length; i++) {
        const returnPct = ((ohlcv[i].close - ohlcv[i-1].close) / ohlcv[i-1].close) * 100;
        returns.push(returnPct);
      }

      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      
      return Math.sqrt(variance);
      
    } catch (error) {
      logger.error('Failed to calculate volatility', error);
      return 0;
    }
  }

  async updatePositionRisk(positionId: string): Promise<void> {
    // Use Prisma if feature flag is enabled
    if (TRADING_FEATURE_FLAGS.USE_PRISMA_RISK_MANAGER) {
      return await this.prismaService.updatePositionRisk(positionId);
    }

    // Original SQL implementation
    try {
      // Get position details
      const position = await db.pool.query(
        `SELECT * FROM trading.positions WHERE id = $1`,
        [positionId]
      );

      if (position.rows.length === 0) {
        return;
      }

      const pos = position.rows[0];
      
      // Get current price
      const currentPrice = await marketDataService.getLatestPrice(
        pos.exchange,
        pos.symbol
      );

      // Calculate unrealized PnL
      let unrealizedPnl: number;
      if (pos.side === 'long' || pos.side === 'buy') {
        unrealizedPnl = (currentPrice - pos.entry_price) * pos.quantity;
      } else {
        unrealizedPnl = (pos.entry_price - currentPrice) * pos.quantity;
      }

      // Update position
      await db.pool.query(
        `UPDATE trading.positions
         SET current_price = $1,
             unrealized_pnl = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [currentPrice, unrealizedPnl, positionId]
      );

      // Check stop loss
      if (pos.stop_loss) {
        if ((pos.side === 'long' && currentPrice <= pos.stop_loss) ||
            (pos.side === 'short' && currentPrice >= pos.stop_loss)) {
          logger.warn('Stop loss triggered', { positionId, currentPrice, stopLoss: pos.stop_loss });
          // TODO: Emit event to close position
        }
      }

      // Check take profit
      if (pos.take_profit) {
        if ((pos.side === 'long' && currentPrice >= pos.take_profit) ||
            (pos.side === 'short' && currentPrice <= pos.take_profit)) {
          logger.info('Take profit triggered', { positionId, currentPrice, takeProfit: pos.take_profit });
          // TODO: Emit event to close position
        }
      }
      
    } catch (error) {
      logger.error('Failed to update position risk', error);
    }
  }

  private startDailyTracking(): void {
    // Reset daily PnL at midnight
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.dailyPnL.clear();
        this.updatePeakBalance();
      }
    }, 60000); // Check every minute
  }

  async emergencyStopAllTrading(reason: string): Promise<void> {
    // Use Prisma if feature flag is enabled
    if (TRADING_FEATURE_FLAGS.USE_PRISMA_RISK_MANAGER) {
      return await this.prismaService.emergencyStopAllTrading(reason);
    }

    // Original SQL implementation
    logger.error('EMERGENCY STOP triggered', { reason });
    
    try {
      // Update all strategies to inactive
      await db.pool.query(
        `UPDATE trading.strategies SET is_active = false, status = 'failed'`
      );

      // Close all open positions
      await db.pool.query(
        `UPDATE trading.positions 
         SET status = 'closed', 
             closed_at = NOW(),
             metadata = jsonb_set(metadata, '{emergency_stop}', 'true')
         WHERE status = 'open'`
      );

      // TODO: Cancel all open orders on exchanges
      
      logger.info('Emergency stop completed');
    } catch (error) {
      logger.error('Emergency stop failed', error);
      throw error;
    }
  }
}

export const riskManagerService = RiskManagerService.getInstance();