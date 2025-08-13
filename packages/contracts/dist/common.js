"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedResponse = exports.ApiResponse = exports.PaginationQuery = exports.Json = exports.Money = exports.Decimal = exports.ISODate = exports.UUID = void 0;
const zod_1 = require("zod");
// Common Zod schemas used across contracts
exports.UUID = zod_1.z.string().uuid();
exports.ISODate = zod_1.z.union([
    zod_1.z.string().datetime(),
    zod_1.z.date()
]).transform(val => typeof val === 'string' ? new Date(val) : val);
exports.Decimal = zod_1.z.union([
    zod_1.z.number(),
    zod_1.z.string()
]).transform(val => Number(val));
exports.Money = exports.Decimal;
exports.Json = zod_1.z.any();
exports.PaginationQuery = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
    search: zod_1.z.string().optional(),
});
const ApiResponse = (dataSchema) => zod_1.z.object({
    success: zod_1.z.boolean(),
    data: dataSchema.optional(),
    error: zod_1.z.string().optional(),
    message: zod_1.z.string().optional(),
});
exports.ApiResponse = ApiResponse;
const PaginatedResponse = (dataSchema) => zod_1.z.object({
    items: zod_1.z.array(dataSchema),
    total: zod_1.z.number(),
    page: zod_1.z.number(),
    limit: zod_1.z.number(),
    totalPages: zod_1.z.number(),
});
exports.PaginatedResponse = PaginatedResponse;
