import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Base Position schema
export const positionSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  strategyId: z.string().uuid().optional().nullable(),
  symbol: z.string(),
  side: z.string().uuid(),
  quantity: z.number(),
  avgEntryPrice: z.number(),
  avgExitPrice: z.number().optional().nullable(),
  realizedPnl: z.number().optional().default(0),
  unrealizedPnl: z.number().optional().default(0),
  fees: z.number().optional().default(0),
  status: z.string().default("open"),
  exchange: z.string(),
  openedAt: z.date(),
  closedAt: z.date().optional().nullable(),
  metadata: z.any().optional(),
});

// Create schema (omit id and timestamps)
export const createPositionSchema = positionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema (all fields optional except id)
export const updatePositionSchema = positionSchema.partial().extend({
  id: z.string().uuid(),
});

// Query params schema
export const positionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Types
export type Position = z.infer<typeof positionSchema>;
export type CreatePosition = z.infer<typeof createPositionSchema>;
export type UpdatePosition = z.infer<typeof updatePositionSchema>;
export type PositionQuery = z.infer<typeof positionQuerySchema>;

// Prisma types
export type PositionWithRelations = Prisma.positionGetPayload<{
}>;
