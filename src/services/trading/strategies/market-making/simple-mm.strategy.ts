import { BaseStrategy, TradingSignal, StrategyConfig } from '../../strategy-engine.service';
import { marketDataService } from '../../market-data.service';
import { tradingConnectorService } from '../../trading-connector.service';
import ccxt from 'ccxt';

interface MarketMakingParams {
  spread: number; // Spread percentage (e.g., 0.2 for 0.2%)
  orderSize: number; // Size per order in base currency
  orderRefreshInterval: number; // Milliseconds to refresh orders
  maxExposure: number; // Maximum exposure in base currency
  minSpread: number; // Minimum spread to maintain
  maxSpread: number; // Maximum spread during volatility
  inventorySkew: number; // Adjust spread based on inventory (0-1)
  useAdaptiveSpread: boolean; // Adjust spread based on volatility
}

interface OrderPair {
  buyOrder?: ccxt.Order;
  sellOrder?: ccxt.Order;
  symbol: string;
  midPrice: number;
  spread: number;
}

export class SimpleMarketMakingStrategy extends BaseStrategy {
  private params: MarketMakingParams;
  private activeOrders: Map<string, OrderPair> = new Map();
  private inventory: Map<string, number> = new Map();
  private refreshInterval?: NodeJS.Timer;
  private lastVolatility: Map<string, number> = new Map();

  constructor(config: StrategyConfig) {
    super(config);
    
    // Default parameters
    this.params = {
      spread: 0.2, // 0.2% spread
      orderSize: 0.1, // 0.1 BTC per order
      orderRefreshInterval: 30000, // 30 seconds
      maxExposure: 1.0, // 1 BTC max exposure
      minSpread: 0.1, // 0.1% minimum
      maxSpread: 1.0, // 1% maximum
      inventorySkew: 0.5, // 50% inventory adjustment
      useAdaptiveSpread: true,
      ...config.parameters,
    };
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Market Making Strategy', { params: this.params });
    
    // Start order refresh cycle
    this.refreshInterval = setInterval(async () => {
      await this.refreshOrders();
    }, this.params.orderRefreshInterval);
    
    // Initial order placement
    await this.refreshOrders();
  }

  async cleanup(): Promise<void> {
    // Cancel all active orders
    await this.cancelAllOrders();
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
    
    this.activeOrders.clear();
    this.inventory.clear();
    this.lastVolatility.clear();
  }

  async analyze(exchange: string, symbol: string, data?: any): Promise<TradingSignal | null> {
    try {
      // Get current market data
      const connector = await tradingConnectorService.getExchange(exchange);
      if (!connector) {
        throw new Error(`Exchange not connected: ${exchange}`);
      }

      const ticker = await connector.exchange.fetchTicker(symbol);
      const orderBook = await connector.exchange.fetchOrderBook(symbol, 20);
      
      // Calculate market metrics
      const midPrice = (ticker.bid + ticker.ask) / 2;
      const currentSpread = ((ticker.ask - ticker.bid) / midPrice) * 100;
      const volatility = await this.calculateVolatility(exchange, symbol);
      
      // Determine optimal spread
      const optimalSpread = this.calculateOptimalSpread(
        currentSpread,
        volatility,
        this.getInventory(symbol)
      );

      // Check if we need to update orders
      const activeOrder = this.activeOrders.get(`${exchange}:${symbol}`);
      const shouldUpdate = this.shouldUpdateOrders(activeOrder, midPrice, optimalSpread);

      if (!shouldUpdate) {
        return null;
      }

      // Generate signal for order update
      const signal: TradingSignal = {
        strategyId: this.config.id,
        exchange,
        symbol,
        action: 'hold', // Market making doesn't have traditional buy/sell signals
        strength: 0.8,
        analysis: {
          midPrice,
          currentSpread,
          optimalSpread,
          volatility,
          inventory: this.getInventory(symbol),
          bidDepth: orderBook.bids.slice(0, 5),
          askDepth: orderBook.asks.slice(0, 5),
        },
        indicatorsUsed: ['spread', 'volatility', 'orderbook_depth'],
        timestamp: new Date(),
      };

      // Update orders instead of emitting signal
      await this.updateOrders(exchange, symbol, midPrice, optimalSpread);
      
      return signal;
      
    } catch (error) {
      this.logger.error('Analysis failed', error);
      return null;
    }
  }

