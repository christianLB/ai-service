import { PrismaClient, Prisma } from '@prisma/client';
import { InfluxDB, Point, QueryApi, WriteApi } from '@influxdata/influxdb-client';
import { Logger } from '../../utils/logger';
import { BinanceConnector, CoinbaseConnector } from './connectors';
import * as ccxt from 'ccxt';
import type { Ticker } from 'ccxt';
import * as cron from 'node-cron';

const logger = new Logger('MarketDataService');

export interface MarketDataConfig {
  influxUrl: string;
  influxToken: string;
  influxOrg: string;
  influxBucket: string;
}

export interface MarketSnapshot {
  exchange: string;
  symbol: string;
  timestamp: Date;
  price: number;
  bid: number;
  ask: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  change24h: number;
  changePercent24h: number;
}

export interface OHLCVData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class MarketDataService {
  private static instance: MarketDataService;
  private prisma: PrismaClient;
  private influxDB?: InfluxDB;
  private writeApi?: WriteApi;
  private queryApi?: QueryApi;
  private connectors: Map<string, BinanceConnector | CoinbaseConnector> = new Map();
  private subscriptions: Map<string, cron.ScheduledTask> = new Map();
  private config?: MarketDataConfig;

  private constructor() {
    this.prisma = new PrismaClient();
  }

  static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  async initialize(config: MarketDataConfig): Promise<void> {
    try {
      this.config = config;
      
      // Initialize InfluxDB connection for time-series data
      this.influxDB = new InfluxDB({
        url: config.influxUrl,
        token: config.influxToken,
      });

      this.writeApi = this.influxDB.getWriteApi(config.influxOrg, config.influxBucket, 'ns');
      this.queryApi = this.influxDB.getQueryApi(config.influxOrg);

      // Test connection
      await this.testInfluxConnection();
      
      logger.info('MarketDataPrismaService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MarketDataPrismaService', error);
      throw error;
    }
  }

  private async testInfluxConnection(): Promise<void> {
    try {
      const query = `from(bucket: "${this.config!.influxBucket}")
        |> range(start: -1m)
        |> limit(n: 1)`;
      
      await this.queryApi!.collectRows(query);
      logger.info('InfluxDB connection test successful');
    } catch (error: any) {
      // It's okay if there's no data yet
      if (error.message?.includes('no data')) {
        logger.info('InfluxDB connected (no data yet)');
      } else {
        throw error;
      }
    }
  }

  async startDataCollection(
    exchange: string,
    symbols: string[],
    interval: string = '1m',
    userId?: string
  ): Promise<void> {
    try {
      // Get or create exchange record
      const exchangeRecord = await this.prisma.exchange.findUnique({
        where: { name: exchange }
      });

      if (!exchangeRecord || !exchangeRecord.isActive) {
        throw new Error(`Exchange ${exchange} not configured or inactive`);
      }

      // Initialize exchange connector
      let connector: BinanceConnector | CoinbaseConnector;
      
      switch (exchange.toLowerCase()) {
        case 'binance':
          connector = new BinanceConnector(userId);
          break;
        case 'coinbase':
          connector = new CoinbaseConnector(userId);
          break;
        default:
          throw new Error(`Unsupported exchange: ${exchange}`);
      }

      await connector.connect();
      this.connectors.set(`${exchange}:${userId || 'global'}`, connector);

      // Verify trading pairs exist
      const tradingPairs = await this.prisma.tradingPair.findMany({
        where: {
          exchangeId: exchangeRecord.id,
          symbol: { in: symbols },
          isActive: true
        }
      });

      if (tradingPairs.length !== symbols.length) {
        const missingSymbols = symbols.filter(s => 
          !tradingPairs.find(tp => tp.symbol === s)
        );
        logger.warn(`Missing trading pairs: ${missingSymbols.join(', ')}`);
      }

      // Convert interval to cron expression
      const cronExpression = this.intervalToCron(interval);
      
      // Create scheduled task for data collection
      const task = cron.schedule(cronExpression, async () => {
        await this.collectMarketData(exchangeRecord.id, exchange, symbols, connector);
      });

      task.start();
      this.subscriptions.set(`${exchange}:${symbols.join(',')}`, task);
      
      // Collect initial data
      await this.collectMarketData(exchangeRecord.id, exchange, symbols, connector);
      
      logger.info(`Started data collection for ${exchange} - ${symbols.join(', ')}`);
    } catch (error) {
      logger.error('Failed to start data collection', error);
      throw error;
    }
  }

  private intervalToCron(interval: string): string {
    const intervals: { [key: string]: string } = {
      '1m': '* * * * *',
      '5m': '*/5 * * * *',
      '15m': '*/15 * * * *',
      '30m': '*/30 * * * *',
      '1h': '0 * * * *',
      '4h': '0 */4 * * *',
      '1d': '0 0 * * *',
    };
    
    return intervals[interval] || '* * * * *';
  }

