import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  UniversalTagSchema,
  UniversalTagCreateSchema,
  UniversalTagUpdateSchema,
  UniversalTagResponseSchema,
  UniversalTagQuerySchema,
} from '../schemas/universal-tag';

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
export const universalTagContract = c.router({
  // Get all universalTags with pagination and filtering
  getAll: {
    method: 'GET',
    path: '/api/tagging/universal-tags',
    responses: {
      200: PaginatedResponseSchema(UniversalTagResponseSchema),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    query: UniversalTagQuerySchema,
    summary: 'Get all universaltags with optional filtering and pagination',
  },

  // Get a single universalTag by ID
  getById: {
    method: 'GET',
    path: '/api/tagging/universal-tags/:id',
    responses: {
      200: z.object({
        success: z.literal(true),
        data: UniversalTagResponseSchema,
      }),
      404: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Get a universaltag by ID',
  },

  // Create a new universalTag
  create: {
    method: 'POST',
    path: '/api/tagging/universal-tags',
    responses: {
      201: z.object({
        success: z.literal(true),
        data: UniversalTagResponseSchema,
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: UniversalTagCreateSchema,
    summary: 'Create a new universaltag',
  },

  // Update an existing universalTag
  update: {
    method: 'PUT',
    path: '/api/tagging/universal-tags/:id',
    responses: {
      200: z.object({
        success: z.literal(true),
        data: UniversalTagResponseSchema,
      }),
      404: ErrorSchema,
      400: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    body: UniversalTagUpdateSchema,
    summary: 'Update a universaltag',
  },

  // Delete a universalTag
  delete: {
    method: 'DELETE',
    path: '/api/tagging/universal-tags/:id',
    responses: {
      200: SuccessSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Delete a universaltag',
  },

  // Bulk create universalTags
  bulkCreate: {
    method: 'POST',
    path: '/api/tagging/universal-tags/bulk',
    responses: {
      201: z.object({
        success: z.literal(true),
        data: z.array(UniversalTagResponseSchema),
        count: z.number(),
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: z.object({
      data: z.array(UniversalTagCreateSchema).min(1).max(100),
    }),
    summary: 'Create multiple universaltags',
  },

  // Bulk update universalTags
  bulkUpdate: {
    method: 'PUT',
    path: '/api/tagging/universal-tags/bulk',
    responses: {
      200: z.object({
        success: z.literal(true),
        count: z.number(),
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: z.object({
      where: UniversalTagQuerySchema,
      data: UniversalTagUpdateSchema,
    }),
    summary: 'Update multiple universaltags',
  },

  // Bulk delete universalTags
  bulkDelete: {
    method: 'DELETE',
    path: '/api/tagging/universal-tags/bulk',
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
    summary: 'Delete multiple universaltags',
  },
});