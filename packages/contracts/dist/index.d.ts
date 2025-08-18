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
    GET: import("openapi-fetch").ClientMethod<GatewayPaths, "get">;
    PUT: import("openapi-fetch").ClientMethod<GatewayPaths, "put">;
    POST: import("openapi-fetch").ClientMethod<GatewayPaths, "post">;
    DELETE: import("openapi-fetch").ClientMethod<GatewayPaths, "delete">;
    OPTIONS: import("openapi-fetch").ClientMethod<GatewayPaths, "options">;
    HEAD: import("openapi-fetch").ClientMethod<GatewayPaths, "head">;
    PATCH: import("openapi-fetch").ClientMethod<GatewayPaths, "patch">;
    TRACE: import("openapi-fetch").ClientMethod<GatewayPaths, "trace">;
    use(...middleware: import("openapi-fetch").Middleware[]): void;
    eject(...middleware: import("openapi-fetch").Middleware[]): void;
};
export declare function createAuthClient(baseUrl: string): {
    GET: import("openapi-fetch").ClientMethod<AuthPaths, "get">;
    PUT: import("openapi-fetch").ClientMethod<AuthPaths, "put">;
    POST: import("openapi-fetch").ClientMethod<AuthPaths, "post">;
    DELETE: import("openapi-fetch").ClientMethod<AuthPaths, "delete">;
    OPTIONS: import("openapi-fetch").ClientMethod<AuthPaths, "options">;
    HEAD: import("openapi-fetch").ClientMethod<AuthPaths, "head">;
    PATCH: import("openapi-fetch").ClientMethod<AuthPaths, "patch">;
    TRACE: import("openapi-fetch").ClientMethod<AuthPaths, "trace">;
    use(...middleware: import("openapi-fetch").Middleware[]): void;
    eject(...middleware: import("openapi-fetch").Middleware[]): void;
};
export declare function createFinancialClient(baseUrl: string): {
    GET: import("openapi-fetch").ClientMethod<FinancialPaths, "get">;
    PUT: import("openapi-fetch").ClientMethod<FinancialPaths, "put">;
    POST: import("openapi-fetch").ClientMethod<FinancialPaths, "post">;
    DELETE: import("openapi-fetch").ClientMethod<FinancialPaths, "delete">;
    OPTIONS: import("openapi-fetch").ClientMethod<FinancialPaths, "options">;
    HEAD: import("openapi-fetch").ClientMethod<FinancialPaths, "head">;
    PATCH: import("openapi-fetch").ClientMethod<FinancialPaths, "patch">;
    TRACE: import("openapi-fetch").ClientMethod<FinancialPaths, "trace">;
    use(...middleware: import("openapi-fetch").Middleware[]): void;
    eject(...middleware: import("openapi-fetch").Middleware[]): void;
};
export declare function createTradingClient(baseUrl: string): {
    GET: import("openapi-fetch").ClientMethod<TradingPaths, "get">;
    PUT: import("openapi-fetch").ClientMethod<TradingPaths, "put">;
    POST: import("openapi-fetch").ClientMethod<TradingPaths, "post">;
    DELETE: import("openapi-fetch").ClientMethod<TradingPaths, "delete">;
    OPTIONS: import("openapi-fetch").ClientMethod<TradingPaths, "options">;
    HEAD: import("openapi-fetch").ClientMethod<TradingPaths, "head">;
    PATCH: import("openapi-fetch").ClientMethod<TradingPaths, "patch">;
    TRACE: import("openapi-fetch").ClientMethod<TradingPaths, "trace">;
    use(...middleware: import("openapi-fetch").Middleware[]): void;
    eject(...middleware: import("openapi-fetch").Middleware[]): void;
};
export declare function createAiCoreClient(baseUrl: string): {
    GET: import("openapi-fetch").ClientMethod<AiCorePaths, "get">;
    PUT: import("openapi-fetch").ClientMethod<AiCorePaths, "put">;
    POST: import("openapi-fetch").ClientMethod<AiCorePaths, "post">;
    DELETE: import("openapi-fetch").ClientMethod<AiCorePaths, "delete">;
    OPTIONS: import("openapi-fetch").ClientMethod<AiCorePaths, "options">;
    HEAD: import("openapi-fetch").ClientMethod<AiCorePaths, "head">;
    PATCH: import("openapi-fetch").ClientMethod<AiCorePaths, "patch">;
    TRACE: import("openapi-fetch").ClientMethod<AiCorePaths, "trace">;
    use(...middleware: import("openapi-fetch").Middleware[]): void;
    eject(...middleware: import("openapi-fetch").Middleware[]): void;
};
export declare function createCommClient(baseUrl: string): {
    GET: import("openapi-fetch").ClientMethod<CommPaths, "get">;
    PUT: import("openapi-fetch").ClientMethod<CommPaths, "put">;
    POST: import("openapi-fetch").ClientMethod<CommPaths, "post">;
    DELETE: import("openapi-fetch").ClientMethod<CommPaths, "delete">;
    OPTIONS: import("openapi-fetch").ClientMethod<CommPaths, "options">;
    HEAD: import("openapi-fetch").ClientMethod<CommPaths, "head">;
    PATCH: import("openapi-fetch").ClientMethod<CommPaths, "patch">;
    TRACE: import("openapi-fetch").ClientMethod<CommPaths, "trace">;
    use(...middleware: import("openapi-fetch").Middleware[]): void;
    eject(...middleware: import("openapi-fetch").Middleware[]): void;
};
export declare const createAiServiceClient: typeof createGatewayClient;
//# sourceMappingURL=index.d.ts.map