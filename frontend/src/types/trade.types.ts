import { z } from 'zod';

// Schema definitions
export const tradeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  strategyId: z.string().optional(),
  positionId: z.string().optional(),
  exchange: z.string(),
  symbol: z.string(),
  side: z.enum(['buy', 'sell']),
  quantity: z.number(),
  price: z.number(),
  fee: z.number().optional(),
  feeAsset: z.string().optional(),
  realizedPnl: z.number().optional(),
  executedAt: z.string(),
  createdAt: z.string()
});

// Types
export type Trade = z.infer<typeof tradeSchema>;
export type CreateTrade = Omit<Trade, 'id' | 'userId' | 'createdAt'>;
export type UpdateTrade = Partial<CreateTrade>;

// Query types
export const tradeQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
  strategyId: z.string().optional(),
  positionId: z.string().optional(),
  exchange: z.string().optional(),
  symbol: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export type TradeQuery = z.infer<typeof tradeQuerySchema>;