import { PrismaClient, Prisma } from '@prisma/client';
import { Logger } from '../../utils/logger';
import { TRADING_FEATURE_FLAGS } from '../../types/trading';
import { integrationConfigService } from '../integrations/integration-config.service';
import { marketDataService } from './market-data.service';
import { riskManagerService } from './risk-manager.service';
import { strategyEngineService, TradingSignal } from './strategy-engine.service';
import { claudeAIService, TradingContext, TradingDecision as ClaudeTradingDecision } from '../ai/claude.service';
import OpenAI from 'openai';
import { config } from '../../config';

const logger = new Logger('TradingBrainPrismaService');

interface MarketContext {
  symbol: string;
  exchange: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  volatility: number;
  technicalIndicators: any;
  orderBook: {
    bidDepth: number;
    askDepth: number;
    spread: number;
  };
  sentiment?: {
    score: number;
    sources: string[];
  };
}

interface TradingDecision {
  action: 'buy' | 'sell' | 'hold' | 'close';
  confidence: number;
  reasoning: string;
  suggestedSize: number;
  stopLoss?: number;
  takeProfit?: number;
  timeHorizon: string;
  riskAssessment: {
    marketRisk: number;
    executionRisk: number;
    overallRisk: number;
  };
}

interface PortfolioAnalysis {
  totalValue: number;
  exposure: Record<string, number>;
  correlation: number;
  suggestions: string[];
  rebalanceNeeded: boolean;
}

export class TradingBrainPrismaService {
  private static instance: TradingBrainPrismaService;
  private prisma: PrismaClient;
  private openaiClient?: OpenAI;
  private useClaudeAI: boolean = true;
  private decisionHistory: Map<string, TradingDecision[]> = new Map();
  private learningData: Map<string, any> = new Map();

  private constructor() {
    this.prisma = new PrismaClient();
  }

