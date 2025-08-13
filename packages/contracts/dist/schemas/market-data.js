"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataQuerySchema = exports.MarketDataResponseSchema = exports.MarketDataUpdateSchema = exports.MarketDataCreateSchema = exports.MarketDataSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("../common");
/**
 * Zod schemas for MarketData model
 * Auto-generated from Prisma schema
 */
// Base schema with all fields
exports.MarketDataSchema = zod_1.z.object({
    id: common_1.UUID,
    exchangeId: zod_1.z.string(),
    tradingPairId: zod_1.z.string(),
    timestamp: common_1.ISODate,
    open: common_1.Money,
    high: common_1.Money,
    low: common_1.Money,
    close: common_1.Money,
    volume: common_1.Money,
    quoteVolume: common_1.Money.optional(),
    trades: zod_1.z.number().int().optional(),
    timeframe: zod_1.z.string().max(10),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
// Schema for creating new records (omits auto-generated fields)
exports.MarketDataCreateSchema = exports.MarketDataSchema.omit({
    id: true,
    metadata: true,
});
// Schema for updating records (all fields optional)
exports.MarketDataUpdateSchema = exports.MarketDataCreateSchema.partial();
// Schema for API responses (includes relations)
exports.MarketDataResponseSchema = exports.MarketDataSchema;
// Schema for query parameters
exports.MarketDataQuerySchema = zod_1.z.object({
    // Pagination
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    // Sorting
    sortBy: zod_1.z.enum([
        'id',
        'exchangeId',
        'tradingPairId',
        'timestamp',
        'open',
        'high',
        'low',
        'close',
        'volume',
        'quoteVolume',
        'trades',
        'timeframe',
        'metadata',
    ]).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
    // Filtering
    search: zod_1.z.string().optional(),
    exchangeId: zod_1.z.string().optional(),
    tradingPairId: zod_1.z.string().optional(),
    timestamp: zod_1.z.any().optional(),
    open: zod_1.z.any().optional(),
    high: zod_1.z.any().optional(),
    low: zod_1.z.any().optional(),
    close: zod_1.z.any().optional(),
    volume: zod_1.z.any().optional(),
    quoteVolume: zod_1.z.any().optional(),
    trades: zod_1.z.coerce.number().optional(),
    timeframe: zod_1.z.string().optional(),
    metadata: zod_1.z.any().optional(),
    // Relations to include
});
