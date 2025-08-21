import { Logger } from '../utils/logger';

const logger = new Logger('TradingPositionsService');

export interface Position {
  id: string;
  exchange: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  positionValue: number;
  unrealizedPnl: number;
  stopLoss?: number;
  takeProfit?: number;
  strategyId?: string;
  strategyName?: string;
  status: 'open' | 'closed' | 'closing';
  openedAt: Date;
  closedAt?: Date;
  realizedPnl?: number;
  fees: number;
  marginUsed: number;
  leverage: number;
  riskLevel: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export interface PositionRisk {
  positionId: string;
  riskScore: number;
  maxLoss: number;
  probabilityOfLoss: number;
  leverageRisk: number;
  concentrationRisk: number;
  recommendations: string[];
}

export interface PortfolioSummary {
  totalPositions: number;
  totalValue: number;
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
  marginUsed: number;
  freeMargin: number;
  riskScore: number;
  exposureBySymbol: Record<string, number>;
  exposureByExchange: Record<string, number>;
}

export interface RiskParameters {
  maxPositionSize: number; // Maximum position size in USD
  maxPortfolioRisk: number; // Maximum portfolio risk as percentage
  maxLeverage: number;
  maxConcentration: number; // Maximum concentration per symbol as percentage
  stopLossThreshold: number; // Maximum loss before forced stop loss
  marginCallThreshold: number; // Margin call threshold
}

export class TradingPositionsService {
  private positions: Map<string, Position> = new Map();
  private riskParameters: RiskParameters = {
    maxPositionSize: 50000,
    maxPortfolioRisk: 5, // 5%
    maxLeverage: 10,
    maxConcentration: 20, // 20%
    stopLossThreshold: 10, // 10%
    marginCallThreshold: 80, // 80%
  };
  
  private positionIdCounter = 1;

  constructor() {
    this.initializeMockPositions();
  }

  private initializeMockPositions(): void {
    const mockPositions: Position[] = [
      {
        id: '1',
        exchange: 'binance',
        symbol: 'BTC/USDT',
        side: 'buy',
        quantity: 0.5,
        entryPrice: 65000,
        currentPrice: 68500,
        positionValue: 34250,
        unrealizedPnl: 1750,
        stopLoss: 63000,
        takeProfit: 70000,
        status: 'open',
        openedAt: new Date('2024-01-15'),
        fees: 50,
        marginUsed: 6850, // 20% margin
        leverage: 5,
        riskLevel: 'medium',
      },
      {
        id: '2',
        exchange: 'binance',
        symbol: 'ETH/USDT',
        side: 'buy',
        quantity: 10,
        entryPrice: 3200,
        currentPrice: 3350,
        positionValue: 33500,
        unrealizedPnl: 1500,
        stopLoss: 3100,
        takeProfit: 3500,
        strategyId: 'trend-following',
        strategyName: 'Trend Following',
        status: 'open',
        openedAt: new Date('2024-01-16'),
        fees: 67,
        marginUsed: 6700, // 20% margin
        leverage: 5,
        riskLevel: 'low',
      },
    ];

    mockPositions.forEach(position => {
      this.positions.set(position.id, position);
    });

    this.positionIdCounter = mockPositions.length + 1;
    logger.info(`Initialized ${mockPositions.length} mock positions`);
  }

  async getAllPositions(status?: 'open' | 'closed' | 'closing'): Promise<Position[]> {
    const allPositions = Array.from(this.positions.values());
    
    if (status) {
      return allPositions.filter(position => position.status === status);
    }
    
    return allPositions;
  }

  async getPosition(id: string): Promise<Position | null> {
    return this.positions.get(id) || null;
  }

  async getPositionsByStrategy(strategyId: string): Promise<Position[]> {
    return Array.from(this.positions.values()).filter(
      position => position.strategyId === strategyId && position.status === 'open'
    );
  }

