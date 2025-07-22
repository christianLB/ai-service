import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation';
import { tradeService } from '../services/trade.service';
import { 
  createTradeSchema, 
  updateTradeSchema,
  tradeQuerySchema 
} from '../types/trade.types';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/trades
 * Get all trades with pagination
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
    const queryParams = tradeQuerySchema.parse(req.query);
    const result = await tradeService.getAll(queryParams, req.user?.userId);
    
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/trades/:id
 * Get a single trade by ID
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid trade ID'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const trade = await tradeService.getById(req.params.id, req.user?.userId);
    
    res.json({
      success: true,
      data: trade,
    });
  })
);

/**
 * POST /api/trades
 * Create a new trade
 */
router.post(
  '/',
  [
    body('userId').notEmpty().withMessage('Userid is required'),
    body('strategyId').optional({ nullable: true }).isString(),
    body('positionId').optional({ nullable: true }).isString(),
    body('symbol').notEmpty().withMessage('Symbol is required'),
    body('side').notEmpty().withMessage('Side is required'),
    body('type').notEmpty().withMessage('Type is required'),
    body('quantity').notEmpty().withMessage('Quantity is required'),
        body('price').notEmpty().withMessage('Price is required'),
        body('avgFillPrice').optional({ nullable: true }),
        body('fees').optional({ nullable: true }),
        body('status').notEmpty().withMessage('Status is required'),
    body('exchange').notEmpty().withMessage('Exchange is required'),
    body('exchangeOrderId').optional({ nullable: true }).isString(),
    body('metadata').optional({ nullable: true }),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = createTradeSchema.parse(req.body);
    const trade = await tradeService.create(data, req.user?.userId);
    
    logger.info(`Trade created by user ${req.user?.email}`);
    
    res.status(201).json({
      success: true,
      data: trade,
      message: 'Trade created successfully',
    });
  })
);

/**
 * PUT /api/trades/:id
 * Update a trade
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid trade ID'),
    body('userId').optional({ nullable: true }).isString(),
    body('strategyId').optional({ nullable: true }).isString(),
    body('positionId').optional({ nullable: true }).isString(),
    body('symbol').optional({ nullable: true }).isString(),
    body('side').optional({ nullable: true }).isString(),
    body('type').optional({ nullable: true }).isString(),
    body('quantity').optional({ nullable: true }),
        body('price').optional({ nullable: true }),
        body('avgFillPrice').optional({ nullable: true }),
        body('fees').optional({ nullable: true }),
        body('status').optional({ nullable: true }).isString(),
    body('exchange').optional({ nullable: true }).isString(),
    body('exchangeOrderId').optional({ nullable: true }).isString(),
    body('metadata').optional({ nullable: true }),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = updateTradeSchema.parse({ ...req.body, id: req.params.id });
    const trade = await tradeService.update(req.params.id, data, req.user?.userId);
    
    logger.info(`Trade ${req.params.id} updated by user ${req.user?.email}`);
    
    res.json({
      success: true,
      data: trade,
      message: 'Trade updated successfully',
    });
  })
);

/**
 * DELETE /api/trades/:id
 * Delete a trade
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid trade ID'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    await tradeService.delete(req.params.id, req.user?.userId);
    
    logger.info(`Trade ${req.params.id} deleted by user ${req.user?.email}`);
    
    res.json({
      success: true,
      message: 'Trade deleted successfully',
    });
  })
);


export default router;