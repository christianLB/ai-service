import { z } from 'zod';
export declare const UUID: z.ZodString;
export declare const ISODate: z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>;
export declare const Decimal: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
export declare const Money: z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodString]>, number, string | number>;
export declare const Json: z.ZodAny;
export declare const PaginationQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    search?: string | undefined;
}, {
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const ApiResponse: <T extends z.ZodTypeAny>(dataSchema: T) => z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
export declare const PaginatedResponse: <T extends z.ZodTypeAny>(dataSchema: T) => z.ZodObject<{
    items: z.ZodArray<T, "many">;
    total: z.ZodNumber;
    page: z.ZodNumber;
    limit: z.ZodNumber;
    totalPages: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    items: T["_output"][];
}, {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    items: T["_input"][];
}>;
//# sourceMappingURL=common.d.ts.map