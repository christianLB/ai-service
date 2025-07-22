import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Base InvoiceTemplate schema
export const invoiceTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
  templateType: z.string().default("invoice"),
  htmlContent: z.string(),
  variables: z.any().default("[]"),
  metadata: z.any().optional().nullable(),
  updatedAt: z.date(),
});

// Create schema (omit id and timestamps)
export const createInvoiceTemplateSchema = invoiceTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema (all fields optional except id)
export const updateInvoiceTemplateSchema = invoiceTemplateSchema.partial().extend({
  id: z.string().uuid(),
});

// Query params schema
export const invoiceTemplateQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  // Add model-specific query filters here
});

// Types
export type InvoiceTemplate = z.infer<typeof invoiceTemplateSchema>;
export type CreateInvoiceTemplate = z.infer<typeof createInvoiceTemplateSchema>;
export type UpdateInvoiceTemplate = z.infer<typeof updateInvoiceTemplateSchema>;
export type InvoiceTemplateQuery = z.infer<typeof invoiceTemplateQuerySchema>;

// Prisma types
export type InvoiceTemplateWithRelations = Prisma.InvoiceTemplateGetPayload<{
  include: {
    user: true;
    invoices: true;
  };
}>;