import { BaseExchangeConnector, PositionInfo } from './base.connector';
import * as ccxt from 'ccxt';
import type { OrderBook } from 'ccxt';

export class BinanceConnector extends BaseExchangeConnector {
  constructor(userId?: string) {
    super('binance', userId);
  }

  protected async onConnect(): Promise<void> {
    // Binance-specific initialization
    if (this.exchange) {
      // Set default options
      this.exchange.options['warnOnFetchOpenOrdersWithoutSymbol'] = false;
      this.exchange.options['recvWindow'] = 10000;
    }
  }

  async getPositions(symbol?: string): Promise<PositionInfo[]> {
    this.ensureConnected();
    
    // Note: Positions are only available for futures trading
    if (this.exchange!.options['defaultType'] !== 'future') {
      return [];
    }

    try {
      const positions = await this.exchange!.fetchPositions(symbol ? [symbol] : undefined);
      
      return positions.map((pos: any) => ({
        symbol: pos.symbol,
        side: pos.side as 'long' | 'short',
        amount: Math.abs(pos.contracts || 0),
        entryPrice: pos.entryPrice || 0,
        markPrice: pos.markPrice || 0,
        unrealizedPnl: pos.unrealizedPnl || 0,
        realizedPnl: pos.realizedPnl || 0,
        marginType: pos.marginType as 'cross' | 'isolated' || 'cross',
        leverage: pos.leverage || 1,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch positions', error);
      return [];
    }
  }

  async setLeverage(symbol: string, leverage: number): Promise<any> {
    this.ensureConnected();
    
    if (this.exchange!.options['defaultType'] !== 'future') {
      throw new Error('Leverage is only available for futures trading');
    }

    try {
      return await this.exchange!.setLeverage(leverage, symbol);
    } catch (error) {
      this.logger.error(`Failed to set leverage for ${symbol}`, error);
      throw error;
    }
  }

  async setMarginMode(symbol: string, marginMode: 'cross' | 'isolated'): Promise<any> {
    this.ensureConnected();
    
    if (this.exchange!.options['defaultType'] !== 'future') {
      throw new Error('Margin mode is only available for futures trading');
    }

    try {
      return await this.exchange!.setMarginMode(marginMode, symbol);
    } catch (error) {
      this.logger.error(`Failed to set margin mode for ${symbol}`, error);
      throw error;
    }
  }

  // Binance-specific methods
  async getAccountInfo(): Promise<any> {
    this.ensureConnected();
    
    try {
      if (this.exchange!.has['fetchAccountInfo']) {
        return await (this.exchange as any).fetchAccountInfo();
      }
      
      // Fallback to balance for spot trading
      return await this.getBalance();
    } catch (error) {
      this.logger.error('Failed to fetch account info', error);
      throw error;
    }
  }

  async getTradingFees(symbol?: string): Promise<any> {
    this.ensureConnected();
    
    try {
      if (this.exchange!.has['fetchTradingFees']) {
        return await this.exchange!.fetchTradingFees({ symbol });
      }
      
      // Return default fees
      return {
        trading: {
          maker: 0.001,
          taker: 0.001,
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch trading fees', error);
      throw error;
    }
  }

  async getFundingRate(symbol: string): Promise<any> {
    this.ensureConnected();
    
    if (this.exchange!.options['defaultType'] !== 'future') {
      throw new Error('Funding rate is only available for futures trading');
    }

    try {
      if (this.exchange!.has['fetchFundingRate']) {
        return await this.exchange!.fetchFundingRate(symbol);
      }
      throw new Error('Funding rate not supported');
    } catch (error) {
      this.logger.error(`Failed to fetch funding rate for ${symbol}`, error);
      throw error;
    }
  }

  async get24hrStats(symbol?: string): Promise<any> {
    this.ensureConnected();
    
    try {
      if (symbol) {
        return await this.exchange!.fetchTicker(symbol);
      }
      
      // Get all tickers
      return await this.exchange!.fetchTickers();
    } catch (error) {
      this.logger.error('Failed to fetch 24hr stats', error);
      throw error;
    }
  }

  async listenToOrderBook(
    symbol: string, 
    callback: (orderbook: OrderBook) => void
  ): Promise<void> {
    this.ensureConnected();
    
    // Note: This is a simplified implementation
    // For real-time updates, you would use WebSocket connections
    const pollInterval = 1000; // 1 second
    
    const poll = async () => {
      try {
        const orderbook = await this.getOrderBook(symbol);
        callback(orderbook);
      } catch (error) {
        this.logger.error(`Error polling orderbook for ${symbol}`, error);
      }
    };

    // Start polling
    setInterval(poll, pollInterval);
    
    // Initial call
    await poll();
  }

  async getSystemStatus(): Promise<any> {
    this.ensureConnected();
    
    try {
      if (this.exchange!.has['fetchStatus']) {
        return await this.exchange!.fetchStatus();
      }
      
      // Simple connectivity check
      await this.exchange!.fetchTime();
      return { status: 'online', timestamp: Date.now() };
    } catch (error: any) {
      return { status: 'offline', timestamp: Date.now(), error: error.message };
    }
  }
}