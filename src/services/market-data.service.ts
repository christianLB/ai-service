import { prisma } from '../lib/prisma';
import { 
  MarketData, 
  CreateMarketData, 
  UpdateMarketData,
  MarketDataQuery,
  MarketDataWithRelations
} from '../types/market-data.types';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

const MODEL_NAME = Prisma.ModelName.MarketData;
const TABLE_NAME = 'public.market_datas';

// Helper function to convert Decimal fields to numbers
function convertDecimals(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(convertDecimals);
  }
  if (typeof data !== 'object') return data;
  
  const result = { ...data };
  
  return result;
}

export class MarketDataService {
  /**
   * Get all marketdatas with pagination and filtering
   */
  async getAll(query: MarketDataQuery, userId?: string) {
    try {
      const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.MarketDataWhereInput = {
        ...(search && {
          OR: [
            { id: { contains: search, mode: 'insensitive' } },
            { exchangeId: { contains: search, mode: 'insensitive' } },
            { tradingPairId: { contains: search, mode: 'insensitive' } },
            { timeframe: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      // Execute queries in parallel
      const [items, total] = await Promise.all([
        prisma.marketData.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        prisma.marketData.count({ where }),
      ]);

      return {
        items: items.map(convertDecimals),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error in MarketDataService.getAll:', error);
      throw new AppError('Failed to fetch marketdatas', 500);
    }
  }

  /**
   * Get a single marketdata by ID
   */
  async getById(id: string, userId?: string): Promise<MarketDataWithRelations | null> {
    try {
      const marketData = await prisma.marketData.findFirst({
        where: { 
          id,
        },
      });

      if (!marketData) {
        throw new AppError('MarketData not found', 404);
      }

      return convertDecimals(marketData);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in MarketDataService.getById:', error);
      throw new AppError('Failed to fetch marketdata', 500);
    }
  }

  /**
   * Create a new marketdata
   */
  async create(data: CreateMarketData, userId?: string): Promise<MarketData> {
    try {

      const marketData = await prisma.marketData.create({
        data: {
          ...data,
        },
      });

      logger.info(`MarketData created: ${ marketData.id }`);
      return convertDecimals(marketData);
    } catch (error) {
      logger.error('Error in MarketDataService.create:', error);
      if ((error as any).code === 'P2002') {
        throw new AppError('MarketData with this data already exists', 409);
      }
      throw new AppError('Failed to create marketdata', 500);
    }
  }

  /**
   * Update a marketdata
   */
  async update(id: string, data: UpdateMarketData, userId?: string): Promise<MarketData> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('MarketData not found', 404);
      }

      const marketData = await prisma.marketData.update({
        where: { id },
        data: {
          ...data,
          id: undefined, // Remove id from data
        },
      });

      logger.info(`MarketData updated: ${id}`);
      return convertDecimals(marketData);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in MarketDataService.update:', error);
      throw new AppError('Failed to update marketdata', 500);
    }
  }

  /**
   * Delete a marketdata
   */
  async delete(id: string, userId?: string): Promise<void> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('MarketData not found', 404);
      }


      await prisma.marketData.delete({
        where: { id },
      });

      logger.info(`MarketData deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in MarketDataService.delete:', error);
      throw new AppError('Failed to delete marketdata', 500);
    }
  }



}

// Export singleton instance
export const marketDataService = new MarketDataService();