import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Base Strategy schema
export const strategySchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional().nullable(),
  type: z.string(),
  status: z.string().default("active"),
  config: z.any(),
  metadata: z.any().optional(),
});

// Create schema (omit id and timestamps)
export const createStrategySchema = strategySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema (all fields optional except id)
export const updateStrategySchema = strategySchema.partial().extend({
  id: z.string().uuid(),
});

// Query params schema
export const strategyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Types
export type Strategy = z.infer<typeof strategySchema>;
export type CreateStrategy = z.infer<typeof createStrategySchema>;
export type UpdateStrategy = z.infer<typeof updateStrategySchema>;
export type StrategyQuery = z.infer<typeof strategyQuerySchema>;

// Prisma types
export type StrategyWithRelations = Prisma.strategyGetPayload<{
}>;
