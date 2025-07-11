import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../../services/auth/auth.service';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { createBruteForceProtection } from '../../middleware/brute-force.middleware';
import { SecurityLoggerService } from '../../services/security/security-logger.service';
import { Pool } from 'pg';
import rateLimit from 'express-rate-limit';

// Rate limiting for auth endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export function createAuthRoutes(pool: Pool): Router {
  const router = Router();
  const authService = new AuthService(pool);
  const securityLogger = new SecurityLoggerService(pool);
  
  // Brute force protection
  const bruteForceProtection = createBruteForceProtection(pool, {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000 // 30 minutes
  });

  // Login endpoint
  router.post(
    '/login',
    loginLimiter,
    bruteForceProtection,
    [
      body('email').isEmail().normalizeEmail(),
      body('password').notEmpty().trim()
    ],
    async (req: Request, res: Response) => {
      try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Get request details
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';
        
        // Log login attempt to database
        await pool.query(
          'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, $3)',
          [email, ip, false]
        );

        // Log security event
        await securityLogger.logSecurityEvent({
          event_type: 'login_attempt',
          email,
          ip_address: ip,
          user_agent: userAgent,
          success: false
        });

        // Attempt login
        const tokens = await authService.login({ email, password });

        // Log successful login
        await pool.query(
          'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, $3)',
          [email, ip, true]
        );
        
        // Log security event for successful login
        await securityLogger.logSecurityEvent({
          event_type: 'login_success',
          email,
          ip_address: ip,
          user_agent: userAgent,
          success: true
        });

        res.json({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenType: 'Bearer'
        });
      } catch (error: any) {
        console.error('Login error:', error);
        
        // Log failed login security event
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';
        
        await securityLogger.logSecurityEvent({
          event_type: 'login_failed',
          email: req.body.email,
          ip_address: ip,
          user_agent: userAgent,
          success: false,
          details: { error: error.message }
        });
        
        res.status(401).json({ error: error.message || 'Authentication failed' });
      }
    }
  );

  // Logout endpoint
  router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const refreshToken = req.body.refreshToken;
      if (refreshToken && req.user) {
        await authService.logout(req.user.userId, refreshToken);
      }
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Refresh token endpoint
  router.post(
    '/refresh',
    [body('refreshToken').notEmpty()],
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const { refreshToken } = req.body;
        const tokens = await authService.refreshAccessToken(refreshToken);

        res.json({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenType: 'Bearer'
        });
      } catch (error: any) {
        console.error('Token refresh error:', error);
        res.status(401).json({ error: error.message || 'Token refresh failed' });
      }
    }
  );

  // Get current user endpoint
  router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await authService.getCurrentUser(req.user.userId);
      res.json({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user information' });
    }
  });

  // Register endpoint (optional, can be disabled in production)
  if (process.env.ALLOW_REGISTRATION === 'true') {
    router.post(
      '/register',
      [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }).trim(),
        body('fullName').notEmpty().trim()
      ],
      async (req: Request, res: Response) => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
          }

          const { email, password, fullName } = req.body;
          const user = await authService.createUser(email, password, fullName);

          res.status(201).json({
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role
          });
        } catch (error: any) {
          console.error('Registration error:', error);
          if (error.code === '23505') { // Unique violation
            res.status(409).json({ error: 'Email already exists' });
          } else {
            res.status(500).json({ error: 'Registration failed' });
          }
        }
      }
    );
  }

  return router;
}