  private async refreshOrders(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Refresh orders for all active pairs
      for (const [key, orderPair] of this.activeOrders) {
        const [exchange, symbol] = key.split(':');
        await this.analyze(exchange, symbol);
      }
    } catch (error) {
      this.logger.error('Order refresh failed', error);
    }
  }

  private async calculateVolatility(exchange: string, symbol: string): Promise<number> {
    try {
      // Get recent price data
      const ohlcv = await marketDataService.getOHLCV(
        exchange,
        symbol,
        '5m',
        new Date(Date.now() - 60 * 60 * 1000), // Last hour
        12 // 12 candles of 5 minutes
      );

      if (ohlcv.length < 2) {
        return 0.5; // Default volatility
      }

      // Calculate standard deviation of returns
      const returns = [];
      for (let i = 1; i < ohlcv.length; i++) {
        const returnPct = (ohlcv[i].close - ohlcv[i-1].close) / ohlcv[i-1].close;
        returns.push(returnPct);
      }

      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);

      // Convert to percentage
      const volatility = stdDev * 100;
      this.lastVolatility.set(`${exchange}:${symbol}`, volatility);
      
      return volatility;
      
    } catch (error) {
      this.logger.error('Volatility calculation failed', error);
      return this.lastVolatility.get(`${exchange}:${symbol}`) || 0.5;
    }
  }

  private calculateOptimalSpread(
    currentMarketSpread: number,
    volatility: number,
    inventory: number
  ): number {
    let spread = this.params.spread;

    // Adjust for volatility
    if (this.params.useAdaptiveSpread) {
      // Higher volatility = wider spread
      const volatilityMultiplier = 1 + (volatility * 2);
      spread = spread * volatilityMultiplier;
    }

    // Adjust for inventory
    const maxInventory = this.params.maxExposure;
    const inventoryRatio = inventory / maxInventory;
    
    if (inventoryRatio > 0.5) {
      // Too much inventory, widen sell side
      spread = spread * (1 + this.params.inventorySkew * (inventoryRatio - 0.5));
    } else if (inventoryRatio < -0.5) {
      // Short inventory, widen buy side
      spread = spread * (1 + this.params.inventorySkew * Math.abs(inventoryRatio + 0.5));
    }

    // Apply bounds
    spread = Math.max(this.params.minSpread, Math.min(this.params.maxSpread, spread));
    
    // Don't go below market spread
    return Math.max(spread, currentMarketSpread * 1.1);
  }

  private shouldUpdateOrders(
    activeOrder: OrderPair | undefined,
    currentMidPrice: number,
    optimalSpread: number
  ): boolean {
    if (!activeOrder) {
      return true;
    }

    // Check if orders are still alive
    if (!activeOrder.buyOrder || !activeOrder.sellOrder) {
      return true;
    }

    // Check if mid price has moved significantly
    const priceDrift = Math.abs(currentMidPrice - activeOrder.midPrice) / activeOrder.midPrice;
    if (priceDrift > 0.001) { // 0.1% drift
      return true;
    }

    // Check if spread needs adjustment
    const spreadDiff = Math.abs(optimalSpread - activeOrder.spread);
    if (spreadDiff > 0.05) { // 0.05% difference
      return true;
    }

    return false;
  }

  private async updateOrders(
    exchange: string,
    symbol: string,
    midPrice: number,
    spread: number
  ): Promise<void> {
    try {
      const key = `${exchange}:${symbol}`;
      
      // Cancel existing orders
      await this.cancelOrdersForPair(exchange, symbol);

      // Check exposure limits
      const currentInventory = this.getInventory(symbol);
      if (Math.abs(currentInventory) >= this.params.maxExposure) {
        this.logger.warn('Max exposure reached, skipping order placement', {
          symbol,
          inventory: currentInventory,
        });
        return;
      }

      // Calculate order prices
      const halfSpread = spread / 200; // Convert percentage to decimal and divide by 2
      const buyPrice = midPrice * (1 - halfSpread);
      const sellPrice = midPrice * (1 + halfSpread);

      // Adjust order sizes based on inventory
      let buySize = this.params.orderSize;
      let sellSize = this.params.orderSize;

      if (currentInventory > 0) {
        // We have inventory, reduce buy size
        buySize = buySize * (1 - currentInventory / this.params.maxExposure);
      } else if (currentInventory < 0) {
        // We're short, reduce sell size
        sellSize = sellSize * (1 + currentInventory / this.params.maxExposure);
      }

      // Place orders
      const connector = await tradingConnectorService.getExchange(exchange);
      if (!connector) {
        throw new Error(`Exchange not connected: ${exchange}`);
      }

      let buyOrder, sellOrder;

      // Place buy order if size is significant
      if (buySize > 0.001) {
        buyOrder = await connector.exchange.createLimitOrder(
          symbol,
          'buy',
          buySize,
          buyPrice
        );
      }

      // Place sell order if size is significant
      if (sellSize > 0.001) {
        sellOrder = await connector.exchange.createLimitOrder(
          symbol,
          'sell',
          sellSize,
          sellPrice
        );
      }

      // Store active orders
      this.activeOrders.set(key, {
        buyOrder,
        sellOrder,
        symbol,
        midPrice,
        spread,
      });

      this.logger.info('Orders updated', {
        symbol,
        buyPrice: buyOrder?.price,
        sellPrice: sellOrder?.price,
        spread: `${spread.toFixed(2)}%`,
      });
      
    } catch (error) {
      this.logger.error('Failed to update orders', error);
    }
  }

  private async cancelOrdersForPair(exchange: string, symbol: string): Promise<void> {
    const key = `${exchange}:${symbol}`;
    const orderPair = this.activeOrders.get(key);
    
    if (!orderPair) {
      return;
    }

    const connector = await tradingConnectorService.getExchange(exchange);
    if (!connector) {
      return;
    }

    try {
      if (orderPair.buyOrder && orderPair.buyOrder.status === 'open') {
        await connector.exchange.cancelOrder(orderPair.buyOrder.id, symbol);
      }
    } catch (error) {
      this.logger.error('Failed to cancel buy order', error);
    }

    try {
      if (orderPair.sellOrder && orderPair.sellOrder.status === 'open') {
        await connector.exchange.cancelOrder(orderPair.sellOrder.id, symbol);
      }
    } catch (error) {
      this.logger.error('Failed to cancel sell order', error);
    }

    this.activeOrders.delete(key);
  }

  private async cancelAllOrders(): Promise<void> {
    const promises = [];
    
    for (const [key, _] of this.activeOrders) {
      const [exchange, symbol] = key.split(':');
      promises.push(this.cancelOrdersForPair(exchange, symbol));
    }

    await Promise.all(promises);
  }

  private getInventory(symbol: string): number {
    const [base, _quote] = symbol.split('/');
    return this.inventory.get(base) || 0;
  }

  private updateInventory(symbol: string, change: number): void {
    const [base, _quote] = symbol.split('/');
    const current = this.inventory.get(base) || 0;
    this.inventory.set(base, current + change);
  }

  // Called when orders are filled
  async onOrderFilled(order: ccxt.Order, exchange: string): Promise<void> {
    const symbol = order.symbol;
    const amount = order.filled;
    
    if (order.side === 'buy') {
      this.updateInventory(symbol, amount);
    } else {
      this.updateInventory(symbol, -amount);
    }

    // Update performance metrics
    await this.updatePerformance({
      pnl: 0, // Market making PnL is calculated differently
      order,
    });

    // Immediately refresh orders for this pair
    await this.analyze(exchange, symbol);
  }
}