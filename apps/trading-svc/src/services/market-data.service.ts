import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';

const logger = new Logger('TradingMarketDataService');

export interface MarketData {
  id?: string;
  exchangeId: string;
  tradingPairId: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
  trades?: number;
  timeframe: string;
  metadata?: Record<string, any>;
}

export interface MarketTick {
  symbol: string;
  exchange: string;
  price: number;
  volume: number;
  timestamp: Date;
  bid: number;
  ask: number;
  spread: number;
  change24h: number;
  change24hPercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export interface OrderBook {
  symbol: string;
  exchange: string;
  timestamp: Date;
  bids: Array<[number, number]>; // [price, quantity]
  asks: Array<[number, number]>; // [price, quantity]
  lastUpdateId: number;
}

export interface TechnicalIndicators {
  symbol: string;
  timeframe: string;
  timestamp: Date;
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  rsi: number;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
  atr: number;
  adx: number;
  volume: number;
}

export interface MarketAlert {
  id: string;
  symbol: string;
  exchange: string;
  type: 'price' | 'volume' | 'technical' | 'volatility';
  condition: string;
  value: number;
  currentValue: number;
  triggered: boolean;
  createdAt: Date;
  triggeredAt?: Date;
  metadata?: Record<string, any>;
}

export interface ExchangeConfig {
  id: string;
  name: string;
  apiKey?: string;
  secretKey?: string;
  sandbox: boolean;
  rateLimit: number; // requests per second
  supportedPairs: string[];
  features: {
    spot: boolean;
    futures: boolean;
    margin: boolean;
    orderBook: boolean;
    klines: boolean;
    trades: boolean;
    websocket: boolean;
  };
  endpoints: {
    rest: string;
    websocket?: string;
  };
  status: 'active' | 'inactive' | 'maintenance';
}

export class TradingMarketDataService extends EventEmitter {
  private marketData: Map<string, MarketData[]> = new Map();
  private currentTicks: Map<string, MarketTick> = new Map();
  private orderBooks: Map<string, OrderBook> = new Map();
  private indicators: Map<string, TechnicalIndicators[]> = new Map();
  private alerts: Map<string, MarketAlert> = new Map();
  private exchanges: Map<string, ExchangeConfig> = new Map();
  
  private subscriptions: Set<string> = new Set();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  constructor() {
    super();
    this.initializeExchanges();
    this.initializeMockData();
    this.startDataGeneration();
  }

  private initializeExchanges(): void {
    const defaultExchanges: ExchangeConfig[] = [
      {
        id: 'binance',
        name: 'Binance',
        sandbox: false,
        rateLimit: 10,
        supportedPairs: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOTUSDT'],
        features: {
          spot: true,
          futures: true,
          margin: true,
          orderBook: true,
          klines: true,
          trades: true,
          websocket: true,
        },
        endpoints: {
          rest: 'https://api.binance.com',
          websocket: 'wss://stream.binance.com:9443/ws',
        },
        status: 'active',
      },
      {
        id: 'coinbase',
        name: 'Coinbase Pro',
        sandbox: false,
        rateLimit: 5,
        supportedPairs: ['BTCUSD', 'ETHUSD', 'LTCUSD', 'BCHUSD'],
        features: {
          spot: true,
          futures: false,
          margin: false,
          orderBook: true,
          klines: true,
          trades: true,
          websocket: true,
        },
        endpoints: {
          rest: 'https://api.exchange.coinbase.com',
          websocket: 'wss://ws-feed.exchange.coinbase.com',
        },
        status: 'active',
      },
      {
        id: 'kraken',
        name: 'Kraken',
        sandbox: false,
        rateLimit: 3,
        supportedPairs: ['BTCUSD', 'ETHUSD', 'XRPUSD', 'LTCUSD'],
        features: {
          spot: true,
          futures: true,
          margin: true,
          orderBook: true,
          klines: true,
          trades: true,
          websocket: true,
        },
        endpoints: {
          rest: 'https://api.kraken.com',
          websocket: 'wss://ws.kraken.com',
        },
        status: 'active',
      },
    ];

    defaultExchanges.forEach(exchange => {
      this.exchanges.set(exchange.id, exchange);
    });

    logger.info(`Initialized ${defaultExchanges.length} exchange configurations`);
  }

  private initializeMockData(): void {
    // Initialize some historical data for key pairs
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    
    symbols.forEach(symbol => {
      timeframes.forEach(timeframe => {
        const key = `${symbol}-${timeframe}`;
        this.marketData.set(key, this.generateMockHistory(symbol, timeframe));
        this.indicators.set(key, this.generateMockIndicators(symbol, timeframe));
      });

      // Initialize current ticks
      this.currentTicks.set(symbol, this.generateMockTick(symbol));
      this.orderBooks.set(symbol, this.generateMockOrderBook(symbol));
    });
  }

