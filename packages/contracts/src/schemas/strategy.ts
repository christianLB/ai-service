import { z } from 'zod';
import { UUID } from '../common';

/**
 * Zod schemas for Strategy model
 * Auto-generated from Prisma schema
 */

// Base schema with all fields
export const StrategySchema = z.object({
  id: UUID,
  userId: z.string().optional(),
  name: z.string().max(100),
  type: z.string().max(50),
  status: z.string().max(20),
  parameters: z.record(z.any()),
});

// Schema for creating new records (omits auto-generated fields)
export const StrategyCreateSchema = StrategySchema.omit({
  id: true,
  status: true,
  parameters: true,
});

// Schema for updating records (all fields optional)
export const StrategyUpdateSchema = StrategyCreateSchema.partial();

// Schema for API responses (includes relations)
export const StrategyResponseSchema = StrategySchema;

// Schema for query parameters
export const StrategyQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  
  // Sorting
  sortBy: z.enum([
    'id',
    'userId',
    'name',
    'type',
    'status',
    'parameters',
  ]).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Filtering
  search: z.string().optional(),
  userId: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  parameters: z.any().optional(),
  
  // Relations to include
});

// Type exports for TypeScript
export type Strategy = z.infer<typeof StrategySchema>;
export type StrategyCreate = z.infer<typeof StrategyCreateSchema>;
export type StrategyUpdate = z.infer<typeof StrategyUpdateSchema>;
export type StrategyResponse = z.infer<typeof StrategyResponseSchema>;
export type StrategyQuery = z.infer<typeof StrategyQuerySchema>;