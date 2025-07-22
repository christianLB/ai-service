import { prisma } from '../lib/prisma';
import { 
  Trade, 
  CreateTrade, 
  UpdateTrade,
  TradeQuery,
  TradeWithRelations
} from '../types/trade.types';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

const MODEL_NAME = Prisma.ModelName.trade;

export class TradeService {
  /**
   * Get all trades with pagination and filtering
   */
  async getAll(query: TradeQuery, userId?: string) {
    try {
      const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.tradeWhereInput = {
        ...(query.symbol && { symbol: { contains: query.symbol, mode: 'insensitive' } }),
        ...(query.status && { status: query.status }),
        ...(query.strategyId && { strategyId: query.strategyId }),
                ...(search && {
          OR: [
            { symbol: { contains: search, mode: 'insensitive' } },
            { orderId: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      // Execute queries in parallel
      const [items, total] = await Promise.all([
        prisma.trade.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
          },
        }),
        prisma.trade.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error in TradeService.getAll:', error);
      throw new AppError('Failed to fetch trades', 500);
    }
  }

  /**
   * Get a single trade by ID
   */
  async getById(id: string, userId?: string): Promise<TradeWithRelations | null> {
    try {
      const trade = await prisma.trade.findFirst({
        where: { 
          id,
        },
        include: {
        },
      });

      if (!trade) {
        throw new AppError('Trade not found', 404);
      }

      return trade;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in TradeService.getById:', error);
      throw new AppError('Failed to fetch trade', 500);
    }
  }

  /**
   * Create a new trade
   */
  async create(data: CreateTrade, userId?: string): Promise<Trade> {
    try {

      const trade = await prisma.trade.create({
        data: {
          ...data,
        },
      });

      logger.info(`Trade created: ${ trade.id }`);
      return trade;
    } catch (error) {
      logger.error('Error in TradeService.create:', error);
      if (error.code === 'P2002') {
        throw new AppError('Trade with this data already exists', 409);
      }
      throw new AppError('Failed to create trade', 500);
    }
  }

  /**
   * Update a trade
   */
  async update(id: string, data: UpdateTrade, userId?: string): Promise<Trade> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('Trade not found', 404);
      }

      const trade = await prisma.trade.update({
        where: { id },
        data: {
          ...data,
          id: undefined, // Remove id from data
        },
      });

      logger.info(`Trade updated: ${id}`);
      return trade;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in TradeService.update:', error);
      throw new AppError('Failed to update trade', 500);
    }
  }

  /**
   * Delete a trade
   */
  async delete(id: string, userId?: string): Promise<void> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('Trade not found', 404);
      }


      await prisma.trade.delete({
        where: { id },
      });

      logger.info(`Trade deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in TradeService.delete:', error);
      throw new AppError('Failed to delete trade', 500);
    }
  }



}

// Export singleton instance
export const tradeService = new TradeService();