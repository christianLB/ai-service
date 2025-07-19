import * as ccxt from 'ccxt';
import type { Exchange, Order, Ticker, OrderBook, Balances, Market, OHLCV, Trade, Dictionary } from 'ccxt';
import { Logger } from '../../../utils/logger';
import { tradingConnectorService } from '../trading-connector.service';

export interface OrderParams {
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  stopPrice?: number;
  params?: any;
}

export interface PositionInfo {
  symbol: string;
  side: 'long' | 'short';
  amount: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  marginType: 'cross' | 'isolated';
  leverage: number;
}

export abstract class BaseExchangeConnector {
  protected logger: Logger;
  protected exchange?: Exchange;
  protected exchangeId: string;
  protected userId?: string;

  constructor(exchangeId: string, userId?: string) {
    this.exchangeId = exchangeId;
    this.userId = userId;
    this.logger = new Logger(`${exchangeId}Connector`);
  }

  async connect(): Promise<void> {
    try {
      const tradingExchange = await tradingConnectorService.initializeExchange(
        this.exchangeId,
        this.userId
      );
      this.exchange = tradingExchange.exchange;
      
      await this.onConnect();
      this.logger.info(`Connected to ${this.exchangeId}`);
    } catch (error) {
      this.logger.error(`Failed to connect to ${this.exchangeId}`, error);
      throw error;
    }
  }

  protected abstract onConnect(): Promise<void>;

  async disconnect(): Promise<void> {
    if (this.exchange && typeof this.exchange.close === 'function') {
      await this.exchange.close();
    }
    this.exchange = undefined;
    this.logger.info(`Disconnected from ${this.exchangeId}`);
  }

  protected ensureConnected(): void {
    if (!this.exchange) {
      throw new Error(`Not connected to ${this.exchangeId}`);
    }
  }

  async getBalance(): Promise<Balances> {
    this.ensureConnected();
    return await this.exchange!.fetchBalance();
  }

  async getTicker(symbol: string): Promise<Ticker> {
    this.ensureConnected();
    return await this.exchange!.fetchTicker(symbol);
  }

  async getOrderBook(symbol: string, limit?: number): Promise<OrderBook> {
    this.ensureConnected();
    return await this.exchange!.fetchOrderBook(symbol, limit);
  }

  async getOHLCV(
    symbol: string,
    timeframe: string = '1h',
    since?: number,
    limit?: number
  ): Promise<OHLCV[]> {
    this.ensureConnected();
    return await this.exchange!.fetchOHLCV(symbol, timeframe, since, limit);
  }

  async createOrder(params: OrderParams): Promise<Order> {
    this.ensureConnected();
    
    const { symbol, type, side, amount, price, stopPrice, params: extraParams } = params;

    // Handle different order types
    let orderParams = { ...extraParams };
    
    if (type === 'stop' || type === 'stop_limit') {
      orderParams.stopPrice = stopPrice;
    }

    return await this.exchange!.createOrder(
      symbol,
      type,
      side,
      amount,
      price,
      orderParams
    );
  }

  async cancelOrder(orderId: string, symbol: string): Promise<any> {
    this.ensureConnected();
    return await this.exchange!.cancelOrder(orderId, symbol);
  }

  async getOrder(orderId: string, symbol: string): Promise<Order> {
    this.ensureConnected();
    return await this.exchange!.fetchOrder(orderId, symbol);
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    this.ensureConnected();
    return await this.exchange!.fetchOpenOrders(symbol);
  }

  async getClosedOrders(symbol?: string, since?: number, limit?: number): Promise<Order[]> {
    this.ensureConnected();
    return await this.exchange!.fetchClosedOrders(symbol, since, limit);
  }

  async getTrades(symbol: string, since?: number, limit?: number): Promise<Trade[]> {
    this.ensureConnected();
    return await this.exchange!.fetchMyTrades(symbol, since, limit);
  }

  async getMarkets(): Promise<Dictionary<Market>> {
    this.ensureConnected();
    return this.exchange!.markets;
  }

  async loadMarkets(reload?: boolean): Promise<Dictionary<Market>> {
    this.ensureConnected();
    return await this.exchange!.loadMarkets(reload);
  }

  async getFees(): Promise<any> {
    this.ensureConnected();
    return this.exchange!.fees;
  }

  async getDepositAddress(currency: string): Promise<any> {
    this.ensureConnected();
    if (this.exchange!.has['fetchDepositAddress']) {
      return await this.exchange!.fetchDepositAddress(currency);
    }
    throw new Error(`${this.exchangeId} does not support fetchDepositAddress`);
  }

  async withdraw(
    currency: string,
    amount: number,
    address: string,
    tag?: string,
    params?: any
  ): Promise<any> {
    this.ensureConnected();
    if (this.exchange!.has['withdraw']) {
      return await this.exchange!.withdraw(currency, amount, address, tag, params);
    }
    throw new Error(`${this.exchangeId} does not support withdrawals`);
  }

  // Abstract methods for exchange-specific features
  abstract getPositions(symbol?: string): Promise<PositionInfo[]>;
  abstract setLeverage(symbol: string, leverage: number): Promise<any>;
  abstract setMarginMode(symbol: string, marginMode: 'cross' | 'isolated'): Promise<any>;
}