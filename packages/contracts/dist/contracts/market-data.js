"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketDataContract = void 0;
const core_1 = require("@ts-rest/core");
const zod_1 = require("zod");
const market_data_1 = require("../schemas/market-data");
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
exports.marketDataContract = c.router({
    // Get all marketDatas with pagination and filtering
    getAll: {
        method: 'GET',
        path: '/api/public/market-datas',
        responses: {
            200: PaginatedResponseSchema(market_data_1.MarketDataResponseSchema),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        query: market_data_1.MarketDataQuerySchema,
        summary: 'Get all marketdatas with optional filtering and pagination',
    },
    // Get a single marketData by ID
    getById: {
        method: 'GET',
        path: '/api/public/market-datas/:id',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: market_data_1.MarketDataResponseSchema,
            }),
            404: ErrorSchema,
            500: ErrorSchema,
        },
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        summary: 'Get a marketdata by ID',
    },
    // Create a new marketData
    create: {
        method: 'POST',
        path: '/api/public/market-datas',
        responses: {
            201: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: market_data_1.MarketDataResponseSchema,
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: market_data_1.MarketDataCreateSchema,
        summary: 'Create a new marketdata',
    },
    // Update an existing marketData
    update: {
        method: 'PUT',
        path: '/api/public/market-datas/:id',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: market_data_1.MarketDataResponseSchema,
            }),
            404: ErrorSchema,
            400: ErrorSchema,
            500: ErrorSchema,
        },
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        body: market_data_1.MarketDataUpdateSchema,
        summary: 'Update a marketdata',
    },
    // Delete a marketData
    delete: {
        method: 'DELETE',
        path: '/api/public/market-datas/:id',
        responses: {
            200: SuccessSchema,
            404: ErrorSchema,
            500: ErrorSchema,
        },
        pathParams: zod_1.z.object({
            id: zod_1.z.string().uuid(),
        }),
        summary: 'Delete a marketdata',
    },
    // Bulk create marketDatas
    bulkCreate: {
        method: 'POST',
        path: '/api/public/market-datas/bulk',
        responses: {
            201: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: zod_1.z.array(market_data_1.MarketDataResponseSchema),
                count: zod_1.z.number(),
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: zod_1.z.object({
            data: zod_1.z.array(market_data_1.MarketDataCreateSchema).min(1).max(100),
        }),
        summary: 'Create multiple marketdatas',
    },
    // Bulk update marketDatas
    bulkUpdate: {
        method: 'PUT',
        path: '/api/public/market-datas/bulk',
        responses: {
            200: zod_1.z.object({
                success: zod_1.z.literal(true),
                count: zod_1.z.number(),
            }),
            400: ErrorSchema,
            500: ErrorSchema,
        },
        body: zod_1.z.object({
            where: market_data_1.MarketDataQuerySchema,
            data: market_data_1.MarketDataUpdateSchema,
        }),
        summary: 'Update multiple marketdatas',
    },
    // Bulk delete marketDatas
    bulkDelete: {
        method: 'DELETE',
        path: '/api/public/market-datas/bulk',
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
        summary: 'Delete multiple marketdatas',
    },
});
