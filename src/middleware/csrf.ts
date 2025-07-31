import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Logger } from '../utils/logger';

const logger = new Logger('CSRFMiddleware');

// Simple double-submit cookie CSRF protection
const CSRF_COOKIE_NAME = 'x-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate a secure random token
const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// CSRF protection middleware
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // Get token from cookie
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  
  // Get token from request (header or body)
  const requestToken = req.headers[CSRF_HEADER_NAME] || 
                      req.headers['x-xsrf-token'] ||
                      req.body?._csrf ||
                      req.query?._csrf;

  // Validate tokens match
  if (!cookieToken || !requestToken || cookieToken !== requestToken) {
    logger.warn(`CSRF token validation failed for ${req.method} ${req.path} from ${req.ip}`);
    res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      code: 'CSRF_VALIDATION_FAILED'
    });
    return;
  }

  next();
};

// Error handler for CSRF token failures
export const csrfErrorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  // This is for compatibility with the app error handler structure
  next(err);
};

// Middleware to send CSRF token to client
export const sendCSRFToken = (req: Request, res: Response): void => {
  const token = generateToken();
  
  // Set cookie with secure options
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400000, // 24 hours
    path: '/'
  });
  
  res.json({
    success: true,
    csrfToken: token
  });
};