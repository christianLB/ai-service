import { z } from 'zod';
import { UUID, ISODate, Money } from '../common';

/**
 * Zod schemas for MarketData model
 * Auto-generated from Prisma schema
 */

// Base schema with all fields
export const MarketDataSchema = z.object({
  id: UUID,
  exchangeId: z.string(),
  tradingPairId: z.string(),
  timestamp: ISODate,
  open: Money,
  high: Money,
  low: Money,
  close: Money,
  volume: Money,
  quoteVolume: Money.optional(),
  trades: z.number().int().optional(),
  timeframe: z.string().max(10),
  metadata: z.record(z.any()).optional(),
});

// Schema for creating new records (omits auto-generated fields)
export const MarketDataCreateSchema = MarketDataSchema.omit({
  id: true,
  metadata: true,
});

// Schema for updating records (all fields optional)
export const MarketDataUpdateSchema = MarketDataCreateSchema.partial();

// Schema for API responses (includes relations)
export const MarketDataResponseSchema = MarketDataSchema;

// Schema for query parameters
export const MarketDataQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  
  // Sorting
  sortBy: z.enum([
    'id',
    'exchangeId',
    'tradingPairId',
    'timestamp',
    'open',
    'high',
    'low',
    'close',
    'volume',
    'quoteVolume',
    'trades',
    'timeframe',
    'metadata',
  ]).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Filtering
  search: z.string().optional(),
  exchangeId: z.string().optional(),
  tradingPairId: z.string().optional(),
  timestamp: z.any().optional(),
  open: z.any().optional(),
  high: z.any().optional(),
  low: z.any().optional(),
  close: z.any().optional(),
  volume: z.any().optional(),
  quoteVolume: z.any().optional(),
  trades: z.coerce.number().optional(),
  timeframe: z.string().optional(),
  metadata: z.any().optional(),
  
  // Relations to include
});

// Type exports for TypeScript
export type MarketData = z.infer<typeof MarketDataSchema>;
export type MarketDataCreate = z.infer<typeof MarketDataCreateSchema>;
export type MarketDataUpdate = z.infer<typeof MarketDataUpdateSchema>;
export type MarketDataResponse = z.infer<typeof MarketDataResponseSchema>;
export type MarketDataQuery = z.infer<typeof MarketDataQuerySchema>;