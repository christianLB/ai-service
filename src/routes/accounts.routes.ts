import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation';
import { accountsService } from '../services/accounts.service';
import { 
  createAccountsSchema, 
  updateAccountsSchema,
  accountsQuerySchema 
} from '../types/accounts.types';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/accountss
 * Get all accountss with pagination
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
    const queryParams = accountsQuerySchema.parse(req.query);
    const result = await accountsService.getAll(queryParams, req.user?.userId);
    
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/accountss/:id
 * Get a single accounts by ID
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid accounts ID'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const accounts = await accountsService.getById(req.params.id, req.user?.userId);
    
    res.json({
      success: true,
      data: accounts,
    });
  })
);

/**
 * POST /api/accountss
 * Create a new accounts
 */
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('description').optional({ nullable: true }).isString(),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = createAccountsSchema.parse(req.body);
    const accounts = await accountsService.create(data, req.user?.userId);
    
    logger.info(`Accounts created by user ${req.user?.email}`);
    
    res.status(201).json({
      success: true,
      data: accounts,
      message: 'Accounts created successfully',
    });
  })
);

/**
 * PUT /api/accountss/:id
 * Update a accounts
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid accounts ID'),
    body('name').optional().notEmpty(),
    body('description').optional({ nullable: true }).isString(),
    body('isActive').optional().isBoolean(),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = updateAccountsSchema.parse({ ...req.body, id: req.params.id });
    const accounts = await accountsService.update(req.params.id, data, req.user?.userId);
    
    logger.info(`Accounts ${req.params.id} updated by user ${req.user?.email}`);
    
    res.json({
      success: true,
      data: accounts,
      message: 'Accounts updated successfully',
    });
  })
);

/**
 * DELETE /api/accountss/:id
 * Delete a accounts
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid accounts ID'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    await accountsService.delete(req.params.id, req.user?.userId);
    
    logger.info(`Accounts ${req.params.id} deleted by user ${req.user?.email}`);
    
    res.json({
      success: true,
      message: 'Accounts deleted successfully',
    });
  })
);




export default router;