  static getInstance(): TradingBrainPrismaService {
    if (!TradingBrainPrismaService.instance) {
      TradingBrainPrismaService.instance = new TradingBrainPrismaService();
    }
    return TradingBrainPrismaService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Claude AI (preferred)
      try {
        await claudeAIService.initialize();
        if (claudeAIService.isReady()) {
          logger.info('Trading Brain initialized with Claude AI (primary)');
        } else {
          this.useClaudeAI = false;
        }
      } catch (claudeError) {
        logger.warn('Claude AI initialization failed, falling back to OpenAI', claudeError);
        this.useClaudeAI = false;
      }

      // Initialize OpenAI as fallback
      if (!this.useClaudeAI) {
        const apiKey = await integrationConfigService.getConfig({
          integrationType: 'openai',
          configKey: 'api_key',
          decrypt: true,
        });

        if (apiKey) {
          this.openaiClient = new OpenAI({ apiKey });
          logger.info('Trading Brain initialized with OpenAI (fallback)');
        } else {
          logger.warn('No OpenAI API key configured, running in limited mode');
        }
      }

      // Load historical learning data
      await this.loadLearningData();
      
    } catch (error) {
      logger.error('Failed to initialize Trading Brain', error);
    }
  }

  async analyzeOpportunity(
    signal: TradingSignal,
    userId?: string
  ): Promise<TradingDecision | null> {
    try {
      // Gather comprehensive market context
      const context = await this.gatherMarketContext(
        signal.exchange,
        signal.symbol
      );

      // Get portfolio status
      const portfolio = await this.getPortfolioStatus(userId);

      // Get recent performance
      const recentPerformance = await this.getRecentPerformance(
        signal.strategyId,
        signal.symbol
      );

      // Use AI to analyze if available
      if (this.useClaudeAI && claudeAIService.isReady()) {
        return await this.claudeAIAnalysis(signal, context, portfolio, recentPerformance);
      } else if (this.openaiClient) {
        return await this.aiAnalysis(signal, context, portfolio, recentPerformance);
      } else {
        return await this.ruleBasedAnalysis(signal, context, portfolio);
      }
      
    } catch (error) {
      logger.error('Failed to analyze opportunity', error);
      return null;
    }
  }

  private async gatherMarketContext(
    exchange: string,
    symbol: string
  ): Promise<MarketContext> {
    try {
      // Get current market data
      const ticker = await marketDataService.getLatestPrice(exchange, symbol);
      const ohlcv = await marketDataService.getOHLCV(
        exchange,
        symbol,
        '1h',
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        24
      );

      // Calculate technical indicators
      const technicalIndicators = this.calculateTechnicalIndicators(ohlcv);
      
      // Calculate volatility
      const volatility = this.calculateVolatility(ohlcv);
      
      // Get order book depth (simplified)
      const orderBook = {
        bidDepth: 100000, // TODO: Get real order book depth
        askDepth: 100000,
        spread: 0.1, // TODO: Calculate real spread
      };

      // Price change calculation
      const priceChange24h = ohlcv.length >= 24
        ? ((ohlcv[ohlcv.length - 1].close - ohlcv[0].close) / ohlcv[0].close) * 100
        : 0;

      // Volume calculation
      const volume24h = ohlcv.reduce((sum, candle) => sum + candle.volume, 0);

      return {
        symbol,
        exchange,
        currentPrice: ticker,
        priceChange24h,
        volume24h,
        volatility,
        technicalIndicators,
        orderBook,
      };
      
    } catch (error) {
      logger.error('Failed to gather market context', error);
      throw error;
    }
  }

  private calculateTechnicalIndicators(ohlcv: any[]): any {
    const closes = ohlcv.map(c => c.close);
    
    // Simple calculations for demonstration
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const rsi = this.calculateRSI(closes, 14);
    
    // MACD
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macd = ema12 - ema26;
    const signal = this.calculateEMA([macd], 9);
    
    // Bollinger Bands
    const bb = this.calculateBollingerBands(closes, 20, 2);
    
    return {
      sma20,
      sma50,
      rsi,
      macd: {
        value: macd,
        signal,
        histogram: macd - signal,
      },
      bollingerBands: bb,
      trend: sma20 > sma50 ? 'bullish' : 'bearish',
    };
  }

  private calculateSMA(values: number[], period: number): number {
    if (values.length < period) return 0;
    const slice = values.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  private calculateEMA(values: number[], period: number): number {
    if (values.length === 0) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = values[0];
    
    for (let i = 1; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  private calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 50;

    const gains = [];
    const losses = [];

    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateBollingerBands(
    values: number[],
    period: number,
    stdDev: number
  ): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMA(values, period);
    const slice = values.slice(-period);
    
    const variance = slice.reduce((sum, val) => {
      return sum + Math.pow(val - sma, 2);
    }, 0) / period;
    
    const std = Math.sqrt(variance);
    
    return {
      upper: sma + (std * stdDev),
      middle: sma,
      lower: sma - (std * stdDev),
    };
  }

  private calculateVolatility(ohlcv: any[]): number {
    const returns = [];
    
    for (let i = 1; i < ohlcv.length; i++) {
      const ret = (ohlcv[i].close - ohlcv[i-1].close) / ohlcv[i-1].close;
      returns.push(ret);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * 100; // Convert to percentage
  }

  private async getPortfolioStatus(userId?: string): Promise<PortfolioAnalysis> {
    try {
      const positions = await this.prisma.position.findMany({
        where: {
          status: 'OPEN',
          ...(userId && { 
            trades: {
              some: {
                // Assuming trades are linked to users through a relation
                // This would need to be adjusted based on actual schema
              }
            }
          })
        },
        include: {
          TradingPair: true
        }
      });

      const exposure: Record<string, number> = {};
      let totalValue = 0;

      for (const pos of positions) {
        const value = Number(pos.quantity) * Number(pos.avgEntryPrice);
        totalValue += value;
        
        const baseAsset = pos.TradingPair?.baseAsset || pos.symbol.split('/')[0];
        exposure[baseAsset] = (exposure[baseAsset] || 0) + value;
      }

      // Simple correlation calculation (same assets = high correlation)
      const assets = Object.keys(exposure);
      const correlation = assets.length > 0 ? 1 / assets.length : 0;

      const suggestions = [];
      
      // Check if portfolio is too concentrated
      for (const [asset, value] of Object.entries(exposure)) {
        const concentration = value / totalValue;
        if (concentration > 0.3) {
          suggestions.push(`High concentration in ${asset} (${(concentration * 100).toFixed(1)}%)`);
        }
      }

      const rebalanceNeeded = suggestions.length > 0;

      return {
        totalValue,
        exposure,
        correlation,
        suggestions,
        rebalanceNeeded,
      };
      
    } catch (error) {
      logger.error('Failed to get portfolio status', error);
      return {
        totalValue: 0,
        exposure: {},
        correlation: 0,
        suggestions: [],
        rebalanceNeeded: false,
      };
    }
  }

  private async getRecentPerformance(
    strategyId: string,
    symbol: string
  ): Promise<any> {
    try {
      const trades = await this.prisma.trade.findMany({
        where: {
          strategyId,
          symbol
        },
        orderBy: {
          executedAt: 'desc'
        },
        take: 20
      });

      const winRate = trades.length > 0
        ? trades.filter(t => Number(t.pnl || 0) > 0).length / trades.length
        : 0;

      const totalPnl = trades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);

      return {
        recentTrades: trades.length,
        winRate,
        totalPnl,
        lastTrade: trades[0] || null,
      };
      
    } catch (error) {
      logger.error('Failed to get recent performance', error);
      return {
        recentTrades: 0,
        winRate: 0,
        totalPnl: 0,
        lastTrade: null,
      };
    }
  }

  private async claudeAIAnalysis(
    signal: TradingSignal,
    context: MarketContext,
    portfolio: PortfolioAnalysis,
    performance: any
  ): Promise<TradingDecision> {
    try {
      // Convert to Claude's TradingContext format
      const claudeContext: TradingContext = {
        symbol: context.symbol,
        exchange: context.exchange,
        currentPrice: context.currentPrice,
        priceChange24h: context.priceChange24h,
        volume24h: context.volume24h,
        volatility: context.volatility,
        technicalIndicators: context.technicalIndicators,
        orderBook: context.orderBook,
        sentiment: context.sentiment,
        portfolio,
        recentPerformance: performance
      };

      // Get Claude's decision
      const claudeDecision = await claudeAIService.analyzeTradingOpportunity(claudeContext, signal);
      
      if (!claudeDecision) {
        logger.warn('Claude AI returned no decision, falling back to OpenAI');
        return this.aiAnalysis(signal, context, portfolio, performance);
      }

      // Convert Claude's decision to our format (they're compatible)
      const decision: TradingDecision = {
        action: claudeDecision.action,
        confidence: claudeDecision.confidence,
        reasoning: claudeDecision.reasoning,
        suggestedSize: claudeDecision.suggestedSize,
        stopLoss: claudeDecision.stopLoss,
        takeProfit: claudeDecision.takeProfit,
        timeHorizon: claudeDecision.timeHorizon,
        riskAssessment: claudeDecision.riskAssessment
      };

      // Store decision for learning
      this.recordDecision(signal.symbol, decision);
      
      logger.info(`Claude AI decision for ${signal.symbol}: ${decision.action} with ${(decision.confidence * 100).toFixed(1)}% confidence`);
      
      return decision;
      
    } catch (error) {
      logger.error('Claude AI analysis failed, falling back to OpenAI', error);
      if (this.openaiClient) {
        return this.aiAnalysis(signal, context, portfolio, performance);
      }
      return this.ruleBasedAnalysis(signal, context, portfolio);
    }
  }

  private async aiAnalysis(
    signal: TradingSignal,
    context: MarketContext,
    portfolio: PortfolioAnalysis,
    performance: any
  ): Promise<TradingDecision> {
    try {
      const prompt = this.buildAnalysisPrompt(signal, context, portfolio, performance);
      
      const completion = await this.openaiClient!.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert quantitative trader and risk manager. 
                     Analyze trading opportunities with a focus on risk management and capital preservation.
                     Always provide specific, actionable recommendations with clear reasoning.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent decisions
        max_tokens: 1000,
      });

      const response = completion.choices[0].message.content;
      const decision = this.parseAIResponse(response, signal, context);
      
      // Store decision for learning
      this.recordDecision(signal.symbol, decision);
      
      return decision;
      
    } catch (error) {
      logger.error('AI analysis failed, falling back to rule-based', error);
      return this.ruleBasedAnalysis(signal, context, portfolio);
    }
  }

  private buildAnalysisPrompt(
    signal: TradingSignal,
    context: MarketContext,
    portfolio: PortfolioAnalysis,
    performance: any
  ): string {
    return `Analyze this trading opportunity:

SIGNAL DETAILS:
- Symbol: ${signal.symbol}
- Exchange: ${signal.exchange}
- Action: ${signal.action}
- Strength: ${signal.strength.toFixed(2)}
- Strategy: ${signal.strategyId}

MARKET CONTEXT:
- Current Price: $${context.currentPrice.toFixed(2)}
- 24h Change: ${context.priceChange24h.toFixed(2)}%
- 24h Volume: $${(context.volume24h * context.currentPrice).toFixed(0)}
- Volatility: ${context.volatility.toFixed(2)}%
- Technical Indicators:
  - RSI: ${context.technicalIndicators.rsi.toFixed(1)}
  - Trend: ${context.technicalIndicators.trend}
  - MACD: ${context.technicalIndicators.macd.value.toFixed(4)}

PORTFOLIO STATUS:
- Total Value: $${portfolio.totalValue.toFixed(2)}
- Open Positions: ${Object.keys(portfolio.exposure).length}
- Concentration Risk: ${portfolio.rebalanceNeeded ? 'HIGH' : 'LOW'}
${portfolio.suggestions.join('\n')}

RECENT PERFORMANCE:
- Last 20 Trades Win Rate: ${(performance.winRate * 100).toFixed(1)}%
- Total PnL: $${performance.totalPnl.toFixed(2)}

Please provide a trading decision with the following:
1. Action (buy/sell/hold/close)
2. Confidence level (0-1)
3. Clear reasoning
4. Suggested position size (as % of portfolio)
5. Stop loss and take profit levels
6. Time horizon
7. Risk assessment

Format your response as JSON.`;
  }

  private parseAIResponse(
    response: string | null,
    signal: TradingSignal,
    context: MarketContext
  ): TradingDecision {
    try {
      if (!response) {
        throw new Error('Empty AI response');
      }

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        action: parsed.action || 'hold',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || 'AI analysis',
        suggestedSize: parsed.suggestedSize || 0.02, // 2% default
        stopLoss: parsed.stopLoss,
        takeProfit: parsed.takeProfit,
        timeHorizon: parsed.timeHorizon || 'medium',
        riskAssessment: {
          marketRisk: parsed.marketRisk || 0.5,
          executionRisk: parsed.executionRisk || 0.5,
          overallRisk: parsed.overallRisk || 0.5,
        },
      };
      
    } catch (error) {
      logger.error('Failed to parse AI response', error);
      
      // Return a conservative decision
      return {
        action: 'hold',
        confidence: 0.3,
        reasoning: 'Failed to parse AI response - defaulting to hold',
        suggestedSize: 0.01,
        timeHorizon: 'short',
        riskAssessment: {
          marketRisk: 0.7,
          executionRisk: 0.7,
          overallRisk: 0.7,
        },
      };
    }
  }

  private async ruleBasedAnalysis(
    signal: TradingSignal,
    context: MarketContext,
    portfolio: PortfolioAnalysis
  ): Promise<TradingDecision> {
    let confidence = signal.strength;
    let action = signal.action;
    const reasoning = [];

    // Technical analysis rules
    const rsi = context.technicalIndicators.rsi;
    
    if (rsi > 70 && action === 'buy') {
      confidence *= 0.7;
      reasoning.push('RSI indicates overbought conditions');
    } else if (rsi < 30 && action === 'sell') {
      confidence *= 0.7;
      reasoning.push('RSI indicates oversold conditions');
    }

    // Volatility adjustment
    if (context.volatility > 3) {
      confidence *= 0.8;
      reasoning.push('High volatility increases risk');
    }

    // Portfolio concentration check
    if (portfolio.rebalanceNeeded) {
      confidence *= 0.9;
      reasoning.push('Portfolio concentration risk detected');
    }

    // Volume check
    if (context.volume24h < 100000) {
      confidence *= 0.8;
      reasoning.push('Low volume may impact execution');
    }

    // Final decision
    if (confidence < 0.6) {
      action = 'hold';
      reasoning.push('Confidence too low for execution');
    }

    const suggestedSize = Math.min(0.05, confidence * 0.1); // Max 5% of portfolio

    return {
      action,
      confidence,
      reasoning: reasoning.join('; '),
      suggestedSize,
      stopLoss: context.currentPrice * (action === 'buy' ? 0.97 : 1.03),
      takeProfit: context.currentPrice * (action === 'buy' ? 1.06 : 0.94),
      timeHorizon: 'medium',
      riskAssessment: {
        marketRisk: context.volatility / 5,
        executionRisk: 0.3,
        overallRisk: (context.volatility / 5 + 0.3) / 2,
      },
    };
  }

  private recordDecision(symbol: string, decision: TradingDecision): void {
    const key = `${symbol}:${new Date().toISOString().split('T')[0]}`;
    const history = this.decisionHistory.get(key) || [];
    history.push(decision);
    
    // Keep only last 100 decisions per symbol per day
    if (history.length > 100) {
      history.shift();
    }
    
    this.decisionHistory.set(key, history);
  }

  private async loadLearningData(): Promise<void> {
    try {
      // Load successful trade patterns using Prisma
      const successfulTrades = await this.prisma.trade.findMany({
        where: {
          pnl: { gt: 0 }
        },
        // No direct relations in Trade model
        orderBy: {
          pnl: 'desc'
        },
        take: 1000
      });

      // Analyze patterns
      for (const trade of successfulTrades) {
        const pattern = {
          symbol: trade.symbol,
          strategyType: (trade.metadata as any)?.strategyType || 'unknown',
          timeOfDay: trade.executedAt ? new Date(trade.executedAt).getHours() : 0,
          dayOfWeek: trade.executedAt ? new Date(trade.executedAt).getDay() : 0,
          confidenceScore: 0.8 // Default confidence for successful trades
        };
        
        const key = `${pattern.symbol}:${pattern.strategyType}`;
        const existing = this.learningData.get(key) || [];
        existing.push(pattern);
        this.learningData.set(key, existing);
      }

      logger.info(`Loaded ${this.learningData.size} learning patterns`);
      
    } catch (error) {
      logger.error('Failed to load learning data', error);
    }
  }

  // Method to switch AI provider
  setAIProvider(provider: 'claude' | 'openai'): void {
    if (provider === 'claude' && claudeAIService.isReady()) {
      this.useClaudeAI = true;
      logger.info('Switched to Claude AI for trading analysis');
    } else if (provider === 'openai' && this.openaiClient) {
      this.useClaudeAI = false;
      logger.info('Switched to OpenAI for trading analysis');
    } else {
      logger.warn(`Cannot switch to ${provider} - provider not initialized`);
    }
  }

  // Get current AI provider
  getCurrentAIProvider(): string {
    if (this.useClaudeAI && claudeAIService.isReady()) {
      return `Claude (${claudeAIService.getCurrentModel()})`;
    } else if (this.openaiClient) {
      return 'OpenAI (gpt-4)';
    } else {
      return 'Rule-based (no AI)';
    }
  }

  async suggestImprovements(strategyId: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    try {
      // Get strategy performance
      const strategy = await this.prisma.strategy.findUnique({
        where: { id: strategyId },
        include: {
          trades: {
            orderBy: { executedAt: 'desc' },
            take: 50
          }
        }
      });

      if (!strategy) {
        return suggestions;
      }
      
      // Calculate actual win rate from trades
      const winRate = strategy.trades.length > 0
        ? strategy.trades.filter(t => Number(t.pnl || 0) > 0).length / strategy.trades.length
        : 0;
      
      // Analyze win rate
      if (winRate < 0.4) {
        suggestions.push('Consider adjusting entry criteria - win rate is below 40%');
      }

      // Analyze drawdown
      const strategyMetadata = strategy.metadata as any || {};
      if (Number(strategyMetadata.maxDrawdownHit || 0) > 0.15) {
        suggestions.push('Implement tighter stop losses - max drawdown exceeds 15%');
      }

      // Check if strategy is using all available indicators
      const params = strategy.config as any;
      if (!params?.useVolumeConfirmation) {
        suggestions.push('Enable volume confirmation for better signal quality');
      }

      // Check for time-based patterns
      const lossByHour = new Map<number, number>();
      for (const trade of strategy.trades) {
        if (Number(trade.pnl || 0) < 0) {
          const hour = trade.executedAt ? new Date(trade.executedAt).getHours() : 0;
          lossByHour.set(hour, (lossByHour.get(hour) || 0) + 1);
        }
      }

      // Find worst performing hours
      for (const [hour, losses] of lossByHour) {
        if (losses > 5) {
          suggestions.push(`Avoid trading during hour ${hour} - high loss rate`);
        }
      }

      return suggestions;
      
    } catch (error) {
      logger.error('Failed to generate suggestions', error);
      return suggestions;
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const tradingBrainPrismaService = TradingBrainPrismaService.getInstance();