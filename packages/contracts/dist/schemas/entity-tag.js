"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityTagQuerySchema = exports.EntityTagResponseSchema = exports.EntityTagUpdateSchema = exports.EntityTagCreateSchema = exports.EntityTagSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("../common");
/**
 * Zod schemas for EntityTag model
 * Auto-generated from Prisma schema
 */
// Base schema with all fields
exports.EntityTagSchema = zod_1.z.object({
    id: common_1.UUID,
    entityType: zod_1.z.string().max(50),
    entityId: zod_1.z.string().max(255),
    method: zod_1.z.string().max(20),
    confidence: zod_1.z.number(),
    appliedBy: zod_1.z.string().max(255).optional(),
    aiProvider: zod_1.z.string().max(50).optional(),
    aiModel: zod_1.z.string().max(100).optional(),
    aiResponse: zod_1.z.record(zod_1.z.any()).optional(),
    aiReasoning: zod_1.z.string().optional(),
    isVerified: zod_1.z.boolean(),
    verifiedBy: zod_1.z.string().max(255).optional(),
    verifiedAt: common_1.ISODate.optional(),
    feedback: zod_1.z.string().optional(),
    isCorrect: zod_1.z.boolean().optional(),
    sourceEntityType: zod_1.z.string().max(50).optional(),
    sourceEntityId: zod_1.z.string().max(255).optional(),
    relationshipType: zod_1.z.string().max(50).optional(),
    createdAt: common_1.ISODate,
    updatedAt: common_1.ISODate,
    tagId: zod_1.z.string(),
});
// Schema for creating new records (omits auto-generated fields)
exports.EntityTagCreateSchema = exports.EntityTagSchema.omit({
    id: true,
    confidence: true,
    isVerified: true,
    createdAt: true,
    updatedAt: true,
});
// Schema for updating records (all fields optional)
exports.EntityTagUpdateSchema = exports.EntityTagCreateSchema.partial();
// Schema for API responses (includes relations)
exports.EntityTagResponseSchema = exports.EntityTagSchema.extend({});
// Schema for query parameters
exports.EntityTagQuerySchema = zod_1.z.object({
    // Pagination
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    // Sorting
    sortBy: zod_1.z.enum([
        'id',
        'entityType',
        'entityId',
        'method',
        'confidence',
        'appliedBy',
        'aiProvider',
        'aiModel',
        'aiResponse',
        'aiReasoning',
        'isVerified',
        'verifiedBy',
        'verifiedAt',
        'feedback',
        'isCorrect',
        'sourceEntityType',
        'sourceEntityId',
        'relationshipType',
        'createdAt',
        'updatedAt',
        'tagId',
    ]).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
    // Filtering
    search: zod_1.z.string().optional(),
    entityType: zod_1.z.string().optional(),
    entityId: zod_1.z.string().optional(),
    method: zod_1.z.string().optional(),
    confidence: zod_1.z.coerce.number().optional(),
    appliedBy: zod_1.z.string().optional(),
    aiProvider: zod_1.z.string().optional(),
    aiModel: zod_1.z.string().optional(),
    aiResponse: zod_1.z.any().optional(),
    aiReasoning: zod_1.z.string().optional(),
    isVerified: zod_1.z.coerce.boolean().optional(),
    verifiedBy: zod_1.z.string().optional(),
    verifiedAt: zod_1.z.any().optional(),
    feedback: zod_1.z.string().optional(),
    isCorrect: zod_1.z.coerce.boolean().optional(),
    sourceEntityType: zod_1.z.string().optional(),
    sourceEntityId: zod_1.z.string().optional(),
    relationshipType: zod_1.z.string().optional(),
    createdAt: zod_1.z.any().optional(),
    updatedAt: zod_1.z.any().optional(),
    tagId: zod_1.z.string().optional(),
    // Relations to include
    include: zod_1.z.object({}).optional(),
});
