/**
 * @ai/contracts - OpenAPI contracts and generated types for AI Service
 * 
 * This package contains:
 * - Generated TypeScript types from OpenAPI specifications
 * - Typed API clients using openapi-fetch
 * - Shared request/response interfaces
 * - Validation schemas
 */

import createClient from 'openapi-fetch';

// Re-export generated types with namespaces to avoid conflicts
export * as gateway from './generated/gateway';
export * as auth from './generated/auth';
export * as financial from './generated/financial';
export * as trading from './generated/trading';
export * as aiCore from './generated/ai-core';
export * as comm from './generated/comm';

// Import types for client creation
import type { paths as GatewayPaths } from './generated/gateway';
import type { paths as AuthPaths } from './generated/auth';
import type { paths as FinancialPaths } from './generated/financial';
import type { paths as TradingPaths } from './generated/trading';
import type { paths as AiCorePaths } from './generated/ai-core';
import type { paths as CommPaths } from './generated/comm';

// Export path types for convenience
export type { GatewayPaths, AuthPaths, FinancialPaths, TradingPaths, AiCorePaths, CommPaths };

// Export contract version for runtime checks
export const CONTRACT_VERSION = '1.0.0';

// Common response types
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

// Type helpers for better DX
export type ExtractResponse<T, Status extends number = 200> = T extends {
  responses: { [K in Status]: { content: { 'application/json': infer R } } }
} ? R : never;

export type ExtractRequest<T> = T extends {
  requestBody: { content: { 'application/json': infer R } }
} ? R : never;

// Typed client creators using openapi-fetch
export function createGatewayClient(baseUrl: string) {
  return createClient<GatewayPaths>({
    baseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function createAuthClient(baseUrl: string) {
  return createClient<AuthPaths>({
    baseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function createFinancialClient(baseUrl: string) {
  return createClient<FinancialPaths>({
    baseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function createTradingClient(baseUrl: string) {
  return createClient<TradingPaths>({
    baseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function createAiCoreClient(baseUrl: string) {
  return createClient<AiCorePaths>({
    baseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function createCommClient(baseUrl: string) {
  return createClient<CommPaths>({
    baseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Legacy alias for backward compatibility
export const createAiServiceClient = createGatewayClient;