  private generateMockHistory(symbol: string, timeframe: string): MarketData[] {
    const history: MarketData[] = [];
    const intervals = timeframe === '1m' ? 1440 : timeframe === '5m' ? 288 : 
                     timeframe === '15m' ? 96 : timeframe === '1h' ? 24 : 
                     timeframe === '4h' ? 6 : 1;
    
    const basePrice = symbol.startsWith('BTC') ? 50000 : 
                     symbol.startsWith('ETH') ? 3000 : 300;
    
    let currentPrice = basePrice;
    const now = new Date();

    for (let i = intervals - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * this.getTimeframeMs(timeframe)));
      const volatility = 0.02; // 2% volatility
      
      const change = (Math.random() - 0.5) * volatility;
      currentPrice *= (1 + change);
      
      const high = currentPrice * (1 + Math.random() * 0.01);
      const low = currentPrice * (1 - Math.random() * 0.01);
      const open = i === intervals - 1 ? currentPrice : history[history.length - 1].close;
      
      history.push({
        exchangeId: 'binance',
        tradingPairId: symbol,
        timestamp,
        open,
        high,
        low,
        close: currentPrice,
        volume: Math.random() * 1000 + 100,
        quoteVolume: Math.random() * currentPrice * 1000,
        trades: Math.floor(Math.random() * 100 + 10),
        timeframe,
        metadata: {
          source: 'mock',
          generated: new Date(),
        },
      });
    }

