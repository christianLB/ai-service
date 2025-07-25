import * as ccxt from 'ccxt';
import type { Exchange } from 'ccxt';
import { Logger } from '../../utils/logger';
import { integrationConfigService } from '../integrations/integration-config.service';
import { db } from '../database';
import { AlpacaConnector, AlpacaConfig } from './connectors/alpaca.connector';

const logger = new Logger('TradingConnectorService');

export interface ExchangeConfig {
  apiKey: string;
  secret: string;
  passphrase?: string;
  testnet?: boolean;
  enableRateLimit?: boolean;
}

export interface ExchangeConnector {
  exchangeId: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getBalance(): Promise<Balance[]>;
  getPositions(): Promise<Position[]>;
  createOrder(request: OrderRequest): Promise<OrderResponse>;
  cancelOrder(orderId: string, symbol?: string): Promise<void>;
  getOrder(orderId: string, symbol?: string): Promise<OrderResponse>;
  getOpenOrders(symbol?: string): Promise<OrderResponse[]>;
  getMarketData(symbol: string): Promise<MarketData>;
  subscribeToOrderbook(symbol: string, callback: (data: any) => void): Promise<void>;
  unsubscribeFromOrderbook(symbol: string): Promise<void>;
  subscribeToTrades(symbol: string, callback: (data: any) => void): Promise<void>;
  unsubscribeFromTrades(symbol: string): Promise<void>;
  getHistoricalData(symbol: string, timeframe: string, since?: number, limit?: number): Promise<any[]>;
  isConnected(): boolean;
  getName(): string;
  getSupportedSymbols(): string[];
  getMinOrderSize(symbol: string): number;
  getTradingFee(): number;
}

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

export interface Position {
  symbol: string;
  side: 'long' | 'short';
  contracts: number;
  notional: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPercent: number;
  margin: number;
  marginRatio: number;
  liquidationPrice: number;
  timestamp: Date;
}

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  amount: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
  reduceOnly?: boolean;
  postOnly?: boolean;
  clientOrderId?: string;
}

export interface OrderResponse {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  price?: number;
  stopPrice?: number;
  amount: number;
  filled: number;
  remaining: number;
  cost: number;
  fee?: number;
  timestamp: Date;
  exchange: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  volume?: number;
  timestamp: Date;
}

export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'open' | 'partial' | 'closed' | 'canceled' | 'rejected' | 'unknown';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'DAY';

export interface TradingExchange {
  id: string;
  name: string;
  exchange: Exchange | ExchangeConnector;
  connected: boolean;
  lastSync?: Date;
}

export class TradingConnectorService {
  private static instance: TradingConnectorService;
  private exchanges: Map<string, TradingExchange> = new Map();
  private configService = integrationConfigService;

  private constructor() {}

  static getInstance(): TradingConnectorService {
    if (!TradingConnectorService.instance) {
      TradingConnectorService.instance = new TradingConnectorService();
    }
    return TradingConnectorService.instance;
  }

  async initializeExchange(exchangeId: string, userId?: string): Promise<TradingExchange> {
    try {
      logger.info(`Initializing exchange: ${exchangeId}`, { userId });

      // Get exchange credentials from secure storage
      const config = await this.getExchangeConfig(exchangeId, userId);
      
      if (!config) {
        throw new Error(`No configuration found for exchange: ${exchangeId}`);
      }

      // Create exchange instance based on ID
      let exchange: Exchange | ExchangeConnector;
      
      switch (exchangeId.toLowerCase()) {
        case 'binance':
          exchange = new ccxt.binance({
            apiKey: config.apiKey,
            secret: config.secret,
            enableRateLimit: config.enableRateLimit ?? true,
            options: {
              defaultType: config.testnet ? 'future' : 'spot',
              testnet: config.testnet ?? false,
            }
          });
          break;
          
        case 'coinbase':
          exchange = new ccxt.coinbase({
            apiKey: config.apiKey,
            secret: config.secret,
            password: config.passphrase,
            enableRateLimit: config.enableRateLimit ?? true,
          });
          break;
          
        case 'kraken':
          exchange = new ccxt.kraken({
            apiKey: config.apiKey,
            secret: config.secret,
            enableRateLimit: config.enableRateLimit ?? true,
          });
          break;
          
        case 'alpaca':
          const alpacaConfig: AlpacaConfig = {
            apiKey: config.apiKey,
            apiSecret: config.secret,
            paper: config.testnet ?? true, // Default to paper trading for safety
          };
          exchange = new AlpacaConnector(alpacaConfig);
          break;
          
        default:
          throw new Error(`Unsupported exchange: ${exchangeId}`);
      }

      // Test connection
      if ('loadMarkets' in exchange) {
        // CCXT exchange
        await exchange.loadMarkets();
      } else {
        // Custom connector
        await exchange.connect();
      }
      
      const tradingExchange: TradingExchange = {
        id: exchangeId,
        name: 'getName' in exchange ? exchange.getName() : exchange.name || exchangeId,
        exchange,
        connected: true,
        lastSync: new Date(),
      };

      // Store in memory
      this.exchanges.set(`${exchangeId}:${userId || 'global'}`, tradingExchange);
      
      logger.info(`Exchange initialized successfully: ${exchangeId}`);
      return tradingExchange;
      
    } catch (error) {
      logger.error(`Failed to initialize exchange: ${exchangeId}`, error);
      throw error;
    }
  }

