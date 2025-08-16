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
export interface GatewayPaths {
    "/api/financial/transactions": {
        get: {
            responses: {
                200: {
                    content: {
                        "application/json": {
                            transactions: Array<{
                                id: string;
                                accountId: string;
                                amount: number;
                                currency: string;
                                description: string;
                                date: string;
                                category?: string;
                                [key: string]: any;
                            }>;
                            pagination?: any;
                        };
                    };
                };
            };
        };
    };
    "/api/financial/attachments": {
        get: {
            responses: {
                200: {
                    content: {
                        "application/json": {
                            attachments: Array<{
                                id: string;
                                fileName: string;
                                fileSize: number;
                                mimeType: string;
                                uploadedAt: string;
                                [key: string]: any;
                            }>;
                            pagination?: any;
                        };
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
                        "application/json": {
                            accounts: Array<{
                                id: string;
                                name: string;
                                type: string;
                                balance: number;
                                currency: string;
                                [key: string]: any;
                            }>;
                            pagination?: any;
                        };
                    };
                };
            };
        };
    };
    "/api/financial/clients": {
        get: {
            responses: {
                200: {
                    content: {
                        "application/json": {
                            clients: Array<{
                                id: string;
                                name: string;
                                email?: string;
                                phone?: string;
                                [key: string]: any;
                            }>;
                            pagination?: any;
                        };
                    };
                };
            };
        };
    };
    [key: string]: any;
}
export type AiServicePaths = GatewayPaths;
export declare function createAiServiceClient(baseUrl: string): {
    baseUrl: string;
    get: (path: string) => Promise<any>;
    GET: (path: string) => Promise<any>;
    post: (path: string, body: any) => Promise<any>;
    POST: (path: string, body: any) => Promise<any>;
};
export declare function createGatewayClient(baseUrl: string): {
    baseUrl: string;
    get: (path: string) => Promise<any>;
    GET: (path: string) => Promise<any>;
    post: (path: string, body: any) => Promise<any>;
    POST: (path: string, body: any) => Promise<any>;
};
//# sourceMappingURL=index.d.ts.map