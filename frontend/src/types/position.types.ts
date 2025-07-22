import { z } from 'zod';

// Schema definitions
export const positionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  strategyId: z.string().optional(),
  exchange: z.string(),
  symbol: z.string(),
  side: z.enum(['buy', 'sell']),
  quantity: z.number(),
  entryPrice: z.number(),
  currentPrice: z.number().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
  status: z.enum(['open', 'closed', 'pending']),
  openedAt: z.string(),
  closedAt: z.string().optional(),
  realizedPnl: z.number().optional(),
  unrealizedPnl: z.number().optional()
});

// Types
export type Position = z.infer<typeof positionSchema>;
export type CreatePosition = Omit<Position, 'id' | 'openedAt' | 'currentPrice' | 'realizedPnl' | 'unrealizedPnl'>;
export type UpdatePosition = Partial<CreatePosition>;

// Query types
export const positionQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
  status: z.enum(['open', 'closed', 'all']).optional(),
  exchange: z.string().optional(),
  symbol: z.string().optional()
});

export type PositionQuery = z.infer<typeof positionQuerySchema>;