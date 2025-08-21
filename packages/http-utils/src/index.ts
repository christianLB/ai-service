import { z, ZodError, ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

// Pagination schema with configurable defaults
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

// Standard error shape matching OpenAPI spec
export interface StandardError {
  message: string;
  code?: string;
  details?: Array<{ path: string; message: string }>;
}

// Format error to match OpenAPI Error schema
export function formatError(
  error: Error | ZodError | unknown,
  statusCode: number = 500
): { status: number; body: StandardError } {
  if (error instanceof ZodError) {
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
    const err = error as Error & { statusCode?: number; code?: string };
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
export const dateRangeSchema = z.object({
  startDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((v) => (typeof v === "string" ? new Date(v) : v))
    .refine((v) => !v || !isNaN(v.getTime()), { message: "Invalid start date" }),
  endDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((v) => (typeof v === "string" ? new Date(v) : v))
    .refine((v) => !v || !isNaN(v.getTime()), { message: "Invalid end date" }),
});

export const sortOrderSchema = z.enum(["asc", "desc"]).optional().default("desc");

// Parse common query filters
export function parseQueryFilters<T extends ZodSchema>(
  query: Record<string, unknown>,
  schema: T
): z.infer<T> {
  const result = schema.safeParse(query);
  if (!result.success) {
    const msg = result.error.errors.map((e) => e.message).join("; ");
    const err = new Error(msg) as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }
  return result.data;
}

// Validation middleware factory
export function validateRequest(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    } catch (error) {
      const { status, body } = formatError(error, 400);
      res.status(status).json(body);
    }
  };
}

// Helper to create paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  pagination: { page: number; limit: number }
): PaginatedResponse<T> {
  return {
    items,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  };
}
