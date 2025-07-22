import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { workflowsService } from '../services/workflows.service';
import { 
  createWorkflowsSchema, 
  updateWorkflowsSchema,
  workflowsQuerySchema 
} from '../types/workflows.types';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/workflowss
 * Get all workflowss with pagination
 */
router.get(
  '/',
  validateRequest([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString().trim(),
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ]),
  asyncHandler(async (req, res) => {
    const queryParams = workflowsQuerySchema.parse(req.query);
    const result = await workflowsService.getAll(queryParams, req.user?.id);
    
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/workflowss/:id
 * Get a single workflows by ID
 */
router.get(
  '/:id',
  validateRequest([
    param('id').isUUID().withMessage('Invalid workflows ID'),
  ]),
  asyncHandler(async (req, res) => {
    const workflows = await workflowsService.getById(req.params.id, req.user?.id);
    
    res.json({
      success: true,
      data: workflows,
    });
  })
);

/**
 * POST /api/workflowss
 * Create a new workflows
 */
router.post(
  '/',
  validateRequest([
    body('name').notEmpty().withMessage('Name is required'),
    body('description').optional({ nullable: true }).isString(),
      ]),
  asyncHandler(async (req, res) => {
    const data = createWorkflowsSchema.parse(req.body);
    const workflows = await workflowsService.create(data, req.user?.id);
    
    logger.info(`Workflows created by user ${req.user?.email}`);
    
    res.status(201).json({
      success: true,
      data: workflows,
      message: 'Workflows created successfully',
    });
  })
);

/**
 * PUT /api/workflowss/:id
 * Update a workflows
 */
router.put(
  '/:id',
  validateRequest([
    param('id').isUUID().withMessage('Invalid workflows ID'),
    body('name').optional().notEmpty(),
    body('description').optional({ nullable: true }).isString(),
    body('isActive').optional().isBoolean(),
      ]),
  asyncHandler(async (req, res) => {
    const data = updateWorkflowsSchema.parse({ ...req.body, id: req.params.id });
    const workflows = await workflowsService.update(req.params.id, data, req.user?.id);
    
    logger.info(`Workflows ${req.params.id} updated by user ${req.user?.email}`);
    
    res.json({
      success: true,
      data: workflows,
      message: 'Workflows updated successfully',
    });
  })
);

/**
 * DELETE /api/workflowss/:id
 * Delete a workflows
 */
router.delete(
  '/:id',
  validateRequest([
    param('id').isUUID().withMessage('Invalid workflows ID'),
  ]),
  asyncHandler(async (req, res) => {
    await workflowsService.delete(req.params.id, req.user?.id);
    
    logger.info(`Workflows ${req.params.id} deleted by user ${req.user?.email}`);
    
    res.json({
      success: true,
      message: 'Workflows deleted successfully',
    });
  })
);




export default router;