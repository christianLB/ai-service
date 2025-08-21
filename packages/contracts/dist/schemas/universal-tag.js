"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalTagQuerySchema = exports.UniversalTagResponseSchema = exports.UniversalTagUpdateSchema = exports.UniversalTagCreateSchema = exports.UniversalTagSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("../common");
/**
 * Zod schemas for UniversalTag model
 * Auto-generated from Prisma schema
 */
// Base schema with all fields
exports.UniversalTagSchema = zod_1.z.object({
    id: common_1.UUID,
    code: zod_1.z.string().max(100),
    name: zod_1.z.string().max(255),
    description: zod_1.z.string().nullable().optional(),
    entityTypes: zod_1.z.array(zod_1.z.string()),
    patterns: zod_1.z.any().optional(),
    rules: zod_1.z.any().optional(),
    confidence: zod_1.z.number(),
    embeddingModel: zod_1.z.string().max(50).optional(),
    path: zod_1.z.string(),
    level: zod_1.z.number().int(),
    color: zod_1.z.string().max(7).nullable().optional(),
    icon: zod_1.z.string().max(50).nullable().optional(),
    isActive: zod_1.z.boolean(),
    isSystem: zod_1.z.boolean(),
    metadata: zod_1.z.any().optional(),
    usageCount: zod_1.z.number().int(),
    successRate: zod_1.z.number(),
    lastUsed: common_1.ISODate.optional(),
    createdAt: common_1.ISODate,
    updatedAt: common_1.ISODate,
    parentId: zod_1.z.string().nullable().optional(),
    entityTags: zod_1.z.any(),
});
// Schema for creating new records (omits auto-generated fields)
exports.UniversalTagCreateSchema = exports.UniversalTagSchema.omit({
    id: true,
    confidence: true,
    level: true,
    isActive: true,
    isSystem: true,
    usageCount: true,
    successRate: true,
    createdAt: true,
    updatedAt: true,
});
// Schema for updating records (all fields optional)
exports.UniversalTagUpdateSchema = exports.UniversalTagCreateSchema.partial();
// Schema for API responses (includes relations)
exports.UniversalTagResponseSchema = exports.UniversalTagSchema.extend({});
// Schema for query parameters
exports.UniversalTagQuerySchema = zod_1.z.object({
    // Pagination
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    // Sorting
    sortBy: zod_1.z.enum([
        'id',
        'code',
        'name',
        'description',
        'entityTypes',
        'patterns',
        'rules',
        'confidence',
        'embeddingModel',
        'path',
        'level',
        'color',
        'icon',
        'isActive',
        'isSystem',
        'metadata',
        'usageCount',
        'successRate',
        'lastUsed',
        'createdAt',
        'updatedAt',
        'parentId',
        'entityTags',
    ]).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
    // Filtering
    search: zod_1.z.string().optional(),
    code: zod_1.z.string().optional(),
    name: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    entityTypes: zod_1.z.array(zod_1.z.string()).optional(),
    patterns: zod_1.z.any().optional(),
    rules: zod_1.z.any().optional(),
    confidence: zod_1.z.coerce.number().optional(),
    embeddingModel: zod_1.z.string().optional(),
    path: zod_1.z.string().optional(),
    level: zod_1.z.coerce.number().optional(),
    color: zod_1.z.string().optional(),
    icon: zod_1.z.string().optional(),
    isActive: zod_1.z.coerce.boolean().optional(),
    isSystem: zod_1.z.coerce.boolean().optional(),
    metadata: zod_1.z.any().optional(),
    usageCount: zod_1.z.coerce.number().optional(),
    successRate: zod_1.z.coerce.number().optional(),
    lastUsed: zod_1.z.any().optional(),
    createdAt: zod_1.z.any().optional(),
    updatedAt: zod_1.z.any().optional(),
    parentId: zod_1.z.string().optional(),
    entityTags: zod_1.z.any().optional(),
    // Relations to include
    include: zod_1.z.object({}).optional(),
});
