import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { 
  standardRateLimit, 
  aiRateLimit, 
  batchRateLimit 
} from '../../middleware/rate-limit.middleware';
import { EntityTaggingService } from '../../services/tagging/entity-tagging.service';
import { aiTaggingService } from '../../services/tagging/ai-tagging.service';
import { patternMatchingService } from '../../services/tagging/pattern-matching.service';
import {
  EntityTypeEnum,
  tagEntityRequestSchema,
  updateEntityTagSchema
} from '../../types/tagging/tag.types';
import { handleTaggingError } from '../../services/tagging/errors';
import { z } from 'zod';

const router = Router();
const entityTaggingService = new EntityTaggingService(aiTaggingService, patternMatchingService);

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * POST /api/entities/:type/:id/tags
 * Tag an entity
 */
router.post('/:type/:id/tags', aiRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityType = EntityTypeEnum.parse(req.params.type);
    const { id: entityId } = req.params;
    const request = tagEntityRequestSchema.parse(req.body);
    const userId = (req as any).user.userId;

    const result = await entityTaggingService.tagEntity(
      entityType,
      entityId,
      request,
      userId
    );

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * GET /api/entities/:type/:id/tags
 * Get tags for an entity
 */
router.get('/:type/:id/tags', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityType = EntityTypeEnum.parse(req.params.type);
    const { id: entityId } = req.params;

    const result = await entityTaggingService.getEntityTags(entityType, entityId);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid entity type',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * DELETE /api/entities/:type/:id/tags/:tagId
 * Remove a tag from an entity
 */
router.delete('/:type/:id/tags/:tagId', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityType = EntityTypeEnum.parse(req.params.type);
    const { id: entityId, tagId } = req.params;
    const userId = (req as any).user.userId;

    await entityTaggingService.removeEntityTag(
      entityType,
      entityId,
      tagId,
      userId
    );

    res.json({
      success: true,
      message: 'Tag removed successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid entity type',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * PATCH /api/entities/:type/:id/tags/:tagId
 * Update an entity tag (confidence, verification)
 */
router.patch('/:type/:id/tags/:tagId', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityType = EntityTypeEnum.parse(req.params.type);
    const { id: entityId, tagId } = req.params;
    const data = updateEntityTagSchema.parse(req.body);
    const userId = (req as any).user.userId;

    const result = await entityTaggingService.updateEntityTag(
      entityType,
      entityId,
      tagId,
      data,
      userId
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * GET /api/entities/by-tag/:tagId
 * Find entities by tag
 */
router.get('/by-tag/:tagId', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tagId } = req.params;
    const { types, page, limit } = req.query;

    // Parse entity types if provided
    let entityTypes: any[] | undefined;
    if (types) {
      const typesArray = Array.isArray(types) ? types : [types];
      entityTypes = typesArray.map(t => EntityTypeEnum.parse(t));
    }

    const pagination = {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20
    };

    const result = await entityTaggingService.findEntitiesByTag(
      tagId,
      entityTypes,
      pagination
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid entity types',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

export default router;