  private async collectMarketData(
    exchangeId: string,
    exchangeName: string,
    symbols: string[],
    connector: BinanceConnector | CoinbaseConnector
  ): Promise<void> {
    const marketDataBatch = [];

    for (const symbol of symbols) {
      try {
        // Fetch ticker data
        const ticker = await connector.getTicker(symbol);
        
        // Get trading pair
        const tradingPair = await this.prisma.tradingPair.findFirst({
          where: {
            exchangeId,
            symbol,
            isActive: true
          }
        });

        if (!tradingPair) {
          logger.warn(`Trading pair ${symbol} not found for exchange ${exchangeName}`);
          continue;
        }

        const marketData = {
          exchangeId,
          tradingPairId: tradingPair.id,
          price: new Prisma.Decimal(ticker.last || 0),
          volume: new Prisma.Decimal(ticker.baseVolume || 0),
          high24h: ticker.high ? new Prisma.Decimal(ticker.high) : null,
          low24h: ticker.low ? new Prisma.Decimal(ticker.low) : null,
          change24h: ticker.change ? new Prisma.Decimal(ticker.change) : null,
          changePercent24h: ticker.percentage ? new Prisma.Decimal(ticker.percentage) : null,
          bidPrice: ticker.bid ? new Prisma.Decimal(ticker.bid) : null,
          askPrice: ticker.ask ? new Prisma.Decimal(ticker.ask) : null,
          bidQuantity: null, // TODO: Get from order book
          askQuantity: null, // TODO: Get from order book
          timestamp: new Date(ticker.timestamp || Date.now())
        };

        marketDataBatch.push(marketData);

        // Store in InfluxDB for time-series analysis
        await this.storeMarketSnapshot({
          exchange: exchangeName,
          symbol,
          timestamp: marketData.timestamp,
          price: Number(marketData.price),
          bid: Number(marketData.bidPrice || 0),
          ask: Number(marketData.askPrice || 0),
          volume24h: Number(marketData.volume),
          high24h: Number(marketData.high24h || 0),
          low24h: Number(marketData.low24h || 0),
          change24h: Number(marketData.change24h || 0),
          changePercent24h: Number(marketData.changePercent24h || 0),
        });
        
      } catch (error) {
        logger.error(`Failed to collect data for ${symbol} on ${exchangeName}`, error);
      }
    }

    // Batch insert market data
    if (marketDataBatch.length > 0) {
      try {
        await this.prisma.marketData.createMany({
          data: marketDataBatch,
          skipDuplicates: true
        });
        logger.debug(`Stored ${marketDataBatch.length} market data points`);
      } catch (error) {
        logger.error('Failed to batch insert market data', error);
      }
    }
  }

  private async storeMarketSnapshot(snapshot: MarketSnapshot): Promise<void> {
    if (!this.writeApi) {
      throw new Error('InfluxDB not initialized');
    }

    const point = new Point('market_data')
      .tag('exchange', snapshot.exchange)
      .tag('symbol', snapshot.symbol)
      .floatField('price', snapshot.price)
      .floatField('bid', snapshot.bid)
      .floatField('ask', snapshot.ask)
      .floatField('volume_24h', snapshot.volume24h)
      .floatField('high_24h', snapshot.high24h)
      .floatField('low_24h', snapshot.low24h)
      .floatField('change_24h', snapshot.change24h)
      .floatField('change_percent_24h', snapshot.changePercent24h)
      .timestamp(snapshot.timestamp);

    this.writeApi.writePoint(point);
    await this.writeApi.flush();
  }

  async getOHLCV(
    exchange: string,
    symbol: string,
    timeframe: string,
    since?: Date,
    limit?: number,
    userId?: string
  ): Promise<OHLCVData[]> {
    try {
      const connectorKey = `${exchange}:${userId || 'global'}`;
      const connector = this.connectors.get(connectorKey);
      
      if (!connector) {
        throw new Error(`No connector found for ${exchange}`);
      }

      const sinceTimestamp = since ? since.getTime() : undefined;
      const ohlcv = await connector.getOHLCV(symbol, timeframe, sinceTimestamp, limit);
      
      return ohlcv.map(candle => ({
        timestamp: new Date(candle[0] || 0),
        open: Number(candle[1]) || 0,
        high: Number(candle[2]) || 0,
        low: Number(candle[3]) || 0,
        close: Number(candle[4]) || 0,
        volume: Number(candle[5]) || 0,
      }));
    } catch (error) {
      logger.error(`Failed to get OHLCV for ${symbol} on ${exchange}`, error);
      throw error;
    }
  }

