import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService, AuthTokens } from '../../services/auth/auth.service';
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
  // Custom key generator to work with trust proxy
  keyGenerator: (req) => {
    // Use x-forwarded-for if available, otherwise fall back to req.ip
    return req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

export function createAuthRoutes(pool: Pool): Router {
  const router = Router();
  const authService = new AuthService();
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
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
          return;
        }

        const { email, password } = req.body;

        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';

        let tokens: AuthTokens;
        try {
          tokens = await authService.login({ email, password });
        } catch (error: any) {
          await pool.query(
            'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, $3)',
            [email, ip, false]
          );
          await securityLogger.logSecurityEvent({
            event_type: 'login_failed',
            email,
            ip_address: ip,
            user_agent: userAgent,
            success: false,
            details: { error: error.message }
          });
          throw error;
        }

        await pool.query(
          'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, $3)',
          [email, ip, true]
        );
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
        return;
      } catch (error: any) {
        console.error('Login error:', error);
        res.status(401).json({ error: error.message || 'Authentication failed' });
        return;
      }
    }
  );

  // Logout endpoint
  router.post('/logout', authMiddleware as any, (async (req: AuthRequest, res: Response) => {
    try {
      const refreshToken = req.body.refreshToken;
      if (refreshToken && req.user) {
        await authService.logout(req.user.userId, refreshToken);
      }
      res.json({ message: 'Logged out successfully' });
      return;
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
      return;
    }
  }) as any);

  // Refresh token endpoint
  router.post(
    '/refresh',
    [body('refreshToken').notEmpty()],
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
          return;
        }

        const { refreshToken } = req.body;
        const tokens = await authService.refreshAccessToken(refreshToken);

        res.json({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenType: 'Bearer'
        });
        return;
      } catch (error: any) {
        console.error('Token refresh error:', error);
        res.status(401).json({ error: error.message || 'Token refresh failed' });
        return;
      }
    }
  );

  // Get current user endpoint
  router.get('/me', authMiddleware as any, (async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      console.log('Getting user with ID:', req.user.userId);
      const user = await authService.getCurrentUser(req.user.userId);
      res.json({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active
      });
      return;
    } catch (error) {
      console.error('Get user error:', error);
      console.error('User ID was:', req.user?.userId);
      res.status(500).json({ error: 'Failed to get user information' });
      return;
    }
  }) as any);

  // Register endpoint (optional, can be disabled in production)
  if (process.env.ALLOW_REGISTRATION === 'true') {
    router.post(
      '/register',
      [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }).trim(),
        body('fullName').notEmpty().trim()
      ],
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
          }

          const { email, password, fullName } = req.body;
          const user = await authService.createUser(email, password, fullName);

          res.status(201).json({
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role
          });
          return;
        } catch (error: any) {
          console.error('Registration error:', error);
          if (error.code === '23505') { // Unique violation
            res.status(409).json({ error: 'Email already exists' });
            return;
          } else {
            res.status(500).json({ error: 'Registration failed' });
            return;
          }
        }
      }
    );
  }

  return router;
}