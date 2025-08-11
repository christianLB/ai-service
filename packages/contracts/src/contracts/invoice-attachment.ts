import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  InvoiceAttachmentSchema,
  InvoiceAttachmentCreateSchema,
  InvoiceAttachmentUpdateSchema,
  InvoiceAttachmentResponseSchema,
  InvoiceAttachmentQuerySchema,
} from '../schemas/invoice-attachment';

const c = initContract();

// Common response schemas
const ErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.any().optional(),
});

const SuccessSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});

const PaginatedResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(dataSchema),
    pagination: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
    }),
  });

// Contract definition
export const invoiceAttachmentContract = c.router({
  // Get all invoiceAttachments with pagination and filtering
  getAll: {
    method: 'GET',
    path: '/api/financial/invoice-attachments',
    responses: {
      200: PaginatedResponseSchema(InvoiceAttachmentResponseSchema),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    query: InvoiceAttachmentQuerySchema,
    summary: 'Get all invoiceattachments with optional filtering and pagination',
  },

  // Get a single invoiceAttachment by ID
  getById: {
    method: 'GET',
    path: '/api/financial/invoice-attachments/:id',
    responses: {
      200: z.object({
        success: z.literal(true),
        data: InvoiceAttachmentResponseSchema,
      }),
      404: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Get a invoiceattachment by ID',
  },

  // Create a new invoiceAttachment
  create: {
    method: 'POST',
    path: '/api/financial/invoice-attachments',
    responses: {
      201: z.object({
        success: z.literal(true),
        data: InvoiceAttachmentResponseSchema,
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: InvoiceAttachmentCreateSchema,
    summary: 'Create a new invoiceattachment',
  },

  // Update an existing invoiceAttachment
  update: {
    method: 'PUT',
    path: '/api/financial/invoice-attachments/:id',
    responses: {
      200: z.object({
        success: z.literal(true),
        data: InvoiceAttachmentResponseSchema,
      }),
      404: ErrorSchema,
      400: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    body: InvoiceAttachmentUpdateSchema,
    summary: 'Update a invoiceattachment',
  },

  // Delete a invoiceAttachment
  delete: {
    method: 'DELETE',
    path: '/api/financial/invoice-attachments/:id',
    responses: {
      200: SuccessSchema,
      404: ErrorSchema,
      500: ErrorSchema,
    },
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    summary: 'Delete a invoiceattachment',
  },

  // Bulk create invoiceAttachments
  bulkCreate: {
    method: 'POST',
    path: '/api/financial/invoice-attachments/bulk',
    responses: {
      201: z.object({
        success: z.literal(true),
        data: z.array(InvoiceAttachmentResponseSchema),
        count: z.number(),
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: z.object({
      data: z.array(InvoiceAttachmentCreateSchema).min(1).max(100),
    }),
    summary: 'Create multiple invoiceattachments',
  },

  // Bulk update invoiceAttachments
  bulkUpdate: {
    method: 'PUT',
    path: '/api/financial/invoice-attachments/bulk',
    responses: {
      200: z.object({
        success: z.literal(true),
        count: z.number(),
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: z.object({
      where: InvoiceAttachmentQuerySchema,
      data: InvoiceAttachmentUpdateSchema,
    }),
    summary: 'Update multiple invoiceattachments',
  },

  // Bulk delete invoiceAttachments
  bulkDelete: {
    method: 'DELETE',
    path: '/api/financial/invoice-attachments/bulk',
    responses: {
      200: z.object({
        success: z.literal(true),
        count: z.number(),
      }),
      400: ErrorSchema,
      500: ErrorSchema,
    },
    body: z.object({
      ids: z.array(z.string().uuid()).min(1),
    }),
    summary: 'Delete multiple invoiceattachments',
  },
});