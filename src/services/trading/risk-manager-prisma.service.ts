import { PrismaClient, Prisma } from '@prisma/client';
import { Logger } from '../../utils/logger';
import { TRADING_FEATURE_FLAGS } from '../../types/trading';
import { TradingSignal } from './strategy-engine.service';
import { marketDataService } from './market-data.service';
import { tradingConnectorService } from './trading-connector.service';

const logger = new Logger('RiskManagerPrismaService');

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

export class RiskManagerPrismaService {
  private static instance: RiskManagerPrismaService;
  private prisma: PrismaClient;
  private defaultParams: RiskParameters;
  private dailyPnL: Map<string, number> = new Map();
  private peakBalance: number = 0;

  private constructor() {
    this.prisma = new PrismaClient();
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

  static getInstance(): RiskManagerPrismaService {
    if (!RiskManagerPrismaService.instance) {
      RiskManagerPrismaService.instance = new RiskManagerPrismaService();
    }
    return RiskManagerPrismaService.instance;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Risk Manager Prisma Service');
    
    // Load user-specific risk parameters from database
    await this.loadRiskParameters();
    
    // Calculate initial metrics
    await this.updatePeakBalance();
    
    // Start daily PnL tracking
    this.startDailyTracking();
  }

  private async loadRiskParameters(userId?: string): Promise<RiskParameters> {
    try {
      // Note: This assumes a config table that might not exist in Prisma schema yet
      // For now, we'll use default params
      logger.warn('Using default risk parameters - config table not yet migrated');
      return this.defaultParams;
      
    } catch (error) {
      logger.error('Failed to load risk parameters', error);
      return this.defaultParams;
    }
  }

  async validateTrade(signal: TradingSignal, userId?: string): Promise<TradeValidation> {
    const warnings: string[] = [];
    let approved = true;
    let reason = '';
    let riskScore = 0;
    
    try {
      // Get current risk metrics
      const metrics = await this.getCurrentRiskMetrics(userId);
      const params = await this.loadRiskParameters(userId);
      
      // Check 1: Max open positions
      if (metrics.openPositions >= params.maxOpenPositions) {
        approved = false;
        reason = `Maximum open positions (${params.maxOpenPositions}) reached`;
        return { approved, reason, riskScore, warnings };
      }
      
      // Check 2: Confidence score
      if (signal.strength < params.minConfidenceScore) {
        approved = false;
        reason = `Confidence score ${signal.strength.toFixed(2)} below minimum ${params.minConfidenceScore}`;
        return { approved, reason, riskScore, warnings };
      }
      
      // Check 3: Daily loss limit
      const dailyLossPercentage = (Math.abs(metrics.dailyPnL) / await this.getAccountBalance(userId)) * 100;
      if (dailyLossPercentage >= params.maxDailyLossPercentage) {
        approved = false;
        reason = `Daily loss limit (${params.maxDailyLossPercentage}%) reached`;
        return { approved, reason, riskScore, warnings };
      }
      
      // Check 4: Drawdown limit
      if (metrics.currentDrawdown >= params.maxDrawdownPercentage) {
        approved = false;
        reason = `Maximum drawdown (${params.maxDrawdownPercentage}%) reached`;
        return { approved, reason, riskScore, warnings };
      }
      
      // Check 5: Correlation with existing positions
      const correlation = await this.checkCorrelation(signal, userId);
      if (correlation > params.correlationLimit) {
        warnings.push(`High correlation (${(correlation * 100).toFixed(1)}%) with existing positions`);
        riskScore += 0.2;
      }
      
      // Check 6: Market volatility
      const volatility = await this.getMarketVolatility(signal.exchange, signal.symbol);
      if (volatility > 3) { // 3% volatility threshold
        warnings.push(`High market volatility (${volatility.toFixed(2)}%)`);
        riskScore += 0.15;
      }
      
      // Check 7: Available capital
      if (metrics.availableCapital < params.maxPositionSizeUSD) {
        approved = false;
        reason = 'Insufficient available capital';
        return { approved, reason, riskScore, warnings };
      }
      
      // Calculate risk score (0-1)
      riskScore = Math.min(1, 
        (1 - signal.strength) * 0.3 +
        (metrics.riskUtilization) * 0.3 +
        (correlation) * 0.2 +
        (volatility / 10) * 0.2
      );
      
      // Final approval based on risk score
      if (riskScore > 0.8) {
        approved = false;
        reason = `Risk score too high (${(riskScore * 100).toFixed(1)}%)`;
      }
      
      // Calculate adjusted position size if needed
      let adjustedSize;
      if (riskScore > 0.6) {
        adjustedSize = params.maxPositionSizeUSD * (1 - riskScore);
        warnings.push(`Position size reduced due to high risk`);
      }
      
      return {
        approved,
        reason,
        adjustedSize,
        riskScore,
        warnings,
      };
      
    } catch (error) {
      logger.error('Trade validation failed', error);
      return {
        approved: false,
        reason: 'Risk validation error',
        riskScore: 1,
        warnings: ['System error during validation'],
      };
    }
  }

  async calculatePositionSize(
    signal: TradingSignal,
    accountBalance: number,
    riskParams?: RiskParameters
  ): Promise<PositionSizeCalculation> {
    const params = riskParams || this.defaultParams;
    
    try {
      // Get current price
      const currentPrice = await marketDataService.getLatestPrice(
        signal.exchange,
        signal.symbol
      );
      
      // Calculate risk amount
      const riskAmount = accountBalance * (params.riskPerTradePercentage / 100);
      
      // Calculate stop loss price
      let stopLossPrice: number;
      if (signal.analysis?.stopLoss) {
        stopLossPrice = signal.analysis.stopLoss;
      } else {
        stopLossPrice = currentPrice * (1 - params.stopLossPercentage / 100);
      }
      
      // Calculate position size based on risk
      const riskPerUnit = Math.abs(currentPrice - stopLossPrice);
      let positionSize = riskAmount / riskPerUnit;
      
      // Apply maximum position size limit
      const maxPositionValue = Math.min(
        params.maxPositionSizeUSD,
        accountBalance * params.marginOfSafety
      );
      
      if (positionSize * currentPrice > maxPositionValue) {
        positionSize = maxPositionValue / currentPrice;
      }
      
      // Calculate max loss amount
      const maxLossAmount = positionSize * riskPerUnit;
      
      // Determine leverage (simplified)
      const leverage = (positionSize * currentPrice) > accountBalance 
        ? (positionSize * currentPrice) / accountBalance 
        : 1;
      
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
    try {
      // Get open positions using Prisma
      const positions = await this.prisma.position.findMany({
        where: {
          status: 'OPEN',
          ...(userId && { userId })
        },
        include: {
          tradingPair: true
        }
      });

      let totalExposure = 0;
      const symbolExposure: Map<string, number> = new Map();
      
      for (const position of positions) {
        const value = Number(position.quantity) * Number(position.currentPrice || position.entryPrice);
        totalExposure += value;
        
        const baseAsset = position.tradingPair.baseAsset;
        symbolExposure.set(baseAsset, (symbolExposure.get(baseAsset) || 0) + value);
      }
      
      // Get account balance
      const accountBalance = await this.getAccountBalance(userId);
      
      // Calculate daily PnL
      const dailyPnL = await this.getDailyPnL(userId);
      
      // Calculate current drawdown
      const currentValue = accountBalance + totalExposure;
      const drawdown = this.peakBalance > 0 
        ? ((this.peakBalance - currentValue) / this.peakBalance) * 100 
        : 0;
      
      // Calculate risk utilization
      const params = await this.loadRiskParameters(userId);
      const riskUtilization = totalExposure / (accountBalance * params.maxOpenPositions);
      
      // Calculate correlation score (simplified)
      const uniqueAssets = symbolExposure.size;
      const correlationScore = uniqueAssets > 0 ? 1 / uniqueAssets : 0;
      
      // Calculate margin used
      const marginUsed = totalExposure;
      
      // Calculate available capital
      const availableCapital = accountBalance - marginUsed;
      
      return {
        totalExposure,
        openPositions: positions.length,
        dailyPnL,
        currentDrawdown: Math.max(0, drawdown),
        riskUtilization: Math.min(1, riskUtilization),
        correlationScore,
        marginUsed,
        availableCapital: Math.max(0, availableCapital),
      };
      
    } catch (error) {
      logger.error('Failed to get current risk metrics', error);
      throw error;
    }
  }

  private async getDailyPnL(userId?: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get today's trades using Prisma
      const trades = await this.prisma.trade.findMany({
        where: {
          executedAt: { gte: today },
          ...(userId && { userId })
        }
      });

      let dailyPnL = 0;
      for (const trade of trades) {
        if (trade.pnl) {
          dailyPnL += Number(trade.pnl);
        }
      }
      
      return dailyPnL;
      
    } catch (error) {
      logger.error('Failed to get daily PnL', error);
      return 0;
    }
  }

  private async getAccountBalance(userId?: string): Promise<number> {
    try {
      // This would need to be implemented based on your account/balance model
      // For now, return a default value
      logger.warn('Account balance query not implemented for Prisma - using default');
      return 10000; // Default $10,000
      
    } catch (error) {
      logger.error('Failed to get account balance', error);
      return 0;
    }
  }

  private async updatePeakBalance(): Promise<void> {
    try {
      const totalBalance = await this.getAccountBalance();
      if (totalBalance > this.peakBalance) {
        this.peakBalance = totalBalance;
      }
    } catch (error) {
      logger.error('Failed to update peak balance', error);
    }
  }

  private async checkCorrelation(signal: TradingSignal, userId?: string): Promise<number> {
    try {
      // Get open positions
      const positions = await this.prisma.position.findMany({
        where: {
          status: 'OPEN',
          ...(userId && { userId })
        },
        include: {
          tradingPair: true
        }
      });

      if (positions.length === 0) {
        return 0;
      }
      
      // Extract base asset from signal
      const [signalBase] = signal.symbol.split('/');
      
      // Count positions with same base asset
      let correlatedPositions = 0;
      for (const position of positions) {
        const posBase = position.tradingPair.baseAsset;
        if (posBase === signalBase) {
          correlatedPositions++;
        }
      }
      
      // Simple correlation score
      return correlatedPositions / positions.length;
      
    } catch (error) {
      logger.error('Failed to check correlation', error);
      return 0;
    }
  }

  private async getMarketVolatility(exchange: string, symbol: string): Promise<number> {
    try {
      const ohlcv = await marketDataService.getOHLCV(
        exchange,
        symbol,
        '1h',
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        24
      );
      
      if (ohlcv.length < 2) {
        return 0;
      }
      
      // Calculate simple volatility (standard deviation of returns)
      const returns = [];
      for (let i = 1; i < ohlcv.length; i++) {
        const ret = (ohlcv[i].close - ohlcv[i-1].close) / ohlcv[i-1].close;
        returns.push(ret);
      }
      
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * 100; // Convert to percentage
      
      return volatility;
      
    } catch (error) {
      logger.error('Failed to calculate market volatility', error);
      return 0;
    }
  }

  async updatePositionRisk(positionId: string): Promise<void> {
    try {
      const position = await this.prisma.position.findUnique({
        where: { id: positionId },
        include: {
          tradingPair: true,
          exchange: true
        }
      });

      if (!position) {
        logger.warn(`Position ${positionId} not found`);
        return;
      }
      
      // Get current price
      const currentPrice = await marketDataService.getLatestPrice(
        position.exchange.name,
        position.tradingPair.symbol
      );
      
      // Calculate current value and PnL
      const currentValue = Number(position.quantity) * currentPrice;
      const entryValue = Number(position.quantity) * Number(position.entryPrice);
      
      let pnl: number;
      let pnlPercentage: number;
      
      if (position.side === 'LONG') {
        pnl = currentValue - entryValue;
        pnlPercentage = ((currentPrice - Number(position.entryPrice)) / Number(position.entryPrice)) * 100;
      } else {
        pnl = entryValue - currentValue;
        pnlPercentage = ((Number(position.entryPrice) - currentPrice) / Number(position.entryPrice)) * 100;
      }
      
      // Update position
      await this.prisma.position.update({
        where: { id: positionId },
        data: {
          currentPrice: new Prisma.Decimal(currentPrice),
          unrealizedPnl: new Prisma.Decimal(pnl),
          lastChecked: new Date()
        }
      });
      
      // Check if stop loss is hit
      if (position.stopLoss) {
        const stopLoss = Number(position.stopLoss);
        if ((position.side === 'LONG' && currentPrice <= stopLoss) ||
            (position.side === 'SHORT' && currentPrice >= stopLoss)) {
          logger.warn(`Stop loss hit for position ${positionId}`);
          // Here you would trigger position closure
        }
      }
      
      // Check if take profit is hit
      if (position.takeProfit) {
        const takeProfit = Number(position.takeProfit);
        if ((position.side === 'LONG' && currentPrice >= takeProfit) ||
            (position.side === 'SHORT' && currentPrice <= takeProfit)) {
          logger.info(`Take profit hit for position ${positionId}`);
          // Here you would trigger position closure
        }
      }
      
    } catch (error) {
      logger.error(`Failed to update position risk for ${positionId}`, error);
    }
  }

  async emergencyStopAllTrading(reason: string): Promise<void> {
    try {
      logger.warn(`EMERGENCY STOP: ${reason}`);
      
      // Update all strategies to inactive
      await this.prisma.strategy.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
      
      // Cancel all open orders
      const openOrders = await this.prisma.order.findMany({
        where: { status: 'PENDING' }
      });

      for (const order of openOrders) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { 
            status: 'CANCELLED',
            metadata: {
              ...(order.metadata as any || {}),
              cancelReason: `Emergency stop: ${reason}`
            }
          }
        });
      }
      
      // Log emergency stop
      logger.error('Emergency trading stop executed', { 
        reason, 
        strategiesDisabled: true,
        ordersCancelled: openOrders.length 
      });
      
    } catch (error) {
      logger.error('Failed to execute emergency stop', error);
      throw error;
    }
  }

  private startDailyTracking(): void {
    // Reset daily PnL at midnight
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.dailyPnL.clear();
        await this.updatePeakBalance();
        logger.info('Daily risk metrics reset');
      }
    }, 60000); // Check every minute
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const riskManagerPrismaService = RiskManagerPrismaService.getInstance();