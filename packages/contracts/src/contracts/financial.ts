
import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { 
  AccountsResponse, 
  TransactionsResponse,
  AttachmentListResponse,
  AttachmentUploadResponse,
  Attachment
} from '../schemas/finance';

const c = initContract();

export const financialContract = c.router({
  // Accounts
  listAccounts: {
    method: 'GET',
    path: `/api/financial/accounts`,
    responses: { 200: AccountsResponse },
    query: z.object({ provider: z.string().optional() }),
    summary: 'List accounts',
  },

  // Attachments
  listAttachments: {
    method: 'GET',
    path: `/api/financial/:invoiceId/attachments`,
    pathParams: z.object({ invoiceId: z.string() }),
    query: z.object({ userId: z.string().optional() }),
    responses: { 
      200: AttachmentListResponse,
      500: z.object({ error: z.string() }),
    },
    summary: 'List attachments for an invoice',
  },

  uploadAttachment: {
    method: 'POST',
    path: `/api/financial/:invoiceId/attachments`,
    pathParams: z.object({ invoiceId: z.string() }),
    contentType: 'multipart/form-data',
    body: z.object({
      file: z.any(), // File upload
      description: z.string().optional(),
      checksum: z.string().optional(),
      userId: z.string().optional(),
    }),
    responses: { 
      201: AttachmentUploadResponse,
      400: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Upload attachment for an invoice',
  },

  downloadAttachment: {
    method: 'GET',
    path: `/api/financial/attachment/:id/download`,
    pathParams: z.object({ id: z.string() }),
    query: z.object({ userId: z.string().optional() }),
    responses: { 
      200: z.any(), // Binary file content
      404: z.object({ error: z.string() }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Download attachment by id',
  },

  // Health check
  health: {
    method: 'GET',
    path: '/api/financial/health',
    responses: { 
      200: z.object({
        success: z.boolean(),
        status: z.enum(['healthy', 'unhealthy', 'degraded']),
        services: z.object({
          database: z.enum(['healthy', 'degraded', 'error', 'unknown']),
          gocardless: z.enum(['healthy', 'degraded', 'error', 'unknown']),
          scheduler: z.enum(['healthy', 'degraded', 'error', 'unknown']),
        }),
        timestamp: z.string().datetime(),
      }),
      500: z.object({ error: z.string() }),
    },
    summary: 'Check health status of financial services',
  },
});
