import { Router } from 'express';
import { z } from 'zod';
import { validateRequest, parsePagination, formatError } from '@ai/http-utils';
import { ClientsController } from './clients.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();
const clientsController = new ClientsController();

// Example of list endpoint with pagination validation
router.get(
  '/',
  authMiddleware,
  validateRequest({
    query: z.object({
      // Pagination params handled by parsePagination
      page: z.union([z.string(), z.number()]).optional(),
      limit: z.union([z.string(), z.number()]).optional(),
      // Other filters
      status: z.enum(['active', 'inactive', 'pending']).optional(),
      search: z.string().optional(),
      sortBy: z.enum(['name', 'email', 'createdAt']).optional().default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    }),
  }),
  async (req, res) => {
    try {
      // Parse pagination with validation
      const _pagination = parsePagination(req.query);

      // Controller would use pagination.skip and pagination.limit
      await clientsController.listClients(req, res);
    } catch (error) {
      const { status, body } = formatError(error);
      res.status(status).json(body);
    }
  }
);

// Example of get by ID with param validation
router.get(
  '/:id',
  authMiddleware,
  validateRequest({
    params: z.object({
      id: z.string().uuid('Invalid client ID format'),
    }),
  }),
  async (req, res) => {
    try {
      await clientsController.getClient(req, res);
    } catch (error) {
      const { status, body } = formatError(error);
      res.status(status).json(body);
    }
  }
);

// Example of create with body validation
router.post(
  '/',
  authMiddleware,
  validateRequest({
    body: z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email format'),
      taxId: z.string().optional(),
      address: z
        .object({
          street: z.string(),
          city: z.string(),
          postalCode: z.string(),
          country: z.string(),
        })
        .optional(),
      metadata: z.record(z.unknown()).optional(),
    }),
  }),
  async (req, res) => {
    try {
      await clientsController.createClient(req, res);
    } catch (error) {
      const { status, body } = formatError(error);
      res.status(status).json(body);
    }
  }
);

export default router;
