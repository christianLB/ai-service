import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  EntityTagSchema,
  EntityTagCreateSchema,
  EntityTagUpdateSchema,
  EntityTagResponseSchema,
  EntityTagQuerySchema,
} from '../schemas/entity-tag';

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
export const entityTagContract = c.router({
  // Get all entityTags with pagination and filtering
  getAll: {
    method: 'GET',
    path: '/api/tagging/entity-tags',
    responses: {
      200: PaginatedResponseSchema(EntityTagResponseSchema),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    query: EntityTagQuerySchema,
    summary: 'Get all entitytags with optional filtering and pagination',
  },

  // Get a single entityTag by ID
  getById: {
    method: 'GET',
    path: '/api/tagging/entity-tags/:id',
    responses: {
      200: z.object({
        success: z.literal(true),
        data: EntityTagResponseSchema,
      }),
      404: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Get a entitytag by ID',
  },

  // Create a new entityTag
  create: {
    method: 'POST',
    path: '/api/tagging/entity-tags',
    responses: {
      201: z.object({
        success: z.literal(true),
        data: EntityTagResponseSchema,
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: EntityTagCreateSchema,
    summary: 'Create a new entitytag',
  },

  // Update an existing entityTag
  update: {
    method: 'PUT',
    path: '/api/tagging/entity-tags/:id',
    responses: {
      200: z.object({
        success: z.literal(true),
        data: EntityTagResponseSchema,
      }),
      404: ErrorSchema,
      400: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    body: EntityTagUpdateSchema,
    summary: 'Update a entitytag',
  },

  // Delete a entityTag
  delete: {
    method: 'DELETE',
    path: '/api/tagging/entity-tags/:id',
    responses: {
      200: SuccessSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Delete a entitytag',
  },

  // Bulk create entityTags
  bulkCreate: {
    method: 'POST',
    path: '/api/tagging/entity-tags/bulk',
    responses: {
      201: z.object({
        success: z.literal(true),
        data: z.array(EntityTagResponseSchema),
        count: z.number(),
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: z.object({
      data: z.array(EntityTagCreateSchema).min(1).max(100),
    }),
    summary: 'Create multiple entitytags',
  },

  // Bulk update entityTags
  bulkUpdate: {
    method: 'PUT',
    path: '/api/tagging/entity-tags/bulk',
    responses: {
      200: z.object({
        success: z.literal(true),
        count: z.number(),
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: z.object({
      where: EntityTagQuerySchema,
      data: EntityTagUpdateSchema,
    }),
    summary: 'Update multiple entitytags',
  },

  // Bulk delete entityTags
  bulkDelete: {
    method: 'DELETE',
    path: '/api/tagging/entity-tags/bulk',
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
    summary: 'Delete multiple entitytags',
  },
});