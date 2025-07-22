import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation';
import { positionService } from '../services/position.service';
import { 
  createPositionSchema, 
  updatePositionSchema,
  positionQuerySchema 
} from '../types/position.types';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/positions
 * Get all positions with pagination
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().trim(),
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const queryParams = positionQuerySchema.parse(req.query);
    const result = await positionService.getAll(queryParams, req.user?.userId);
    
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/positions/:id
 * Get a single position by ID
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid position ID'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const position = await positionService.getById(req.params.id, req.user?.userId);
    
    res.json({
      success: true,
      data: position,
    });
  })
);

/**
 * POST /api/positions
 * Create a new position
 */
router.post(
  '/',
  [
    body('userId').notEmpty().withMessage('Userid is required'),
    body('strategyId').optional({ nullable: true }).isString(),
    body('symbol').notEmpty().withMessage('Symbol is required'),
    body('side').notEmpty().withMessage('Side is required'),
    body('quantity').notEmpty().withMessage('Quantity is required'),
        body('avgEntryPrice').notEmpty().withMessage('Avgentryprice is required'),
        body('avgExitPrice').optional({ nullable: true }),
        body('realizedPnl').optional({ nullable: true }),
        body('unrealizedPnl').optional({ nullable: true }),
        body('fees').optional({ nullable: true }),
        body('status').notEmpty().withMessage('Status is required'),
    body('exchange').notEmpty().withMessage('Exchange is required'),
    body('openedAt').isISO8601().withMessage('Openedat must be a valid date'),
    body('closedAt').optional({ nullable: true }).isISO8601(),
    body('metadata').optional({ nullable: true }),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = createPositionSchema.parse(req.body);
    const position = await positionService.create(data, req.user?.userId);
    
    logger.info(`Position created by user ${req.user?.email}`);
    
    res.status(201).json({
      success: true,
      data: position,
      message: 'Position created successfully',
    });
  })
);

/**
 * PUT /api/positions/:id
 * Update a position
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid position ID'),
    body('userId').optional({ nullable: true }).isString(),
    body('strategyId').optional({ nullable: true }).isString(),
    body('symbol').optional({ nullable: true }).isString(),
    body('side').optional({ nullable: true }).isString(),
    body('quantity').optional({ nullable: true }),
        body('avgEntryPrice').optional({ nullable: true }),
        body('avgExitPrice').optional({ nullable: true }),
        body('realizedPnl').optional({ nullable: true }),
        body('unrealizedPnl').optional({ nullable: true }),
        body('fees').optional({ nullable: true }),
        body('status').optional({ nullable: true }).isString(),
    body('exchange').optional({ nullable: true }).isString(),
    body('openedAt').optional({ nullable: true }).isISO8601(),
    body('closedAt').optional({ nullable: true }).isISO8601(),
    body('metadata').optional({ nullable: true }),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = updatePositionSchema.parse({ ...req.body, id: req.params.id });
    const position = await positionService.update(req.params.id, data, req.user?.userId);
    
    logger.info(`Position ${req.params.id} updated by user ${req.user?.email}`);
    
    res.json({
      success: true,
      data: position,
      message: 'Position updated successfully',
    });
  })
);

/**
 * DELETE /api/positions/:id
 * Delete a position
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid position ID'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    await positionService.delete(req.params.id, req.user?.userId);
    
    logger.info(`Position ${req.params.id} deleted by user ${req.user?.email}`);
    
    res.json({
      success: true,
      message: 'Position deleted successfully',
    });
  })
);


export default router;