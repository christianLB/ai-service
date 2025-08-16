/**
 * @ai/contracts - OpenAPI contracts and generated types for AI Service
 * 
 * This package contains:
 * - Generated TypeScript types from OpenAPI specifications
 * - Shared request/response interfaces
 * - Validation schemas
 */

// Re-export generated types (will be created by openapi-typescript)
// export * from './generated/gateway';
// export * from './generated/auth';
// export * from './generated/financial';
// export * from './generated/trading';
// export * from './generated/ai-core';
// export * from './generated/comm';

// Export contract version for runtime checks
export const CONTRACT_VERSION = '1.0.0';

// Export placeholder types until generation is complete
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

// Export GatewayPaths as an alias for AiServicePaths (frontend compatibility)
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

// Keep AiServicePaths as alias for backward compatibility
export type AiServicePaths = GatewayPaths;

// Export placeholder client creator
export function createAiServiceClient(baseUrl: string) {
  return {
    baseUrl,
    get: async (path: string) => {
      const response = await fetch(`${baseUrl}${path}`);
      return response.json();
    },
    GET: async (path: string) => {
      const response = await fetch(`${baseUrl}${path}`);
      return response.json();
    },
    post: async (path: string, body: any) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return response.json();
    },
    POST: async (path: string, body: any) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return response.json();
    },
  };
}

// Export createGatewayClient for frontend compatibility
export function createGatewayClient(baseUrl: string) {
  return createAiServiceClient(baseUrl);
}