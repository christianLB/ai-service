import { Request, Response, NextFunction } from 'express';
import { MCPError } from '../types/mcp.types';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error | MCPError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Handle MCPError
  if (err instanceof MCPError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Handle validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: (err as any).errors,
      },
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
      },
    });
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isDevelopment ? err.message : 'Internal server error',
      ...(isDevelopment && { stack: err.stack }),
    },
  });
};