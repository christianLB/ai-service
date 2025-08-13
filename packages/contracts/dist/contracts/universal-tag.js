"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.universalTagContract = void 0;
const core_1 = require("@ts-rest/core");
const zod_1 = require("zod");
const universal_tag_1 = require("../schemas/universal-tag");
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
exports.universalTagContract = c.router({
    // Get all universalTags with pagination and filtering
    getAll: {
        method: 'GET',
        path: '/api/tagging/universal-tags',
        responses: {
            200: PaginatedResponseSchema(universal_tag_1.UniversalTagResponseSchema),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        query: universal_tag_1.UniversalTagQuerySchema,
        summary: 'Get all universaltags with optional filtering and pagination',
    },
    // Get a single universalTag by ID
    getById: {
        method: 'GET',
        path: '/api/tagging/universal-tags/:id',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: universal_tag_1.UniversalTagResponseSchema,
            }),
            404: ErrorSchema,
            500: ErrorSchema,
        },
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        summary: 'Get a universaltag by ID',
    },
    // Create a new universalTag
    create: {
        method: 'POST',
        path: '/api/tagging/universal-tags',
        responses: {
            201: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: universal_tag_1.UniversalTagResponseSchema,
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: universal_tag_1.UniversalTagCreateSchema,
        summary: 'Create a new universaltag',
    },
    // Update an existing universalTag
    update: {
        method: 'PUT',
        path: '/api/tagging/universal-tags/:id',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: universal_tag_1.UniversalTagResponseSchema,
            }),
            404: ErrorSchema,
            400: ErrorSchema,
            500: ErrorSchema,
        },
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        body: universal_tag_1.UniversalTagUpdateSchema,
        summary: 'Update a universaltag',
    },
    // Delete a universalTag
    delete: {
        method: 'DELETE',
        path: '/api/tagging/universal-tags/:id',
        responses: {
            200: SuccessSchema,
            404: ErrorSchema,
            500: ErrorSchema,
        },
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        summary: 'Delete a universaltag',
    },
    // Bulk create universalTags
    bulkCreate: {
        method: 'POST',
        path: '/api/tagging/universal-tags/bulk',
        responses: {
            201: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: zod_1.z.array(universal_tag_1.UniversalTagResponseSchema),
                count: zod_1.z.number(),
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: zod_1.z.object({
            data: zod_1.z.array(universal_tag_1.UniversalTagCreateSchema).min(1).max(100),
        }),
        summary: 'Create multiple universaltags',
    },
    // Bulk update universalTags
    bulkUpdate: {
        method: 'PUT',
        path: '/api/tagging/universal-tags/bulk',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                count: zod_1.z.number(),
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: zod_1.z.object({
            where: universal_tag_1.UniversalTagQuerySchema,
            data: universal_tag_1.UniversalTagUpdateSchema,
        }),
        summary: 'Update multiple universaltags',
    },
    // Bulk delete universalTags
    bulkDelete: {
        method: 'DELETE',
        path: '/api/tagging/universal-tags/bulk',
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
        summary: 'Delete multiple universaltags',
    },
});