  async getExchangeConfig(exchangeId: string, userId?: string): Promise<ExchangeConfig | null> {
    try {
      const apiKey = await this.configService.getConfig({
        integrationType: `trading_${exchangeId}`,
        configKey: 'api_key',
        userId,
        decrypt: true,
      });

      const secret = await this.configService.getConfig({
        integrationType: `trading_${exchangeId}`,
        configKey: 'secret',
        userId,
        decrypt: true,
      });

      if (!apiKey || !secret) {
        return null;
      }

      const config: ExchangeConfig = {
        apiKey,
        secret,
        enableRateLimit: true,
      };

      // Optional passphrase for exchanges like Coinbase
      const passphrase = await this.configService.getConfig({
        integrationType: `trading_${exchangeId}`,
        configKey: 'passphrase',
        userId,
        decrypt: true,
      });
      
      if (passphrase) {
        config.passphrase = passphrase;
      }

      // Check if testnet mode
      const testnetConfig = await this.configService.getConfig({
        integrationType: `trading_${exchangeId}`,
        configKey: 'testnet',
        userId,
        decrypt: false,
      });
      
      if (testnetConfig === 'true') {
        config.testnet = true;
      }

      return config;
      
    } catch (error) {
      logger.error(`Failed to get config for exchange: ${exchangeId}`, error);
      return null;
    }
  }

  async saveExchangeConfig(
    exchangeId: string, 
    config: ExchangeConfig, 
    userId?: string
  ): Promise<void> {
    try {
      // Save API key
      await this.configService.setConfig({
        integrationType: `trading_${exchangeId}`,
        configKey: 'api_key',
        configValue: config.apiKey,
        userId,
        encrypt: true,
        description: `${exchangeId} API Key`,
      });

      // Save secret
      await this.configService.setConfig({
        integrationType: `trading_${exchangeId}`,
        configKey: 'secret',
        configValue: config.secret,
        userId,
        encrypt: true,
        description: `${exchangeId} Secret Key`,
      });

      // Save passphrase if provided
      if (config.passphrase) {
        await this.configService.setConfig({
          integrationType: `trading_${exchangeId}`,
          configKey: 'passphrase',
          configValue: config.passphrase,
          userId,
          encrypt: true,
          description: `${exchangeId} Passphrase`,
        });
      }

      // Save testnet flag
      if (config.testnet !== undefined) {
        await this.configService.setConfig({
          integrationType: `trading_${exchangeId}`,
          configKey: 'testnet',
          configValue: config.testnet.toString(),
          userId,
          encrypt: false,
          description: `${exchangeId} Testnet Mode`,
        });
      }

      logger.info(`Exchange config saved: ${exchangeId}`, { userId });
      
    } catch (error) {
      logger.error(`Failed to save exchange config: ${exchangeId}`, error);
      throw error;
    }
  }

  async getExchange(exchangeId: string, userId?: string): Promise<TradingExchange | null> {
    const key = `${exchangeId}:${userId || 'global'}`;
    const cached = this.exchanges.get(key);
    
    if (cached && cached.connected) {
      return cached;
    }

    // Try to initialize if not cached
    try {
      return await this.initializeExchange(exchangeId, userId);
    } catch (error) {
      logger.error(`Failed to get exchange: ${exchangeId}`, error);
      return null;
    }
  }

  async testConnection(exchangeId: string, userId?: string): Promise<boolean> {
    try {
      const exchange = await this.getExchange(exchangeId, userId);
      if (!exchange) {
        return false;
      }

      // Test by fetching ticker
      if ('fetchTicker' in exchange.exchange) {
        const ticker = await exchange.exchange.fetchTicker('BTC/USDT');
        return ticker !== null && ticker !== undefined;
      } else {
        // Custom connector - test connection
        return exchange.exchange.isConnected();
      }
      
    } catch (error) {
      logger.error(`Connection test failed for ${exchangeId}`, error);
      return false;
    }
  }

  async getBalance(exchangeId: string, userId?: string): Promise<any> {
    try {
      const exchange = await this.getExchange(exchangeId, userId);
      if (!exchange) {
        throw new Error(`Exchange not initialized: ${exchangeId}`);
      }

      if ('fetchBalance' in exchange.exchange) {
        // CCXT exchange
        const balance = await exchange.exchange.fetchBalance();
        return balance;
      } else {
        // Custom connector
        const balances = await exchange.exchange.getBalance();
        // Convert to CCXT format
        const result: any = { info: balances, free: {}, used: {}, total: {} };
        for (const balance of balances) {
          result.free[balance.asset] = balance.free;
          result.used[balance.asset] = balance.locked;
          result.total[balance.asset] = balance.total;
        }
        return result;
      }
      
    } catch (error) {
      logger.error(`Failed to fetch balance from ${exchangeId}`, error);
      throw error;
    }
  }

