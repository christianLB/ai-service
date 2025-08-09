import { z } from 'zod';
import { UUID, ISODate } from '../common';

/**
 * Zod schemas for EntityTag model
 * Auto-generated from Prisma schema
 */

// Base schema with all fields
export const EntityTagSchema = z.object({
  id: UUID,
  entityType: z.string().max(50),
  entityId: z.string().max(255),
  method: z.string().max(20),
  confidence: z.number(),
  appliedBy: z.string().max(255).optional(),
  aiProvider: z.string().max(50).optional(),
  aiModel: z.string().max(100).optional(),
  aiResponse: z.record(z.any()).optional(),
  aiReasoning: z.string().optional(),
  isVerified: z.boolean(),
  verifiedBy: z.string().max(255).optional(),
  verifiedAt: ISODate.optional(),
  feedback: z.string().optional(),
  isCorrect: z.boolean().optional(),
  sourceEntityType: z.string().max(50).optional(),
  sourceEntityId: z.string().max(255).optional(),
  relationshipType: z.string().max(50).optional(),
  createdAt: ISODate,
  updatedAt: ISODate,
  tagId: z.string(),
});

// Schema for creating new records (omits auto-generated fields)
export const EntityTagCreateSchema = EntityTagSchema.omit({
  id: true,
  confidence: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for updating records (all fields optional)
export const EntityTagUpdateSchema = EntityTagCreateSchema.partial();

// Schema for API responses (includes relations)
export const EntityTagResponseSchema = EntityTagSchema.extend({
});

// Schema for query parameters
export const EntityTagQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  
  // Sorting
  sortBy: z.enum([
    'id',
    'entityType',
    'entityId',
    'method',
    'confidence',
    'appliedBy',
    'aiProvider',
    'aiModel',
    'aiResponse',
    'aiReasoning',
    'isVerified',
    'verifiedBy',
    'verifiedAt',
    'feedback',
    'isCorrect',
    'sourceEntityType',
    'sourceEntityId',
    'relationshipType',
    'createdAt',
    'updatedAt',
    'tagId',
  ]).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Filtering
  search: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  method: z.string().optional(),
  confidence: z.coerce.number().optional(),
  appliedBy: z.string().optional(),
  aiProvider: z.string().optional(),
  aiModel: z.string().optional(),
  aiResponse: z.any().optional(),
  aiReasoning: z.string().optional(),
  isVerified: z.coerce.boolean().optional(),
  verifiedBy: z.string().optional(),
  verifiedAt: z.any().optional(),
  feedback: z.string().optional(),
  isCorrect: z.coerce.boolean().optional(),
  sourceEntityType: z.string().optional(),
  sourceEntityId: z.string().optional(),
  relationshipType: z.string().optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  tagId: z.string().optional(),
  
  // Relations to include
  include: z.object({
  }).optional(),
});

// Type exports for TypeScript
export type EntityTag = z.infer<typeof EntityTagSchema>;
export type EntityTagCreate = z.infer<typeof EntityTagCreateSchema>;
export type EntityTagUpdate = z.infer<typeof EntityTagUpdateSchema>;
export type EntityTagResponse = z.infer<typeof EntityTagResponseSchema>;
export type EntityTagQuery = z.infer<typeof EntityTagQuerySchema>;