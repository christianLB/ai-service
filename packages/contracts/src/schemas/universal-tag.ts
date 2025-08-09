import { z } from 'zod';
import { UUID, ISODate } from '../common';

/**
 * Zod schemas for UniversalTag model
 * Auto-generated from Prisma schema
 */

// Base schema with all fields
export const UniversalTagSchema = z.object({
  id: UUID,
  code: z.string().max(100),
  name: z.string().max(255),
  description: z.string().optional(),
  entityTypes: z.string(),
  patterns: z.record(z.any()).optional(),
  rules: z.record(z.any()).optional(),
  confidence: z.number(),
  embeddingModel: z.string().max(50).optional(),
  path: z.string(),
  level: z.number().int(),
  color: z.string().max(7).optional(),
  icon: z.string().max(50).optional(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  metadata: z.record(z.any()).optional(),
  usageCount: z.number().int(),
  successRate: z.number(),
  lastUsed: ISODate.optional(),
  createdAt: ISODate,
  updatedAt: ISODate,
  parentId: z.string().optional(),
  entityTags: z.string(),
});

// Schema for creating new records (omits auto-generated fields)
export const UniversalTagCreateSchema = UniversalTagSchema.omit({
  id: true,
  confidence: true,
  level: true,
  isActive: true,
  isSystem: true,
  usageCount: true,
  successRate: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for updating records (all fields optional)
export const UniversalTagUpdateSchema = UniversalTagCreateSchema.partial();

// Schema for API responses (includes relations)
export const UniversalTagResponseSchema = UniversalTagSchema.extend({
});

// Schema for query parameters
export const UniversalTagQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  
  // Sorting
  sortBy: z.enum([
    'id',
    'code',
    'name',
    'description',
    'entityTypes',
    'patterns',
    'rules',
    'confidence',
    'embeddingModel',
    'path',
    'level',
    'color',
    'icon',
    'isActive',
    'isSystem',
    'metadata',
    'usageCount',
    'successRate',
    'lastUsed',
    'createdAt',
    'updatedAt',
    'parentId',
    'entityTags',
  ]).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Filtering
  search: z.string().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  entityTypes: z.string().optional(),
  patterns: z.any().optional(),
  rules: z.any().optional(),
  confidence: z.coerce.number().optional(),
  embeddingModel: z.string().optional(),
  path: z.string().optional(),
  level: z.coerce.number().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isSystem: z.coerce.boolean().optional(),
  metadata: z.any().optional(),
  usageCount: z.coerce.number().optional(),
  successRate: z.coerce.number().optional(),
  lastUsed: z.any().optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  parentId: z.string().optional(),
  entityTags: z.any().optional(),
  
  // Relations to include
  include: z.object({
  }).optional(),
});

// Type exports for TypeScript
export type UniversalTag = z.infer<typeof UniversalTagSchema>;
export type UniversalTagCreate = z.infer<typeof UniversalTagCreateSchema>;
export type UniversalTagUpdate = z.infer<typeof UniversalTagUpdateSchema>;
export type UniversalTagResponse = z.infer<typeof UniversalTagResponseSchema>;
export type UniversalTagQuery = z.infer<typeof UniversalTagQuerySchema>;