import { injectable } from 'inversify';
import { prisma } from '../../lib/prisma';
import {
  Prisma,
  UniversalTag as PrismaUniversalTag,
  EntityTag as PrismaEntityTag,
} from '@prisma/client';
import {
  Tag,
  CreateTag,
  UpdateTag,
  TagQuery,
  TagSearch,
  DeleteTagOptions,
} from '../../types/tagging/tag.types';
import {
  TagResponse,
  TagListResponse,
  TagSearchResponse,
  TagWithPath,
} from '../../types/tagging/response.types';
import { ITagService } from './interfaces';
import {
  TagNotFoundError,
  DuplicateTagCodeError,
  InvalidTagHierarchyError,
  handleTaggingError,
} from './errors';
import logger from '../../utils/logger';

@injectable()
export class TagService implements ITagService {
  /**
   * Create a new tag
   */
  async createTag(data: CreateTag, userId: string): Promise<TagResponse> {
    try {
      // Check if tag code already exists
      const existing = await prisma.universalTag.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new DuplicateTagCodeError(data.code);
      }

      // Validate parent if provided
      if (data.parentId) {
        const parent = await prisma.universalTag.findUnique({
          where: { id: data.parentId },
        });

        if (!parent) {
          throw new InvalidTagHierarchyError('Parent tag not found', { parentId: data.parentId });
        }

        // Check if entity types are compatible
        const commonTypes = data.entityTypes.filter((type) => parent.entityTypes.includes(type));

        if (commonTypes.length === 0) {
          throw new InvalidTagHierarchyError(
            'Child tag must support at least one entity type from parent',
            { parentTypes: parent.entityTypes, childTypes: data.entityTypes }
          );
        }
      }

      // Calculate path and level based on parent
      let path = '/';
      let level = 0;

      if (data.parentId) {
        const parent = await prisma.universalTag.findUnique({
          where: { id: data.parentId },
        });

        if (parent) {
          path = parent.path === '/' ? `/${parent.code}` : `${parent.path}/${parent.code}`;
          level = parent.level + 1;
        }
      }

      // Create the tag
      const tagData: any = {
        code: data.code,
        name: data.name,
        description: data.description,
        entityTypes: data.entityTypes,
        patterns: data.patterns as any,
        rules: data.rules as any,
        metadata: data.metadata as any,
        confidence: data.confidence,
        embeddingModel: data.embeddingModel,
        color: data.color,
        icon: data.icon,
        isActive: data.isActive,
        isSystem: data.isSystem,
        path,
        level,
        usageCount: 0,
        successRate: 0.0,
      };

      if (data.parentId) {
        tagData.parentId = data.parentId;
      }

      const tag = await prisma.universalTag.create({
        data: tagData,
      });

      logger.info('Tag created', { tagId: tag.id, code: tag.code });

      return {
        success: true,
        data: tag as Tag,
      };
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Get a tag by ID
   */
  async getTag(tagId: string): Promise<TagResponse> {
    try {
      const tag = await prisma.universalTag.findUnique({
        where: { id: tagId },
        include: {
          parent: true,
          children: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
        },
      });

      if (!tag) {
        throw new TagNotFoundError(tagId);
      }

      return {
        success: true,
        data: tag as Tag,
      };
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Get tag by ID (alias for getTag)
   */
  async getTagById(tagId: string): Promise<TagResponse> {
    return this.getTag(tagId);
  }

  /**
   * Update a tag
   */
  async updateTag(tagId: string, data: UpdateTag, userId: string): Promise<TagResponse> {
    try {
      // Check if tag exists
      const existing = await prisma.universalTag.findUnique({
        where: { id: tagId },
      });

      if (!existing) {
        throw new TagNotFoundError(tagId);
      }

      // Validate parent change if provided
      if (data.parentId !== undefined) {
        if (data.parentId === tagId) {
          throw new InvalidTagHierarchyError('Tag cannot be its own parent');
        }

        if (data.parentId) {
          // Check for circular reference
          const wouldCreateCycle = await this.checkCircularReference(tagId, data.parentId);
          if (wouldCreateCycle) {
            throw new InvalidTagHierarchyError('This change would create a circular reference');
          }
        }
      }

      // Update the tag
      const { parentId, ...updateData } = data;
      const tag = await prisma.universalTag.update({
        where: { id: tagId },
        data: {
          ...updateData,
          entityTypes: data.entityTypes,
          patterns: data.patterns as any,
          metadata: data.metadata as any,
          rules: data.rules as any,
          ...(parentId !== undefined && { parentId }),
          updatedAt: new Date(),
        },
      });

      logger.info('Tag updated', { tagId });

      return {
        success: true,
        data: tag as Tag,
      };
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagId: string, options?: DeleteTagOptions, userId?: string): Promise<void> {
    try {
      const tag = await prisma.universalTag.findUnique({
        where: { id: tagId },
        include: {
          children: true,
          entityTags: { take: 1 },
        },
      });

      if (!tag) {
        throw new TagNotFoundError(tagId);
      }

      // Check if tag has children
      if (tag.children.length > 0) {
        throw new InvalidTagHierarchyError(
          'Cannot delete tag with children. Delete children first or reassign them.',
          { childCount: tag.children.length }
        );
      }

      // Handle entity reassignment if specified
      if (options?.reassignTo && tag.entityTags.length > 0) {
        const reassignTarget = await prisma.universalTag.findUnique({
          where: { id: options.reassignTo },
        });

        if (!reassignTarget) {
          throw new TagNotFoundError(options.reassignTo);
        }

        // Reassign all entity tags
        await prisma.entityTag.updateMany({
          where: { tagId },
          data: { tagId: options.reassignTo },
        });

        logger.info('Entity tags reassigned', {
          fromTagId: tagId,
          toTagId: options.reassignTo,
        });
      }

      // Delete the tag (cascade will handle entity tags if not reassigned)
      await prisma.universalTag.delete({
        where: { id: tagId },
      });

      logger.info('Tag deleted', { tagId });
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * List tags with filtering and pagination
   */
  async listTags(query: TagQuery): Promise<TagListResponse> {
    try {
      const where: Prisma.UniversalTagWhereInput = {
        ...(query.isActive !== undefined && { isActive: query.isActive }),
        ...(query.entityType && {
          entityTypes: { has: query.entityType },
        }),
        ...(query.parentId && { parentId: query.parentId }),
        ...(query.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { code: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }),
      };

      // Get total count
      const total = await prisma.universalTag.count({ where });

      // Get tags
      const tags = await prisma.universalTag.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          parent: {
            select: { id: true, code: true, name: true },
          },
          _count: {
            select: { entityTags: true },
          },
        },
      });

      // Map to include usage count
      const tagsWithUsage = tags.map((tag) => ({
        ...tag,
        usageCount: tag._count.entityTags,
        _count: undefined,
      }));

      return {
        success: true,
        data: tagsWithUsage as Tag[],
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          pages: Math.ceil(total / query.limit),
          hasNext: query.page * query.limit < total,
          hasPrev: query.page > 1,
        },
      };
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Search tags
   */
  async searchTags(search: TagSearch): Promise<TagSearchResponse> {
    try {
      const where: Prisma.UniversalTagWhereInput = {
        isActive: true,
        ...(search.entityType && {
          entityTypes: { has: search.entityType },
        }),
        OR: [
          { name: { contains: search.q, mode: 'insensitive' } },
          { code: { contains: search.q, mode: 'insensitive' } },
          { description: { contains: search.q, mode: 'insensitive' } },
        ],
      };

      const tags = await prisma.universalTag.findMany({
        where,
        take: search.limit,
        orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
        include: {
          parent: true,
        },
      });

      // Build paths and calculate scores
      const results = await Promise.all(
        tags.map(async (tag) => {
          const path = await this.getTagPath(tag.id);
          const score = this.calculateSearchScore(tag, search.q);

          return {
            ...tag,
            path: path.join(' > '),
            score,
          };
        })
      );

      // Sort by score
      results.sort((a, b) => b.score - a.score);

      return {
        success: true,
        data: results as TagWithPath[],
      };
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Get tag hierarchy
   */
  async getTagHierarchy(parentId?: string): Promise<Tag[]> {
    try {
      const tags = await prisma.universalTag.findMany({
        where: {
          parentId: parentId || null,
          isActive: true,
        },
        orderBy: { name: 'asc' },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
        },
      });

      // Recursively load children
      for (const tag of tags) {
        if (tag.children && tag.children.length > 0) {
          tag.children = await this.loadChildrenRecursively(tag.children);
        }
      }

      return tags as Tag[];
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Get tag path (breadcrumb)
   */
  async getTagPath(tagId: string): Promise<string[]> {
    try {
      const path: string[] = [];
      let currentId: string | null = tagId;

      while (currentId) {
        const tag: { name: string; parentId: string | null } | null =
          await prisma.universalTag.findUnique({
            where: { id: currentId },
            select: { name: true, parentId: true },
          });

        if (!tag) {
          break;
        }

        path.unshift(tag.name);
        currentId = tag.parentId;
      }

      return path;
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Bulk create tags
   */
  async bulkCreateTags(tags: CreateTag[], userId: string): Promise<Tag[]> {
    try {
      // Validate all tag codes are unique
      const codes = tags.map((t) => t.code);
      const uniqueCodes = new Set(codes);

      if (codes.length !== uniqueCodes.size) {
        throw new InvalidTagHierarchyError('Duplicate tag codes in batch');
      }

      // Check for existing codes
      const existing = await prisma.universalTag.findMany({
        where: { code: { in: codes } },
        select: { code: true },
      });

      if (existing.length > 0) {
        throw new DuplicateTagCodeError(existing[0].code);
      }

      // Create all tags
      const created = await prisma.$transaction(
        tags.map((tag) => {
          const tagData: any = {
            code: tag.code,
            name: tag.name,
            description: tag.description,
            entityTypes: tag.entityTypes,
            patterns: tag.patterns as any,
            rules: tag.rules as any,
            metadata: tag.metadata as any,
            confidence: tag.confidence,
            embeddingModel: tag.embeddingModel,
            color: tag.color,
            icon: tag.icon,
            isActive: tag.isActive,
            isSystem: tag.isSystem,
            path: '/', // TODO: Calculate based on parent
            level: 0, // TODO: Calculate based on parent
            usageCount: 0,
            successRate: 0.0,
          };

          if (tag.parentId) {
            tagData.parentId = tag.parentId;
          }

          return prisma.universalTag.create({
            data: tagData,
          });
        })
      );

      logger.info('Bulk tags created', { count: created.length });

      return created as Tag[];
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Bulk update tags
   */
  async bulkUpdateTags(
    updates: Array<{ id: string; data: UpdateTag }>,
    userId: string
  ): Promise<Tag[]> {
    try {
      const updated = await prisma.$transaction(
        updates.map(({ id, data }) => {
          const { parentId, ...updateData } = data;
          return prisma.universalTag.update({
            where: { id },
            data: {
              ...updateData,
              entityTypes: data.entityTypes,
              patterns: data.patterns as any,
              metadata: data.metadata as any,
              rules: data.rules as any,
              ...(parentId !== undefined && { parentId }),
              updatedAt: new Date(),
            },
          });
        })
      );

      logger.info('Bulk tags updated', { count: updated.length });

      return updated as Tag[];
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  // Private helper methods

  private async checkCircularReference(tagId: string, newParentId: string): Promise<boolean> {
    let currentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === tagId || visited.has(currentId)) {
        return true;
      }

      visited.add(currentId);

      const parent: { parentId: string | null } | null = await prisma.universalTag.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      currentId = parent?.parentId || null;
    }

    return false;
  }

  private async loadChildrenRecursively(children: any[]): Promise<any[]> {
    for (const child of children) {
      const grandchildren = await prisma.universalTag.findMany({
        where: {
          parentId: child.id,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });

      if (grandchildren.length > 0) {
        child.children = await this.loadChildrenRecursively(grandchildren);
      }
    }

    return children;
  }

  private calculateSearchScore(tag: any, query: string): number {
    const q = query.toLowerCase();
    let score = 0;

    // Exact match scores highest
    if (tag.code.toLowerCase() === q) {
      score += 100;
    }
    if (tag.name.toLowerCase() === q) {
      score += 90;
    }

    // Starts with query
    if (tag.code.toLowerCase().startsWith(q)) {
      score += 50;
    }
    if (tag.name.toLowerCase().startsWith(q)) {
      score += 45;
    }

    // Contains query
    if (tag.code.toLowerCase().includes(q)) {
      score += 20;
    }
    if (tag.name.toLowerCase().includes(q)) {
      score += 18;
    }
    if (tag.description?.toLowerCase().includes(q)) {
      score += 10;
    }

    // Usage count bonus (logarithmic)
    score += Math.log10(tag.usageCount + 1) * 5;

    return score;
  }
}
