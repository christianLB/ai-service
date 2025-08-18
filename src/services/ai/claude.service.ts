import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '../../utils/logger';
import { integrationConfigService } from '../integrations/integration-config.service';
import { config } from '../../config';

const logger = new Logger('ClaudeAIService');

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface TradingContext {
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
  portfolio?: any;
  recentPerformance?: any;
}

export interface TradingDecision {
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

export interface MarketAnalysis {
  summary: string;
  opportunities: Array<{
    symbol: string;
    action: string;
    confidence: number;
    reasoning: string;
  }>;
  risks: string[];
  recommendations: string[];
}

export class ClaudeAIService {
  private static instance: ClaudeAIService;
  private client?: Anthropic;
  private model: string = 'claude-3-opus-20240229';
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): ClaudeAIService {
    if (!ClaudeAIService.instance) {
      ClaudeAIService.instance = new ClaudeAIService();
    }
    return ClaudeAIService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Get Claude API key from secure storage
      const apiKey = await integrationConfigService.getConfig({
        integrationType: 'claude',
        configKey: 'api_key',
        decrypt: true,
      });

      if (!apiKey) {
        // Fallback to environment variable if not in database
        const envKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
        if (envKey) {
          this.client = new Anthropic({ apiKey: envKey });
          logger.info('Claude AI initialized with environment API key');
        } else {
          logger.warn('No Claude API key configured');
          return;
        }
      } else {
        this.client = new Anthropic({ apiKey });
        logger.info('Claude AI initialized with secure storage API key');
      }

      // Get model preference
      const modelConfig = await integrationConfigService.getConfig({
        integrationType: 'claude',
        configKey: 'model',
        decrypt: false,
      });

      if (modelConfig) {
        this.model = modelConfig;
      }

      this.isInitialized = true;
      logger.info(`Claude AI service initialized with model: ${this.model}`);
    } catch (error) {
      logger.error('Failed to initialize Claude AI', error);
      throw error;
    }
  }

  async analyzeTradingOpportunity(
    context: TradingContext,
    signal?: any
  ): Promise<TradingDecision | null> {
    if (!this.client || !this.isInitialized) {
      logger.error('Claude AI not initialized');
      return null;
    }

    try {
      const prompt = this.buildTradingAnalysisPrompt(context, signal);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        temperature: 0.3,
        system: this.getTradingSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract text content from response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return this.parseTradingDecision(content.text, context);
    } catch (error) {
      logger.error('Failed to analyze trading opportunity with Claude', error);
      return null;
    }
  }

  async analyzeMarketConditions(
    symbols: string[],
    marketData: any[]
  ): Promise<MarketAnalysis | null> {
    if (!this.client || !this.isInitialized) {
      logger.error('Claude AI not initialized');
      return null;
    }

    try {
      const prompt = this.buildMarketAnalysisPrompt(symbols, marketData);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        temperature: 0.4,
        system: this.getMarketAnalysisSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return this.parseMarketAnalysis(content.text);
    } catch (error) {
      logger.error('Failed to analyze market conditions with Claude', error);
      return null;
    }
  }

  async generateTradingStrategy(requirements: {
    riskTolerance: 'low' | 'medium' | 'high';
    timeframe: string;
    targetReturn: number;
    assets: string[];
    constraints?: string[];
  }): Promise<any> {
    if (!this.client || !this.isInitialized) {
      logger.error('Claude AI not initialized');
      return null;
    }

    try {
      const prompt = this.buildStrategyGenerationPrompt(requirements);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 3000,
        temperature: 0.5,
        system: this.getStrategyGenerationSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return this.parseStrategyResponse(content.text);
    } catch (error) {
      logger.error('Failed to generate trading strategy with Claude', error);
      return null;
    }
  }

  private getTradingSystemPrompt(): string {
    return `You are an expert quantitative trader and risk manager with deep knowledge of financial markets, technical analysis, and algorithmic trading. Your role is to analyze trading opportunities with a focus on risk management, capital preservation, and consistent profitability.

Key principles:
1. Risk management is paramount - never suggest risking more than 2% of capital on a single trade
2. Provide specific, actionable recommendations with clear reasoning
3. Consider market conditions, volatility, and liquidity in all decisions
4. Balance potential returns with downside risk
5. Use technical indicators as confirmation, not primary signals
6. Always consider the broader market context and correlations

Your analysis should be data-driven, objective, and free from emotional bias. When uncertain, recommend smaller position sizes or holding positions.`;
  }

  private getMarketAnalysisSystemPrompt(): string {
    return `You are a senior market analyst specializing in cryptocurrency and traditional financial markets. Your role is to provide comprehensive market analysis, identify trends, and spot trading opportunities across multiple assets.

Focus areas:
1. Identify market regimes (trending, ranging, volatile)
2. Spot correlations and divergences between assets
3. Analyze volume patterns and market microstructure
4. Identify potential catalysts and risk events
5. Provide actionable insights for traders

Be concise but thorough, highlighting the most important information for trading decisions.`;
  }

  private getStrategyGenerationSystemPrompt(): string {
    return `You are a quantitative strategy developer and financial engineer. Your role is to design robust, profitable trading strategies based on specific requirements and constraints.

Strategy design principles:
1. Strategies must be clearly defined with specific entry/exit rules
2. Include proper risk management and position sizing
3. Consider transaction costs and slippage
4. Design for robustness across different market conditions
5. Provide backtesting recommendations and performance metrics
6. Include clear implementation steps

Generate strategies that are practical, implementable, and aligned with the user's risk tolerance and objectives.`;
  }

  private buildTradingAnalysisPrompt(context: TradingContext, signal?: any): string {
    let prompt = 'Analyze this trading opportunity:\n\n';

    if (signal) {
      prompt += 'SIGNAL DETAILS:\n';
      prompt += `- Symbol: ${signal.symbol}\n`;
      prompt += `- Exchange: ${signal.exchange}\n`;
      prompt += `- Action: ${signal.action}\n`;
      prompt += `- Strength: ${signal.strength?.toFixed(2) || 'N/A'}\n`;
      prompt += `- Strategy: ${signal.strategyId || 'Manual'}\n\n`;
    }

    prompt += 'MARKET CONTEXT:\n';
    prompt += `- Symbol: ${context.symbol}\n`;
    prompt += `- Exchange: ${context.exchange}\n`;
    prompt += `- Current Price: $${context.currentPrice.toFixed(2)}\n`;
    prompt += `- 24h Change: ${context.priceChange24h.toFixed(2)}%\n`;
    prompt += `- 24h Volume: $${(context.volume24h * context.currentPrice).toFixed(0)}\n`;
    prompt += `- Volatility: ${context.volatility.toFixed(2)}%\n`;
    prompt += `- Order Book Spread: ${context.orderBook.spread.toFixed(2)}%\n`;

    if (context.technicalIndicators) {
      prompt += '\nTECHNICAL INDICATORS:\n';
      prompt += `- RSI: ${context.technicalIndicators.rsi?.toFixed(1) || 'N/A'}\n`;
      prompt += `- Trend: ${context.technicalIndicators.trend || 'N/A'}\n`;
      if (context.technicalIndicators.macd) {
        prompt += `- MACD: ${context.technicalIndicators.macd.value?.toFixed(4) || 'N/A'}\n`;
      }
    }

    if (context.portfolio) {
      prompt += '\nPORTFOLIO STATUS:\n';
      prompt += `- Total Value: $${context.portfolio.totalValue?.toFixed(2) || '0'}\n`;
      prompt += `- Open Positions: ${Object.keys(context.portfolio.exposure || {}).length}\n`;
      prompt += `- Concentration Risk: ${context.portfolio.rebalanceNeeded ? 'HIGH' : 'LOW'}\n`;
    }

    if (context.recentPerformance) {
      prompt += '\nRECENT PERFORMANCE:\n';
      prompt += `- Win Rate: ${(context.recentPerformance.winRate * 100).toFixed(1)}%\n`;
      prompt += `- Total PnL: $${context.recentPerformance.totalPnl?.toFixed(2) || '0'}\n`;
    }

    prompt += `\nPlease provide a trading decision with:
1. Action (buy/sell/hold/close)
2. Confidence level (0-1)
3. Clear reasoning for the decision
4. Suggested position size (as % of portfolio)
5. Stop loss and take profit levels
6. Time horizon for the trade
7. Risk assessment (market risk, execution risk, overall risk)

Format your response as a JSON object.`;

    return prompt;
  }

  private buildMarketAnalysisPrompt(symbols: string[], marketData: any[]): string {
    let prompt = 'Analyze the current market conditions for the following assets:\n\n';

    symbols.forEach((symbol, index) => {
      const data = marketData[index];
      if (data) {
        prompt += `${symbol}:\n`;
        prompt += `- Price: $${data.price?.toFixed(2) || 'N/A'}\n`;
        prompt += `- 24h Change: ${data.change24h?.toFixed(2) || 'N/A'}%\n`;
        prompt += `- Volume: $${data.volume24h?.toFixed(0) || 'N/A'}\n`;
        prompt += `- RSI: ${data.rsi?.toFixed(1) || 'N/A'}\n\n`;
      }
    });

    prompt += `Provide a comprehensive market analysis including:
1. Overall market summary
2. Top opportunities with specific symbols and actions
3. Key risks to monitor
4. Actionable recommendations for traders

Format your response as a JSON object.`;

    return prompt;
  }

  private buildStrategyGenerationPrompt(requirements: any): string {
    return `Generate a trading strategy with the following requirements:

REQUIREMENTS:
- Risk Tolerance: ${requirements.riskTolerance}
- Timeframe: ${requirements.timeframe}
- Target Return: ${requirements.targetReturn}% per month
- Assets: ${requirements.assets.join(', ')}
${requirements.constraints ? `- Constraints: ${requirements.constraints.join(', ')}` : ''}

Please design a complete trading strategy including:
1. Strategy name and description
2. Entry rules (specific conditions)
3. Exit rules (profit targets and stop losses)
4. Position sizing formula
5. Risk management rules
6. Recommended indicators and parameters
7. Market conditions where the strategy works best
8. Implementation steps

Format your response as a JSON object with clear structure.`;
  }

  private parseTradingDecision(response: string, context: TradingContext): TradingDecision {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        action: parsed.action || 'hold',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || 'Claude AI analysis',
        suggestedSize: Math.min(0.1, Math.max(0.01, parsed.suggestedSize || 0.02)), // Max 10% of portfolio
        stopLoss:
          parsed.stopLoss || this.calculateDefaultStopLoss(context.currentPrice, parsed.action),
        takeProfit:
          parsed.takeProfit || this.calculateDefaultTakeProfit(context.currentPrice, parsed.action),
        timeHorizon: parsed.timeHorizon || 'medium',
        riskAssessment: {
          marketRisk: parsed.riskAssessment?.marketRisk || parsed.marketRisk || 0.5,
          executionRisk: parsed.riskAssessment?.executionRisk || parsed.executionRisk || 0.5,
          overallRisk: parsed.riskAssessment?.overallRisk || parsed.overallRisk || 0.5,
        },
      };
    } catch (error) {
      logger.error('Failed to parse Claude trading decision', error);

      // Return a conservative default decision
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

  private parseMarketAnalysis(response: string): MarketAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || 'Market analysis completed',
        opportunities: parsed.opportunities || [],
        risks: parsed.risks || [],
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      logger.error('Failed to parse Claude market analysis', error);

      return {
        summary: 'Failed to parse market analysis',
        opportunities: [],
        risks: ['Analysis parsing error'],
        recommendations: ['Manual review recommended'],
      };
    }
  }

  private parseStrategyResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse Claude strategy response', error);
      return null;
    }
  }

  private calculateDefaultStopLoss(currentPrice: number, action: string): number {
    // Default 3% stop loss
    return action === 'buy' ? currentPrice * 0.97 : currentPrice * 1.03;
  }

  private calculateDefaultTakeProfit(currentPrice: number, action: string): number {
    // Default 6% take profit
    return action === 'buy' ? currentPrice * 1.06 : currentPrice * 0.94;
  }

  // Helper method to check if service is ready
  isReady(): boolean {
    return this.isInitialized && !!this.client;
  }

  // Get current model being used
  getCurrentModel(): string {
    return this.model;
  }

  // Update model preference
  async updateModel(model: string): Promise<void> {
    this.model = model;
    await integrationConfigService.setConfig({
      integrationType: 'claude',
      configKey: 'model',
      configValue: model,
      encrypt: false,
      isGlobal: true,
    });
    logger.info(`Claude AI model updated to: ${model}`);
  }
}

export const claudeAIService = ClaudeAIService.getInstance();
