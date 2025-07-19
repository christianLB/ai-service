import ccxt from 'ccxt';
import { Logger } from '../../utils/logger';
import { integrationConfigService } from '../integrations/integration-config.service';
import { db } from '../database';

const logger = new Logger('TradingConnectorService');

export interface ExchangeConfig {
  apiKey: string;
  secret: string;
  passphrase?: string;
  testnet?: boolean;
  enableRateLimit?: boolean;
}

export interface TradingExchange {
  id: string;
  name: string;
  exchange: ccxt.Exchange;
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
      let exchange: ccxt.Exchange;
      
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
          
        default:
          throw new Error(`Unsupported exchange: ${exchangeId}`);
      }

      // Test connection
      await exchange.loadMarkets();
      
      const tradingExchange: TradingExchange = {
        id: exchangeId,
        name: exchange.name,
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
      const ticker = await exchange.exchange.fetchTicker('BTC/USDT');
      return ticker !== null && ticker !== undefined;
      
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

      const balance = await exchange.exchange.fetchBalance();
      return balance;
      
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

      return exchange.exchange.markets;
      
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
      const order = await exchange.exchange.createOrder(
        symbol,
        type,
        side,
        amount,
        price,
        params
      );

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
        if (exchange.exchange && typeof exchange.exchange.close === 'function') {
          await exchange.exchange.close();
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