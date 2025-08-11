import { z } from 'zod';

// Common Zod schemas used across contracts

export const UUID = z.string().uuid();

export const ISODate = z.union([
  z.string().datetime(),
  z.date()
]).transform(val => typeof val === 'string' ? new Date(val) : val);

export const Decimal = z.union([
  z.number(),
  z.string()
]).transform(val => Number(val));

export const Money = Decimal;

export const Json = z.any();

export const PaginationQuery = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
});

export const ApiResponse = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const PaginatedResponse = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  items: z.array(dataSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});