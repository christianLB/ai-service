import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Base Accounts schema
export const accountsSchema = z.object({
  id: z.string().uuid().optional(),
  account_id: z.string(),
  name: z.string(),
  type: z.string(),
  currency_id: z.string().uuid().optional().nullable(),
  balance: z.number().optional().default(0),
  available_balance: z.number().optional().default(0),
  institution: z.string().optional().nullable(),
  institution_id: z.string().optional().nullable(),
  requisition_id: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  wallet_address: z.string().optional().nullable(),
  chain_id: z.string().optional().nullable(),
  exchange_name: z.string().optional().nullable(),
  metadata: z.any().optional(),
  is_active: z.boolean().optional().default(true),
  last_sync: z.date().optional().nullable(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// Create schema (omit id and timestamps)
export const createAccountsSchema = accountsSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Update schema (all fields optional except id)
export const updateAccountsSchema = accountsSchema.partial().extend({
  id: z.string().uuid(),
});

// Query params schema
export const accountsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Types
export type Accounts = z.infer<typeof accountsSchema>;
export type CreateAccounts = z.infer<typeof createAccountsSchema>;
export type UpdateAccounts = z.infer<typeof updateAccountsSchema>;
export type AccountsQuery = z.infer<typeof accountsQuerySchema>;

// Prisma types
export type AccountsWithRelations = Prisma.accountsGetPayload<{}>;
