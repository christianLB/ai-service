// Import reflect-metadata before anything else
import 'reflect-metadata';

// Load environment variables from .env.local if it exists
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Only load .env.local in development mode
if (process.env.NODE_ENV !== 'production') {
  const envLocalPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
    console.log('📁 Environment variables loaded from .env.local');
  }
}

const defaultJwt = 'your-secret-key-change-in-production';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === defaultJwt) {
  console.warn('⚠️  JWT_SECRET is using the default value. Please change it in production.');
}

import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { csrfProtection, csrfErrorHandler, sendCSRFToken } from './middleware/csrf';
import { standardRateLimit } from './middleware/express-rate-limit.middleware';
import { createAuthRoutes } from './routes/auth/auth.routes';
import { setupContractRoutes } from './routes/contract-routes';
import versionRoutes from './routes/version';
import { logger } from './utils/log';
import { db } from './services/database';

const app = express();
const httpServer = createServer(app);

// Trust proxy for rate limiting and forwarded headers
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Global rate limiting
app.use(standardRateLimit);

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// CSRF protection
app.use(csrfProtection);

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  logger.info(`${req.method} ${req.path} - Request started`);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Public endpoints (no auth required)
const authRoutes = createAuthRoutes(db.pool);
app.use('/api/auth', authRoutes);

// CSRF token endpoint (public)
app.get('/api/csrf-token', sendCSRFToken);

// API info endpoint (public)
app.get('/api/info', (_req: express.Request, res: express.Response) => {
  res.json({
    service: 'AI Service API - Contract-First',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    message: 'Using ts-rest contract-first approach'
  });
});

// Simple health check endpoint (for Docker healthcheck)
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API health check endpoint (for monitoring and frontend)
app.get('/api/health', (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'ai-service-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.VERSION || 'development'
  });
});

// Version routes
app.use('/api', versionRoutes);

// Import legacy routes temporarily while migrating
import financialRoutes from './routes/financial';
import dashboardRoutes from './routes/dashboard';
import tradingRoutes from './routes/trading';

// Legacy routes (temporary while migrating to contract-first)
app.use('/api/financial', financialRoutes);
app.use('/api/financial/dashboard', dashboardRoutes);
app.use('/api/trading', tradingRoutes);

// Setup contract-first routes using ts-rest
setupContractRoutes(app);

// Serve static files for frontend
const frontendPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../public')
  : path.join(__dirname, '../frontend/dist');
logger.info(`Serving static files from: ${frontendPath}`);

// Middleware to prevent caching of HTML files
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/' || req.path === '') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    logger.debug(`No-cache headers set for: ${req.path}`);
  } else if (req.path.startsWith('/assets/') && req.path.match(/\.(js|css)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
});

app.use(express.static(frontendPath));

// Catch-all route for SPA - serve index.html for any non-API route
app.get('*', (_req: express.Request, res: express.Response) => {
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend not built' });
  }
});

// CSRF error handler
app.use(csrfErrorHandler);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal server error',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3001;

// Handle shutdown gracefully
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal received: closing HTTP server`);
  httpServer.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await db.close();
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database connections:', error);
    }
    
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize services and start server
async function startServer() {
  try {
    // Check database connection
    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database health check failed');
    }
    logger.info('✅ Database connection established');
    
    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Contract-First API Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API available at: http://localhost:${PORT}/api`);
      logger.info(`📱 Frontend served from: ${frontendPath}`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(error => {
  logger.error('Fatal error during startup:', error);
  process.exit(1);
});