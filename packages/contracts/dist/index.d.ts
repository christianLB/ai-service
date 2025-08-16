/**
 * @ai/contracts - OpenAPI contracts and generated types for AI Service
 *
 * This package contains:
 * - Generated TypeScript types from OpenAPI specifications
 * - Shared request/response interfaces
 * - Validation schemas
 */
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
export interface AiServicePaths {
    "/api/financial/clients": {
        get: {
            responses: {
                200: {
                    content: {
                        "application/json": PaginatedResponse<any>;
                    };
                };
            };
        };
    };
    "/api/financial/clients/{id}": {
        get: {
            responses: {
                200: {
                    content: {
                        "application/json": ApiResponse<any>;
                    };
                };
            };
        };
    };
    "/api/financial/invoices": {
        get: {
            responses: {
                200: {
                    content: {
                        "application/json": PaginatedResponse<any>;
                    };
                };
            };
        };
    };
    "/api/financial/invoices/{id}": {
        get: {
            responses: {
                200: {
                    content: {
                        "application/json": ApiResponse<any>;
                    };
                };
            };
        };
    };
    "/api/financial/accounts": {
        get: {
            responses: {
                200: {
                    content: {
                        "application/json": PaginatedResponse<any>;
                    };
                };
            };
        };
    };
    "/api/financial/accounts/{id}": {
        get: {
            responses: {
                200: {
                    content: {
                        "application/json": ApiResponse<any>;
                    };
                };
            };
        };
    };
    [key: string]: any;
}
export declare function createAiServiceClient(baseUrl: string): {
    baseUrl: string;
    get: (path: string) => Promise<any>;
    post: (path: string, body: any) => Promise<any>;
};
//# sourceMappingURL=index.d.ts.map