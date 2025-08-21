"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceAttachmentContract = void 0;
const core_1 = require("@ts-rest/core");
const zod_1 = require("zod");
const invoice_attachment_1 = require("../schemas/invoice-attachment");
const c = (0, core_1.initContract)();
// Common response schemas
const ErrorSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    error: zod_1.z.string(),
    details: zod_1.z.any().optional(),
});
const SuccessSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string().optional(),
});
const PaginatedResponseSchema = (dataSchema) => zod_1.z.object({
    success: zod_1.z.literal(true),
    data: zod_1.z.array(dataSchema),
    pagination: zod_1.z.object({
        total: zod_1.z.number(),
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
        totalPages: zod_1.z.number(),
    }),
});
// Contract definition
exports.invoiceAttachmentContract = c.router({
    // Get all invoiceAttachments with pagination and filtering
    getAll: {
        method: 'GET',
        path: '/api/financial/invoice-attachments',
        responses: {
            200: PaginatedResponseSchema(invoice_attachment_1.InvoiceAttachmentResponseSchema),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        query: invoice_attachment_1.InvoiceAttachmentQuerySchema,
        summary: 'Get all invoiceattachments with optional filtering and pagination',
    },
    // Get a single invoiceAttachment by ID
    getById: {
        method: 'GET',
        path: '/api/financial/invoice-attachments/:id',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: invoice_attachment_1.InvoiceAttachmentResponseSchema,
            }),
            404: ErrorSchema,
            500: ErrorSchema,
        },
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        summary: 'Get a invoiceattachment by ID',
    },
    // Create a new invoiceAttachment
    create: {
        method: 'POST',
        path: '/api/financial/invoice-attachments',
        responses: {
            201: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: invoice_attachment_1.InvoiceAttachmentResponseSchema,
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: invoice_attachment_1.InvoiceAttachmentCreateSchema,
        summary: 'Create a new invoiceattachment',
    },
    // Update an existing invoiceAttachment
    update: {
        method: 'PUT',
        path: '/api/financial/invoice-attachments/:id',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: invoice_attachment_1.InvoiceAttachmentResponseSchema,
            }),
            404: ErrorSchema,
            400: ErrorSchema,
            500: ErrorSchema,
        },
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        body: invoice_attachment_1.InvoiceAttachmentUpdateSchema,
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
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        summary: 'Delete a invoiceattachment',
    },
    // Bulk create invoiceAttachments
    bulkCreate: {
        method: 'POST',
        path: '/api/financial/invoice-attachments/bulk',
        responses: {
            201: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: zod_1.z.array(invoice_attachment_1.InvoiceAttachmentResponseSchema),
                count: zod_1.z.number(),
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: zod_1.z.object({
            data: zod_1.z.array(invoice_attachment_1.InvoiceAttachmentCreateSchema).min(1).max(100),
        }),
        summary: 'Create multiple invoiceattachments',
    },
    // Bulk update invoiceAttachments
    bulkUpdate: {
        method: 'PUT',
        path: '/api/financial/invoice-attachments/bulk',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                count: zod_1.z.number(),
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: zod_1.z.object({
            where: invoice_attachment_1.InvoiceAttachmentQuerySchema,
            data: invoice_attachment_1.InvoiceAttachmentUpdateSchema,
        }),
        summary: 'Update multiple invoiceattachments',
    },
    // Bulk delete invoiceAttachments
    bulkDelete: {
        method: 'DELETE',
        path: '/api/financial/invoice-attachments/bulk',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                count: zod_1.z.number(),
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: zod_1.z.object({
            ids: zod_1.z.array(zod_1.z.string().uuid()).min(1),
        }),
        summary: 'Delete multiple invoiceattachments',
    },
});
