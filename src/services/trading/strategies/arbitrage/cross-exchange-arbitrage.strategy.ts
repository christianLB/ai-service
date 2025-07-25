import { BaseStrategy, TradingSignal, StrategyConfig } from '../../strategy-engine.service';
import { marketDataService } from '../../market-data.service';
import { tradingConnectorService } from '../../trading-connector.service';
import { Logger } from '../../../../utils/logger';

interface CrossExchangeArbitrageParams {
  minProfitThreshold: number; // Minimum profit percentage to trigger trade
  maxPositionSize: number; // Maximum USD value per trade
  exchangeFeePercentage: Record<string, number>; // Fee per exchange
  slippagePercentage: number; // Expected slippage
  exchanges: string[]; // Exchanges to monitor
  symbols: string[]; // Symbols to monitor
  checkIntervalMs: number; // How often to check for opportunities
}

interface ArbitrageOpportunity {
  buyExchange: string;
  sellExchange: string;
  symbol: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  spreadPercentage: number;
  estimatedProfit: number;
  buyVolume: number;
  sellVolume: number;
  maxVolume: number;
  timestamp: Date;
}

export class CrossExchangeArbitrageStrategy extends BaseStrategy {
  private params: CrossExchangeArbitrageParams;
  private scanInterval?: NodeJS.Timeout;
  private priceCache: Map<string, number> = new Map();
  private opportunityLogger = new Logger('ArbitrageOpportunity');