  async getMarkets(exchangeId: string, userId?: string): Promise<any> {
    try {
      const exchange = await this.getExchange(exchangeId, userId);
      if (!exchange) {
        throw new Error(`Exchange not initialized: ${exchangeId}`);
      }

      if ('markets' in exchange.exchange) {
        return exchange.exchange.markets;
      } else {
        // Custom connector - return supported symbols
        const symbols = exchange.exchange.getSupportedSymbols();
        const markets: any = {};
        for (const symbol of symbols) {
          markets[symbol] = {
            id: symbol,
            symbol: symbol,
            base: symbol.split('/')[0],
            quote: symbol.split('/')[1] || 'USD',
            active: true,
          };
        }
        return markets;
      }
      
    } catch (error) {
      logger.error(`Failed to fetch markets from ${exchangeId}`, error);
      throw error;
    }
  }

  async createOrder(
    exchangeId: string,
    symbol: string,
    type: 'market' | 'limit',
    side: 'buy' | 'sell',
    amount: number,
    price?: number,
    params?: any,
    userId?: string
  ): Promise<any> {
    try {
      const exchange = await this.getExchange(exchangeId, userId);
      if (!exchange) {
        throw new Error(`Exchange not initialized: ${exchangeId}`);
      }

      // Validate trading mode
      const tradingMode = await this.getTradingMode(userId);
      if (tradingMode === 'paper') {
        logger.warn('Paper trading mode - order not sent to exchange', {
          exchangeId,
          symbol,
          type,
          side,
          amount,
          price,
        });
        
        // Return simulated order
        return {
          id: `paper-${Date.now()}`,
          symbol,
          type,
          side,
          amount,
          price: price || 0,
          status: 'closed',
          timestamp: Date.now(),
          datetime: new Date().toISOString(),
          info: { paper_trading: true },
        };
      }

      // Create real order
      let order;
      
      if ('createOrder' in exchange.exchange && typeof exchange.exchange.createOrder === 'function') {
        // CCXT exchange
        const ccxtExchange = exchange.exchange as Exchange;
        order = await ccxtExchange.createOrder(
          symbol,
          type,
          side,
          amount,
          price,
          params
        );
      } else {
        // Custom connector
        const connector = exchange.exchange as ExchangeConnector;
        const orderRequest: OrderRequest = {
          symbol,
          side: side as OrderSide,
          type: type as OrderType,
          amount,
          price,
          timeInForce: params?.timeInForce || 'GTC',
        };
        
        const orderResponse = await connector.createOrder(orderRequest);
        
        // Convert to CCXT format
        order = {
          id: orderResponse.orderId,
          clientOrderId: orderResponse.clientOrderId,
          symbol: orderResponse.symbol,
          type: orderResponse.type,
          side: orderResponse.side,
          amount: orderResponse.amount,
          price: orderResponse.price,
          status: orderResponse.status,
          filled: orderResponse.filled,
          remaining: orderResponse.remaining,
          cost: orderResponse.cost,
          fee: orderResponse.fee ? { cost: orderResponse.fee } : undefined,
          timestamp: orderResponse.timestamp.getTime(),
          datetime: orderResponse.timestamp.toISOString(),
          info: {},
        };
      }

      // Log order in database
      await this.logOrder(exchangeId, order, userId);
      
      return order;
      
    } catch (error) {
      logger.error(`Failed to create order on ${exchangeId}`, error);
      throw error;
    }
  }

  async getTradingMode(userId?: string): Promise<string> {
    const mode = await db.pool.query(
      `SELECT config_value FROM trading.config 
       WHERE config_key = 'global.trading_mode' 
       AND (user_id = $1 OR user_id IS NULL)
       ORDER BY user_id DESC NULLS LAST LIMIT 1`,
      [userId]
    );
    
    return mode.rows[0]?.config_value?.replace(/"/g, '') || 'paper';
  }

  private async logOrder(exchangeId: string, order: any, userId?: string): Promise<void> {
    try {
      await db.pool.query(
        `INSERT INTO trading.trades (
          user_id, exchange, symbol, side, type, quantity, price, 
          fee, exchange_order_id, status, executed_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          userId,
          exchangeId,
          order.symbol,
          order.side,
          order.type,
          order.amount,
          order.price || order.average,
          order.fee?.cost || 0,
          order.id,
          order.status,
          new Date(order.timestamp),
          JSON.stringify(order.info || {}),
        ]
      );
    } catch (error) {
      logger.error('Failed to log order', error);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [key, exchange] of this.exchanges) {
      try {
        if ('close' in exchange.exchange && typeof exchange.exchange.close === 'function') {
          await exchange.exchange.close();
        } else if ('disconnect' in exchange.exchange) {
          await exchange.exchange.disconnect();
        }
        exchange.connected = false;
      } catch (error) {
        logger.error(`Failed to disconnect ${key}`, error);
      }
    }
    this.exchanges.clear();
  }
}

export const tradingConnectorService = TradingConnectorService.getInstance();