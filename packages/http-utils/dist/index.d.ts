import { z, ZodError, ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";
export type Pagination = {
    page: number;
    limit: number;
    skip: number;
};
export declare function parsePagination(query: Record<string, unknown>): Pagination;
export interface StandardError {
    message: string;
    code?: string;
    details?: Array<{
        path: string;
        message: string;
    }>;
}
export declare function formatError(error: Error | ZodError | unknown, statusCode?: number): {
    status: number;
    body: StandardError;
};
export declare const dateRangeSchema: z.ZodObject<{
    startDate: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>, Date | undefined, string | Date | undefined>, Date | undefined, string | Date | undefined>;
    endDate: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>, Date | undefined, string | Date | undefined>, Date | undefined, string | Date | undefined>;
}, "strip", z.ZodTypeAny, {
    startDate?: Date | undefined;
    endDate?: Date | undefined;
}, {
    startDate?: string | Date | undefined;
    endDate?: string | Date | undefined;
}>;
export declare const sortOrderSchema: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
export declare function parseQueryFilters<T extends ZodSchema>(query: Record<string, unknown>, schema: T): z.infer<T>;
export declare function validateRequest(schema: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare function createPaginatedResponse<T>(items: T[], total: number, pagination: {
    page: number;
    limit: number;
}): PaginatedResponse<T>;
