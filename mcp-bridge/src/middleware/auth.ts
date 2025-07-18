import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { MCPError, MCP_ERROR_CODES } from '../types/mcp.types';
import logger from '../utils/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        permissions?: string[];
      };
      apiKey?: string;
    }
  }
}

export const authMiddleware = (required: boolean = true) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Check for API key first (if enabled)
      if (config.auth.enableApiKey) {
        const apiKey = req.headers[config.auth.apiKeyHeader] as string;
        if (apiKey) {
          // Validate API key (this would check against a database in production)
          if (validateApiKey(apiKey)) {
            req.apiKey = apiKey;
            logger.info('API key authentication successful');
            return next();
          }
        }
      }

      // Check for JWT token
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        if (required) {
          throw new MCPError(
            'No authorization header',
            MCP_ERROR_CODES.AUTHENTICATION_REQUIRED,
            401
          );
        }
        return next();
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (!token) {
        if (required) {
          throw new MCPError(
            'No token provided',
            MCP_ERROR_CODES.AUTHENTICATION_REQUIRED,
            401
          );
        }
        return next();
      }

      try {
        const decoded = jwt.verify(token, config.auth.jwtSecret) as any;
        req.user = {
          id: decoded.userId || decoded.id,
          email: decoded.email,
          permissions: decoded.permissions || [],
        };
        next();
      } catch (jwtError: any) {
        logger.warn('JWT verification failed', { error: jwtError.message });
        if (required) {
          throw new MCPError(
            'Invalid token',
            MCP_ERROR_CODES.AUTHENTICATION_REQUIRED,
            401
          );
        }
        next();
      }
    } catch (error) {
      next(error);
    }
  };
};

// Helper function to validate API keys
function validateApiKey(apiKey: string): boolean {
  // In production, this would check against a database
  // For now, we'll use environment variable for demo
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  return validApiKeys.includes(apiKey);
}

// Tool-specific permission check
export const checkToolPermission = (toolName: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Check if user has permission to use this specific tool
    const user = req.user;
    if (!user) {
      return next(new MCPError(
        'Authentication required',
        MCP_ERROR_CODES.AUTHENTICATION_REQUIRED,
        401
      ));
    }

    // Check permissions (simplified for demo)
    const hasPermission = 
      user.permissions?.includes('*') || 
      user.permissions?.includes(`tool:${toolName}`) ||
      user.permissions?.includes(`tool:*`);

    if (!hasPermission) {
      return next(new MCPError(
        'Insufficient permissions',
        MCP_ERROR_CODES.AUTHENTICATION_REQUIRED,
        403
      ));
    }

    next();
  };
};