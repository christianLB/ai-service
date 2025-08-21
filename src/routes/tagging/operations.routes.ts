import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { batchRateLimit, standardRateLimit } from '../../middleware/express-rate-limit.middleware';
import {
  getEntityTaggingService,
  getAITaggingService,
  getTagService,
} from '../../services/tagging';
import {
  batchTagRequestSchema,
  reTagRequestSchema,
  tagFeedbackSchema,
  tagLearningSchema,
  EntityTypeEnum,
} from '../../types/tagging/tag.types';
import { handleTaggingError } from '../../services/tagging/errors';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * POST /api/tagging/batch
 * Batch tag multiple entities
 */
router.post('/batch', batchRateLimit, async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const request = batchTagRequestSchema.parse(req.body);
    const userId = (req as any).user.userId;

    const result = await getEntityTaggingService().batchTagEntities(request, userId);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid batch request',
          details: error.errors,
        },
      });
      return;
    }
    _next(handleTaggingError(error));
  }
});

/**
 * POST /api/tagging/retag
 * Re-tag entities based on filter criteria
 */
router.post('/retag', batchRateLimit, async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const request = reTagRequestSchema.parse(req.body);
    const userId = (req as any).user.userId;

    const result = await getEntityTaggingService().reTagEntities(request, userId);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid retag request',
          details: error.errors,
        },
      });
      return;
    }
    _next(handleTaggingError(error));
  }
});

/**
 * POST /api/tagging/feedback
 * Submit feedback on tag accuracy
 */
router.post(
  '/feedback',
  standardRateLimit,
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const feedback = tagFeedbackSchema.parse(req.body);
      const result = await getAITaggingService().learnFromFeedback(feedback);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid feedback data',
            details: error.errors,
          },
        });
        return;
      }
      _next(handleTaggingError(error));
    }
  }
);

/**
 * POST /api/tagging/learn
 * Learn from manual tag corrections
 */
router.post(
  '/learn',
  standardRateLimit,
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const learning = tagLearningSchema.parse(req.body);
      const result = await getAITaggingService().learnFromCorrection(learning);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid learning data',
            details: error.errors,
          },
        });
        return;
      }
      _next(handleTaggingError(error));
    }
  }
);

/**
 * GET /api/tagging/accuracy
 * Get system accuracy metrics
 */
router.get(
  '/accuracy',
  standardRateLimit,
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { period, entityType } = req.query;

      // Validate entity type if provided
      let validEntityType: any;
      if (entityType) {
        validEntityType = EntityTypeEnum.parse(entityType);
      }

      // Calculate accuracy metrics
      const now = new Date();
      const periodDays =
        period === 'week' ? 7 : period === 'month' ? 30 : period === 'year' ? 365 : 30;
      const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

      // Get tagging statistics
      const [totalTagged, verifiedTags] = await Promise.all([
        prisma.entityTag.count({
          where: {
            createdAt: { gte: startDate },
            ...(validEntityType && { entityType: validEntityType }),
          },
        }),
        prisma.entityTag.count({
          where: {
            createdAt: { gte: startDate },
            isVerified: true,
            ...(validEntityType && { entityType: validEntityType }),
          },
        }),
      ]);

      // Calculate accuracy based on verified tags (simplified without feedback table)
      const accuracy = totalTagged > 0 ? verifiedTags / totalTagged : 1;

      // Get accuracy by entity type
      const entityTypes = ['transaction', 'document', 'client', 'invoice'];
      const byEntityType: Record<string, any> = {};

      for (const type of entityTypes) {
        const [typeTotal, typeVerified] = await Promise.all([
          prisma.entityTag.count({
            where: {
              createdAt: { gte: startDate },
              entityType: type,
            },
          }),
          prisma.entityTag.count({
            where: {
              createdAt: { gte: startDate },
              entityType: type,
              isVerified: true,
            },
          }),
        ]);

        const typeAccuracy = typeTotal > 0 ? typeVerified / typeTotal : 1;

        byEntityType[type] = {
          accuracy: typeAccuracy,
          count: typeTotal,
          verified: typeVerified,
        };
      }

      // Get accuracy by method
      const methods = ['AI', 'PATTERN', 'MANUAL'];
      const byMethod: Record<string, any> = {};

      for (const method of methods) {
        const methodTags = await prisma.entityTag.findMany({
          where: {
            createdAt: { gte: startDate },
            method,
            ...(validEntityType && { entityType: validEntityType }),
          },
          select: { id: true },
        });

        const methodTagIds = methodTags.map((t) => t.id);

        if (methodTagIds.length > 0) {
          const verifiedCount = await prisma.entityTag.count({
            where: {
              id: { in: methodTagIds },
              isVerified: true,
            },
          });

          const methodAccuracy = methodTagIds.length > 0 ? verifiedCount / methodTagIds.length : 1;

          byMethod[method] = {
            accuracy: methodAccuracy,
            total: methodTagIds.length,
            verified: verifiedCount,
          };
        } else {
          byMethod[method] = { accuracy: 1, total: 0, verified: 0 };
        }
      }

      res.json({
        success: true,
        data: {
          overall: {
            accuracy,
            totalTagged,
            verified: verifiedTags,
          },
          byEntityType,
          byMethod,
          period: {
            start: startDate.toISOString(),
            end: now.toISOString(),
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: error.errors,
          },
        });
        return;
      }
      _next(handleTaggingError(error));
    }
  }
);

