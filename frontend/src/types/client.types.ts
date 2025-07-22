import { z } from 'zod';

// Zod schemas
export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().nullable(),
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
});

export const updateClientSchema = createClientSchema.partial();

export const clientQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Types
export type Client = z.infer<typeof createClientSchema> & {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateClient = z.infer<typeof createClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;
export type ClientQuery = z.infer<typeof clientQuerySchema>;

export interface ClientWithRelations extends Client {
  invoices?: any[];
  user?: any;
}