  async openPosition(positionData: Partial<Position>): Promise<{ success: boolean; position?: Position; error?: string }> {
    try {
      // Validate required fields
      if (!positionData.symbol || !positionData.side || !positionData.quantity || !positionData.entryPrice) {
        return { success: false, error: 'Missing required position fields' };
      }

      // Risk validation
      const riskValidation = await this.validatePositionRisk(positionData);
      if (!riskValidation.isValid) {
        return { success: false, error: riskValidation.error };
      }

      const position: Position = {
        id: this.positionIdCounter.toString(),
        exchange: positionData.exchange || 'binance',
        symbol: positionData.symbol,
        side: positionData.side,
        quantity: positionData.quantity,
        entryPrice: positionData.entryPrice,
        currentPrice: positionData.entryPrice, // Initialize with entry price
        positionValue: positionData.quantity * positionData.entryPrice,
        unrealizedPnl: 0,
        stopLoss: positionData.stopLoss,
        takeProfit: positionData.takeProfit,
        strategyId: positionData.strategyId,
        strategyName: positionData.strategyName,
        status: 'open',
        openedAt: new Date(),
        fees: positionData.fees || 0,
        marginUsed: positionData.marginUsed || (positionData.quantity * positionData.entryPrice / (positionData.leverage || 1)),
        leverage: positionData.leverage || 1,
        riskLevel: this.calculateRiskLevel(positionData),
        metadata: positionData.metadata,
      };

      this.positions.set(position.id, position);
      this.positionIdCounter++;

      logger.info(`Opened new position: ${position.id} - ${position.symbol} ${position.side} ${position.quantity}`);

      return { success: true, position };
    } catch (error) {
      logger.error('Failed to open position', error);
      return { success: false, error: 'Failed to open position' };
    }
  }

  async closePosition(
    id: string, 
    reason: string = 'manual_close', 
    market: boolean = true
  ): Promise<{ success: boolean; message: string; closedAt?: Date; finalPnl?: number }> {
    try {
      const position = this.positions.get(id);
      if (!position) {
        return { success: false, message: 'Position not found' };
      }

      if (position.status !== 'open') {
        return { success: false, message: 'Position is not open' };
      }

      // Calculate final PnL
      const finalPnl = this.calculatePnl(position);
      
      // Update position
      position.status = 'closed';
      position.closedAt = new Date();
      position.realizedPnl = finalPnl;

      logger.info(`Closed position ${id}: ${reason}, PnL: ${finalPnl}, Market: ${market}`);

      return {
        success: true,
        message: 'Position closed successfully',
        closedAt: position.closedAt,
        finalPnl,
      };
    } catch (error) {
      logger.error('Failed to close position', error);
      return { success: false, message: 'Failed to close position' };
    }
  }

  async closeAllPositions(reason: string = 'manual_close_all'): Promise<{ success: boolean; message: string; positionsClosed: number }> {
    try {
      const openPositions = Array.from(this.positions.values()).filter(p => p.status === 'open');
      let closedCount = 0;

      for (const position of openPositions) {
        const result = await this.closePosition(position.id, reason, true);
        if (result.success) {
          closedCount++;
        }
      }

      logger.info(`Closed all positions: ${closedCount} positions closed`);

      return {
        success: true,
        message: 'All positions closed successfully',
        positionsClosed: closedCount,
      };
    } catch (error) {
      logger.error('Failed to close all positions', error);
      return { success: false, message: 'Failed to close all positions', positionsClosed: 0 };
    }
  }

  async updateStopLossTakeProfit(
    id: string, 
    stopLoss?: number, 
    takeProfit?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const position = this.positions.get(id);
      if (!position) {
        return { success: false, message: 'Position not found' };
      }

      if (position.status !== 'open') {
        return { success: false, message: 'Position is not open' };
      }

      // Validate stop loss and take profit levels
      if (stopLoss !== undefined) {
        const isValidStopLoss = position.side === 'buy' ? 
          stopLoss < position.currentPrice : 
          stopLoss > position.currentPrice;
        
        if (!isValidStopLoss) {
          return { success: false, message: 'Invalid stop loss level' };
        }
        position.stopLoss = stopLoss;
      }

      if (takeProfit !== undefined) {
        const isValidTakeProfit = position.side === 'buy' ? 
          takeProfit > position.currentPrice : 
          takeProfit < position.currentPrice;
        
        if (!isValidTakeProfit) {
          return { success: false, message: 'Invalid take profit level' };
        }
        position.takeProfit = takeProfit;
      }

      logger.info(`Updated SL/TP for position ${id} - SL: ${stopLoss}, TP: ${takeProfit}`);

      return { success: true, message: 'Stop loss and take profit updated successfully' };
    } catch (error) {
      logger.error('Failed to update SL/TP', error);
      return { success: false, message: 'Failed to update SL/TP' };
    }
  }