/**
 * GET /api/tags/:id/metrics
 * Get metrics for a specific tag
 */
router.get(
  '/tags/:id/metrics',
  standardRateLimit,
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { id: tagId } = req.params;
      const { period, startDate, endDate } = req.query;

      // Validate tag exists
      const tag = await prisma.universalTag.findUnique({
        where: { id: tagId },
        select: { id: true, code: true, name: true },
      });

      if (!tag) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Tag not found',
          },
        });
        return;
      }

      // Calculate date range
      let start: Date, end: Date;

      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      } else {
        end = new Date();
        const days =
          period === 'day'
            ? 1
            : period === 'week'
              ? 7
              : period === 'month'
                ? 30
                : period === 'year'
                  ? 365
                  : 30;
        start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
      }

      // Get metrics
      const [usageCount, entityTags, unverifiedCount] = await Promise.all([
        prisma.entityTag.count({
          where: {
            tagId,
            createdAt: { gte: start, lte: end },
          },
        }),
        prisma.entityTag.findMany({
          where: {
            tagId,
            createdAt: { gte: start, lte: end },
          },
          select: {
            confidence: true,
            isVerified: true,
            createdAt: true,
          },
        }),
        prisma.entityTag.count({
          where: {
            tagId,
            createdAt: { gte: start, lte: end },
            isVerified: false,
          },
        }),
      ]);

      // Calculate average confidence
      const avgConfidence =
        entityTags.length > 0
          ? entityTags.reduce((sum: number, et: any) => sum + et.confidence, 0) / entityTags.length
          : 0;

      // Calculate verification rate
      const verifiedCount = entityTags.filter((et: any) => et.isVerified).length;
      const verificationRate = entityTags.length > 0 ? verifiedCount / entityTags.length : 0;

      // Generate daily trends
      const trends = [];
      const dayMs = 24 * 60 * 60 * 1000;
      const current = new Date(start);

      while (current <= end) {
        const dayStart = new Date(current);
        const dayEnd = new Date(current.getTime() + dayMs);

        const dayTags = entityTags.filter(
          (et: any) => et.createdAt >= dayStart && et.createdAt < dayEnd
        );

        const dayAvgConfidence =
          dayTags.length > 0
            ? dayTags.reduce((sum: number, et: any) => sum + et.confidence, 0) / dayTags.length
            : 0;

        trends.push({
          date: dayStart.toISOString().split('T')[0],
          count: dayTags.length,
          avgConfidence: Math.round(dayAvgConfidence * 100) / 100,
        });

        current.setDate(current.getDate() + 1);
      }

      res.json({
        success: true,
        data: {
          tag: {
            id: tag.id,
            code: tag.code,
            name: tag.name,
          },
          metrics: {
            usageCount,
            avgConfidence: Math.round(avgConfidence * 100) / 100,
            verificationRate: Math.round(verificationRate * 100) / 100,
            trends,
          },
        },
      });
    } catch (error) {
      _next(handleTaggingError(error));
    }
  }
);

/**
 * GET /api/relationships/:type/:id
 * Discover relationships for an entity
 */
