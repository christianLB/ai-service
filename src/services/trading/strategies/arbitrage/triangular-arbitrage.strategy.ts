import { BaseStrategy, TradingSignal, StrategyConfig } from '../../strategy-engine.service';
import { marketDataService } from '../../market-data.service';
import { tradingConnectorService } from '../../trading-connector.service';
import * as ccxt from 'ccxt';
import type { Ticker } from 'ccxt';

interface ArbitrageOpportunity {
  path: string[];
  profitPercentage: number;
  estimatedProfit: number;
  volumes: number[];
  prices: number[];
  timestamp: Date;
}

interface TriangularArbitrageParams {
  minProfitThreshold: number; // Minimum profit percentage to trigger trade
  maxPositionSize: number; // Maximum USD value per trade
  exchangeFeePercentage: number; // Exchange trading fee
  slippagePercentage: number; // Expected slippage
  symbols: string[]; // Symbols to monitor
}

export class TriangularArbitrageStrategy extends BaseStrategy {
  private params: TriangularArbitrageParams;
  private marketCache: Map<string, Ticker> = new Map();
  private scanInterval?: NodeJS.Timeout;

  constructor(config: StrategyConfig) {
    super(config);
    
    // Default parameters
    this.params = {
      minProfitThreshold: 0.3, // 0.3% minimum profit
      maxPositionSize: 1000, // $1000 max per trade
      exchangeFeePercentage: 0.1, // 0.1% fee
      slippagePercentage: 0.05, // 0.05% slippage
      symbols: ['BTC/USDT', 'ETH/USDT', 'ETH/BTC'],
      ...config.parameters,
    };
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Triangular Arbitrage Strategy', { params: this.params });
    
    // Start scanning for opportunities
    this.scanInterval = setInterval(async () => {
      await this.scanForOpportunities();
    }, 5000); // Scan every 5 seconds
  }

