"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategyContract = void 0;
const core_1 = require("@ts-rest/core");
const zod_1 = require("zod");
const strategy_1 = require("../schemas/strategy");
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
exports.strategyContract = c.router({
    // Get all strategys with pagination and filtering
    getAll: {
        method: 'GET',
        path: '/api/public/strategys',
        responses: {
            200: PaginatedResponseSchema(strategy_1.StrategyResponseSchema),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        query: strategy_1.StrategyQuerySchema,
        summary: 'Get all strategys with optional filtering and pagination',
    },
    // Get a single strategy by ID
    getById: {
        method: 'GET',
        path: '/api/public/strategys/:id',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: strategy_1.StrategyResponseSchema,
            }),
            404: ErrorSchema,
            500: ErrorSchema,
        },
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        summary: 'Get a strategy by ID',
    },
    // Create a new strategy
    create: {
        method: 'POST',
        path: '/api/public/strategys',
        responses: {
            201: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: strategy_1.StrategyResponseSchema,
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: strategy_1.StrategyCreateSchema,
        summary: 'Create a new strategy',
    },
    // Update an existing strategy
    update: {
        method: 'PUT',
        path: '/api/public/strategys/:id',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: strategy_1.StrategyResponseSchema,
            }),
            404: ErrorSchema,
            400: ErrorSchema,
            500: ErrorSchema,
        },
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        body: strategy_1.StrategyUpdateSchema,
        summary: 'Update a strategy',
    },
    // Delete a strategy
    delete: {
        method: 'DELETE',
        path: '/api/public/strategys/:id',
        responses: {
            200: SuccessSchema,
            404: ErrorSchema,
            500: ErrorSchema,
        },
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        summary: 'Delete a strategy',
    },
    // Bulk create strategys
    bulkCreate: {
        method: 'POST',
        path: '/api/public/strategys/bulk',
        responses: {
            201: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: zod_1.z.array(strategy_1.StrategyResponseSchema),
                count: zod_1.z.number(),
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: zod_1.z.object({
            data: zod_1.z.array(strategy_1.StrategyCreateSchema).min(1).max(100),
        }),
        summary: 'Create multiple strategys',
    },
    // Bulk update strategys
    bulkUpdate: {
        method: 'PUT',
        path: '/api/public/strategys/bulk',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                count: zod_1.z.number(),
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: zod_1.z.object({
            where: strategy_1.StrategyQuerySchema,
            data: strategy_1.StrategyUpdateSchema,
        }),
        summary: 'Update multiple strategys',
    },
    // Bulk delete strategys
    bulkDelete: {
        method: 'DELETE',
        path: '/api/public/strategys/bulk',
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
        summary: 'Delete multiple strategys',
    },
});