router.get(
  '/relationships/:type/:id',
  standardRateLimit,
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const entityType = EntityTypeEnum.parse(req.params.type);
      const { id: entityId } = req.params;

      const result = await getEntityTaggingService().discoverRelationships(entityType, entityId);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid entity type',
            details: error.errors,
          },
        });
        return;
      }
      _next(handleTaggingError(error));
    }
  }
);

/**
 * POST /api/tagging/suggest
 * Get AI-powered tag suggestions for content
 */
router.post(
  '/suggest',
  standardRateLimit,
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { content, entityType, metadata, options } = req.body;

      // Validate entity type
      const validEntityType = EntityTypeEnum.parse(entityType);

      const suggestions = await getAITaggingService().suggestTags(
        content,
        validEntityType,
        metadata,
        options
      );

      res.json({
        success: true,
        data: {
          suggestions,
          provider: options?.provider || 'claude',
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        });
        return;
      }
      _next(handleTaggingError(error));
    }
  }
);

/**
 * POST /api/tagging/categorize
 * Auto-categorize content using AI
 */
router.post(
  '/categorize',
  standardRateLimit,
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { content, entityType, language, context } = req.body;

      // Validate entity type
      const validEntityType = EntityTypeEnum.parse(entityType);

      const result = await getAITaggingService().autoCategorize(
        content,
        validEntityType,
        language,
        context
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        });
        return;
      }
      _next(handleTaggingError(error));
    }
  }
);

/**
 * POST /api/tagging/batch-ai
 * Batch process items for AI tagging
 */
router.post(
  '/batch-ai',
  batchRateLimit,
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { items, options } = req.body;

      // Validate items
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Items must be a non-empty array',
          },
        });
        return;
      }

      // Validate entity types in items
      for (const item of items) {
        EntityTypeEnum.parse(item.entityType);
      }

      const results = await getAITaggingService().batchProcessTags(items, options);

      res.json({
        success: true,
        data: {
          processed: results.length,
          results,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        });
        return;
      }
      _next(handleTaggingError(error));
    }
  }
);

/**
 * POST /api/tagging/multilingual
 * Get multi-language tag suggestions
 */
router.post(
  '/multilingual',
  standardRateLimit,
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { content, entityType, targetLanguages } = req.body;

      // Validate entity type
      const validEntityType = EntityTypeEnum.parse(entityType);

      const suggestions = await getAITaggingService().getMultilingualSuggestions(
        content,
        validEntityType,
        targetLanguages
      );

      // suggestions is already a Record, no conversion needed
      const result = suggestions;

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        });
        return;
      }
      _next(handleTaggingError(error));
    }
  }
);

/**
 * POST /api/tagging/contextual
 * Get contextual tag suggestions based on related entities
 */
router.post(
  '/contextual',
  standardRateLimit,
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { content, entityType, context } = req.body;

      // Validate entity type
      const validEntityType = EntityTypeEnum.parse(entityType);

      const suggestions = await getAITaggingService().getContextualSuggestions(
        content,
        validEntityType,
        context
      );

      res.json({
        success: true,
        data: {
          suggestions,
          contextUsed: Object.keys(context || {}),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        });
        return;
      }
      _next(handleTaggingError(error));
    }
  }
);

/**
 * GET /api/tagging/analytics
 * Get AI tagging analytics
 */
router.get(
  '/analytics',
  standardRateLimit,
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const analytics = await getAITaggingService().getTagAnalytics();

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      _next(handleTaggingError(error));
    }
  }
);

/**
 * POST /api/tagging/improve-patterns
 * Improve tag patterns based on examples
 */
router.post(
  '/improve-patterns',
  standardRateLimit,
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { tagId, successfulExamples, failedExamples } = req.body;

      if (!tagId || !Array.isArray(successfulExamples)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'tagId and successfulExamples are required',
          },
        });
        return;
      }

      await getAITaggingService().improveTagPatterns(tagId, successfulExamples, failedExamples);

      res.json({
        success: true,
        data: {
          message: 'Tag patterns improved successfully',
          tagId,
          positiveExamples: successfulExamples.length,
          negativeExamples: failedExamples?.length || 0,
        },
      });
    } catch (error) {
      _next(handleTaggingError(error));
    }
  }
);

export default router;
