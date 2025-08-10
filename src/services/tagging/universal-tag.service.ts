import { prisma } from '../../lib/prisma';
import {
  UniversalTag,
  CreateUniversalTag,
  UpdateUniversalTag,
  UniversalTagQuery,
  UniversalTagWithRelations
} from '../../types/universal-tag.types';
import { Prisma } from '@prisma/client';
import { AppError } from '../../utils/errors';
import logger from '../../utils/logger';

const MODEL_NAME = Prisma.ModelName.UniversalTag;
const TABLE_NAME = 'tagging.universal_tags';

// Helper function to convert Decimal fields to numbers
function convertDecimals(data: any): any {
  if (!data) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(convertDecimals);
  }
  if (typeof data !== 'object') {
    return data;
  }

  const result = { ...data };

  return result;
}

export class UniversalTagService {
  /**
   * Get all universaltags with pagination and filtering
   */
  async getAll(query: UniversalTagQuery, userId?: string) {
    try {
      const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.UniversalTagWhereInput = {
        ...(search && {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            // entityTypes is a string[] list -> use `has`
            { entityTypes: { has: search } },
            { embeddingModel: { contains: search, mode: 'insensitive' } },
            { path: { contains: search, mode: 'insensitive' } },
            { color: { contains: search, mode: 'insensitive' } },
            { icon: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      // Execute queries in parallel
      const [items, total] = await Promise.all([
        prisma.universalTag.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            parent: true,
            children: true,
          },
        }),
        prisma.universalTag.count({ where }),
      ]);

      return {
        items: items.map(convertDecimals),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error in UniversalTagService.getAll:', error);
      throw new AppError('Failed to fetch universaltags', 500);
    }
  }

  /**
   * Get a single universaltag by ID
   */
  async getById(id: string, userId?: string): Promise<UniversalTagWithRelations | null> {
    try {
      const universalTag = await prisma.universalTag.findFirst({
        where: {
          id,
        },
        include: {
          parent: true,
          children: true,
        },
      });

      if (!universalTag) {
        throw new AppError('UniversalTag not found', 404);
      }

      return convertDecimals(universalTag);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error in UniversalTagService.getById:', error);
      throw new AppError('Failed to fetch universaltag', 500);
    }
  }

  /**
   * Create a new universaltag
   */
  async create(data: CreateUniversalTag, userId?: string): Promise<UniversalTag> {
    try {

      const universalTag = await prisma.universalTag.create({
        data: {
          ...data,
        },
      });

      logger.info(`UniversalTag created: ${ universalTag.id }`);
      return convertDecimals(universalTag);
    } catch (error) {
      logger.error('Error in UniversalTagService.create:', error);
      if ((error as any).code === 'P2002') {
        throw new AppError('UniversalTag with this data already exists', 409);
      }
      throw new AppError('Failed to create universaltag', 500);
    }
  }

  /**
   * Update a universaltag
   */
  async update(id: string, data: UpdateUniversalTag, userId?: string): Promise<UniversalTag> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('UniversalTag not found', 404);
      }

      const universalTag = await prisma.universalTag.update({
        where: { id },
        data: {
          ...data,
          id: undefined, // Remove id from data
        },
      });

      logger.info(`UniversalTag updated: ${id}`);
      return convertDecimals(universalTag);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error in UniversalTagService.update:', error);
      throw new AppError('Failed to update universaltag', 500);
    }
  }

  /**
   * Delete a universaltag
   */
  async delete(id: string, userId?: string): Promise<void> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('UniversalTag not found', 404);
      }


      await prisma.universalTag.delete({
        where: { id },
      });

      logger.info(`UniversalTag deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error in UniversalTagService.delete:', error);
      throw new AppError('Failed to delete universaltag', 500);
    }
  }



}

// Export singleton instance
export const universalTagService = new UniversalTagService();