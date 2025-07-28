import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { batchRateLimit, standardRateLimit } from '../../middleware/rate-limit.middleware';
import { EntityTaggingService } from '../../services/tagging/entity-tagging.service';
import { aiTaggingService } from '../../services/tagging/ai-tagging.service';
import { patternMatchingService } from '../../services/tagging/pattern-matching.service';
import { tagService } from '../../services/tagging/tag.service';
import {
  batchTagRequestSchema,
  reTagRequestSchema,
  tagFeedbackSchema,
  tagLearningSchema,
  EntityTypeEnum
} from '../../types/tagging/tag.types';
import { handleTaggingError } from '../../services/tagging/errors';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const router = Router();
const entityTaggingService = new EntityTaggingService(aiTaggingService, patternMatchingService);

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * POST /api/tagging/batch
 * Batch tag multiple entities
 */
router.post('/batch', batchRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = batchTagRequestSchema.parse(req.body);
    const userId = (req as any).user.userId;

    const result = await entityTaggingService.batchTagEntities(request, userId);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid batch request',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * POST /api/tagging/retag
 * Re-tag entities based on filter criteria
 */
router.post('/retag', batchRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = reTagRequestSchema.parse(req.body);
    const userId = (req as any).user.userId;

    const result = await entityTaggingService.reTagEntities(request, userId);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid retag request',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * POST /api/tagging/feedback
 * Submit feedback on tag accuracy
 */
router.post('/feedback', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feedback = tagFeedbackSchema.parse(req.body);
    const result = await aiTaggingService.learnFromFeedback(feedback);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid feedback data',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * POST /api/tagging/learn
 * Learn from manual tag corrections
 */
router.post('/learn', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const learning = tagLearningSchema.parse(req.body);
    const result = await aiTaggingService.learnFromCorrection(learning);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid learning data',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * GET /api/tagging/accuracy
 * Get system accuracy metrics
 */
router.get('/accuracy', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period, entityType } = req.query;

    // Validate entity type if provided
    let validEntityType: any;
    if (entityType) {
      validEntityType = EntityTypeEnum.parse(entityType);
    }

    // Calculate accuracy metrics
    const now = new Date();
    const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : period === 'year' ? 365 : 30;
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Get tagging statistics
    const [totalTagged, verifiedTags, feedbackData] = await Promise.all([
      prisma.entityTag.count({
        where: {
          appliedAt: { gte: startDate },
          ...(validEntityType && { entityType: validEntityType })
        }
      }),
      prisma.entityTag.count({
        where: {
          appliedAt: { gte: startDate },
          isVerified: true,
          ...(validEntityType && { entityType: validEntityType })
        }
      }),
      prisma.tagFeedback.groupBy({
        by: ['isCorrect'],
        where: {
          createdAt: { gte: startDate },
          ...(validEntityType && { entityType: validEntityType })
        },
        _count: true
      })
    ]);

    // Calculate accuracy
    const correctCount = feedbackData.find(f => f.isCorrect)?.._count || 0;
    const incorrectCount = feedbackData.find(f => !f.isCorrect)?.._count || 0;
    const totalFeedback = correctCount + incorrectCount;
    const accuracy = totalFeedback > 0 ? correctCount / totalFeedback : 1;

    // Get accuracy by entity type
    const entityTypes = ['transaction', 'document', 'client', 'invoice'];
    const byEntityType: Record<string, any> = {};

    for (const type of entityTypes) {
      const [typeTotal, typeFeedback] = await Promise.all([
        prisma.entityTag.count({
          where: {
            appliedAt: { gte: startDate },
            entityType: type
          }
        }),
        prisma.tagFeedback.groupBy({
          by: ['isCorrect'],
          where: {
            createdAt: { gte: startDate },
            entityType: type
          },
          _count: true
        })
      ]);

      const typeCorrect = typeFeedback.find(f => f.isCorrect)?._count || 0;
      const typeIncorrect = typeFeedback.find(f => !f.isCorrect)?._count || 0;
      const typeAccuracy = (typeCorrect + typeIncorrect) > 0 
        ? typeCorrect / (typeCorrect + typeIncorrect) 
        : 1;

      byEntityType[type] = {
        accuracy: typeAccuracy,
        count: typeTotal
      };
    }

    // Get accuracy by method
    const methods = ['AI', 'PATTERN', 'MANUAL'];
    const byMethod: Record<string, any> = {};

    for (const method of methods) {
      const methodTags = await prisma.entityTag.findMany({
        where: {
          appliedAt: { gte: startDate },
          method,
          ...(validEntityType && { entityType: validEntityType })
        },
        select: { id: true }
      });

      const methodTagIds = methodTags.map(t => t.id);
      
      if (methodTagIds.length > 0) {
        const methodFeedback = await prisma.tagFeedback.groupBy({
          by: ['isCorrect'],
          where: {
            entityTagId: { in: methodTagIds }
          },
          _count: true
        });

        const methodCorrect = methodFeedback.find(f => f.isCorrect)?._count || 0;
        const methodIncorrect = methodFeedback.find(f => !f.isCorrect)?._count || 0;
        const methodAccuracy = (methodCorrect + methodIncorrect) > 0 
          ? methodCorrect / (methodCorrect + methodIncorrect) 
          : 1;

        byMethod[method] = { accuracy: methodAccuracy };
      } else {
        byMethod[method] = { accuracy: 1 };
      }
    }

    res.json({
      success: true,
      data: {
        overall: {
          accuracy,
          totalTagged,
          verified: verifiedTags,
          corrected: incorrectCount
        },
        byEntityType,
        byMethod,
        period: {
          start: startDate.toISOString(),
          end: now.toISOString()
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid parameters',
          details: error.errors
        }
      });
      return;
    }
    next(handleTaggingError(error));
  }
});

/**
 * GET /api/tags/:id/metrics
 * Get metrics for a specific tag
 */
router.get('/tags/:id/metrics', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: tagId } = req.params;
    const { period, startDate, endDate } = req.query;

    // Validate tag exists
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      select: { id: true, code: true, name: true }
    });

    if (!tag) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Tag not found'
        }
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
      const days = period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : period === 'year' ? 365 : 30;
      start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // Get metrics
    const [usageCount, entityTags, feedbackData] = await Promise.all([
      prisma.entityTag.count({
        where: {
          tagId,
          appliedAt: { gte: start, lte: end }
        }
      }),
      prisma.entityTag.findMany({
        where: {
          tagId,
          appliedAt: { gte: start, lte: end }
        },
        select: {
          confidence: true,
          isVerified: true,
          appliedAt: true
        }
      }),
      prisma.tagFeedback.count({
        where: {
          entityTag: { tagId },
          createdAt: { gte: start, lte: end },
          isCorrect: false
        }
      })
    ]);

    // Calculate average confidence
    const avgConfidence = entityTags.length > 0
      ? entityTags.reduce((sum, et) => sum + et.confidence, 0) / entityTags.length
      : 0;

    // Calculate verification rate
    const verifiedCount = entityTags.filter(et => et.isVerified).length;
    const verificationRate = entityTags.length > 0 ? verifiedCount / entityTags.length : 0;

    // Generate daily trends
    const trends = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const current = new Date(start);

    while (current <= end) {
      const dayStart = new Date(current);
      const dayEnd = new Date(current.getTime() + dayMs);

      const dayTags = entityTags.filter(et => 
        et.appliedAt >= dayStart && et.appliedAt < dayEnd
      );

      const dayAvgConfidence = dayTags.length > 0
        ? dayTags.reduce((sum, et) => sum + et.confidence, 0) / dayTags.length
        : 0;

      trends.push({
        date: dayStart.toISOString().split('T')[0],
        count: dayTags.length,
        avgConfidence: Math.round(dayAvgConfidence * 100) / 100
      });

      current.setDate(current.getDate() + 1);
    }

    res.json({
      success: true,
      data: {
        tag: {
          id: tag.id,
          code: tag.code,
          name: tag.name
        },
        metrics: {
          usageCount,
          avgConfidence: Math.round(avgConfidence * 100) / 100,
          verificationRate: Math.round(verificationRate * 100) / 100,
          trends
        }
      }
    });
  } catch (error) {
    next(handleTaggingError(error));
  }
});

/**
 * GET /api/relationships/:type/:id
 * Discover relationships for an entity
 */
router.get('/relationships/:type/:id', standardRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityType = EntityTypeEnum.parse(req.params.type);
    const { id: entityId } = req.params;

    const result = await entityTaggingService.discoverRelationships(entityType, entityId);
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

export default router;