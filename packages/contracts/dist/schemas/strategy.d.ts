import { z } from 'zod';
/**
 * Zod schemas for Strategy model
 * Auto-generated from Prisma schema
 */
export declare const StrategySchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    type: z.ZodString;
    status: z.ZodString;
    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    type: string;
    status: string;
    id: string;
    name: string;
    parameters: Record<string, any>;
    userId?: string | undefined;
}, {
    type: string;
    status: string;
    id: string;
    name: string;
    parameters: Record<string, any>;
    userId?: string | undefined;
}>;
export declare const StrategyCreateSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    type: z.ZodString;
    status: z.ZodString;
    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "status" | "id" | "parameters">, "strip", z.ZodTypeAny, {
    type: string;
    name: string;
    userId?: string | undefined;
}, {
    type: string;
    name: string;
    userId?: string | undefined;
}>;
export declare const StrategyUpdateSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type?: string | undefined;
    userId?: string | undefined;
    name?: string | undefined;
}, {
    type?: string | undefined;
    userId?: string | undefined;
    name?: string | undefined;
}>;
export declare const StrategyResponseSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    type: z.ZodString;
    status: z.ZodString;
    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    type: string;
    status: string;
    id: string;
    name: string;
    parameters: Record<string, any>;
    userId?: string | undefined;
}, {
    type: string;
    status: string;
    id: string;
    name: string;
    parameters: Record<string, any>;
    userId?: string | undefined;
}>;
export declare const StrategyQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    sortBy: z.ZodOptional<z.ZodEnum<["id", "userId", "name", "type", "status", "parameters"]>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    search: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    parameters: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    type?: string | undefined;
    status?: string | undefined;
    search?: string | undefined;
    sortBy?: "type" | "status" | "id" | "userId" | "name" | "parameters" | undefined;
    userId?: string | undefined;
    name?: string | undefined;
    parameters?: any;
}, {
    type?: string | undefined;
    status?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    search?: string | undefined;
    sortBy?: "type" | "status" | "id" | "userId" | "name" | "parameters" | undefined;
    userId?: string | undefined;
    name?: string | undefined;
    parameters?: any;
}>;
export type Strategy = z.infer<typeof StrategySchema>;
export type StrategyCreate = z.infer<typeof StrategyCreateSchema>;
export type StrategyUpdate = z.infer<typeof StrategyUpdateSchema>;
export type StrategyResponse = z.infer<typeof StrategyResponseSchema>;
export type StrategyQuery = z.infer<typeof StrategyQuerySchema>;
//# sourceMappingURL=strategy.d.ts.map