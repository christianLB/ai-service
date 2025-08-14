"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePagination = parsePagination;
const zod_1 = require("zod");
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