  async updatePositionPrices(priceUpdates: Record<string, number>): Promise<void> {
    for (const [symbol, price] of Object.entries(priceUpdates)) {
      const positions = Array.from(this.positions.values()).filter(
        p => p.symbol === symbol && p.status === 'open'
      );

      for (const position of positions) {
        position.currentPrice = price;
        position.positionValue = position.quantity * price;
        position.unrealizedPnl = this.calculatePnl(position);

        // Check stop loss and take profit
        await this.checkStopLossTakeProfit(position);
      }
    }
  }

  private async checkStopLossTakeProfit(position: Position): Promise<void> {
    if (position.stopLoss && 
        ((position.side === 'buy' && position.currentPrice <= position.stopLoss) ||
         (position.side === 'sell' && position.currentPrice >= position.stopLoss))) {
      
      await this.closePosition(position.id, 'stop_loss_triggered', true);
      logger.info(`Stop loss triggered for position ${position.id}`);
    }

    if (position.takeProfit &&
        ((position.side === 'buy' && position.currentPrice >= position.takeProfit) ||
         (position.side === 'sell' && position.currentPrice <= position.takeProfit))) {
      
      await this.closePosition(position.id, 'take_profit_triggered', true);
      logger.info(`Take profit triggered for position ${position.id}`);
    }
  }

  private calculatePnl(position: Position): number {
    if (position.status === 'closed' && position.realizedPnl !== undefined) {
      return position.realizedPnl;
    }

    const priceDiff = position.side === 'buy' ? 
      position.currentPrice - position.entryPrice : 
      position.entryPrice - position.currentPrice;

    return priceDiff * position.quantity - position.fees;
  }

  private calculateRiskLevel(positionData: Partial<Position>): 'low' | 'medium' | 'high' {
    const leverage = positionData.leverage || 1;
    const positionSize = (positionData.quantity || 0) * (positionData.entryPrice || 0);

    if (leverage > 8 || positionSize > 30000) {
      return 'high';
    } else if (leverage > 3 || positionSize > 10000) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private async validatePositionRisk(positionData: Partial<Position>): Promise<{ isValid: boolean; error?: string }> {
    const positionSize = (positionData.quantity || 0) * (positionData.entryPrice || 0);
    
    if (positionSize > this.riskParameters.maxPositionSize) {
      return { isValid: false, error: `Position size exceeds maximum allowed: ${this.riskParameters.maxPositionSize}` };
    }

    if ((positionData.leverage || 1) > this.riskParameters.maxLeverage) {
      return { isValid: false, error: `Leverage exceeds maximum allowed: ${this.riskParameters.maxLeverage}` };
    }

    // Check portfolio concentration
    const portfolioSummary = await this.getPortfolioSummary();
    const symbolExposure = portfolioSummary.exposureBySymbol[positionData.symbol || ''] || 0;
    const newExposure = (symbolExposure + positionSize) / portfolioSummary.totalValue * 100;

    if (newExposure > this.riskParameters.maxConcentration) {
      return { isValid: false, error: `Position would exceed concentration limit for ${positionData.symbol}` };
    }

    return { isValid: true };
  }

  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const openPositions = Array.from(this.positions.values()).filter(p => p.status === 'open');
    
    const summary: PortfolioSummary = {
      totalPositions: openPositions.length,
      totalValue: 0,
      totalUnrealizedPnl: 0,
      totalRealizedPnl: 0,
      marginUsed: 0,
      freeMargin: 0,
      riskScore: 0,
      exposureBySymbol: {},
      exposureByExchange: {},
    };

    for (const position of openPositions) {
      summary.totalValue += position.positionValue;
      summary.totalUnrealizedPnl += position.unrealizedPnl;
      summary.marginUsed += position.marginUsed;

      // Symbol exposure
      if (!summary.exposureBySymbol[position.symbol]) {
        summary.exposureBySymbol[position.symbol] = 0;
      }
      summary.exposureBySymbol[position.symbol] += position.positionValue;

      // Exchange exposure
      if (!summary.exposureByExchange[position.exchange]) {
        summary.exposureByExchange[position.exchange] = 0;
      }
      summary.exposureByExchange[position.exchange] += position.positionValue;
    }

    // Calculate realized PnL from closed positions
    const closedPositions = Array.from(this.positions.values()).filter(p => p.status === 'closed');
    for (const position of closedPositions) {
      if (position.realizedPnl) {
        summary.totalRealizedPnl += position.realizedPnl;
      }
    }

    // Calculate risk score (simplified)
    summary.riskScore = this.calculatePortfolioRisk(openPositions);
    
    // Assume total capital of 100,000 USD for free margin calculation
    const totalCapital = 100000;
    summary.freeMargin = totalCapital - summary.marginUsed;

    return summary;
  }

