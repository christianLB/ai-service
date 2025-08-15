import createClient from 'openapi-fetch';
export { createClient };
import type { paths as AiServicePaths } from './generated/ai-service';
export type { paths as AiServicePaths } from './generated/ai-service';
export declare const createAiServiceClient: (baseUrl: string) => import("openapi-fetch").Client<AiServicePaths, `${string}/${string}`>;
import type { paths as FinancialPaths } from './generated/financial';
export type { paths as FinancialPaths } from './generated/financial';
export declare const createFinancialClient: (baseUrl: string) => import("openapi-fetch").Client<FinancialPaths, `${string}/${string}`>;
import type { paths as GatewayPaths } from './generated/gateway';
export type { paths as GatewayPaths } from './generated/gateway';
export declare const createGatewayClient: (baseUrl: string) => import("openapi-fetch").Client<GatewayPaths, `${string}/${string}`>;
//# sourceMappingURL=index.d.ts.map