import { prisma } from '../lib/prisma';
import { 
  EntityTag, 
  CreateEntityTag, 
  UpdateEntityTag,
  EntityTagQuery,
  EntityTagWithRelations
} from '../types/entity-tag.types';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

const MODEL_NAME = Prisma.ModelName.EntityTag;
const TABLE_NAME = 'tagging.entity_tags';

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

export class EntityTagService {
  /**
   * Get all entitytags with pagination and filtering
   */
  async getAll(query: EntityTagQuery, userId?: string) {
    try {
      const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.EntityTagWhereInput = {
        ...(search && {
          OR: [
            { id: { contains: search, mode: 'insensitive' } },
            { entityType: { contains: search, mode: 'insensitive' } },
            { entityId: { contains: search, mode: 'insensitive' } },
            { method: { contains: search, mode: 'insensitive' } },
            { appliedBy: { contains: search, mode: 'insensitive' } },
            { aiProvider: { contains: search, mode: 'insensitive' } },
            { aiModel: { contains: search, mode: 'insensitive' } },
            { aiReasoning: { contains: search, mode: 'insensitive' } },
            { verifiedBy: { contains: search, mode: 'insensitive' } },
            { feedback: { contains: search, mode: 'insensitive' } },
            { sourceEntityType: { contains: search, mode: 'insensitive' } },
            { sourceEntityId: { contains: search, mode: 'insensitive' } },
            { relationshipType: { contains: search, mode: 'insensitive' } },
            { tagId: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      // Execute queries in parallel
      const [items, total] = await Promise.all([
        prisma.entityTag.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            universalTag: true,
          },
        }),
        prisma.entityTag.count({ where }),
      ]);

      return {
        items: items.map(convertDecimals),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error in EntityTagService.getAll:', error);
      throw new AppError('Failed to fetch entitytags', 500);
    }
  }

  /**
   * Get a single entitytag by ID
   */
  async getById(id: string, userId?: string): Promise<EntityTagWithRelations | null> {
    try {
      const entityTag = await prisma.entityTag.findFirst({
        where: { 
          id,
        },
        include: {
          universalTag: true,
        },
      });

      if (!entityTag) {
        throw new AppError('EntityTag not found', 404);
      }

      return convertDecimals(entityTag);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in EntityTagService.getById:', error);
      throw new AppError('Failed to fetch entitytag', 500);
    }
  }

  /**
   * Create a new entitytag
   */
  async create(data: CreateEntityTag, userId?: string): Promise<EntityTag> {
    try {

      const entityTag = await prisma.entityTag.create({
        data: {
          ...data,
        },
      });

      logger.info(`EntityTag created: ${ entityTag.id }`);
      return convertDecimals(entityTag);
    } catch (error) {
      logger.error('Error in EntityTagService.create:', error);
      if ((error as any).code === 'P2002') {
        throw new AppError('EntityTag with this data already exists', 409);
      }
      throw new AppError('Failed to create entitytag', 500);
    }
  }

  /**
   * Update a entitytag
   */
  async update(id: string, data: UpdateEntityTag, userId?: string): Promise<EntityTag> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('EntityTag not found', 404);
      }

      const entityTag = await prisma.entityTag.update({
        where: { id },
        data: {
          ...data,
          id: undefined, // Remove id from data
        },
      });

      logger.info(`EntityTag updated: ${id}`);
      return convertDecimals(entityTag);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in EntityTagService.update:', error);
      throw new AppError('Failed to update entitytag', 500);
    }
  }

  /**
   * Delete a entitytag
   */
  async delete(id: string, userId?: string): Promise<void> {
    try {
      // Check if exists and user has permission
      const existing = await this.getById(id, userId);
      if (!existing) {
        throw new AppError('EntityTag not found', 404);
      }


      await prisma.entityTag.delete({
        where: { id },
      });

      logger.info(`EntityTag deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in EntityTagService.delete:', error);
      throw new AppError('Failed to delete entitytag', 500);
    }
  }



}

// Export singleton instance
export const entityTagService = new EntityTagService();