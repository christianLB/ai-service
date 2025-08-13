"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entityTagContract = void 0;
const core_1 = require("@ts-rest/core");
const zod_1 = require("zod");
const entity_tag_1 = require("../schemas/entity-tag");
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
exports.entityTagContract = c.router({
    // Get all entityTags with pagination and filtering
    getAll: {
        method: 'GET',
        path: '/api/tagging/entity-tags',
        responses: {
            200: PaginatedResponseSchema(entity_tag_1.EntityTagResponseSchema),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        query: entity_tag_1.EntityTagQuerySchema,
        summary: 'Get all entitytags with optional filtering and pagination',
    },
    // Get a single entityTag by ID
    getById: {
        method: 'GET',
        path: '/api/tagging/entity-tags/:id',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: entity_tag_1.EntityTagResponseSchema,
            }),
            404: ErrorSchema,
            500: ErrorSchema,
        },
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        summary: 'Get a entitytag by ID',
    },
    // Create a new entityTag
    create: {
        method: 'POST',
        path: '/api/tagging/entity-tags',
        responses: {
            201: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: entity_tag_1.EntityTagResponseSchema,
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: entity_tag_1.EntityTagCreateSchema,
        summary: 'Create a new entitytag',
    },
    // Update an existing entityTag
    update: {
        method: 'PUT',
        path: '/api/tagging/entity-tags/:id',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: entity_tag_1.EntityTagResponseSchema,
            }),
            404: ErrorSchema,
            400: ErrorSchema,
            500: ErrorSchema,
        },
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        body: entity_tag_1.EntityTagUpdateSchema,
        summary: 'Update a entitytag',
    },
    // Delete a entityTag
    delete: {
        method: 'DELETE',
        path: '/api/tagging/entity-tags/:id',
        responses: {
            200: SuccessSchema,
            404: ErrorSchema,
            500: ErrorSchema,
        },
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        summary: 'Delete a entitytag',
    },
    // Bulk create entityTags
    bulkCreate: {
        method: 'POST',
        path: '/api/tagging/entity-tags/bulk',
        responses: {
            201: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: zod_1.z.array(entity_tag_1.EntityTagResponseSchema),
                count: zod_1.z.number(),
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: zod_1.z.object({
            data: zod_1.z.array(entity_tag_1.EntityTagCreateSchema).min(1).max(100),
        }),
        summary: 'Create multiple entitytags',
    },
    // Bulk update entityTags
    bulkUpdate: {
        method: 'PUT',
        path: '/api/tagging/entity-tags/bulk',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                count: zod_1.z.number(),
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: zod_1.z.object({
            where: entity_tag_1.EntityTagQuerySchema,
            data: entity_tag_1.EntityTagUpdateSchema,
        }),
        summary: 'Update multiple entitytags',
    },
    // Bulk delete entityTags
    bulkDelete: {
        method: 'DELETE',
        path: '/api/tagging/entity-tags/bulk',
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
        summary: 'Delete multiple entitytags',
    },
});
