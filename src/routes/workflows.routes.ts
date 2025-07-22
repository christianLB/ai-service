import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
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
router.use(authMiddleware);

/**
 * GET /api/workflows
 * Get all workflows with pagination
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
    const queryParams = workflowsQuerySchema.parse(req.query);
    const result = await workflowsService.getAll(queryParams, req.user?.userId);
    
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/workflows/:id
 * Get a single workflow by ID
 */
router.get(
  '/:id',
  [
    param('id').isString().withMessage('Invalid workflow ID'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const workflow = await workflowsService.getById(req.params.id, req.user?.userId);
    
    res.json({
      success: true,
      data: workflow,
    });
  })
);

/**
 * POST /api/workflows
 * Create a new workflow
 */
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('workflow_data').notEmpty().withMessage('Workflow data is required'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = createWorkflowsSchema.parse(req.body);
    const workflow = await workflowsService.create(data, req.user?.userId);
    
    logger.info(`Workflow created by user ${req.user?.email}`);
    
    res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow created successfully',
    });
  })
);

/**
 * PUT /api/workflows/:id
 * Update a workflow
 */
router.put(
  '/:id',
  [
    param('id').isString().withMessage('Invalid workflow ID'),
    body('name').optional().notEmpty(),
    body('workflow_data').optional().notEmpty(),
    body('active').optional().isBoolean(),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = updateWorkflowsSchema.parse({ ...req.body, id: req.params.id });
    const workflow = await workflowsService.update(req.params.id, data, req.user?.userId);
    
    logger.info(`Workflow ${req.params.id} updated by user ${req.user?.email}`);
    
    res.json({
      success: true,
      data: workflow,
      message: 'Workflow updated successfully',
    });
  })
);

/**
 * DELETE /api/workflows/:id
 * Delete a workflow
 */
router.delete(
  '/:id',
  [
    param('id').isString().withMessage('Invalid workflow ID'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    await workflowsService.delete(req.params.id, req.user?.userId);
    
    logger.info(`Workflow ${req.params.id} deleted by user ${req.user?.email}`);
    
    res.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  })
);

export default router;