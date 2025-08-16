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