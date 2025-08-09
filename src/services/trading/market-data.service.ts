import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface MarketDataConfig {
  exchanges: string[];
  symbols: string[];
  updateInterval: number;
}

export class MarketDataService {
  constructor(private prisma: PrismaClient) {}

  async getLatestPrice(exchangeId: string, tradingPairId: string): Promise<number> {
    const data = await this.prisma.marketData.findFirst({
      where: { exchangeId, tradingPairId },
      orderBy: { timestamp: 'desc' },
    });
    return data ? Number(data.close) : 0;
  }

  async saveMarketData(data: any) {
    return this.prisma.marketData.create({
      data: {
        ...data,
        open: data.open || new Decimal(0),
        high: data.high || new Decimal(0),
        low: data.low || new Decimal(0),
        close: data.close || new Decimal(0),
        volume: data.volume || new Decimal(0),
        timeframe: data.timeframe || '1m',
      },
    });
  }

  async getMarketDataBatch(exchangeId: string, tradingPairIds: string[]) {
    return this.prisma.marketData.findMany({
      where: {
        exchangeId,
        tradingPairId: { in: tradingPairIds },
      },
      orderBy: { timestamp: 'desc' },
      distinct: ['tradingPairId'],
    });
  }
}

// Singleton instance for backward compatibility
const prisma = new PrismaClient();
export const marketDataService = new MarketDataService(prisma);