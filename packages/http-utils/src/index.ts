import { z } from "zod";

const paginationSchema = z.object({
  page: z
    .union([z.string().transform((v) => parseInt(v, 10)), z.number()])
    .optional()
    .transform((v) => (v == null || Number.isNaN(v) ? 1 : v))
    .refine((v) => Number.isFinite(v) && v >= 1, {
      message: "page must be an integer >= 1",
    }),
  limit: z
    .union([z.string().transform((v) => parseInt(v, 10)), z.number()])
    .optional()
    .transform((v) => (v == null || Number.isNaN(v) ? 20 : v))
    .refine((v) => Number.isFinite(v) && v >= 1 && v <= 100, {
      message: "limit must be an integer between 1 and 100",
    }),
});

export type Pagination = { page: number; limit: number; skip: number };

export function parsePagination(query: Record<string, unknown>): Pagination {
  const result = paginationSchema.safeParse({ page: query.page, limit: query.limit });
  if (!result.success) {
    const msg = result.error.errors.map((e) => e.message).join("; ") || "Invalid pagination params";
    const err = new Error(msg) as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }
  const page = result.data.page as number;
  const limit = result.data.limit as number;
  return { page, limit, skip: (page - 1) * limit };
}
