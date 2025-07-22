import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Base Alert schema
export const alertSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  strategyId: z.string().uuid().optional().nullable(),
  type: z.string(),
  severity: z.string().default("info"),
  title: z.string(),
  message: z.string(),
  data: z.any().optional(),
});

// Create schema (omit id and timestamps)
export const createAlertSchema = alertSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema (all fields optional except id)
export const updateAlertSchema = alertSchema.partial().extend({
  id: z.string().uuid(),
});

// Query params schema
export const alertQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Types
export type Alert = z.infer<typeof alertSchema>;
export type CreateAlert = z.infer<typeof createAlertSchema>;
export type UpdateAlert = z.infer<typeof updateAlertSchema>;
export type AlertQuery = z.infer<typeof alertQuerySchema>;

// Prisma types
export type AlertWithRelations = Prisma.alertGetPayload<{
}>;
