import { z } from 'zod';

// Base Client schema
export const clientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  defaultCurrency: z.string().default('EUR'),
  paymentTerms: z.number().int().min(0).default(30),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Create schema (omit id and timestamps)
export const createClientSchema = clientSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema (all fields optional except id)
export const updateClientSchema = clientSchema.partial().extend({
  id: z.string().uuid(),
});

// Query params schema
export const clientQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  // Add model-specific query filters here
});

// Types
export type Client = z.infer<typeof clientSchema>;
export type CreateClient = z.infer<typeof createClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;
export type ClientQuery = z.infer<typeof clientQuerySchema>;

// Prisma types
import type { Client as PrismaClient } from '../lib/prisma';

export interface ClientWithRelations extends PrismaClient {
  invoices?: any[];
  user?: any;
}