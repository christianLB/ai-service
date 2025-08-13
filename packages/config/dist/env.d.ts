import { z } from "zod";
declare const EnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    DATABASE_URL: z.ZodUnion<[z.ZodString, z.ZodString]>;
    REDIS_URL: z.ZodUnion<[z.ZodString, z.ZodString]>;
    JWT_SECRET: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "test" | "production";
    PORT: number;
    DATABASE_URL: string;
    REDIS_URL: string;
    JWT_SECRET?: string | undefined;
}, {
    DATABASE_URL: string;
    REDIS_URL: string;
    NODE_ENV?: "development" | "test" | "production" | undefined;
    PORT?: number | undefined;
    JWT_SECRET?: string | undefined;
}>;
export type Env = z.infer<typeof EnvSchema>;
export declare const env: Env;
export {};
