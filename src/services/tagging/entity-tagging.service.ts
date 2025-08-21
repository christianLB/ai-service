import { injectable, inject } from 'inversify';
import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { TAGGING_SERVICE_IDENTIFIERS } from './identifiers';
import {
  EntityType,
  TagEntityRequest,
  BatchTagRequest,
  ReTagRequest,
  UpdateEntityTag,
  TagMethod,
} from '../../types/tagging/tag.types';
import {
  EntityTagResponse,
  EntityTagsResponse,
  TagEntityResponse,
  BatchTagResponse,
  ReTagResponse,
  FindEntitiesByTagResponse,
  RelationshipsResponse,
  BatchTagResult,
} from '../../types/tagging/response.types';
import { IEntityTaggingService, IAITaggingService, IPatternMatchingService } from './interfaces';
import { EntityNotFoundError, TagNotFoundError, handleTaggingError } from './errors';
import logger from '../../utils/logger';

@injectable()
export class EntityTaggingService implements IEntityTaggingService {
  constructor(
    @inject(TAGGING_SERVICE_IDENTIFIERS.AITaggingService)
    private aiTaggingService: IAITaggingService,
    @inject(TAGGING_SERVICE_IDENTIFIERS.PatternMatchingService)
    private patternMatchingService: IPatternMatchingService
  ) {}

