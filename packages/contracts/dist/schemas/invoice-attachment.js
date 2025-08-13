"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceAttachmentQuerySchema = exports.InvoiceAttachmentResponseSchema = exports.InvoiceAttachmentUpdateSchema = exports.InvoiceAttachmentCreateSchema = exports.InvoiceAttachmentSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("../common");
/**
 * Zod schemas for InvoiceAttachment model
 * Auto-generated from Prisma schema
 */
// Base schema with all fields
exports.InvoiceAttachmentSchema = zod_1.z.object({
    id: common_1.UUID,
    invoiceId: zod_1.z.string(),
    fileName: zod_1.z.string().max(255),
    filePath: zod_1.z.string(),
    fileSize: zod_1.z.string(),
    fileType: zod_1.z.string().max(100),
    description: zod_1.z.string().optional(),
    uploadedBy: zod_1.z.string().max(255),
    uploadedAt: common_1.ISODate,
    isDeleted: zod_1.z.boolean(),
    deletedAt: common_1.ISODate.optional(),
    deletedBy: zod_1.z.string().max(255).optional(),
});
// Schema for creating new records (omits auto-generated fields)
exports.InvoiceAttachmentCreateSchema = exports.InvoiceAttachmentSchema.omit({
    id: true,
    uploadedAt: true,
    isDeleted: true,
});
// Schema for updating records (all fields optional)
exports.InvoiceAttachmentUpdateSchema = exports.InvoiceAttachmentCreateSchema.partial();
// Schema for API responses (includes relations)
exports.InvoiceAttachmentResponseSchema = exports.InvoiceAttachmentSchema.extend({});
// Schema for query parameters
exports.InvoiceAttachmentQuerySchema = zod_1.z.object({
    // Pagination
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    // Sorting
    sortBy: zod_1.z.enum([
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
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
    // Filtering
    search: zod_1.z.string().optional(),
    invoiceId: zod_1.z.string().optional(),
    fileName: zod_1.z.string().optional(),
    filePath: zod_1.z.string().optional(),
    fileSize: zod_1.z.any().optional(),
    fileType: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    uploadedBy: zod_1.z.string().optional(),
    uploadedAt: zod_1.z.any().optional(),
    isDeleted: zod_1.z.coerce.boolean().optional(),
    deletedAt: zod_1.z.any().optional(),
    deletedBy: zod_1.z.string().optional(),
    // Relations to include
    include: zod_1.z.object({}).optional(),
});
