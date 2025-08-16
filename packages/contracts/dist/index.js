"use strict";
/**
 * @ai/contracts - OpenAPI contracts and generated types for AI Service
 *
 * This package contains:
 * - Generated TypeScript types from OpenAPI specifications
 * - Shared request/response interfaces
 * - Validation schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTRACT_VERSION = void 0;
exports.createAiServiceClient = createAiServiceClient;
exports.createGatewayClient = createGatewayClient;
// Re-export generated types (will be created by openapi-typescript)
// export * from './generated/gateway';
// export * from './generated/auth';
// export * from './generated/financial';
// export * from './generated/trading';
// export * from './generated/ai-core';
// export * from './generated/comm';
// Export contract version for runtime checks
exports.CONTRACT_VERSION = '1.0.0';
// Export placeholder client creator
function createAiServiceClient(baseUrl) {
    return {
        baseUrl,
        get: async (path) => {
            const response = await fetch(`${baseUrl}${path}`);
            return response.json();
        },
        GET: async (path) => {
            const response = await fetch(`${baseUrl}${path}`);
            return response.json();
        },
        post: async (path, body) => {
            const response = await fetch(`${baseUrl}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            return response.json();
        },
        POST: async (path, body) => {
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
function createGatewayClient(baseUrl) {
    return createAiServiceClient(baseUrl);
}
