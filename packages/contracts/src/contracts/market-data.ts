import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  MarketDataSchema,
  MarketDataCreateSchema,
  MarketDataUpdateSchema,
  MarketDataResponseSchema,
  MarketDataQuerySchema,
} from '../schemas/market-data';

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
export const marketDataContract = c.router({
  // Get all marketDatas with pagination and filtering
  getAll: {
    method: 'GET',
    path: '/api/public/market-datas',
    responses: {
      200: PaginatedResponseSchema(MarketDataResponseSchema),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    query: MarketDataQuerySchema,
    summary: 'Get all marketdatas with optional filtering and pagination',
  },

  // Get a single marketData by ID
  getById: {
    method: 'GET',
    path: '/api/public/market-datas/:id',
    responses: {
      200: z.object({
        success: z.literal(true),
        data: MarketDataResponseSchema,
      }),
      404: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Get a marketdata by ID',
  },

  // Create a new marketData
  create: {
    method: 'POST',
    path: '/api/public/market-datas',
    responses: {
      201: z.object({
        success: z.literal(true),
        data: MarketDataResponseSchema,
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: MarketDataCreateSchema,
    summary: 'Create a new marketdata',
  },

  // Update an existing marketData
  update: {
    method: 'PUT',
    path: '/api/public/market-datas/:id',
    responses: {
      200: z.object({
        success: z.literal(true),
        data: MarketDataResponseSchema,
      }),
      404: ErrorSchema,
      400: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    body: MarketDataUpdateSchema,
    summary: 'Update a marketdata',
  },

  // Delete a marketData
  delete: {
    method: 'DELETE',
    path: '/api/public/market-datas/:id',
    responses: {
      200: SuccessSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Delete a marketdata',
  },

  // Bulk create marketDatas
  bulkCreate: {
    method: 'POST',
    path: '/api/public/market-datas/bulk',
    responses: {
      201: z.object({
        success: z.literal(true),
        data: z.array(MarketDataResponseSchema),
        count: z.number(),
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: z.object({
      data: z.array(MarketDataCreateSchema).min(1).max(100),
    }),
    summary: 'Create multiple marketdatas',
  },

  // Bulk update marketDatas
  bulkUpdate: {
    method: 'PUT',
    path: '/api/public/market-datas/bulk',
    responses: {
      200: z.object({
        success: z.literal(true),
        count: z.number(),
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: z.object({
      where: MarketDataQuerySchema,
      data: MarketDataUpdateSchema,
    }),
    summary: 'Update multiple marketdatas',
  },

  // Bulk delete marketDatas
  bulkDelete: {
    method: 'DELETE',
    path: '/api/public/market-datas/bulk',
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
    summary: 'Delete multiple marketdatas',
  },
});