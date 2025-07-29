import { Request, Response, NextFunction } from 'express';
import { TaggingError } from '../services/tagging/errors';
import logger from '../utils/logger';

/**
 * Error handler middleware for tagging routes
 */
export function taggingErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logger.error('Tagging error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    user: (req as any).user?.userId
  });

  // Handle TaggingError instances
  if (error instanceof TaggingError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
    return;
  }

  // Handle Prisma errors
  if (error.code && error.code.startsWith('P')) {
    let statusCode = 500;
    let message = 'Database error occurred';
    let code = 'DATABASE_ERROR';

    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        message = 'A record with this value already exists';
        code = 'CONFLICT';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        code = 'NOT_FOUND';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Invalid reference to related record';
        code = 'INVALID_REFERENCE';
        break;
      case 'P2014':
        statusCode = 400;
        message = 'Invalid relation data';
        code = 'INVALID_RELATION';
        break;
    }

    res.status(statusCode).json({
      error: {
        code,
        message,
        details: error.meta
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
    return;
  }

  // Handle validation errors (non-Zod)
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.details || {}
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
    return;
  }

  // Handle generic errors
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      ...(isDevelopment && { stack: error.stack })
    },
    timestamp: new Date().toISOString(),
    path: req.path
  });
}