  async cleanup(): Promise<void> {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = undefined;
    }
    this.marketCache.clear();
  }

  async analyze(exchange: string, symbol: string, data?: any): Promise<TradingSignal | null> {
    try {
      // Update market cache
      await this.updateMarketData(exchange);
      
      // Find arbitrage opportunities
      const opportunities = await this.findArbitrageOpportunities(exchange);
      
      if (opportunities.length === 0) {
        return null;
      }

      // Sort by profit percentage
      opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
      const bestOpportunity = opportunities[0];

      // Check if profitable enough
      if (bestOpportunity.profitPercentage < this.params.minProfitThreshold) {
        return null;
      }

      // Generate trading signal
      const signal: TradingSignal = {
        strategyId: this.config.id,
        exchange,
        symbol: bestOpportunity.path[0], // First pair in the path
        action: 'buy',
        strength: Math.min(bestOpportunity.profitPercentage / 1.0, 1.0), // Normalize to 0-1
        analysis: {
          opportunity: bestOpportunity,
          expectedProfit: bestOpportunity.estimatedProfit,
          path: bestOpportunity.path,
        },
        indicatorsUsed: ['price_differential', 'volume_analysis'],
        timestamp: new Date(),
      };

      await this.emitSignal(signal);
      return signal;
      
    } catch (error) {
      this.logger.error('Analysis failed', error);
      return null;
    }
  }

  private async scanForOpportunities(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Scan all configured exchanges
      const exchanges = ['binance', 'coinbase']; // TODO: Get from config
      
      for (const exchange of exchanges) {
        await this.analyze(exchange, '', null);
      }
    } catch (error) {
      this.logger.error('Scan failed', error);
    }
  }

  private async updateMarketData(exchange: string): Promise<void> {
    try {
      const connector = await tradingConnectorService.getExchange(exchange);
      if (!connector) {
        throw new Error(`Exchange not connected: ${exchange}`);
      }

      // Fetch tickers for all symbols
      for (const symbol of this.params.symbols) {
        try {
          const ticker = await connector.exchange.fetchTicker(symbol);
          this.marketCache.set(`${exchange}:${symbol}`, ticker);
        } catch (error) {
          this.logger.debug(`Failed to fetch ${symbol} on ${exchange}`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to update market data', error);
    }
  }

  private async findArbitrageOpportunities(exchange: string): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Example: BTC/USDT -> ETH/BTC -> ETH/USDT -> USDT
    const paths = [
      ['BTC/USDT', 'ETH/BTC', 'ETH/USDT'],
      ['ETH/USDT', 'BNB/ETH', 'BNB/USDT'],
      // Add more paths as needed
    ];

    for (const path of paths) {
      const opportunity = await this.calculateArbitrage(exchange, path);
      if (opportunity && opportunity.profitPercentage > 0) {
        opportunities.push(opportunity);
      }
    }

    return opportunities;
  }

  private async calculateArbitrage(
    exchange: string,
    path: string[]
  ): Promise<ArbitrageOpportunity | null> {
    try {
      const prices: number[] = [];
      const volumes: number[] = [];
      let currentAmount = 1000; // Start with $1000

      // Calculate through the path
      for (let i = 0; i < path.length; i++) {
        const symbol = path[i];
        const ticker = this.marketCache.get(`${exchange}:${symbol}`);
        
        if (!ticker || !ticker.bid || !ticker.ask) {
          return null;
        }

        const [base, quote] = symbol.split('/');
        
        if (i === 0) {
          // First trade: Buy base with quote
          prices.push(ticker.ask);
          volumes.push(ticker.askVolume || 0);
          currentAmount = currentAmount / ticker.ask;
        } else if (i === path.length - 1) {
          // Last trade: Sell to get back to original currency
          prices.push(ticker.bid);
          volumes.push(ticker.bidVolume || 0);
          currentAmount = currentAmount * ticker.bid;
        } else {
          // Middle trades
          if (symbol.includes(path[i-1].split('/')[0])) {
            // Sell
            prices.push(ticker.bid);
            volumes.push(ticker.bidVolume || 0);
            currentAmount = currentAmount * ticker.bid;
          } else {
            // Buy
            prices.push(ticker.ask);
            volumes.push(ticker.askVolume || 0);
            currentAmount = currentAmount / ticker.ask;
          }
        }

        // Apply fees
        currentAmount = currentAmount * (1 - this.params.exchangeFeePercentage / 100);
      }

      // Calculate profit
      const profit = currentAmount - 1000;
      const profitPercentage = (profit / 1000) * 100;

      // Apply slippage estimate
      const adjustedProfitPercentage = profitPercentage - this.params.slippagePercentage;

      if (adjustedProfitPercentage <= 0) {
        return null;
      }

      return {
        path,
        profitPercentage: adjustedProfitPercentage,
        estimatedProfit: profit * (1 - this.params.slippagePercentage / 100),
        volumes,
        prices,
        timestamp: new Date(),
      };
      
    } catch (error) {
      this.logger.error('Failed to calculate arbitrage', error);
      return null;
    }
  }

  async executeArbitrage(opportunity: ArbitrageOpportunity, exchange: string): Promise<void> {
    this.logger.info('Executing arbitrage opportunity', { opportunity });
    
    try {
      const orders = [];
      let currentAmount = this.params.maxPositionSize;

      // Execute trades in sequence
      for (let i = 0; i < opportunity.path.length; i++) {
        const symbol = opportunity.path[i];
        const [base, quote] = symbol.split('/');
        
        let side: 'buy' | 'sell';
        let amount: number;

        if (i === 0) {
          // First trade: Buy base with quote
          side = 'buy';
          amount = currentAmount / opportunity.prices[i];
        } else if (i === opportunity.path.length - 1) {
          // Last trade: Sell to get back to original currency
          side = 'sell';
          amount = currentAmount;
        } else {
          // Middle trades - determine based on path
          if (symbol.includes(opportunity.path[i-1].split('/')[0])) {
            side = 'sell';
            amount = currentAmount;
          } else {
            side = 'buy';
            amount = currentAmount / opportunity.prices[i];
          }
        }

        // Create order
        const order = await tradingConnectorService.createOrder(
          exchange,
          symbol,
          'market',
          side,
          amount,
          undefined,
          { arbitrage: true },
          this.config.id
        );

        orders.push(order);
        
        // Update current amount for next trade
        if (side === 'buy') {
          currentAmount = amount * (1 - this.params.exchangeFeePercentage / 100);
        } else {
          currentAmount = order.cost * (1 - this.params.exchangeFeePercentage / 100);
        }
      }

      // Calculate actual profit
      const actualProfit = currentAmount - this.params.maxPositionSize;
      
      // Update performance
      await this.updatePerformance({
        pnl: actualProfit,
        orders,
      });

      this.logger.info('Arbitrage executed successfully', {
        profit: actualProfit,
        orders: orders.length,
      });
      
    } catch (error) {
      this.logger.error('Arbitrage execution failed', error);
      throw error;
    }
  }
}