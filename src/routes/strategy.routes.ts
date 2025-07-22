import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation';
import { strategyService } from '../services/strategy.service';
import { 
  createStrategySchema, 
  updateStrategySchema,
  strategyQuerySchema 
} from '../types/strategy.types';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/strategys
 * Get all strategys with pagination
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
    const queryParams = strategyQuerySchema.parse(req.query);
    const result = await strategyService.getAll(queryParams, req.user?.userId);
    
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/strategys/:id
 * Get a single strategy by ID
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid strategy ID'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const strategy = await strategyService.getById(req.params.id, req.user?.userId);
    
    res.json({
      success: true,
      data: strategy,
    });
  })
);

/**
 * POST /api/strategys
 * Create a new strategy
 */
router.post(
  '/',
  [
    body('userId').notEmpty().withMessage('Userid is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('description').optional({ nullable: true }).isString(),
    body('type').notEmpty().withMessage('Type is required'),
    body('status').notEmpty().withMessage('Status is required'),
    body('config').notEmpty().withMessage('Config is required'),
    body('metadata').optional({ nullable: true }),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = createStrategySchema.parse(req.body);
    const strategy = await strategyService.create(data, req.user?.userId);
    
    logger.info(`Strategy created by user ${req.user?.email}`);
    
    res.status(201).json({
      success: true,
      data: strategy,
      message: 'Strategy created successfully',
    });
  })
);

/**
 * PUT /api/strategys/:id
 * Update a strategy
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid strategy ID'),
    body('userId').optional({ nullable: true }).isString(),
    body('name').optional({ nullable: true }).isString(),
    body('description').optional({ nullable: true }).isString(),
    body('type').optional({ nullable: true }).isString(),
    body('status').optional({ nullable: true }).isString(),
    body('config').optional({ nullable: true }),
    body('metadata').optional({ nullable: true }),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = updateStrategySchema.parse({ ...req.body, id: req.params.id });
    const strategy = await strategyService.update(req.params.id, data, req.user?.userId);
    
    logger.info(`Strategy ${req.params.id} updated by user ${req.user?.email}`);
    
    res.json({
      success: true,
      data: strategy,
      message: 'Strategy updated successfully',
    });
  })
);

/**
 * DELETE /api/strategys/:id
 * Delete a strategy
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid strategy ID'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    await strategyService.delete(req.params.id, req.user?.userId);
    
    logger.info(`Strategy ${req.params.id} deleted by user ${req.user?.email}`);
    
    res.json({
      success: true,
      message: 'Strategy deleted successfully',
    });
  })
);


export default router;