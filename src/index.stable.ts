// Minimal stable server entry that excludes legacy trading, tagging, and invoice-attachment routes
import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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
import flowGen from './routes/flow-gen';
import flowUpdate from './routes/flow-update';
import flowTest from './routes/flow-test';
import versionRoutes from './routes/version';
import telegramRoutes from './routes/telegram';
import documentRoutes from './routes/documents';
import realEstateRoutes from './routes/real-estate';
import integrationRoutes from './routes/integrations';
import { logger } from './utils/log';
import { db } from './services/database';
import { metricsService } from './services/metrics';
import { neuralOrchestrator } from './services/neural-orchestrator';

const app = express();
const httpServer = createServer(app);

app.set('trust proxy', true);

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
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(standardRateLimit);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(csrfProtection);
app.use(metricsService.createApiMetricsMiddleware());

// Request logging
app.use((req, res, next) => {
  const startTime = Date.now();
  logger.info(`${req.method} ${req.path} - Request started`);
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Public endpoints
const authRoutes = createAuthRoutes(db.pool);
app.use('/api/auth', authRoutes);
app.get('/api/csrf-token', sendCSRFToken);

// API info
app.get('/api/info', (_req, res) => {
  res.json({
    service: 'AI Service API (stable)',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    message: 'Stable build without legacy modules'
  });
});

// Simple health
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// API health
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'ai-service-api', timestamp: new Date().toISOString(), uptime: process.uptime(), version: process.env.VERSION || 'development' });
});

// Neural status
app.get('/status', async (_req, res) => {
  const startTime = Date.now();
  try {
    const neuralState = await neuralOrchestrator.evaluateSystemHealth();
    const healthCheckDuration = Date.now() - startTime;
    res.status(200).json({
      neural: neuralState,
      status: neuralState.overallHealth === 'optimal' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: { connected: await db.healthCheck(), healthCheckDuration: `${healthCheckDuration}ms` }
    });
  } catch (error: any) {
    res.status(503).json({ status: 'error', error: error.message, timestamp: new Date().toISOString() });
  }
});

// Metrics
app.get('/metrics', async (_req, res) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Routes (stable subset only)
app.use('/api', versionRoutes);
app.use('/api', flowGen);
app.use('/api', flowUpdate);
app.use('/api', flowTest);
app.use('/api/real-estate', realEstateRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/integrations', integrationRoutes);

// Static frontend
const frontendPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '../public')
  : path.join(__dirname, '../frontend/dist');
logger.info(`Serving static files from: ${frontendPath}`);
app.use(express.static(frontendPath));

// SPA fallback
app.get('*', (_req, res) => {
  const indexPath = path.join(__dirname, '../frontend/dist/index.html');
  res.sendFile(indexPath);
});

// CSRF error handler
app.use(csrfErrorHandler);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack, path: req.path, method: req.method });
  res.status(500).json({ error: 'Internal server error', path: req.path, timestamp: new Date().toISOString() });
});

const port = Number(process.env.PORT || 3000);
httpServer.listen(port, () => {
  logger.info(`Stable server running on port ${port}`);
});
