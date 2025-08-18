"use strict";
/**
 * @ai/contracts - OpenAPI contracts and generated types for AI Service
 *
 * This package contains:
 * - Generated TypeScript types from OpenAPI specifications
 * - Typed API clients using openapi-fetch
 * - Shared request/response interfaces
 * - Validation schemas
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAiServiceClient = exports.CONTRACT_VERSION = exports.comm = exports.aiCore = exports.trading = exports.financial = exports.auth = exports.gateway = void 0;
exports.createGatewayClient = createGatewayClient;
exports.createAuthClient = createAuthClient;
exports.createFinancialClient = createFinancialClient;
exports.createTradingClient = createTradingClient;
exports.createAiCoreClient = createAiCoreClient;
exports.createCommClient = createCommClient;
const openapi_fetch_1 = __importDefault(require("openapi-fetch"));
// Re-export generated types with namespaces to avoid conflicts
exports.gateway = __importStar(require("./generated/gateway"));
exports.auth = __importStar(require("./generated/auth"));
exports.financial = __importStar(require("./generated/financial"));
exports.trading = __importStar(require("./generated/trading"));
exports.aiCore = __importStar(require("./generated/ai-core"));
exports.comm = __importStar(require("./generated/comm"));
// Export contract version for runtime checks
exports.CONTRACT_VERSION = '1.0.0';
// Typed client creators using openapi-fetch
function createGatewayClient(baseUrl) {
    return (0, openapi_fetch_1.default)({
        baseUrl,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
function createAuthClient(baseUrl) {
    return (0, openapi_fetch_1.default)({
        baseUrl,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
function createFinancialClient(baseUrl) {
    return (0, openapi_fetch_1.default)({
        baseUrl,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
function createTradingClient(baseUrl) {
    return (0, openapi_fetch_1.default)({
        baseUrl,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
function createAiCoreClient(baseUrl) {
    return (0, openapi_fetch_1.default)({
        baseUrl,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
function createCommClient(baseUrl) {
    return (0, openapi_fetch_1.default)({
        baseUrl,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
// Legacy alias for backward compatibility
exports.createAiServiceClient = createGatewayClient;
