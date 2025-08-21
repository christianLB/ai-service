"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyQuerySchema = exports.StrategyResponseSchema = exports.StrategyUpdateSchema = exports.StrategyCreateSchema = exports.StrategySchema = void 0;
const zod_1 = require("zod");
const common_1 = require("../common");
/**
 * Zod schemas for Strategy model
 * Auto-generated from Prisma schema
 */
// Base schema with all fields
exports.StrategySchema = zod_1.z.object({
    id: common_1.UUID,
    userId: zod_1.z.string().optional(),
    name: zod_1.z.string().max(100),
    type: zod_1.z.string().max(50),
    status: zod_1.z.string().max(20),
    parameters: zod_1.z.record(zod_1.z.any()),
});
// Schema for creating new records (omits auto-generated fields)
exports.StrategyCreateSchema = exports.StrategySchema.omit({
    id: true,
    status: true,
    parameters: true,
});
// Schema for updating records (all fields optional)
exports.StrategyUpdateSchema = exports.StrategyCreateSchema.partial();
// Schema for API responses (includes relations)
exports.StrategyResponseSchema = exports.StrategySchema;
// Schema for query parameters
exports.StrategyQuerySchema = zod_1.z.object({
    // Pagination
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    // Sorting
    sortBy: zod_1.z.enum([
        'id',
        'userId',
        'name',
        'type',
        'status',
        'parameters',
    ]).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
    // Filtering
    search: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    name: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    parameters: zod_1.z.any().optional(),
    // Relations to include
});
