import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Type assertion helper
export const authMiddlewareWrapper = (middleware: any) => middleware as any;

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  // Development bypass
  if (process.env.NODE_ENV === 'development' && process.env.AUTH_BYPASS === 'true') {
    req.user = {
      userId: '00000000-0000-0000-0000-000000000001',
      email: 'dev@local',
      role: 'admin'
    };
    next();
    return;
  }

  // Get token from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  try {
    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
}

// Role-based access control middleware
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
}