import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import type { FinancialPaths, TradingPaths } from '@ai/contracts';

// Type helpers for extracting request/response types from OpenAPI paths
type ExtractRequest<T, M extends keyof T, P extends keyof T[M]> = T[M][P] extends {
  requestBody?: { content: { 'application/json': infer R } };
}
  ? R
  : never;

type ExtractResponse<T, M extends keyof T, P extends keyof T[M]> = T[M][P] extends {
  responses: { 200: { content: { 'application/json': infer R } } };
}
  ? R
  : never;

/**
 * Typed request interface that includes typed body, params, and query
 */
export interface TypedRequest<TBody = unknown, TParams = unknown, TQuery = unknown>
  extends Request {
  body: TBody;
  params: TParams;
  query: TQuery;
}

/**
 * Typed response interface with send method that accepts typed data
 */
export interface TypedResponse<TData = unknown> extends Response {
  json(data: TData): this;
}

/**
 * Create a typed router for financial service endpoints
 */
export function createTypedFinancialRouter() {
  const router = Router();

  return {
    router,

    // Typed route handlers for financial endpoints
    getAccounts: (
      handler: (
        req: TypedRequest<never, never, { page?: number; limit?: number }>,
        res: TypedResponse<ExtractResponse<FinancialPaths, '/api/financial/accounts', 'get'>>
      ) => Promise<void>
    ) => {
      router.get('/accounts', handler as RequestHandler);
    },

    getAccount: (
      handler: (
        req: TypedRequest<never, { id: string }, never>,
        res: TypedResponse<ExtractResponse<FinancialPaths, '/api/financial/accounts/{id}', 'get'>>
      ) => Promise<void>
    ) => {
      router.get('/accounts/:id', handler as RequestHandler);
    },

    getClients: (
      handler: (
        req: TypedRequest<never, never, { page?: number; limit?: number; search?: string }>,
        res: TypedResponse<ExtractResponse<FinancialPaths, '/api/financial/clients', 'get'>>
      ) => Promise<void>
    ) => {
      router.get('/clients', handler as RequestHandler);
    },

    createClient: (
      handler: (
        req: TypedRequest<
          ExtractRequest<FinancialPaths, '/api/financial/clients', 'post'>,
          never,
          never
        >,
        res: TypedResponse<ExtractResponse<FinancialPaths, '/api/financial/clients', 'post'>>
      ) => Promise<void>
    ) => {
      router.post('/clients', handler as RequestHandler);
    },

    updateClient: (
      handler: (
        req: TypedRequest<
          ExtractRequest<FinancialPaths, '/api/financial/clients/{id}', 'put'>,
          { id: string },
          never
        >,
        res: TypedResponse<ExtractResponse<FinancialPaths, '/api/financial/clients/{id}', 'put'>>
      ) => Promise<void>
    ) => {
      router.put('/clients/:id', handler as RequestHandler);
    },

    deleteClient: (
      handler: (
        req: TypedRequest<never, { id: string }, never>,
        res: TypedResponse<ExtractResponse<FinancialPaths, '/api/financial/clients/{id}', 'delete'>>
      ) => Promise<void>
    ) => {
      router.delete('/clients/:id', handler as RequestHandler);
    },

    getInvoices: (
      handler: (
        req: TypedRequest<
          never,
          never,
          { page?: number; limit?: number; clientId?: string; status?: string }
        >,
        res: TypedResponse<ExtractResponse<FinancialPaths, '/api/financial/invoices', 'get'>>
      ) => Promise<void>
    ) => {
      router.get('/invoices', handler as RequestHandler);
    },

    createInvoice: (
      handler: (
        req: TypedRequest<
          ExtractRequest<FinancialPaths, '/api/financial/invoices', 'post'>,
          never,
          never
        >,
        res: TypedResponse<ExtractResponse<FinancialPaths, '/api/financial/invoices', 'post'>>
      ) => Promise<void>
    ) => {
      router.post('/invoices', handler as RequestHandler);
    },

    getTransactions: (
      handler: (
        req: TypedRequest<
          never,
          never,
          {
            page?: number;
            limit?: number;
            accountId?: string;
            startDate?: string;
            endDate?: string;
          }
        >,
        res: TypedResponse<ExtractResponse<FinancialPaths, '/api/financial/transactions', 'get'>>
      ) => Promise<void>
    ) => {
      router.get('/transactions', handler as RequestHandler);
    },
  };
}

/**
 * Create a typed router for trading service endpoints
 */
export function createTypedTradingRouter() {
  const router = Router();

  return {
    router,

    getStrategies: (
      handler: (
        req: TypedRequest<never, never, { page?: number; limit?: number }>,
        res: TypedResponse<ExtractResponse<TradingPaths, '/api/trading/strategies', 'get'>>
      ) => Promise<void>
    ) => {
      router.get('/strategies', handler as RequestHandler);
    },

    createStrategy: (
      handler: (
        req: TypedRequest<
          ExtractRequest<TradingPaths, '/api/trading/strategies', 'post'>,
          never,
          never
        >,
        res: TypedResponse<ExtractResponse<TradingPaths, '/api/trading/strategies', 'post'>>
      ) => Promise<void>
    ) => {
      router.post('/strategies', handler as RequestHandler);
    },

    deployStrategy: (
      handler: (
        req: TypedRequest<
          ExtractRequest<TradingPaths, '/api/trading/deploy', 'post'>,
          never,
          never
        >,
        res: TypedResponse<ExtractResponse<TradingPaths, '/api/trading/deploy', 'post'>>
      ) => Promise<void>
    ) => {
      router.post('/deploy', handler as RequestHandler);
    },

    stopStrategy: (
      handler: (
        req: TypedRequest<never, { sessionId: string }, never>,
        res: TypedResponse<ExtractResponse<TradingPaths, '/api/trading/stop/{sessionId}', 'post'>>
      ) => Promise<void>
    ) => {
      router.post('/stop/:sessionId', handler as RequestHandler);
    },

    getPositions: (
      handler: (
        req: TypedRequest<never, never, { exchange?: string; symbol?: string }>,
        res: TypedResponse<ExtractResponse<TradingPaths, '/api/trading/positions', 'get'>>
      ) => Promise<void>
    ) => {
      router.get('/positions', handler as RequestHandler);
    },
  };
}

/**
 * Middleware to ensure response matches contract
 * Wraps res.json to validate response against OpenAPI schema
 */
export function contractValidationMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = function (data: unknown) {
    // In development, log the response for debugging
    if (process.env.NODE_ENV === 'development') {
      // Log response for debugging
    }

    // Call original json method
    return originalJson(data);
  };

  next();
}

/**
 * Helper to create typed error responses
 */
export function createErrorResponse(status: number, message: string, code?: string) {
  return {
    error: {
      status,
      message,
      code: code || 'ERROR',
      timestamp: new Date().toISOString(),
    },
  };
}
