import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Base Trade schema
export const tradeSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  strategyId: z.string().uuid().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  symbol: z.string(),
  side: z.string().uuid(),
  type: z.string(),
  quantity: z.number(),
  price: z.number(),
  avgFillPrice: z.number().optional().nullable(),
  fees: z.number().optional().default(0),
  status: z.string().default("pending"),
  exchange: z.string(),
  exchangeOrderId: z.string().uuid().optional().nullable(),
  metadata: z.any().optional(),
});

// Create schema (omit id and timestamps)
export const createTradeSchema = tradeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema (all fields optional except id)
export const updateTradeSchema = tradeSchema.partial().extend({
  id: z.string().uuid(),
});

// Query params schema
export const tradeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  symbol: z.string().optional(),
  status: z.enum(['pending', 'filled', 'cancelled']).optional(),
  strategyId: z.string().uuid().optional(),
  });

// Types
export type Trade = z.infer<typeof tradeSchema>;
export type CreateTrade = z.infer<typeof createTradeSchema>;
export type UpdateTrade = z.infer<typeof updateTradeSchema>;
export type TradeQuery = z.infer<typeof tradeQuerySchema>;

// Prisma types
export type TradeWithRelations = Prisma.tradeGetPayload<{
}>;
