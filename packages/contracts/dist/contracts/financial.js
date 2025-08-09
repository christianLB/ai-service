"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financialContract = void 0;
const core_1 = require("@ts-rest/core");
const zod_1 = require("zod");
const finance_1 = require("../schemas/finance");
const c = (0, core_1.initContract)();
exports.financialContract = c.router({
    // Accounts
    listAccounts: {
        method: 'GET',
        path: `/api/financial/accounts`,
        responses: { 200: finance_1.AccountsResponse },
        query: zod_1.z.object({ provider: zod_1.z.string().optional() }),
        summary: 'List accounts',
    },
    // Attachments
    listAttachments: {
        method: 'GET',
        path: `/api/financial/:invoiceId/attachments`,
        pathParams: zod_1.z.object({ invoiceId: zod_1.z.string() }),
        query: zod_1.z.object({ userId: zod_1.z.string().optional() }),
        responses: {
            200: finance_1.AttachmentListResponse,
            500: zod_1.z.object({ error: zod_1.z.string() }),
        },
        summary: 'List attachments for an invoice',
    },
    uploadAttachment: {
        method: 'POST',
        path: `/api/financial/:invoiceId/attachments`,
        pathParams: zod_1.z.object({ invoiceId: zod_1.z.string() }),
        contentType: 'multipart/form-data',
        body: zod_1.z.object({
            file: zod_1.z.any(), // File upload
            description: zod_1.z.string().optional(),
            checksum: zod_1.z.string().optional(),
            userId: zod_1.z.string().optional(),
        }),
        responses: {
            201: finance_1.AttachmentUploadResponse,
            400: zod_1.z.object({ error: zod_1.z.string() }),
            500: zod_1.z.object({ error: zod_1.z.string() }),
        },
        summary: 'Upload attachment for an invoice',
    },
    downloadAttachment: {
        method: 'GET',
        path: `/api/financial/attachment/:id/download`,
        pathParams: zod_1.z.object({ id: zod_1.z.string() }),
        query: zod_1.z.object({ userId: zod_1.z.string().optional() }),
        responses: {
            200: zod_1.z.any(), // Binary file content
            404: zod_1.z.object({ error: zod_1.z.string() }),
            500: zod_1.z.object({ error: zod_1.z.string() }),
        },
        summary: 'Download attachment by id',
    },
    // Health check
    health: {
        method: 'GET',
        path: '/api/financial/health',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.boolean(),
                status: zod_1.z.enum(['healthy', 'unhealthy', 'degraded']),
                services: zod_1.z.object({
                    database: zod_1.z.enum(['healthy', 'degraded', 'error', 'unknown']),
                    gocardless: zod_1.z.enum(['healthy', 'degraded', 'error', 'unknown']),
                    scheduler: zod_1.z.enum(['healthy', 'degraded', 'error', 'unknown']),
                }),
                timestamp: zod_1.z.string().datetime(),
            }),
            500: zod_1.z.object({ error: zod_1.z.string() }),
        },
        summary: 'Check health status of financial services',
    },
});