    return history;
  }

  private generateMockTick(symbol: string): MarketTick {
    const basePrice = symbol.startsWith('BTC') ? 50000 : 
                     symbol.startsWith('ETH') ? 3000 : 300;
    
    const price = basePrice * (0.95 + Math.random() * 0.1);
    const spread = price * 0.001; // 0.1% spread
    
    return {
      symbol,
      exchange: 'binance',
      price,
      volume: Math.random() * 10,
      timestamp: new Date(),
      bid: price - spread / 2,
      ask: price + spread / 2,
      spread: spread / 2,
      change24h: (Math.random() - 0.5) * price * 0.1,
      change24hPercent: (Math.random() - 0.5) * 10,
      high24h: price * 1.05,
      low24h: price * 0.95,
      volume24h: Math.random() * 10000 + 1000,
    };
  }

  private generateMockOrderBook(symbol: string): OrderBook {
    const tick = this.currentTicks.get(symbol);
    const basePrice = tick ? tick.price : 50000;
    
    const bids: Array<[number, number]> = [];
    const asks: Array<[number, number]> = [];
    
    // Generate 20 levels each side
    for (let i = 0; i < 20; i++) {
      const bidPrice = basePrice * (1 - (i + 1) * 0.001);
      const askPrice = basePrice * (1 + (i + 1) * 0.001);
      const bidQty = Math.random() * 10 + 0.1;
      const askQty = Math.random() * 10 + 0.1;
      
      bids.push([bidPrice, bidQty]);
      asks.push([askPrice, askQty]);
    }
    
    return {
      symbol,
      exchange: 'binance',
      timestamp: new Date(),
      bids: bids.sort((a, b) => b[0] - a[0]), // Highest bids first
      asks: asks.sort((a, b) => a[0] - b[0]), // Lowest asks first
      lastUpdateId: Math.floor(Math.random() * 1000000),
    };
  }

  private generateMockIndicators(symbol: string, timeframe: string): TechnicalIndicators[] {
    const indicators: TechnicalIndicators[] = [];
    const history = this.marketData.get(`${symbol}-${timeframe}`) || [];
    
    history.forEach((candle, index) => {
      if (index < 20) return; // Need at least 20 periods for indicators
      
      const recentPrices = history.slice(index - 19, index + 1).map(h => h.close);
      const sma20 = recentPrices.reduce((a, b) => a + b, 0) / 20;
      const sma50 = index >= 50 ? 
        history.slice(index - 49, index + 1).map(h => h.close).reduce((a, b) => a + b, 0) / 50 : sma20;
      
      indicators.push({
        symbol,
        timeframe,
        timestamp: candle.timestamp,
        sma20,
        sma50,
        sma200: sma50, // Simplified
        ema12: sma20 * 0.98, // Simplified EMA
        ema26: sma20 * 1.02,
        macd: Math.random() * 100 - 50,
        macdSignal: Math.random() * 100 - 50,
        macdHistogram: Math.random() * 50 - 25,
        rsi: Math.random() * 100,
        bollinger: {
          upper: sma20 * 1.02,
          middle: sma20,
          lower: sma20 * 0.98,
        },
        stochastic: {
          k: Math.random() * 100,
          d: Math.random() * 100,
        },
        atr: candle.close * 0.02, // 2% ATR
        adx: Math.random() * 100,
        volume: candle.volume,
      });
    });
    
    return indicators;
  }

  private startDataGeneration(): void {
    // Simulate real-time data updates
    setInterval(() => {
      this.updateMarketTicks();
      this.updateOrderBooks();
      this.checkAlerts();
    }, 1000); // Update every second

    // Update candles less frequently
    setInterval(() => {
      this.updateCandles();
      this.updateIndicators();
    }, 60000); // Update every minute

    this.isConnected = true;
    logger.info('Started real-time market data generation');
  }

  private updateMarketTicks(): void {
    for (const [symbol, tick] of this.currentTicks.entries()) {
      const change = (Math.random() - 0.5) * 0.001; // 0.1% max change
      const newPrice = tick.price * (1 + change);
      
      const updatedTick: MarketTick = {
        ...tick,
        price: newPrice,
        volume: Math.random() * 10,
        timestamp: new Date(),
        bid: newPrice * 0.999,
        ask: newPrice * 1.001,
        change24h: newPrice - tick.price,
        change24hPercent: ((newPrice - tick.price) / tick.price) * 100,
      };
      
      this.currentTicks.set(symbol, updatedTick);
      this.emit('tick', updatedTick);
    }
  }

  private updateOrderBooks(): void {
    for (const symbol of this.currentTicks.keys()) {
      const orderBook = this.generateMockOrderBook(symbol);
      this.orderBooks.set(symbol, orderBook);
      this.emit('orderbook', orderBook);
    }
  }

  private updateCandles(): void {
    for (const [key, history] of this.marketData.entries()) {
      const [symbol, timeframe] = key.split('-');
      const lastCandle = history[history.length - 1];
      const currentTick = this.currentTicks.get(symbol);
      
      if (!currentTick) continue;
      
      // Create new candle if enough time has passed
      const timeDiff = Date.now() - lastCandle.timestamp.getTime();
      const timeframeMs = this.getTimeframeMs(timeframe);
      
      if (timeDiff >= timeframeMs) {
        const newCandle: MarketData = {
          exchangeId: 'binance',
          tradingPairId: symbol,
          timestamp: new Date(),
          open: lastCandle.close,
          high: currentTick.price,
          low: currentTick.price,
          close: currentTick.price,
          volume: Math.random() * 1000 + 100,
          quoteVolume: Math.random() * currentTick.price * 1000,
          trades: Math.floor(Math.random() * 100 + 10),
          timeframe,
          metadata: {
            source: 'mock',
            generated: new Date(),
          },
        };
        
        history.push(newCandle);
        // Keep only last 1000 candles
        if (history.length > 1000) {
          history.shift();
        }
        
        this.emit('candle', { symbol, timeframe, candle: newCandle });
      }
    }
  }

  private updateIndicators(): void {
    for (const [key] of this.indicators.entries()) {
      const [symbol, timeframe] = key.split('-');
      const newIndicators = this.generateMockIndicators(symbol, timeframe);
      this.indicators.set(key, newIndicators);
      
      const latest = newIndicators[newIndicators.length - 1];
      if (latest) {
        this.emit('indicators', latest);
      }
    }
  }

  private checkAlerts(): void {
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.triggered) continue;
      
      const currentTick = this.currentTicks.get(alert.symbol);
      if (!currentTick) continue;
      
      let triggered = false;
      
      switch (alert.type) {
        case 'price':
          triggered = this.checkPriceAlert(alert, currentTick.price);
          break;
        case 'volume':
          triggered = this.checkVolumeAlert(alert, currentTick.volume24h);
          break;
        case 'technical':
          triggered = this.checkTechnicalAlert(alert, alert.symbol);
          break;
        case 'volatility':
          triggered = this.checkVolatilityAlert(alert, currentTick);
          break;
      }
      
      if (triggered) {
        alert.triggered = true;
        alert.triggeredAt = new Date();
        alert.currentValue = currentTick.price;
        this.emit('alert', alert);
        logger.info(`Alert triggered: ${alert.id} - ${alert.condition}`);
      }
    }
  }

  private checkPriceAlert(alert: MarketAlert, currentPrice: number): boolean {
    const [operator, targetPrice] = alert.condition.split(' ');
    const target = parseFloat(targetPrice);
    
    switch (operator) {
      case '>':
        return currentPrice > target;
      case '<':
        return currentPrice < target;
      case '>=':
        return currentPrice >= target;
      case '<=':
        return currentPrice <= target;
      default:
        return false;
    }
  }

  private checkVolumeAlert(alert: MarketAlert, currentVolume: number): boolean {
    return currentVolume > alert.value;
  }

  private checkTechnicalAlert(alert: MarketAlert, symbol: string): boolean {
    const indicators = this.indicators.get(`${symbol}-1h`);
    if (!indicators || indicators.length === 0) return false;
    
    const latest = indicators[indicators.length - 1];
    
    // Simplified technical alert checking
    if (alert.condition.includes('RSI')) {
      return latest.rsi > 70 || latest.rsi < 30;
    }
    
    return false;
  }

  private checkVolatilityAlert(alert: MarketAlert, tick: MarketTick): boolean {
    return Math.abs(tick.change24hPercent) > alert.value;
  }

  private getTimeframeMs(timeframe: string): number {
    const unit = timeframe.slice(-1);
    const value = parseInt(timeframe.slice(0, -1));
    
    switch (unit) {
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 60 * 1000; // Default to 1 minute
    }
  }

  // Public API methods

  async getMarketData(
    symbol: string, 
    timeframe: string, 
    limit: number = 100
  ): Promise<MarketData[]> {
    const key = `${symbol}-${timeframe}`;
    const data = this.marketData.get(key) || [];
    return data.slice(-limit);
  }

  async getCurrentTick(symbol: string): Promise<MarketTick | null> {
    return this.currentTicks.get(symbol) || null;
  }

  async getAllTicks(): Promise<MarketTick[]> {
    return Array.from(this.currentTicks.values());
  }

  async getOrderBook(symbol: string): Promise<OrderBook | null> {
    return this.orderBooks.get(symbol) || null;
  }

  async getTechnicalIndicators(
    symbol: string, 
    timeframe: string, 
    limit: number = 100
  ): Promise<TechnicalIndicators[]> {
    const key = `${symbol}-${timeframe}`;
    const indicators = this.indicators.get(key) || [];
    return indicators.slice(-limit);
  }

  async getExchanges(): Promise<ExchangeConfig[]> {
    return Array.from(this.exchanges.values());
  }

  async getExchange(id: string): Promise<ExchangeConfig | null> {
    return this.exchanges.get(id) || null;
  }

  async getSupportedSymbols(exchangeId?: string): Promise<string[]> {
    if (exchangeId) {
      const exchange = this.exchanges.get(exchangeId);
      return exchange ? exchange.supportedPairs : [];
    }
    
    const allSymbols = new Set<string>();
    for (const exchange of this.exchanges.values()) {
      exchange.supportedPairs.forEach(symbol => allSymbols.add(symbol));
    }
    
    return Array.from(allSymbols);
  }

  async createAlert(alert: Omit<MarketAlert, 'id' | 'triggered' | 'createdAt'>): Promise<string> {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newAlert: MarketAlert = {
      ...alert,
      id,
      triggered: false,
      createdAt: new Date(),
    };
    
    this.alerts.set(id, newAlert);
    logger.info(`Created alert: ${id} - ${alert.condition}`);
    
    return id;
  }

  async getAlerts(activeOnly: boolean = false): Promise<MarketAlert[]> {
    const allAlerts = Array.from(this.alerts.values());
    return activeOnly ? allAlerts.filter(alert => !alert.triggered) : allAlerts;
  }

  async deleteAlert(id: string): Promise<boolean> {
    return this.alerts.delete(id);
  }

  async subscribe(symbols: string[], channels: string[] = ['tick']): Promise<void> {
    symbols.forEach(symbol => {
      channels.forEach(channel => {
        const subscription = `${symbol}:${channel}`;
        this.subscriptions.add(subscription);
      });
    });
    
    logger.info(`Subscribed to ${symbols.length} symbols, ${channels.length} channels`);
  }

  async unsubscribe(symbols: string[], channels: string[] = ['tick']): Promise<void> {
    symbols.forEach(symbol => {
      channels.forEach(channel => {
        const subscription = `${symbol}:${channel}`;
        this.subscriptions.delete(subscription);
      });
    });
    
    logger.info(`Unsubscribed from ${symbols.length} symbols, ${channels.length} channels`);
  }

  async getMarketSummary(): Promise<Record<string, any>> {
    const ticks = Array.from(this.currentTicks.values());
    
    return {
      totalSymbols: ticks.length,
      totalExchanges: this.exchanges.size,
      activeSubscriptions: this.subscriptions.size,
      connected: this.isConnected,
      topMovers: ticks
        .sort((a, b) => Math.abs(b.change24hPercent) - Math.abs(a.change24hPercent))
        .slice(0, 5)
        .map(tick => ({
          symbol: tick.symbol,
          price: tick.price,
          change24hPercent: tick.change24hPercent,
        })),
      marketCap: ticks.reduce((sum, tick) => sum + tick.price * tick.volume24h, 0),
      avgVolatility: ticks.reduce((sum, tick) => sum + Math.abs(tick.change24hPercent), 0) / ticks.length,
    };
  }

  getConnectionStatus(): { connected: boolean; subscriptions: number; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      subscriptions: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

export const tradingMarketDataService = new TradingMarketDataService();