  private calculatePortfolioRisk(positions: Position[]): number {
    if (positions.length === 0) return 0;

    let totalRisk = 0;
    let totalValue = 0;

    for (const position of positions) {
      const leverage = position.leverage || 1;
      const riskWeight = leverage * 0.1 + (position.riskLevel === 'high' ? 0.3 : position.riskLevel === 'medium' ? 0.2 : 0.1);
      totalRisk += position.positionValue * riskWeight;
      totalValue += position.positionValue;
    }

    return totalValue > 0 ? (totalRisk / totalValue) * 100 : 0;
  }

  async getPositionRiskAnalysis(id: string): Promise<PositionRisk | null> {
    const position = this.positions.get(id);
    if (!position || position.status !== 'open') {
      return null;
    }

    const maxLoss = position.stopLoss ? 
      Math.abs(position.stopLoss - position.entryPrice) * position.quantity : 
      position.positionValue * 0.1; // Assume 10% max loss if no stop loss

    const riskAnalysis: PositionRisk = {
      positionId: position.id,
      riskScore: this.calculatePositionRiskScore(position),
      maxLoss,
      probabilityOfLoss: this.calculateLossProbability(position),
      leverageRisk: position.leverage > 5 ? position.leverage * 10 : position.leverage * 5,
      concentrationRisk: this.calculateConcentrationRisk(position),
      recommendations: this.generateRiskRecommendations(position),
    };

    return riskAnalysis;
  }

  private calculatePositionRiskScore(position: Position): number {
    const leverageScore = (position.leverage - 1) * 10;
    const sizeScore = (position.positionValue / 1000) * 2;
    const stopLossScore = position.stopLoss ? -10 : 20; // Penalty for no stop loss
    
    return Math.max(0, Math.min(100, leverageScore + sizeScore + stopLossScore));
  }

  private calculateLossProbability(position: Position): number {
    // Simplified probability calculation based on position characteristics
    const baseProb = 0.4; // 40% base probability
    const leverageAdjustment = (position.leverage - 1) * 0.05;
    const stopLossAdjustment = position.stopLoss ? -0.1 : 0.1;
    
    return Math.max(0.1, Math.min(0.9, baseProb + leverageAdjustment + stopLossAdjustment));
  }

  private calculateConcentrationRisk(position: Position): number {
    const portfolio = this.positions;
    const symbolExposure = Array.from(portfolio.values())
      .filter(p => p.symbol === position.symbol && p.status === 'open')
      .reduce((sum, p) => sum + p.positionValue, 0);
    
    const totalPortfolioValue = Array.from(portfolio.values())
      .filter(p => p.status === 'open')
      .reduce((sum, p) => sum + p.positionValue, 0);
    
    return totalPortfolioValue > 0 ? (symbolExposure / totalPortfolioValue) * 100 : 0;
  }

  private generateRiskRecommendations(position: Position): string[] {
    const recommendations: string[] = [];

    if (!position.stopLoss) {
      recommendations.push('Consider setting a stop loss to limit potential losses');
    }

    if (position.leverage > 5) {
      recommendations.push('High leverage detected - consider reducing position size');
    }

    if (position.riskLevel === 'high') {
      recommendations.push('Position classified as high risk - monitor closely');
    }

    const concentrationRisk = this.calculateConcentrationRisk(position);
    if (concentrationRisk > 25) {
      recommendations.push('High concentration in this symbol - consider diversification');
    }

    return recommendations;
  }

  async getRiskParameters(): Promise<RiskParameters> {
    return { ...this.riskParameters };
  }

  async updateRiskParameters(newParameters: Partial<RiskParameters>): Promise<{ success: boolean; message: string }> {
    try {
      this.riskParameters = { ...this.riskParameters, ...newParameters };
      logger.info('Updated risk parameters:', newParameters);
      return { success: true, message: 'Risk parameters updated successfully' };
    } catch (error) {
      logger.error('Failed to update risk parameters', error);
      return { success: false, message: 'Failed to update risk parameters' };
    }
  }
}

export const tradingPositionsService = new TradingPositionsService();