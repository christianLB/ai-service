import { z } from 'zod';
import { UUID, ISODate } from '../common';

/**
 * Zod schemas for InvoiceAttachment model
 * Auto-generated from Prisma schema
 */

// Base schema with all fields
export const InvoiceAttachmentSchema = z.object({
  id: UUID,
  invoiceId: z.string(),
  fileName: z.string().max(255),
  filePath: z.string(),
  fileSize: z.string(),
  fileType: z.string().max(100),
  description: z.string().optional(),
  uploadedBy: z.string().max(255),
  uploadedAt: ISODate,
  isDeleted: z.boolean(),
  deletedAt: ISODate.optional(),
  deletedBy: z.string().max(255).optional(),
});

// Schema for creating new records (omits auto-generated fields)
export const InvoiceAttachmentCreateSchema = InvoiceAttachmentSchema.omit({
  id: true,
  uploadedAt: true,
  isDeleted: true,
});

// Schema for updating records (all fields optional)
export const InvoiceAttachmentUpdateSchema = InvoiceAttachmentCreateSchema.partial();

// Schema for API responses (includes relations)
export const InvoiceAttachmentResponseSchema = InvoiceAttachmentSchema.extend({
});

// Schema for query parameters
export const InvoiceAttachmentQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  
  // Sorting
  sortBy: z.enum([
    'id',
    'invoiceId',
    'fileName',
    'filePath',
    'fileSize',
    'fileType',
    'description',
    'uploadedBy',
    'uploadedAt',
    'isDeleted',
    'deletedAt',
    'deletedBy',
  ]).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Filtering
  search: z.string().optional(),
  invoiceId: z.string().optional(),
  fileName: z.string().optional(),
  filePath: z.string().optional(),
  fileSize: z.any().optional(),
  fileType: z.string().optional(),
  description: z.string().optional(),
  uploadedBy: z.string().optional(),
  uploadedAt: z.any().optional(),
  isDeleted: z.coerce.boolean().optional(),
  deletedAt: z.any().optional(),
  deletedBy: z.string().optional(),
  
  // Relations to include
  include: z.object({
  }).optional(),
});

// Type exports for TypeScript
export type InvoiceAttachment = z.infer<typeof InvoiceAttachmentSchema>;
export type InvoiceAttachmentCreate = z.infer<typeof InvoiceAttachmentCreateSchema>;
export type InvoiceAttachmentUpdate = z.infer<typeof InvoiceAttachmentUpdateSchema>;
export type InvoiceAttachmentResponse = z.infer<typeof InvoiceAttachmentResponseSchema>;
export type InvoiceAttachmentQuery = z.infer<typeof InvoiceAttachmentQuerySchema>;