  async getLatestPrice(exchange: string, symbol: string): Promise<number> {
    try {
      // First try to get from Prisma cache
      const latestData = await this.prisma.marketData.findFirst({
        where: {
          exchange: { name: exchange },
          tradingPair: { symbol }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      if (latestData) {
        return Number(latestData.price);
      }

      // If not in cache, fetch from exchange
      const connector = Array.from(this.connectors.values()).find(c => 
        c.constructor.name.toLowerCase().includes(exchange.toLowerCase())
      );

      if (connector) {
        const ticker = await connector.getTicker(symbol);
        return ticker.last || 0;
      }

      throw new Error(`No price data available for ${symbol} on ${exchange}`);
    } catch (error) {
      logger.error(`Failed to get latest price for ${symbol} on ${exchange}`, error);
      throw error;
    }
  }

  async getMarketStats(
    exchange: string,
    symbol: string,
    period: string = '24h'
  ): Promise<any> {
    if (!this.queryApi) {
      throw new Error('InfluxDB not initialized');
    }

    try {
      const query = `
        from(bucket: "${this.config!.influxBucket}")
        |> range(start: -${period})
        |> filter(fn: (r) => r["exchange"] == "${exchange}" and r["symbol"] == "${symbol}")
        |> filter(fn: (r) => r["_field"] == "price")
        |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
        |> yield(name: "hourly_avg")
      `;

      const data = await this.queryApi.collectRows(query);
      
      // Calculate statistics
      const prices = data.map((row: any) => row._value);
      const stats: any = {
        exchange,
        symbol,
        period,
        avg: prices.reduce((a, b) => a + b, 0) / prices.length,
        min: Math.min(...prices),
        max: Math.max(...prices),
        count: prices.length,
        lastUpdate: new Date(),
      };

      // Also get recent data from Prisma for additional stats
      const recentData = await this.prisma.marketData.findMany({
        where: {
          exchange: { name: exchange },
          tradingPair: { symbol },
          timestamp: {
            gte: new Date(Date.now() - this.parsePeriod(period))
          }
        },
        orderBy: { timestamp: 'desc' }
      });

      if (recentData.length > 0) {
        const volumes = recentData.map(d => Number(d.volume));
        stats.totalVolume = volumes.reduce((a, b) => a + b, 0);
        stats.avgVolume = stats.totalVolume / volumes.length;
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get market stats', error);
      throw error;
    }
  }

  private parsePeriod(period: string): number {
    const units: { [key: string]: number } = {
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000,
      'm': 30 * 24 * 60 * 60 * 1000,
    };

    const match = period.match(/^(\d+)([hdwm])$/);
    if (!match) {
      return 24 * 60 * 60 * 1000; // Default to 24h
    }

    const value = parseInt(match[1]);
    const unit = match[2];
    return value * (units[unit] || units['h']);
  }

  async stopDataCollection(exchange: string, symbols: string[]): Promise<void> {
    const key = `${exchange}:${symbols.join(',')}`;
    const task = this.subscriptions.get(key);
    
    if (task) {
      task.stop();
      this.subscriptions.delete(key);
      logger.info(`Stopped data collection for ${key}`);
    }
  }

  async stopAllDataCollection(): Promise<void> {
    for (const [key, task] of this.subscriptions) {
      task.stop();
      logger.info(`Stopped data collection for ${key}`);
    }
    this.subscriptions.clear();

    // Disconnect all connectors
    for (const [key, connector] of this.connectors) {
      await connector.disconnect();
    }
    this.connectors.clear();
  }

  async cleanup(): Promise<void> {
    await this.stopAllDataCollection();
    
    if (this.writeApi) {
      await this.writeApi.close();
    }

    await this.prisma.$disconnect();
  }

  /**
   * Get market data history for a specific period
   */
  async getMarketDataHistory(
    exchangeName: string,
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      const data = await this.prisma.marketData.findMany({
        where: {
          exchange: { name: exchangeName },
          tradingPair: { symbol },
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { timestamp: 'asc' },
        include: {
          tradingPair: {
            select: {
              symbol: true,
              baseAsset: true,
              quoteAsset: true
            }
          }
        }
      });

      return data;
    } catch (error) {
      logger.error('Failed to get market data history', error);
      throw error;
    }
  }

  /**
   * Clean up old market data
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.prisma.marketData.deleteMany({
        where: {
          timestamp: { lt: cutoffDate }
        }
      });

      logger.info(`Cleaned up ${result.count} old market data records`);
    } catch (error) {
      logger.error('Failed to cleanup old market data', error);
      throw error;
    }
  }
}

export const marketDataService = MarketDataService.getInstance();