"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortOrderSchema = exports.dateRangeSchema = void 0;
exports.parsePagination = parsePagination;
exports.formatError = formatError;
exports.parseQueryFilters = parseQueryFilters;
exports.validateRequest = validateRequest;
exports.createPaginatedResponse = createPaginatedResponse;
const zod_1 = require("zod");
// Pagination schema with configurable defaults
const paginationSchema = zod_1.z.object({
    page: zod_1.z
        .union([zod_1.z.string().transform((v) => parseInt(v, 10)), zod_1.z.number()])
        .optional()
        .transform((v) => (v == null || Number.isNaN(v) ? 1 : v))
        .refine((v) => Number.isFinite(v) && v >= 1, {
        message: "page must be an integer >= 1",
    }),
    limit: zod_1.z
        .union([zod_1.z.string().transform((v) => parseInt(v, 10)), zod_1.z.number()])
        .optional()
        .transform((v) => (v == null || Number.isNaN(v) ? 20 : v))
        .refine((v) => Number.isFinite(v) && v >= 1 && v <= 100, {
        message: "limit must be an integer between 1 and 100",
    }),
});
function parsePagination(query) {
    const result = paginationSchema.safeParse({ page: query.page, limit: query.limit });
    if (!result.success) {
        const msg = result.error.errors.map((e) => e.message).join("; ") || "Invalid pagination params";
        const err = new Error(msg);
        err.statusCode = 400;
        throw err;
    }
    const page = result.data.page;
    const limit = result.data.limit;
    return { page, limit, skip: (page - 1) * limit };
}
// Format error to match OpenAPI Error schema
function formatError(error, statusCode = 500) {
    if (error instanceof zod_1.ZodError) {
        return {
            status: 400,
            body: {
                message: "Validation failed",
                code: "VALIDATION_ERROR",
                details: error.errors.map((e) => ({
                    path: e.path.join("."),
                    message: e.message,
                })),
            },
        };
    }
    if (error instanceof Error) {
        const err = error;
        return {
            status: err.statusCode || statusCode,
            body: {
                message: err.message || "An error occurred",
                code: err.code || (err.statusCode === 400 ? "BAD_REQUEST" : "ERROR"),
            },
        };
    }
    return {
        status: statusCode,
        body: {
            message: "An unexpected error occurred",
            code: "UNKNOWN_ERROR",
        },
    };
}
// Common query filter schemas
exports.dateRangeSchema = zod_1.z.object({
    startDate: zod_1.z
        .union([zod_1.z.string(), zod_1.z.date()])
        .optional()
        .transform((v) => (typeof v === "string" ? new Date(v) : v))
        .refine((v) => !v || !isNaN(v.getTime()), { message: "Invalid start date" }),
    endDate: zod_1.z
        .union([zod_1.z.string(), zod_1.z.date()])
        .optional()
        .transform((v) => (typeof v === "string" ? new Date(v) : v))
        .refine((v) => !v || !isNaN(v.getTime()), { message: "Invalid end date" }),
});
exports.sortOrderSchema = zod_1.z.enum(["asc", "desc"]).optional().default("desc");
// Parse common query filters
function parseQueryFilters(query, schema) {
    const result = schema.safeParse(query);
    if (!result.success) {
        const msg = result.error.errors.map((e) => e.message).join("; ");
        const err = new Error(msg);
        err.statusCode = 400;
        throw err;
    }
    return result.data;
}
// Validation middleware factory
function validateRequest(schema) {
    return async (req, res, next) => {
        try {
            if (schema.body) {
                req.body = await schema.body.parseAsync(req.body);
            }
            if (schema.query) {
                req.query = await schema.query.parseAsync(req.query);
            }
            if (schema.params) {
                req.params = await schema.params.parseAsync(req.params);
            }
            next();
        }
        catch (error) {
            const { status, body } = formatError(error, 400);
            res.status(status).json(body);
        }
    };
}
function createPaginatedResponse(items, total, pagination) {
    return {
        items,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
    };
}
