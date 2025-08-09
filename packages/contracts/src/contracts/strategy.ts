import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  StrategySchema,
  StrategyCreateSchema,
  StrategyUpdateSchema,
  StrategyResponseSchema,
  StrategyQuerySchema,
} from '../schemas/strategy';

const c = initContract();

// Common response schemas
const ErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.any().optional(),
});

const SuccessSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});

const PaginatedResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(dataSchema),
    pagination: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    }),
  });

// Contract definition
export const strategyContract = c.router({
  // Get all strategys with pagination and filtering
  getAll: {
    method: 'GET',
    path: '/api/public/strategys',
    responses: {
      200: PaginatedResponseSchema(StrategyResponseSchema),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    query: StrategyQuerySchema,
    summary: 'Get all strategys with optional filtering and pagination',
  },

  // Get a single strategy by ID
  getById: {
    method: 'GET',
    path: '/api/public/strategys/:id',
    responses: {
      200: z.object({
        success: z.literal(true),
        data: StrategyResponseSchema,
      }),
      404: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Get a strategy by ID',
  },

  // Create a new strategy
  create: {
    method: 'POST',
    path: '/api/public/strategys',
    responses: {
      201: z.object({
        success: z.literal(true),
        data: StrategyResponseSchema,
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: StrategyCreateSchema,
    summary: 'Create a new strategy',
  },

  // Update an existing strategy
  update: {
    method: 'PUT',
    path: '/api/public/strategys/:id',
    responses: {
      200: z.object({
        success: z.literal(true),
        data: StrategyResponseSchema,
      }),
      404: ErrorSchema,
      400: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    body: StrategyUpdateSchema,
    summary: 'Update a strategy',
  },

  // Delete a strategy
  delete: {
    method: 'DELETE',
    path: '/api/public/strategys/:id',
    responses: {
      200: SuccessSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Delete a strategy',
  },

  // Bulk create strategys
  bulkCreate: {
    method: 'POST',
    path: '/api/public/strategys/bulk',
    responses: {
      201: z.object({
        success: z.literal(true),
        data: z.array(StrategyResponseSchema),
        count: z.number(),
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: z.object({
      data: z.array(StrategyCreateSchema).min(1).max(100),
    }),
    summary: 'Create multiple strategys',
  },

  // Bulk update strategys
  bulkUpdate: {
    method: 'PUT',
    path: '/api/public/strategys/bulk',
    responses: {
      200: z.object({
        success: z.literal(true),
        count: z.number(),
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: z.object({
      where: StrategyQuerySchema,
      data: StrategyUpdateSchema,
    }),
    summary: 'Update multiple strategys',
  },

  // Bulk delete strategys
  bulkDelete: {
    method: 'DELETE',
    path: '/api/public/strategys/bulk',
    responses: {
      200: z.object({
        success: z.literal(true),
        count: z.number(),
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: z.object({
      ids: z.array(z.string().uuid()).min(1),
    }),
    summary: 'Delete multiple strategys',
  },
});