import { z } from 'zod';

// Schema definitions
export const strategySchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.string(),
  config: z.record(z.any()),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

// Types
export type Strategy = z.infer<typeof strategySchema>;
export type CreateStrategy = Omit<Strategy, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type UpdateStrategy = Partial<CreateStrategy>;

// Query types
export const strategyQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
  isActive: z.boolean().optional(),
  type: z.string().optional()
});

export type StrategyQuery = z.infer<typeof strategyQuerySchema>;