/**
 * OpenAPI Validation Middleware
 * Validates requests and responses against OpenAPI specifications
 */
import * as OpenApiValidator from 'express-openapi-validator';
import { Request, Response, NextFunction } from 'express';
import * as Express from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

// Path to OpenAPI specs
const OPENAPI_SPECS_DIR = join(__dirname, '../../openapi');

/**
 * Create OpenAPI validator middleware for a specific service
 */
export function createOpenApiValidator(serviceName: string) {
  const specPath = join(OPENAPI_SPECS_DIR, `${serviceName}.yaml`);

  if (!existsSync(specPath)) {
    console.warn(`OpenAPI spec not found for service: ${serviceName} at ${specPath}`);
    // Return a no-op middleware if spec doesn't exist
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  return OpenApiValidator.middleware({
    apiSpec: specPath,
    validateRequests: {
      allowUnknownQueryParameters: false,
      coerceTypes: true,
      removeAdditional: 'failing', // Remove additional properties and fail validation
    },
    validateResponses: {
      coerceTypes: true,
      removeAdditional: 'failing',
      onError: (error, body, req) => {
        console.error('Response validation error:', {
          path: req.path,
          method: req.method,
          error: error.message,
          body,
        });
      },
    },
    validateSecurity: false, // We handle security separately
    validateFormats: 'full',
    formats: [
      {
        name: 'iso-date-time',
        type: 'string',
        validate: (value: string) => {
          return !isNaN(Date.parse(value));
        },
      },
      {
        name: 'uuid',
        type: 'string',
        validate: (value: string) => {
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(value);
        },
      },
    ],
    fileUploader: false, // We handle file uploads separately
    $refParser: {
      mode: 'bundle',
    },
  });
}

/**
 * Global error handler for OpenAPI validation errors
 */
export function openApiErrorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  // Check if this is an OpenAPI validation error
  const error = err as any;
  if (error.status === 400 && error.errors) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: (err as any).errors.map((e: unknown) => ({
          path: (e as any).path,
          message: (e as any).message,
          errorCode: (e as any).errorCode,
        })),
      },
    });
  }

  // Check if this is a response validation error
  if (error.status === 500 && error.message && error.message.includes('Response validation')) {
    console.error('Response validation failed:', error);
    // In production, you might want to return a generic error
    // In development, return the actual validation error
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({
        success: false,
        error: {
          code: 'RESPONSE_VALIDATION_ERROR',
          message: 'Response validation failed',
          details: error.message,
        },
      });
    }
  }

  // Pass to next error handler
  next(error);
}

/**
 * Create validators for all services
 */
export function createServiceValidators() {
  return {
    gateway: createOpenApiValidator('gateway'),
    auth: createOpenApiValidator('auth'),
    financial: createOpenApiValidator('financial'),
    trading: createOpenApiValidator('trading'),
    aiCore: createOpenApiValidator('ai-core'),
    comm: createOpenApiValidator('comm'),
  };
}

/**
 * Apply OpenAPI validation to specific routes
 */
export function applyOpenApiValidation(app: Express.Application) {
  const validators = createServiceValidators();

  // Apply validators to specific route prefixes
  // These will be applied before the actual route handlers

  // Financial routes
  app.use('/api/financial', validators.financial);

  // Trading routes
  app.use('/api/trading', validators.trading);

  // Auth routes
  app.use('/api/auth', validators.auth);

  // AI Core routes
  app.use('/api/ai', validators.aiCore);

  // Communication routes
  app.use('/api/comm', validators.comm);

  // Gateway routes (catch-all for remaining)
  app.use('/api', validators.gateway);

  // Add the error handler after all routes
  app.use(openApiErrorHandler);
}

/**
 * Middleware to skip validation for specific routes
 */
export function skipValidation(paths: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (paths.some((path) => req.path.startsWith(path))) {
      // Skip validation by removing the OpenAPI validation context
      const reqWithOpenApi = req as any;
      reqWithOpenApi.openapi = undefined;
    }
    next();
  };
}
