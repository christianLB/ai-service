import Alpaca from '@alpacahq/alpaca-trade-api';
import { Logger } from '../../../utils/logger';
import { EventEmitter } from 'events';
import { 
  ExchangeConnector, 
  OrderRequest, 
  OrderResponse, 
  MarketData,
  Balance,
  Position,
  OrderType,
  OrderSide,
  OrderStatus,
  TimeInForce
} from '../trading-connector.service';

const logger = new Logger('AlpacaConnector');

export interface AlpacaConfig {
  apiKey: string;
  apiSecret: string;
  paper?: boolean; // Use paper trading environment
  baseUrl?: string;
  dataBaseUrl?: string;
}

export class AlpacaConnector extends EventEmitter implements ExchangeConnector {
  public readonly exchangeId = 'alpaca';
  private client: any; // Alpaca client
  private dataClient: any; // For market data
  private wsClient: any; // WebSocket client
  private connected: boolean = false;
  private config: AlpacaConfig;

  constructor(config: AlpacaConfig) {
    super();
    this.config = config;
    
    // Initialize Alpaca client
    this.client = new Alpaca({
      keyId: config.apiKey,
      secretKey: config.apiSecret,
      paper: config.paper !== false, // Default to paper trading
      usePolygon: false
    });
  }

  async connect(): Promise<void> {
    try {
      // Test connection by getting account info
      const account = await this.client.getAccount();
      logger.info('Connected to Alpaca', { 
        accountId: account.account_number,
        buyingPower: account.buying_power,
        paper: this.config.paper 
      });

      // Initialize WebSocket for real-time data
      await this.initializeWebSocket();
      
      this.connected = true;
      this.emit('connected');
    } catch (error: any) {
      logger.error('Failed to connect to Alpaca', error);
      throw new Error(`Failed to connect to Alpaca: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.wsClient) {
        this.wsClient.disconnect();
      }
      this.connected = false;
      this.emit('disconnected');
      logger.info('Disconnected from Alpaca');
    } catch (error) {
      logger.error('Error disconnecting from Alpaca', error);
    }
  }

  private async initializeWebSocket(): Promise<void> {
    try {
      // Initialize data stream
      const stream = this.client.data_stream_v2;
      
      stream.onConnect(() => {
        logger.info('Alpaca WebSocket connected');
      });

      stream.onError((err: any) => {
        logger.error('Alpaca WebSocket error', err);
        this.emit('error', err);
      });

      stream.onOrderUpdate((order: any) => {
        this.handleOrderUpdate(order);
      });

      stream.onTradeUpdate((trade: any) => {
        this.handleTradeUpdate(trade);
      });

      await stream.connect();
      
      // Subscribe to order updates
      stream.subscribeForOrderUpdates();
    } catch (error) {
      logger.error('Failed to initialize WebSocket', error);
    }
  }

  async getBalance(): Promise<Balance[]> {
    try {
      const account = await this.client.getAccount();
      const positions = await this.client.getPositions();

      const balances: Balance[] = [];

      // Add cash balance (USD)
      balances.push({
        asset: 'USD',
        free: parseFloat(account.cash),
        locked: parseFloat(account.cash) - parseFloat(account.buying_power),
        total: parseFloat(account.cash)
      });

      // Add positions as balances
      for (const position of positions) {
        balances.push({
          asset: position.symbol,
          free: parseFloat(position.qty),
          locked: 0,
          total: parseFloat(position.qty)
        });
      }

      return balances;
    } catch (error) {
      logger.error('Failed to get balance', error);
      throw error;
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      const alpacaPositions = await this.client.getPositions();
      
      return alpacaPositions.map((pos: any) => ({
        symbol: pos.symbol,
        side: parseFloat(pos.qty) > 0 ? 'long' : 'short',
        contracts: Math.abs(parseFloat(pos.qty)),
        notional: parseFloat(pos.market_value),
        entryPrice: parseFloat(pos.avg_entry_price),
        markPrice: parseFloat(pos.current_price || pos.avg_entry_price),
        pnl: parseFloat(pos.unrealized_pl),
        pnlPercent: (parseFloat(pos.unrealized_pl) / parseFloat(pos.cost_basis)) * 100,
        margin: 0, // Alpaca doesn't use margin for stocks
        marginRatio: 0,
        liquidationPrice: 0,
        timestamp: new Date()
      }));
    } catch (error) {
      logger.error('Failed to get positions', error);
      throw error;
    }
  }

  async createOrder(request: OrderRequest): Promise<OrderResponse> {
    try {
      const orderParams: any = {
        symbol: request.symbol.replace('/', ''), // Remove slash from symbol
        qty: request.amount,
        side: request.side,
        type: this.mapOrderType(request.type),
        time_in_force: this.mapTimeInForce(request.timeInForce || 'GTC')
      };

      // Add price for limit orders
      if (request.type === 'limit' && request.price) {
        orderParams.limit_price = request.price;
      }

      // Add stop price for stop orders
      if (request.type === 'stop' && request.stopPrice) {
        orderParams.stop_price = request.stopPrice;
      }

      const order = await this.client.createOrder(orderParams);

      return this.mapAlpacaOrder(order);
    } catch (error) {
      logger.error('Failed to create order', error);
      throw error;
    }
  }

  async cancelOrder(orderId: string, symbol?: string): Promise<void> {
    try {
      await this.client.cancelOrder(orderId);
      logger.info('Order cancelled', { orderId });
    } catch (error) {
      logger.error('Failed to cancel order', error);
      throw error;
    }
  }

  async getOrder(orderId: string, symbol?: string): Promise<OrderResponse> {
    try {
      const order = await this.client.getOrder(orderId);
      return this.mapAlpacaOrder(order);
    } catch (error) {
      logger.error('Failed to get order', error);
      throw error;
    }
  }

  async getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
    try {
      const params: any = { status: 'open' };
      if (symbol) {
        params.symbols = symbol.replace('/', '');
      }

      const orders = await this.client.getOrders(params);
      return orders.map((order: any) => this.mapAlpacaOrder(order));
    } catch (error) {
      logger.error('Failed to get open orders', error);
      throw error;
    }
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      const cleanSymbol = symbol.replace('/', '');
      
      // Get latest trade for price
      const latestTrade = await this.client.getLatestTrade(cleanSymbol);
      
      // Get quote for bid/ask
      const quote = await this.client.getLatestQuote(cleanSymbol);
      
      // Get daily bar for volume and change
      const bars = await this.client.getBarsV2(cleanSymbol, {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        timeframe: '1Day',
        limit: 1
      });

      const dailyBar = bars.bars?.[0];

      return {
        symbol: symbol,
        price: latestTrade.Price,
        bid: quote.BidPrice,
        ask: quote.AskPrice,
        volume: dailyBar?.Volume || 0,
        timestamp: new Date(latestTrade.Timestamp)
      };
    } catch (error) {
      logger.error('Failed to get market data', error);
      throw error;
    }
  }

  async subscribeToOrderbook(symbol: string, callback: (data: any) => void): Promise<void> {
    try {
      const cleanSymbol = symbol.replace('/', '');
      
      // Alpaca doesn't provide orderbook data in the same way as crypto exchanges
      // We'll subscribe to quotes instead
      const stream = this.client.data_stream_v2;
      
      stream.onQuote((quote: any) => {
        if (quote.Symbol === cleanSymbol) {
          callback({
            symbol: symbol,
            bids: [[quote.BidPrice, quote.BidSize]],
            asks: [[quote.AskPrice, quote.AskSize]],
            timestamp: new Date(quote.Timestamp)
          });
        }
      });

      await stream.subscribeForQuotes([cleanSymbol]);
      logger.info('Subscribed to quotes', { symbol });
    } catch (error) {
      logger.error('Failed to subscribe to orderbook', error);
      throw error;
    }
  }

  async unsubscribeFromOrderbook(symbol: string): Promise<void> {
    try {
      const cleanSymbol = symbol.replace('/', '');
      const stream = this.client.data_stream_v2;
      await stream.unsubscribeFromQuotes([cleanSymbol]);
      logger.info('Unsubscribed from quotes', { symbol });
    } catch (error) {
      logger.error('Failed to unsubscribe from orderbook', error);
    }
  }

  async subscribeToTrades(symbol: string, callback: (data: any) => void): Promise<void> {
    try {
      const cleanSymbol = symbol.replace('/', '');
      const stream = this.client.data_stream_v2;
      
      stream.onTrade((trade: any) => {
        if (trade.Symbol === cleanSymbol) {
          callback({
            symbol: symbol,
            price: trade.Price,
            amount: trade.Size,
            side: trade.Conditions?.includes('B') ? 'buy' : 'sell',
            timestamp: new Date(trade.Timestamp)
          });
        }
      });

      await stream.subscribeForTrades([cleanSymbol]);
      logger.info('Subscribed to trades', { symbol });
    } catch (error) {
      logger.error('Failed to subscribe to trades', error);
      throw error;
    }
  }

  async unsubscribeFromTrades(symbol: string): Promise<void> {
    try {
      const cleanSymbol = symbol.replace('/', '');
      const stream = this.client.data_stream_v2;
      await stream.unsubscribeFromTrades([cleanSymbol]);
      logger.info('Unsubscribed from trades', { symbol });
    } catch (error) {
      logger.error('Failed to unsubscribe from trades', error);
    }
  }

  async getHistoricalData(
    symbol: string,
    timeframe: string,
    since?: number,
    limit?: number
  ): Promise<any[]> {
    try {
      const cleanSymbol = symbol.replace('/', '');
      const params: any = {
        symbols: cleanSymbol,
        timeframe: this.mapTimeframe(timeframe),
        limit: limit || 1000
      };

      if (since) {
        params.start = new Date(since).toISOString();
      }

      const bars = await this.client.getBarsV2(cleanSymbol, params);
      
      return bars.bars.map((bar: any) => ({
        timestamp: new Date(bar.Timestamp).getTime(),
        open: bar.OpenPrice,
        high: bar.HighPrice,
        low: bar.LowPrice,
        close: bar.ClosePrice,
        volume: bar.Volume
      }));
    } catch (error) {
      logger.error('Failed to get historical data', error);
      throw error;
    }
  }

  private mapOrderType(type: OrderType): string {
    switch (type) {
      case 'market': return 'market';
      case 'limit': return 'limit';
      case 'stop': return 'stop';
      case 'stop_limit': return 'stop_limit';
      default: return 'market';
    }
  }

  private mapTimeInForce(tif: TimeInForce): string {
    switch (tif) {
      case 'GTC': return 'gtc';
      case 'IOC': return 'ioc';
      case 'FOK': return 'fok';
      case 'DAY': return 'day';
      default: return 'gtc';
    }
  }

  private mapTimeframe(timeframe: string): string {
    // Map common timeframes to Alpaca format
    const map: { [key: string]: string } = {
      '1m': '1Min',
      '5m': '5Min',
      '15m': '15Min',
      '30m': '30Min',
      '1h': '1Hour',
      '4h': '4Hour',
      '1d': '1Day',
      '1w': '1Week',
      '1M': '1Month'
    };
    return map[timeframe] || '1Day';
  }

  private mapAlpacaOrder(order: any): OrderResponse {
    return {
      orderId: order.id,
      clientOrderId: order.client_order_id,
      symbol: order.symbol,
      side: order.side as OrderSide,
      type: order.order_type as OrderType,
      status: this.mapOrderStatus(order.status),
      price: parseFloat(order.limit_price || '0'),
      stopPrice: parseFloat(order.stop_price || '0'),
      amount: parseFloat(order.qty),
      filled: parseFloat(order.filled_qty),
      remaining: parseFloat(order.qty) - parseFloat(order.filled_qty),
      cost: parseFloat(order.filled_avg_price || '0') * parseFloat(order.filled_qty),
      fee: 0, // Alpaca doesn't return fees in order object
      timestamp: new Date(order.created_at),
      exchange: 'alpaca'
    };
  }

  private mapOrderStatus(status: string): OrderStatus {
    switch (status) {
      case 'new':
      case 'accepted':
      case 'pending_new':
        return 'open';
      case 'partially_filled':
        return 'partial';
      case 'filled':
        return 'closed';
      case 'canceled':
      case 'pending_cancel':
        return 'canceled';
      case 'rejected':
      case 'expired':
        return 'rejected';
      default:
        return 'unknown';
    }
  }

  private handleOrderUpdate(order: any): void {
    const mappedOrder = this.mapAlpacaOrder(order);
    this.emit('orderUpdate', mappedOrder);
  }

  private handleTradeUpdate(trade: any): void {
    this.emit('tradeUpdate', {
      symbol: trade.symbol,
      price: parseFloat(trade.price),
      amount: parseFloat(trade.qty),
      side: trade.side,
      timestamp: new Date(trade.timestamp)
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  getName(): string {
    return 'Alpaca Markets';
  }

  getSupportedSymbols(): string[] {
    // Return some common symbols - in production, this should fetch from API
    return [
      'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA',
      'BTC/USD', 'ETH/USD', 'DOGE/USD'
    ];
  }

  getMinOrderSize(symbol: string): number {
    // Alpaca allows fractional shares for most stocks
    return symbol.includes('/USD') ? 0.0001 : 0.001;
  }

  getTradingFee(): number {
    // Alpaca has zero commission for stocks
    // Crypto has a small fee
    return 0.0025; // 0.25% for crypto, 0% for stocks
  }
}