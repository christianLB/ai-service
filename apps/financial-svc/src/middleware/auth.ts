import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ultra_secure_jwt_secret_2025';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      ok: false, 
      error: 'No authentication token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ 
      ok: false, 
      error: 'Invalid or expired token' 
    });
  }
}

export function extractUserId(req: AuthRequest): string {
  // First try to get from JWT token
  if (req.user?.userId) {
    return req.user.userId;
  }
  
  // Fallback to query param for backwards compatibility (will remove later)
  const queryUserId = req.query.userId as string;
  if (queryUserId) {
    console.warn('Using userId from query param - this is deprecated');
    return queryUserId;
  }
  
  // Default fallback (should never reach here with auth middleware)
  return 'default-user';
}