  /**
   * Tag a single entity
   */
  async tagEntity(
    entityType: EntityType,
    entityId: string,
    request: TagEntityRequest,
    userId: string
  ): Promise<TagEntityResponse> {
    const startTime = Date.now();

    try {
      // Verify entity exists
      const entity = await this.getEntity(entityType, entityId);
      if (!entity) {
        throw new EntityNotFoundError(entityType, entityId);
      }

      // Get entity content for analysis
      const content = this.extractEntityContent(entity, entityType);
      const metadata = this.extractEntityMetadata(entity, entityType);

      // Remove existing tags if force re-tag is enabled
      if (request.options?.forceReTag) {
        await prisma.entityTag.deleteMany({
          where: { entityType, entityId },
        });
      }

      // Get tag suggestions based on method
      const suggestedTags: Array<{ tagId: string; confidence: number; method: TagMethod }> = [];

      if (request.method === 'ai' || request.method === 'auto') {
        // Use AI for tagging
        const aiSuggestions = await this.aiTaggingService.suggestTags(
          content,
          entityType,
          metadata,
          {
            provider: request.options?.aiProvider,
            maxTags: request.options?.maxTags,
            confidenceThreshold: request.options?.confidenceThreshold,
          }
        );

        suggestedTags.push(
          ...aiSuggestions.map((s) => ({
            ...s,
            method: 'AI' as TagMethod,
          }))
        );
      }

      if (request.method === 'pattern' || request.method === 'auto') {
        // Use pattern matching
        const patternMatches = await this.patternMatchingService.matchPatterns(
          content,
          entityType,
          metadata
        );

        // Filter by confidence threshold
        const threshold = request.options?.confidenceThreshold || 0.7;
        const filtered = patternMatches.filter((m) => m.confidence >= threshold);

        suggestedTags.push(
          ...filtered.map((m) => ({
            tagId: m.tagId,
            confidence: m.confidence,
            method: 'PATTERN' as TagMethod,
          }))
        );
      }

      // Deduplicate and sort by confidence
      const uniqueTags = this.deduplicateTags(suggestedTags);
      uniqueTags.sort((a, b) => b.confidence - a.confidence);

      // Apply max tags limit
      const maxTags = request.options?.maxTags || 5;
      const finalTags = uniqueTags.slice(0, maxTags);

      // Create entity tags
      const createdTags = await prisma.$transaction(async (tx) => {
        const tags = [];

        for (const suggestion of finalTags) {
          // Check if tag already exists for this entity
          const existing = await tx.entityTag.findFirst({
            where: {
              entityType,
              entityId,
              tagId: suggestion.tagId,
            },
          });

          if (!existing) {
            const entityTag = await tx.entityTag.create({
              data: {
                entityType,
                entityId,
                tagId: suggestion.tagId,
                confidence: suggestion.confidence,
                method: suggestion.method,
                appliedBy: userId,
                aiProvider: request.options?.aiProvider,
              },
              include: {
                universalTag: true,
              },
            });

            tags.push(entityTag);

            // Update tag usage count
            await tx.universalTag.update({
              where: { id: suggestion.tagId },
              data: {
                usageCount: { increment: 1 },
                lastUsed: new Date(),
              },
            });
          } else {
            // Update confidence if new one is higher
            if (suggestion.confidence > existing.confidence) {
              const updated = await tx.entityTag.update({
                where: { id: existing.id },
                data: {
                  confidence: suggestion.confidence,
                  method: suggestion.method,
                },
                include: {
                  universalTag: true,
                },
              });

              tags.push(updated);
            }
          }
        }

        return tags;
      });

      const processingTime = Date.now() - startTime;

      logger.info('Entity tagged', {
        entityType,
        entityId,
        tagCount: createdTags.length,
        processingTime,
        userId,
      });

      return {
        success: true,
        data: {
          entity: { type: entityType, id: entityId },
          tags: createdTags.map(this.mapToEntityTagResponse),
          processingTime,
          aiProvider: request.options?.aiProvider,
        },
      };
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Get tags for an entity
   */
  async getEntityTags(entityType: EntityType, entityId: string): Promise<EntityTagsResponse> {
    try {
      // Verify entity exists
      const entity = await this.getEntity(entityType, entityId);
      if (!entity) {
        throw new EntityNotFoundError(entityType, entityId);
      }

      const entityTags = await prisma.entityTag.findMany({
        where: { entityType, entityId },
        include: { universalTag: true },
        orderBy: { confidence: 'desc' },
      });

      const preview = this.getEntityPreview(entity, entityType);

      return {
        success: true,
        data: {
          entity: {
            type: entityType,
            id: entityId,
            preview,
          },
          tags: entityTags.map(this.mapToEntityTagResponse),
        },
      };
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Remove a tag from an entity
   */
  async removeEntityTag(
    entityType: EntityType,
    entityId: string,
    tagId: string,
    userId: string
  ): Promise<void> {
    try {
      const entityTag = await prisma.entityTag.findFirst({
        where: { entityType, entityId, tagId },
      });

      if (!entityTag) {
        throw new EntityNotFoundError(entityType, entityId);
      }

      await prisma.$transaction(async (tx) => {
        // Delete the entity tag
        await tx.entityTag.delete({
          where: { id: entityTag.id },
        });

        // Decrement tag usage count
        await tx.universalTag.update({
          where: { id: tagId },
          data: { usageCount: { decrement: 1 } },
        });
      });

      logger.info('Entity tag removed', {
        entityType,
        entityId,
        tagId,
        userId,
      });
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Update an entity tag
   */
  async updateEntityTag(
    entityType: EntityType,
    entityId: string,
    tagId: string,
    data: UpdateEntityTag,
    userId: string
  ): Promise<EntityTagResponse> {
    try {
      const entityTag = await prisma.entityTag.findFirst({
        where: { entityType, entityId, tagId },
      });

      if (!entityTag) {
        throw new EntityNotFoundError(entityType, entityId);
      }

      const updated = await prisma.entityTag.update({
        where: { id: entityTag.id },
        data: {
          ...data,
          ...(data.isVerified && {
            verifiedBy: userId,
            verifiedAt: new Date(),
          }),
          verifiedBy: data.isVerified ? userId : entityTag.verifiedBy,
          verifiedAt: data.isVerified ? new Date() : entityTag.verifiedAt,
        },
        include: { universalTag: true },
      });

      logger.info('Entity tag updated', {
        entityType,
        entityId,
        tagId,
        updates: data,
        userId,
      });

      return this.mapToEntityTagResponse(updated);
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Batch tag multiple entities
   */
  async batchTagEntities(request: BatchTagRequest, userId: string): Promise<BatchTagResponse> {
    const startTime = Date.now();
    const results: BatchTagResult[] = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    for (const entity of request.entities) {
      const entityStartTime = Date.now();

      try {
        // Check if entity exists
        const exists = await this.getEntity(entity.type, entity.id);
        if (!exists) {
          results.push({
            entityId: entity.id,
            status: 'skipped',
            error: 'Entity not found',
            processingTime: Date.now() - entityStartTime,
          });
          skipped++;
          continue;
        }

        // Tag the entity
        const tagResult = await this.tagEntity(
          entity.type,
          entity.id,
          {
            method: 'auto',
            options: request.options,
          },
          userId
        );

        results.push({
          entityId: entity.id,
          status: 'success',
          tags: tagResult.data?.tags,
          processingTime: Date.now() - entityStartTime,
        });
        successful++;
      } catch (error: any) {
        results.push({
          entityId: entity.id,
          status: 'failed',
          error: error.message,
          processingTime: Date.now() - entityStartTime,
        });
        failed++;

        logger.error('Batch tag entity failed', {
          entityId: entity.id,
          error: error.message,
        });
      }
    }

    const totalProcessingTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        results,
        summary: {
          total: request.entities.length,
          successful,
          failed,
          skipped,
          totalProcessingTime,
        },
      },
    };
  }

  /**
   * Re-tag entities based on filter criteria
   */
  async reTagEntities(request: ReTagRequest, userId: string): Promise<ReTagResponse> {
    const startTime = Date.now();

    try {
      // Build query based on filter
      const where: any = {
        ...(request.filter.entityType && { entityType: request.filter.entityType }),
      };

      // Add date range filter if provided
      if (request.filter.dateRange) {
        where.createdAt = {
          gte: request.filter.dateRange.start,
          lte: request.filter.dateRange.end,
        };
      }

      // Get entities to re-tag
      let entityIds: string[] = [];

      if (request.filter.hasNoTags) {
        // Find entities without tags
        const dateRange = request.filter.dateRange && 
          request.filter.dateRange.start && 
          request.filter.dateRange.end 
          ? request.filter.dateRange as { start: Date; end: Date }
          : undefined;
        
        entityIds = await this.findEntitiesWithoutTags(
          request.filter.entityType!,
          dateRange
        );
      } else if (request.filter.tags && request.filter.tags.length > 0) {
        // Find entities with specific tags
        const entityTags = await prisma.entityTag.findMany({
          where: {
            ...where,
            tagId: { in: request.filter.tags },
          },
          select: { entityId: true },
          distinct: ['entityId'],
        });

        entityIds = entityTags.map((et) => et.entityId);
      }

      // Process in batches
      const batchSize = request.options.batchSize;
      const errors: Array<{ entityId: string; error: string }> = [];
      let processed = 0;
      let tagged = 0;
      let failed = 0;
      let skipped = 0;

      for (let i = 0; i < entityIds.length; i += batchSize) {
        const batch = entityIds.slice(i, i + batchSize);

        if (!request.options.dryRun) {
          // Process batch
          const batchResult = await this.batchTagEntities(
            {
              entities: batch.map((id) => ({
                type: request.filter.entityType!,
                id,
              })),
              options: {
                forceReTag: true,
                confidenceThreshold: 0.7,
                maxTags: 5,
                includeRelated: false,
              },
            },
            userId
          );

          processed += batchResult.data!.summary.total;
          tagged += batchResult.data!.summary.successful;
          failed += batchResult.data!.summary.failed;
          skipped += batchResult.data!.summary.skipped;

          // Collect errors
          batchResult
            .data!.results.filter((r) => r.status === 'failed')
            .forEach((r) => {
              errors.push({
                entityId: r.entityId,
                error: r.error || 'Unknown error',
              });
            });
        } else {
          // Dry run - just count
          processed += batch.length;
        }
      }

      const estimatedTimeMs = Date.now() - startTime;

      return {
        success: true,
        data: {
          processed,
          tagged,
          failed,
          skipped,
          errors,
          estimatedTimeMs,
        },
      };
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Find entities by tag
   */
  async findEntitiesByTag(
    tagId: string,
    types?: EntityType[],
    pagination?: { page: number; limit: number }
  ): Promise<FindEntitiesByTagResponse> {
    try {
      const tag = await prisma.universalTag.findUnique({
        where: { id: tagId },
      });

      if (!tag) {
        throw new TagNotFoundError(tagId);
      }

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;

      const where: Prisma.EntityTagWhereInput = {
        tagId,
        ...(types &&
          types.length > 0 && {
            entityType: { in: types },
          }),
      };

      const [entityTags, total] = await prisma.$transaction([
        prisma.entityTag.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.entityTag.count({ where }),
      ]);

      // Get entity previews
      const previews = await Promise.all(
        entityTags.map(async (et) => {
          const entity = await this.getEntity(et.entityType as EntityType, et.entityId);
          return {
            type: et.entityType as EntityType,
            id: et.entityId,
            preview: this.getEntityPreview(entity, et.entityType as EntityType),
            taggedAt: et.createdAt.toISOString(),
            confidence: et.confidence,
          };
        })
      );

      return {
        success: true,
        data: previews,
        tag: {
          id: tag.id,
          code: tag.code,
          name: tag.name,
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  /**
   * Discover relationships between entities
   */
  async discoverRelationships(
    entityType: EntityType,
    entityId: string
  ): Promise<RelationshipsResponse> {
    try {
      // This is a placeholder for relationship discovery logic
      // In a real implementation, this would analyze entity content,
      // metadata, and patterns to discover relationships

      const relationships: Array<{
        targetType: EntityType;
        targetId: string;
        relationshipType: string;
        confidence: number;
        discoveredBy: string;
        metadata?: Record<string, any>;
      }> = [];

      // Example: Find related entities through shared tags
      const entityTags = await prisma.entityTag.findMany({
        where: { entityType, entityId },
        select: { tagId: true },
      });

      if (entityTags.length > 0) {
        const tagIds = entityTags.map((et) => et.tagId);

        // Find other entities with same tags
        const relatedEntities = await prisma.entityTag.findMany({
          where: {
            tagId: { in: tagIds },
            NOT: { entityId },
          },
          select: {
            entityType: true,
            entityId: true,
            tagId: true,
            confidence: true,
          },
          distinct: ['entityId'],
          take: 10,
        });

        // Group by entity and calculate relationship confidence
        const entityMap = new Map<string, any>();

        relatedEntities.forEach((re) => {
          const key = `${re.entityType}:${re.entityId}`;
          if (!entityMap.has(key)) {
            entityMap.set(key, {
              targetType: re.entityType,
              targetId: re.entityId,
              sharedTags: [],
              avgConfidence: 0,
            });
          }

          const entry = entityMap.get(key);
          entry.sharedTags.push(re.tagId);
          entry.avgConfidence += re.confidence;
        });

        // Convert to relationships
        entityMap.forEach((value, key) => {
          relationships.push({
            targetType: value.targetType as EntityType,
            targetId: value.targetId,
            relationshipType: 'SHARED_TAGS',
            confidence: value.avgConfidence / value.sharedTags.length,
            discoveredBy: 'TAG_ANALYSIS',
            metadata: {
              sharedTagCount: value.sharedTags.length,
              sharedTags: value.sharedTags,
            },
          });
        });
      }

      return {
        success: true,
        data: {
          entity: {
            type: entityType,
            id: entityId,
          },
          relationships,
        },
      };
    } catch (error) {
      throw handleTaggingError(error);
    }
  }

  // Private helper methods

  private async getEntity(type: EntityType, id: string): Promise<any> {
    switch (type) {
      case 'transaction':
        return prisma.transactions.findUnique({ where: { id } });
      case 'document':
        // Document model doesn't exist yet, return null for now
        // TODO: Implement when document management is added
        return null;
      case 'client':
        return prisma.client.findUnique({ where: { id } });
      case 'invoice':
        return prisma.invoice.findUnique({ where: { id } });
      default:
        throw new Error(`Unknown entity type: ${type}`);
    }
  }

  private extractEntityContent(entity: any, type: EntityType): string {
    switch (type) {
      case 'transaction':
        return `${entity.description || ''} ${entity.counterparty_name || ''} ${entity.reference || ''}`.trim();
      case 'document':
        // Document model doesn't exist yet
        return '';
      case 'client':
        return `${entity.name} ${entity.company || ''}`.trim();
      case 'invoice':
        return `${entity.invoiceNumber || ''} ${entity.description || ''}`.trim();
      default:
        return '';
    }
  }

  private extractEntityMetadata(entity: any, type: EntityType): Record<string, any> {
    switch (type) {
      case 'transaction':
        return {
          amount: entity.amount,
          currencyId: entity.currency_id,
          date: entity.date,
          accountId: entity.account_id,
          type: entity.type,
          status: entity.status,
        };
      case 'document':
        // Document model doesn't exist yet
        return {};
      case 'client':
        return {
          vatNumber: entity.vatNumber,
          email: entity.email,
          taxId: entity.taxId,
        };
      case 'invoice':
        return {
          amount: entity.amount,
          currency: entity.currency,
          status: entity.status,
          clientId: entity.clientId,
          dueDate: entity.dueDate,
        };
      default:
        return {};
    }
  }

  private getEntityPreview(entity: any, type: EntityType): string {
    if (!entity) {
      return 'N/A';
    }

    switch (type) {
      case 'transaction':
        return entity.counterparty_name || entity.description || 'Transaction';
      case 'document':
        // Document model doesn't exist yet
        return 'Document';
      case 'client':
        return entity.name || 'Client';
      case 'invoice':
        return entity.invoiceNumber || 'Invoice';
      default:
        return 'Entity';
    }
  }

  private deduplicateTags(
    tags: Array<{ tagId: string; confidence: number; method: TagMethod }>
  ): Array<{ tagId: string; confidence: number; method: TagMethod }> {
    const map = new Map<string, { confidence: number; method: TagMethod }>();

    tags.forEach((tag) => {
      const existing = map.get(tag.tagId);
      if (!existing || tag.confidence > existing.confidence) {
        map.set(tag.tagId, {
          confidence: tag.confidence,
          method: tag.method,
        });
      }
    });

    return Array.from(map.entries()).map(([tagId, data]) => ({
      tagId,
      ...data,
    }));
  }

  private mapToEntityTagResponse(entityTag: any): EntityTagResponse {
    return {
      id: entityTag.id,
      entityType: entityTag.entityType as EntityType,
      entityId: entityTag.entityId,
      tagId: entityTag.tagId,
      tagCode: entityTag.tag.code,
      tagName: entityTag.tag.name,
      confidence: entityTag.confidence,
      method: entityTag.method as TagMethod,
      appliedAt: entityTag.createdAt,
      appliedBy: entityTag.appliedBy,
      isVerified: entityTag.isVerified,
      verifiedBy: entityTag.verifiedBy,
      verifiedAt: entityTag.verifiedAt,
    };
  }

  private async findEntitiesWithoutTags(
    entityType: EntityType,
    dateRange?: { start: Date; end: Date }
  ): Promise<string[]> {
    // This would need to be implemented based on your entity tables
    // For now, returning empty array
    return [];
  }
}
