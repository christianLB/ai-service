import { z } from 'zod';
export declare const ToolSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    parameters: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    category: z.ZodEnum<["financial", "documents", "system", "trading", "development", "database", "quality", "deployment", "mcp", "utility", "information", "validation", "monitoring", "intelligence"]>;
    requiresAuth: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    parameters: Record<string, any>;
    category: "validation" | "financial" | "documents" | "system" | "trading" | "development" | "database" | "quality" | "deployment" | "mcp" | "utility" | "information" | "monitoring" | "intelligence";
    requiresAuth: boolean;
}, {
    name: string;
    description: string;
    category: "validation" | "financial" | "documents" | "system" | "trading" | "development" | "database" | "quality" | "deployment" | "mcp" | "utility" | "information" | "monitoring" | "intelligence";
    parameters?: Record<string, any> | undefined;
    requiresAuth?: boolean | undefined;
}>;
export type Tool = z.infer<typeof ToolSchema>;
export declare const ToolExecutionRequestSchema: z.ZodObject<{
    tool: z.ZodString;
    arguments: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
}, "strip", z.ZodTypeAny, {
    tool: string;
    arguments: Record<string, any>;
}, {
    tool: string;
    arguments?: Record<string, any> | undefined;
}>;
export type ToolExecutionRequest = z.infer<typeof ToolExecutionRequestSchema>;
export interface ToolExecutionResponse {
    success: boolean;
    result?: any;
    error?: string;
    metadata?: {
        executionTime: number;
        cached?: boolean;
    };
}
export interface AIServiceConfig {
    url: string;
    authToken?: string;
    timeout?: number;
}
export interface MCPServerConfig {
    name: string;
    version: string;
    aiService: AIServiceConfig;
    cache?: {
        enabled: boolean;
        ttl: number;
    };
}
//# sourceMappingURL=index.d.ts.map