  constructor(config: StrategyConfig) {
    super(config);
    
    // Default parameters
    this.params = {
      minProfitThreshold: 0.5, // 0.5% minimum profit
      maxPositionSize: 5000, // $5000 max per trade
      exchangeFeePercentage: {
        binance: 0.1,
        coinbase: 0.5,
        kraken: 0.26,
        alpaca: 0.25, // For crypto on Alpaca
      },
      slippagePercentage: 0.1, // 0.1% slippage
      exchanges: ['binance', 'coinbase', 'alpaca'],
      symbols: ['BTC/USDT', 'ETH/USDT'],
      checkIntervalMs: 3000, // Check every 3 seconds
      ...config.parameters,
    };
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Cross-Exchange Arbitrage Strategy', { 
      params: this.params,
      exchanges: this.params.exchanges,
      symbols: this.params.symbols,
    });
    
    // Verify all exchanges are connected
    for (const exchangeId of this.params.exchanges) {
      const exchange = await tradingConnectorService.getExchange(exchangeId);
      if (!exchange) {
        this.logger.warn(`Exchange ${exchangeId} not connected, removing from list`);
        this.params.exchanges = this.params.exchanges.filter(e => e !== exchangeId);
      }
    }
    
    if (this.params.exchanges.length < 2) {
      throw new Error('Need at least 2 connected exchanges for cross-exchange arbitrage');
    }
    
    // Start scanning for opportunities
    this.scanInterval = setInterval(async () => {
      await this.scanForOpportunities();
    }, this.params.checkIntervalMs);
    
    // Initial scan
    await this.scanForOpportunities();
  }

  async cleanup(): Promise<void> {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = undefined;
    }
    this.priceCache.clear();
  }

  async analyze(exchange: string, symbol: string, data?: any): Promise<TradingSignal | null> {
    // This strategy scans all exchanges, not individual ones
    return null;
  }

  private async scanForOpportunities(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const opportunities: ArbitrageOpportunity[] = [];

      // Check each symbol across all exchanges
      for (const symbol of this.params.symbols) {
        const exchangePrices: Array<{
          exchange: string;
          bid: number;
          ask: number;
          bidVolume: number;
          askVolume: number;
        }> = [];

        // Collect prices from all exchanges
        for (const exchangeId of this.params.exchanges) {
          try {
            const marketData = await this.getMarketData(exchangeId, symbol);
            if (marketData) {
              exchangePrices.push({
                exchange: exchangeId,
                bid: marketData.bid,
                ask: marketData.ask,
                bidVolume: marketData.bidVolume,
                askVolume: marketData.askVolume,
              });
            }
          } catch (error) {
            this.logger.debug(`Failed to get ${symbol} from ${exchangeId}`, error);
          }
        }

        // Find arbitrage opportunities
        for (let i = 0; i < exchangePrices.length; i++) {
          for (let j = 0; j < exchangePrices.length; j++) {
            if (i === j) continue;

            const buyExchange = exchangePrices[i];
            const sellExchange = exchangePrices[j];

            // Calculate potential profit
            const spread = sellExchange.bid - buyExchange.ask;
            const spreadPercentage = (spread / buyExchange.ask) * 100;

            // Account for fees
            const buyFee = this.params.exchangeFeePercentage[buyExchange.exchange] || 0.1;
            const sellFee = this.params.exchangeFeePercentage[sellExchange.exchange] || 0.1;
            const totalFees = buyFee + sellFee;
            const netSpreadPercentage = spreadPercentage - totalFees - this.params.slippagePercentage;

            if (netSpreadPercentage >= this.params.minProfitThreshold) {
              const maxVolume = Math.min(
                buyExchange.askVolume * buyExchange.ask,
                sellExchange.bidVolume * sellExchange.bid,
                this.params.maxPositionSize
              );

              const estimatedProfit = (maxVolume * netSpreadPercentage) / 100;

              opportunities.push({
                buyExchange: buyExchange.exchange,
                sellExchange: sellExchange.exchange,
                symbol,
                buyPrice: buyExchange.ask,
                sellPrice: sellExchange.bid,
                spread,
                spreadPercentage: netSpreadPercentage,
                estimatedProfit,
                buyVolume: buyExchange.askVolume,
                sellVolume: sellExchange.bidVolume,
                maxVolume,
                timestamp: new Date(),
              });
            }
          }
        }
      }

      // Process opportunities
      if (opportunities.length > 0) {
        // Sort by profit
        opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
        
        const bestOpportunity = opportunities[0];
        
        this.opportunityLogger.info('🎯 Arbitrage opportunity detected!', {
          symbol: bestOpportunity.symbol,
          buyFrom: `${bestOpportunity.buyExchange} @ $${bestOpportunity.buyPrice.toFixed(2)}`,
          sellTo: `${bestOpportunity.sellExchange} @ $${bestOpportunity.sellPrice.toFixed(2)}`,
          spread: `$${bestOpportunity.spread.toFixed(2)} (${bestOpportunity.spreadPercentage.toFixed(2)}%)`,
          estimatedProfit: `$${bestOpportunity.estimatedProfit.toFixed(2)}`,
          maxVolume: `$${bestOpportunity.maxVolume.toFixed(2)}`,
        });

        // Execute if profitable enough
        if (bestOpportunity.estimatedProfit >= 10) { // At least $10 profit
          await this.executeArbitrage(bestOpportunity);
        }
      }
    } catch (error) {
      this.logger.error('Scan failed', error);
    }
  }

  private async getMarketData(exchangeId: string, symbol: string): Promise<any> {
    try {
      const exchange = await tradingConnectorService.getExchange(exchangeId);
      if (!exchange) return null;

      // Handle different symbol formats
      let exchangeSymbol = symbol;
      if (exchangeId === 'alpaca' && symbol.includes('/')) {
        // Alpaca uses different format for crypto
        exchangeSymbol = symbol.replace('/', '');
      }

      if ('fetchTicker' in exchange.exchange) {
        // CCXT exchange
        const ticker = await exchange.exchange.fetchTicker(exchangeSymbol);
        return {
          bid: ticker.bid || 0,
          ask: ticker.ask || 0,
          bidVolume: ticker.bidVolume || 0,
          askVolume: ticker.askVolume || 0,
        };
      } else {
        // Custom connector (Alpaca)
        const marketData = await exchange.exchange.getMarketData(exchangeSymbol);
        return {
          bid: marketData.bid || marketData.price,
          ask: marketData.ask || marketData.price,
          bidVolume: marketData.volume || 0,
          askVolume: marketData.volume || 0,
        };
      }
    } catch (error) {
      this.logger.debug(`Failed to get market data for ${symbol} on ${exchangeId}`, error);
      return null;
    }
  }

  private async executeArbitrage(opportunity: ArbitrageOpportunity): Promise<void> {
    this.logger.info('💸 Executing arbitrage trade', {
      opportunity: {
        ...opportunity,
        estimatedProfit: `$${opportunity.estimatedProfit.toFixed(2)}`,
      },
    });

    try {
      // Calculate order size based on available volume and max position
      const orderValue = Math.min(
        opportunity.maxVolume,
        this.params.maxPositionSize
      );
      const orderAmount = orderValue / opportunity.buyPrice;

      // Create simultaneous orders
      const [buyOrder, sellOrder] = await Promise.all([
        // Buy order on exchange with lower price
        tradingConnectorService.createOrder(
          opportunity.buyExchange,
          opportunity.symbol,
          'market',
          'buy',
          orderAmount,
          undefined,
          { arbitrage: true },
          this.config.userId
        ),
        // Sell order on exchange with higher price
        tradingConnectorService.createOrder(
          opportunity.sellExchange,
          opportunity.symbol,
          'market',
          'sell',
          orderAmount,
          undefined,
          { arbitrage: true },
          this.config.userId
        ),
      ]);

      // Calculate actual profit
      const buyFee = buyOrder.cost * (this.params.exchangeFeePercentage[opportunity.buyExchange] / 100);
      const sellFee = sellOrder.cost * (this.params.exchangeFeePercentage[opportunity.sellExchange] / 100);
      const actualProfit = sellOrder.cost - buyOrder.cost - buyFee - sellFee;

      this.logger.info('✅ Arbitrage executed successfully', {
        buyOrder: {
          exchange: opportunity.buyExchange,
          price: buyOrder.price,
          amount: buyOrder.amount,
          cost: buyOrder.cost,
        },
        sellOrder: {
          exchange: opportunity.sellExchange,
          price: sellOrder.price,
          amount: sellOrder.amount,
          cost: sellOrder.cost,
        },
        actualProfit: `$${actualProfit.toFixed(2)}`,
        fees: `$${(buyFee + sellFee).toFixed(2)}`,
      });

      // Update performance metrics
      await this.updatePerformance({
        pnl: actualProfit,
        orders: [buyOrder, sellOrder],
      });

      // Emit signal for tracking
      const signal: TradingSignal = {
        strategyId: this.config.id,
        exchange: `${opportunity.buyExchange}->${opportunity.sellExchange}`,
        symbol: opportunity.symbol,
        action: 'buy',
        strength: 1.0,
        analysis: {
          type: 'cross_exchange_arbitrage',
          buyExchange: opportunity.buyExchange,
          sellExchange: opportunity.sellExchange,
          spread: opportunity.spreadPercentage,
          profit: actualProfit,
        },
        indicatorsUsed: ['price_differential', 'volume_analysis'],
        timestamp: new Date(),
      };

      await this.emitSignal(signal);

    } catch (error) {
      this.logger.error('Arbitrage execution failed', error);
      throw error;
    }
  }
}