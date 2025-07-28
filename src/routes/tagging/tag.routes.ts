import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { 
  standardRateLimit, 
  aiRateLimit, 
  batchRateLimit, 
  searchRateLimit 
} from '../../middleware/rate-limit.middleware';
import { tagService } from '../../services/tagging/tag.service';
import {
  createTagSchema,
  updateTagSchema,
  tagQuerySchema,
  tagSearchSchema,
  deleteTagOptionsSchema
} from '../../types/tagging/tag.types';
import { handleTaggingError } from '../../services/tagging/errors';
import { z } from 'zod';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * GET /api/tags
 * List all tags with filtering and pagination
 */
router.get('/', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = tagQuerySchema.parse(req.query);
    const result = await tagService.listTags(query);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * POST /api/tags
 * Create a new tag
 */
router.post('/', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createTagSchema.parse(req.body);
    const userId = (req as any).user.userId;
    const result = await tagService.createTag(data, userId);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * GET /api/tags/search
 * Search tags
 */
router.get('/search', searchRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = tagSearchSchema.parse(req.query);
    const result = await tagService.searchTags(search);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid search parameters',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * GET /api/tags/hierarchy
 * Get tag hierarchy tree
 */
router.get('/hierarchy', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { parentId } = req.query;
    const hierarchy = await tagService.getTagHierarchy(parentId as string);
    res.json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    next(handleTaggingError(error));
  }
});

/**
 * GET /api/tags/:id
 * Get a specific tag
 */
router.get('/:id', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await tagService.getTag(id);
    res.json(result);
  } catch (error) {
    next(handleTaggingError(error));
  }
});

/**
 * PUT /api/tags/:id
 * Update a tag
 */
router.put('/:id', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateTagSchema.parse(req.body);
    const userId = (req as any).user.userId;
    const result = await tagService.updateTag(id, data, userId);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * DELETE /api/tags/:id
 * Delete a tag
 */
router.delete('/:id', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const options = req.query.reassignTo 
      ? deleteTagOptionsSchema.parse(req.query)
      : undefined;
    const userId = (req as any).user.userId;
    
    await tagService.deleteTag(id, options, userId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * GET /api/tags/:id/path
 * Get tag path (breadcrumb)
 */
router.get('/:id/path', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const path = await tagService.getTagPath(id);
    res.json({
      success: true,
      data: {
        tagId: id,
        path
      }
    });
  } catch (error) {
    next(handleTaggingError(error));
  }
});

/**
 * POST /api/tags/bulk
 * Bulk create tags
 */
router.post('/bulk', batchRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tags } = req.body;
    
    if (!Array.isArray(tags) || tags.length === 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Tags array is required and must not be empty'
        }
      });
      return;
    }

    // Validate each tag
    const validatedTags = tags.map(tag => createTagSchema.parse(tag));
    const userId = (req as any).user.userId;
    
    const created = await tagService.bulkCreateTags(validatedTags, userId);
    res.status(201).json({
      success: true,
      data: created,
      count: created.length
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid tags data',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * PUT /api/tags/bulk
 * Bulk update tags
 */
router.put('/bulk', batchRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Updates array is required and must not be empty'
        }
      });
      return;
    }

    // Validate each update
    const validatedUpdates = updates.map(update => ({
      id: z.string().uuid().parse(update.id),
      data: updateTagSchema.parse(update.data)
    }));
    
    const userId = (req as any).user.userId;
    const updated = await tagService.bulkUpdateTags(validatedUpdates, userId);
    
    res.json({
      success: true,
      data: updated,
      count: updated.length
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update data',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

export default router;