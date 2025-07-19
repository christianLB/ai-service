import { BaseExchangeConnector, PositionInfo } from './base.connector';
import ccxt from 'ccxt';

export class CoinbaseConnector extends BaseExchangeConnector {
  constructor(userId?: string) {
    super('coinbase', userId);
  }

  protected async onConnect(): Promise<void> {
    // Coinbase-specific initialization
    if (this.exchange) {
      // Coinbase uses different API endpoints for different products
      this.exchange.options['fetchOHLCVWarning'] = false;
    }
  }

  async getPositions(symbol?: string): Promise<PositionInfo[]> {
    this.ensureConnected();
    
    // Coinbase spot trading doesn't have traditional positions
    // We return current holdings as "positions"
    try {
      const balance = await this.getBalance();
      const positions: PositionInfo[] = [];
      
      for (const [currency, balanceInfo] of Object.entries(balance)) {
        if (balanceInfo.total > 0 && currency !== 'USD' && currency !== 'USDT') {
          try {
            // Try to get current price
            const ticker = await this.getTicker(`${currency}/USD`);
            
            positions.push({
              symbol: `${currency}/USD`,
              side: 'long',
              amount: balanceInfo.total,
              entryPrice: 0, // Coinbase doesn't track entry price in spot
              markPrice: ticker.last || 0,
              unrealizedPnl: 0, // Would need to track purchase price
              realizedPnl: 0,
              marginType: 'cross',
              leverage: 1, // Spot trading has no leverage
            });
          } catch (error) {
            // Skip if we can't get ticker for this currency
            this.logger.debug(`Skipping ${currency} - no ticker available`);
          }
        }
      }
      
      return positions;
    } catch (error) {
      this.logger.error('Failed to fetch positions', error);
      return [];
    }
  }

  async setLeverage(symbol: string, leverage: number): Promise<any> {
    // Coinbase doesn't support leverage in spot trading
    throw new Error('Leverage trading is not supported on Coinbase spot market');
  }

  async setMarginMode(symbol: string, marginMode: 'cross' | 'isolated'): Promise<any> {
    // Coinbase doesn't support margin modes in spot trading
    throw new Error('Margin mode selection is not supported on Coinbase spot market');
  }

  // Coinbase-specific methods
  async getAccounts(): Promise<any> {
    this.ensureConnected();
    
    try {
      // Get all currency accounts
      const balance = await this.getBalance();
      const accounts = [];
      
      for (const [currency, info] of Object.entries(balance.info)) {
        if (typeof info === 'object' && info !== null) {
          accounts.push({
            id: (info as any).id || currency,
            currency,
            balance: (info as any).balance || balance[currency]?.total || 0,
            available: (info as any).available || balance[currency]?.free || 0,
            hold: (info as any).hold || balance[currency]?.used || 0,
          });
        }
      }
      
      return accounts;
    } catch (error) {
      this.logger.error('Failed to fetch accounts', error);
      throw error;
    }
  }

  async getPaymentMethods(): Promise<any> {
    this.ensureConnected();
    
    try {
      if (this.exchange!.has['fetchPaymentMethods']) {
        return await (this.exchange as any).fetchPaymentMethods();
      }
      
      throw new Error('Payment methods API not available');
    } catch (error) {
      this.logger.error('Failed to fetch payment methods', error);
      throw error;
    }
  }

  async createDepositAddress(currency: string): Promise<any> {
    this.ensureConnected();
    
    try {
      if (this.exchange!.has['createDepositAddress']) {
        return await this.exchange!.createDepositAddress(currency);
      }
      
      // Fallback to fetch existing address
      return await this.getDepositAddress(currency);
    } catch (error) {
      this.logger.error(`Failed to create deposit address for ${currency}`, error);
      throw error;
    }
  }

  async getFills(orderId?: string, productId?: string): Promise<any> {
    this.ensureConnected();
    
    try {
      // Get recent trades
      const trades = await this.getTrades(productId || 'BTC/USD');
      
      if (orderId) {
        return trades.filter(trade => trade.order === orderId);
      }
      
      return trades;
    } catch (error) {
      this.logger.error('Failed to fetch fills', error);
      throw error;
    }
  }

  async getHistoricRates(
    productId: string,
    granularity: number,
    start?: string,
    end?: string
  ): Promise<any> {
    this.ensureConnected();
    
    try {
      // Map granularity to timeframe
      const timeframeMap: { [key: number]: string } = {
        60: '1m',
        300: '5m',
        900: '15m',
        3600: '1h',
        21600: '6h',
        86400: '1d',
      };
      
      const timeframe = timeframeMap[granularity] || '1h';
      const since = start ? new Date(start).getTime() : undefined;
      const limit = 300; // Coinbase default
      
      return await this.getOHLCV(productId, timeframe, since, limit);
    } catch (error) {
      this.logger.error(`Failed to fetch historic rates for ${productId}`, error);
      throw error;
    }
  }

  async getProduct(productId: string): Promise<any> {
    this.ensureConnected();
    
    try {
      await this.loadMarkets();
      const market = this.exchange!.market(productId);
      
      return {
        id: market.id,
        symbol: market.symbol,
        base_currency: market.base,
        quote_currency: market.quote,
        base_min_size: market.limits.amount?.min,
        base_max_size: market.limits.amount?.max,
        quote_increment: market.precision.price,
        base_increment: market.precision.amount,
        display_name: market.symbol,
        status: market.active ? 'online' : 'offline',
        trading_disabled: !market.active,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch product ${productId}`, error);
      throw error;
    }
  }

  async getServerTime(): Promise<any> {
    this.ensureConnected();
    
    try {
      const time = await this.exchange!.fetchTime();
      return {
        iso: new Date(time).toISOString(),
        epoch: time / 1000,
      };
    } catch (error) {
      this.logger.error('Failed to fetch server time', error);
      throw error;
    }
  }
}