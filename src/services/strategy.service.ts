import { prisma } from '../lib/prisma';
import { 
  Strategy, 
  CreateStrategy, 
  UpdateStrategy,
  StrategyQuery,
  StrategyWithRelations
} from '../types/strategy.types';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

const MODEL_NAME = Prisma.ModelName.strategy;

export class StrategyService {
  /**
   * Get all strategys with pagination and filtering
   */
  async getAll(query: StrategyQuery, userId?: string) {
    try {
      const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.strategyWhereInput = {
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
                      ],
        }),
      };

      // Execute queries in parallel
      const [items, total] = await Promise.all([
        prisma.strategy.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
          },
        }),
        prisma.strategy.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error in StrategyService.getAll:', error);
      throw new AppError('Failed to fetch strategys', 500);
    }
  }

  /**
   * Get a single strategy by ID
   */
  async getById(id: string, userId?: string): Promise<StrategyWithRelations | null> {
    try {
      const strategy = await prisma.strategy.findFirst({
        where: { 
          id,
        },
        include: {
        },
      });

      if (!strategy) {
        throw new AppError('Strategy not found', 404);
      }

      return strategy;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in StrategyService.getById:', error);
      throw new AppError('Failed to fetch strategy', 500);
    }
  }

  /**
   * Create a new strategy
   */
  async create(data: CreateStrategy, userId?: string): Promise<Strategy> {
    try {

      const strategy = await prisma.strategy.create({
        data: {
          ...data,
        },
      });

      logger.info(`Strategy created: ${ strategy.id }`);
      return strategy;
    } catch (error) {
      logger.error('Error in StrategyService.create:', error);
      if (error.code === 'P2002') {
        throw new AppError('Strategy with this data already exists', 409);
      }
      throw new AppError('Failed to create strategy', 500);
    }
  }

  /**
   * Update a strategy
   */
  async update(id: string, data: UpdateStrategy, userId?: string): Promise<Strategy> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('Strategy not found', 404);
      }

      const strategy = await prisma.strategy.update({
        where: { id },
        data: {
          ...data,
          id: undefined, // Remove id from data
        },
      });

      logger.info(`Strategy updated: ${id}`);
      return strategy;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in StrategyService.update:', error);
      throw new AppError('Failed to update strategy', 500);
    }
  }

  /**
   * Delete a strategy
   */
  async delete(id: string, userId?: string): Promise<void> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('Strategy not found', 404);
      }


      await prisma.strategy.delete({
        where: { id },
      });

      logger.info(`Strategy deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in StrategyService.delete:', error);
      throw new AppError('Failed to delete strategy', 500);
    }
  }



}

// Export singleton instance
export const strategyService = new StrategyService();