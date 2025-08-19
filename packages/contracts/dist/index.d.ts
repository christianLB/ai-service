/**
 * @ai/contracts - OpenAPI contracts and generated types for AI Service
 *
 * This package contains:
 * - Generated TypeScript types from OpenAPI specifications
 * - Typed API clients using openapi-fetch
 * - Shared request/response interfaces
 * - Validation schemas
 */
export * as gateway from './generated/gateway';
export * as auth from './generated/auth';
export * as financial from './generated/financial';
export * as trading from './generated/trading';
export * as aiCore from './generated/ai-core';
export * as comm from './generated/comm';
import type { paths as GatewayPaths } from './generated/gateway';
import type { paths as AuthPaths } from './generated/auth';
import type { paths as FinancialPaths } from './generated/financial';
import type { paths as TradingPaths } from './generated/trading';
import type { paths as AiCorePaths } from './generated/ai-core';
import type { paths as CommPaths } from './generated/comm';
export type { GatewayPaths, AuthPaths, FinancialPaths, TradingPaths, AiCorePaths, CommPaths };
export declare const CONTRACT_VERSION = "1.0.0";
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    meta?: {
        timestamp: string;
        version: string;
    };
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface ApiError {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, any>;
}
export type ExtractResponse<T, Status extends number = 200> = T extends {
    responses: {
        [K in Status]: {
            content: {
                'application/json': infer R;
            };
        };
    };
} ? R : never;
export type ExtractRequest<T> = T extends {
    requestBody: {
        content: {
            'application/json': infer R;
        };
    };
} ? R : never;
export declare function createGatewayClient(baseUrl: string): {
    GET: import("openapi-fetch").ClientMethod<GatewayPaths, "get", `${string}/${string}`>;
    PUT: import("openapi-fetch").ClientMethod<GatewayPaths, "put", `${string}/${string}`>;
    POST: import("openapi-fetch").ClientMethod<GatewayPaths, "post", `${string}/${string}`>;
    DELETE: import("openapi-fetch").ClientMethod<GatewayPaths, "delete", `${string}/${string}`>;
    OPTIONS: import("openapi-fetch").ClientMethod<GatewayPaths, "options", `${string}/${string}`>;
    HEAD: import("openapi-fetch").ClientMethod<GatewayPaths, "head", `${string}/${string}`>;
    PATCH: import("openapi-fetch").ClientMethod<GatewayPaths, "patch", `${string}/${string}`>;
    TRACE: import("openapi-fetch").ClientMethod<GatewayPaths, "trace", `${string}/${string}`>;
    use(...middleware: import("openapi-fetch").Middleware[]): void;
    eject(...middleware: import("openapi-fetch").Middleware[]): void;
};
export declare function createAuthClient(baseUrl: string): {
    GET: import("openapi-fetch").ClientMethod<AuthPaths, "get", `${string}/${string}`>;
    PUT: import("openapi-fetch").ClientMethod<AuthPaths, "put", `${string}/${string}`>;
    POST: import("openapi-fetch").ClientMethod<AuthPaths, "post", `${string}/${string}`>;
    DELETE: import("openapi-fetch").ClientMethod<AuthPaths, "delete", `${string}/${string}`>;
    OPTIONS: import("openapi-fetch").ClientMethod<AuthPaths, "options", `${string}/${string}`>;
    HEAD: import("openapi-fetch").ClientMethod<AuthPaths, "head", `${string}/${string}`>;
    PATCH: import("openapi-fetch").ClientMethod<AuthPaths, "patch", `${string}/${string}`>;
    TRACE: import("openapi-fetch").ClientMethod<AuthPaths, "trace", `${string}/${string}`>;
    use(...middleware: import("openapi-fetch").Middleware[]): void;
    eject(...middleware: import("openapi-fetch").Middleware[]): void;
};
export declare function createFinancialClient(baseUrl: string): {
    GET: import("openapi-fetch").ClientMethod<FinancialPaths, "get", `${string}/${string}`>;
    PUT: import("openapi-fetch").ClientMethod<FinancialPaths, "put", `${string}/${string}`>;
    POST: import("openapi-fetch").ClientMethod<FinancialPaths, "post", `${string}/${string}`>;
    DELETE: import("openapi-fetch").ClientMethod<FinancialPaths, "delete", `${string}/${string}`>;
    OPTIONS: import("openapi-fetch").ClientMethod<FinancialPaths, "options", `${string}/${string}`>;
    HEAD: import("openapi-fetch").ClientMethod<FinancialPaths, "head", `${string}/${string}`>;
    PATCH: import("openapi-fetch").ClientMethod<FinancialPaths, "patch", `${string}/${string}`>;
    TRACE: import("openapi-fetch").ClientMethod<FinancialPaths, "trace", `${string}/${string}`>;
    use(...middleware: import("openapi-fetch").Middleware[]): void;
    eject(...middleware: import("openapi-fetch").Middleware[]): void;
};
export declare function createTradingClient(baseUrl: string): {
    GET: import("openapi-fetch").ClientMethod<TradingPaths, "get", `${string}/${string}`>;
    PUT: import("openapi-fetch").ClientMethod<TradingPaths, "put", `${string}/${string}`>;
    POST: import("openapi-fetch").ClientMethod<TradingPaths, "post", `${string}/${string}`>;
    DELETE: import("openapi-fetch").ClientMethod<TradingPaths, "delete", `${string}/${string}`>;
    OPTIONS: import("openapi-fetch").ClientMethod<TradingPaths, "options", `${string}/${string}`>;
    HEAD: import("openapi-fetch").ClientMethod<TradingPaths, "head", `${string}/${string}`>;
    PATCH: import("openapi-fetch").ClientMethod<TradingPaths, "patch", `${string}/${string}`>;
    TRACE: import("openapi-fetch").ClientMethod<TradingPaths, "trace", `${string}/${string}`>;
    use(...middleware: import("openapi-fetch").Middleware[]): void;
    eject(...middleware: import("openapi-fetch").Middleware[]): void;
};
export declare function createAiCoreClient(baseUrl: string): {
    GET: import("openapi-fetch").ClientMethod<AiCorePaths, "get", `${string}/${string}`>;
    PUT: import("openapi-fetch").ClientMethod<AiCorePaths, "put", `${string}/${string}`>;
    POST: import("openapi-fetch").ClientMethod<AiCorePaths, "post", `${string}/${string}`>;
    DELETE: import("openapi-fetch").ClientMethod<AiCorePaths, "delete", `${string}/${string}`>;
    OPTIONS: import("openapi-fetch").ClientMethod<AiCorePaths, "options", `${string}/${string}`>;
    HEAD: import("openapi-fetch").ClientMethod<AiCorePaths, "head", `${string}/${string}`>;
    PATCH: import("openapi-fetch").ClientMethod<AiCorePaths, "patch", `${string}/${string}`>;
    TRACE: import("openapi-fetch").ClientMethod<AiCorePaths, "trace", `${string}/${string}`>;
    use(...middleware: import("openapi-fetch").Middleware[]): void;
    eject(...middleware: import("openapi-fetch").Middleware[]): void;
};
export declare function createCommClient(baseUrl: string): {
    GET: import("openapi-fetch").ClientMethod<CommPaths, "get", `${string}/${string}`>;
    PUT: import("openapi-fetch").ClientMethod<CommPaths, "put", `${string}/${string}`>;
    POST: import("openapi-fetch").ClientMethod<CommPaths, "post", `${string}/${string}`>;
    DELETE: import("openapi-fetch").ClientMethod<CommPaths, "delete", `${string}/${string}`>;
    OPTIONS: import("openapi-fetch").ClientMethod<CommPaths, "options", `${string}/${string}`>;
    HEAD: import("openapi-fetch").ClientMethod<CommPaths, "head", `${string}/${string}`>;
    PATCH: import("openapi-fetch").ClientMethod<CommPaths, "patch", `${string}/${string}`>;
    TRACE: import("openapi-fetch").ClientMethod<CommPaths, "trace", `${string}/${string}`>;
    use(...middleware: import("openapi-fetch").Middleware[]): void;
    eject(...middleware: import("openapi-fetch").Middleware[]): void;
};
export declare const createAiServiceClient: typeof createGatewayClient;
//# sourceMappingURL=index.d.ts.map