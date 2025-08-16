import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface TraceIdOptions {
  /**
   * Header name for the trace ID
   * @default 'x-trace-id'
   */
  headerName?: string;
  
  /**
   * Whether to generate a new trace ID if none exists
   * @default true
   */
  generateIfMissing?: boolean;
  
  /**
   * Function to generate trace ID
   * @default () => uuidv4()
   */
  generator?: () => string;
  
  /**
   * Whether to set the trace ID in response headers
   * @default true
   */
  setResponseHeader?: boolean;
  
  /**
   * Custom validator for existing trace IDs
   * @default undefined (no validation)
   */
  validator?: (traceId: string) => boolean;
  
  /**
   * Whether to override existing trace ID if validation fails
   * @default true
   */
  overrideInvalid?: boolean;
}

export interface TracedRequest extends Request {
  traceId: string;
}

/**
 * Middleware to handle request tracing with trace IDs
 * Adds a trace ID to each request for distributed tracing
 */
export function traceIdMiddleware(options: TraceIdOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const {
    headerName = 'x-trace-id',
    generateIfMissing = true,
    generator = () => uuidv4(),
    setResponseHeader = true,
    validator,
    overrideInvalid = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    let traceId = req.get(headerName);
    
    // Validate existing trace ID if validator is provided
    if (traceId && validator && !validator(traceId)) {
      if (overrideInvalid) {
        traceId = undefined;
      }
    }
    
    // Generate new trace ID if missing and generation is enabled
    if (!traceId && generateIfMissing) {
      traceId = generator();
    }
    
    // Set trace ID on request object
    if (traceId) {
      (req as TracedRequest).traceId = traceId;
      
      // Set response header if enabled
      if (setResponseHeader) {
        res.set(headerName, traceId);
      }
    }
    
    next();
  };
}

/**
 * Get trace ID from request
 */
export function getTraceId(req: Request): string | undefined {
  return (req as TracedRequest).traceId;
}

/**
 * Set trace ID on request (useful for internal request creation)
 */
export function setTraceId(req: Request, traceId: string): void {
  (req as TracedRequest).traceId = traceId;
}

/**
 * Default trace ID validator - checks if it's a valid UUID v4
 */
export function isValidUuidV4(traceId: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(traceId);
}

/**
 * Create a child trace ID (useful for sub-operations)
 */
export function createChildTraceId(parentTraceId: string, suffix?: string): string {
  const childId = uuidv4().split('-')[0]; // Use first part of UUID for brevity
  const finalSuffix = suffix || childId;
  return `${parentTraceId}-${finalSuffix}`;
}

/**
 * Enhanced middleware that also logs trace ID
 */
export function traceIdWithLoggingMiddleware(
  logger: { info: (message: string, meta?: any) => void },
  options: TraceIdOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const baseMiddleware = traceIdMiddleware(options);
  
  return (req: Request, res: Response, next: NextFunction): void => {
    baseMiddleware(req, res, () => {
      const traceId = getTraceId(req);
      if (traceId) {
        logger.info('Request received', {
          traceId,
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress,
        });
      }
      next();
    });
  };
}

/**
 * Utility to create trace-aware HTTP client headers
 */
export function createTracedHeaders(
  req: Request,
  additionalHeaders: Record<string, string> = {},
  headerName = 'x-trace-id'
): Record<string, string> {
  const traceId = getTraceId(req);
  const headers = { ...additionalHeaders };
  
  if (traceId) {
    headers[headerName] = traceId;
  }
  
  return headers;
}

/**
 * Context manager for trace ID (useful for async operations)
 */
export class TraceContext {
  private static storage = new Map<symbol, string>();
  
  static run<T>(traceId: string, fn: () => T): T {
    const key = Symbol('trace-context');
    this.storage.set(key, traceId);
    
    try {
      return fn();
    } finally {
      this.storage.delete(key);
    }
  }
  
  static async runAsync<T>(traceId: string, fn: () => Promise<T>): Promise<T> {
    const key = Symbol('trace-context');
    this.storage.set(key, traceId);
    
    try {
      return await fn();
    } finally {
      this.storage.delete(key);
    }
  }
  
  static getTraceId(): string | undefined {
    // Return the most recently set trace ID
    const values = Array.from(this.storage.values());
    return values[values.length - 1];
  }
}