import { prisma } from '../lib/prisma';
import { 
  Position, 
  CreatePosition, 
  UpdatePosition,
  PositionQuery,
  PositionWithRelations
} from '../types/position.types';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

const MODEL_NAME = Prisma.ModelName.position;

export class PositionService {
  /**
   * Get all positions with pagination and filtering
   */
  async getAll(query: PositionQuery, userId?: string) {
    try {
      const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.positionWhereInput = {
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
                      ],
        }),
      };

      // Execute queries in parallel
      const [items, total] = await Promise.all([
        prisma.position.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
          },
        }),
        prisma.position.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error in PositionService.getAll:', error);
      throw new AppError('Failed to fetch positions', 500);
    }
  }

  /**
   * Get a single position by ID
   */
  async getById(id: string, userId?: string): Promise<PositionWithRelations | null> {
    try {
      const position = await prisma.position.findFirst({
        where: { 
          id,
        },
        include: {
        },
      });

      if (!position) {
        throw new AppError('Position not found', 404);
      }

      return position;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in PositionService.getById:', error);
      throw new AppError('Failed to fetch position', 500);
    }
  }

  /**
   * Create a new position
   */
  async create(data: CreatePosition, userId?: string): Promise<Position> {
    try {

      const position = await prisma.position.create({
        data: {
          ...data,
        },
      });

      logger.info(`Position created: ${ position.id }`);
      return position;
    } catch (error) {
      logger.error('Error in PositionService.create:', error);
      if (error.code === 'P2002') {
        throw new AppError('Position with this data already exists', 409);
      }
      throw new AppError('Failed to create position', 500);
    }
  }

  /**
   * Update a position
   */
  async update(id: string, data: UpdatePosition, userId?: string): Promise<Position> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('Position not found', 404);
      }

      const position = await prisma.position.update({
        where: { id },
        data: {
          ...data,
          id: undefined, // Remove id from data
        },
      });

      logger.info(`Position updated: ${id}`);
      return position;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in PositionService.update:', error);
      throw new AppError('Failed to update position', 500);
    }
  }

  /**
   * Delete a position
   */
  async delete(id: string, userId?: string): Promise<void> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('Position not found', 404);
      }


      await prisma.position.delete({
        where: { id },
      });

      logger.info(`Position deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in PositionService.delete:', error);
      throw new AppError('Failed to delete position', 500);
    }
  }



}

// Export singleton instance
export const positionService = new PositionService();