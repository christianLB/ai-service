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
    console.warn('📁 Environment variables loaded from .env.local');
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
import { applyOpenApiValidation } from './middleware/openapi-validator';
import { createAuthRoutes } from './routes/auth/auth.routes';
import flowGen from './routes/flow-gen';
import flowUpdate from './routes/flow-update';
import flowTest from './routes/flow-test';
import financialRoutes from './routes/financial';
import versionRoutes from './routes/version';
import telegramRoutes from './routes/telegram';
import documentRoutes from './routes/documents';
// import { createCryptoRoutes } from './routes/crypto.routes';
import realEstateRoutes from './routes/real-estate';
import integrationRoutes from './routes/integrations';
import taggingRoutes from './routes/tagging';
// Trading module removed
import { logger } from './utils/log';
import { db } from './services/database';
import { metricsService } from './services/metrics';
import { TelegramService } from './services/communication/telegram.service';
import { FinancialDatabaseService } from './services/financial/database.service';
import { DocumentStorageService } from './services/document-intelligence/storage.service';
import { neuralOrchestrator } from './services/neural-orchestrator';
import { forensicLogger } from './utils/forensic-logger';
import { WebSocketService } from './services/websocket/websocket.service';

const app = express();
const httpServer = createServer(app);
let websocketService: WebSocketService | null = null;

// Trust proxy for rate limiting and forwarded headers
app.set('trust proxy', true);

// Security middleware - Elena's implementation
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Global rate limiting - MUST be before other middleware
app.use(standardRateLimit);

// Middleware básico
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// OpenAPI validation middleware - validates requests/responses against OpenAPI specs
// This ensures contract compliance and type safety
applyOpenApiValidation(app);

// Middleware de métricas (debe ir antes de las rutas)
app.use(metricsService.createApiMetricsMiddleware());

// Middleware de logging de requests
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
    service: 'AI Service API',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    message: 'Use /health for health check or /api/* for API endpoints',
  });
});

// Forensic logs endpoint
app.get('/forensic-logs', (_req: express.Request, res: express.Response) => {
  const summary = forensicLogger.getSummary();
  res.json({
    summary,
    logFile: forensicLogger.getLogFile(),
    message: 'Check console for detailed output or view the log file directly',
  });
});

// Simple health check endpoint (for Docker healthcheck)
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API health check endpoint (for monitoring and frontend)
app.get('/api/health', (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'ai-service-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.VERSION || 'development',
  });
});

// Neural health check endpoint
app.get('/status', async (_req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  try {
    // Get neural system state
    const neuralState = await neuralOrchestrator.evaluateSystemHealth();
    const healthCheckDuration = Date.now() - startTime;

    // Get traditional metrics for compatibility
    const dbHealthy = await db.healthCheck();
    const poolStats = {
      total: db.pool.totalCount,
      idle: db.pool.idleCount,
      waiting: db.pool.waitingCount,
    };

    const status = {
      // Neural system status
      neural: {
        mode: neuralState.mode,
        overallHealth: neuralState.overallHealth,
        activeHemispheres: neuralState.activeHemispheres,
        offlineExtremities: neuralState.offlineExtremities,
        lastEvaluation: neuralState.lastEvaluation,
      },
      // Traditional status for backward compatibility
      status: neuralState.overallHealth === 'optimal' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        connected: dbHealthy,
        poolStats,
        healthCheckDuration: `${healthCheckDuration}ms`,
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    // Determine HTTP status based on neural health
    let httpStatus = 200;
    if (neuralState.overallHealth === 'offline') {
      httpStatus = 503;
    } else if (neuralState.overallHealth === 'critical') {
      httpStatus = 503;
    } else if (neuralState.overallHealth === 'degraded') {
      httpStatus = 200; // Still functional
    }

    res.status(httpStatus).json(status);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error('Neural health check failed:', {
      error: message,
      duration: `${duration}ms`,
      stack,
    });
    res.status(503).json({
      status: 'error',
      error: message,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
    });
  }
});

// Detailed neural status endpoint
app.get('/neural', async (_req: express.Request, res: express.Response) => {
  try {
    const neuralReport = neuralOrchestrator.getNeuralReport();
    res.json({
      success: true,
      data: neuralReport,
    });
  } catch (error: unknown) {
    logger.error('Error getting neural report:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', async (_req: express.Request, res: express.Response) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error: unknown) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Version routes - should be public
app.use('/api', versionRoutes);

// CSRF protection - Applied AFTER public endpoints but BEFORE protected routes
// This allows /api/csrf-token to work without already having a token
app.use(csrfProtection);

// Protected API Routes - Some routes have built-in auth, others need it applied
app.use('/api', flowGen);
app.use('/api', flowUpdate);
app.use('/api', flowTest);
// Use typed financial routes for contract compliance (Single Source of Truth)
// The typed routes ensure all requests/responses match OpenAPI specifications
app.use('/api/financial', financialRoutes);

// const cryptoRoutes = createCryptoRoutes(db.pool);

// app.use('/api', cryptoRoutes);
app.use('/api/real-estate', realEstateRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/integrations', integrationRoutes);

// Universal AI Tagging System routes
app.use('/api', taggingRoutes);

// Trading routes removed

// Servir archivos estáticos del frontend
// En producción, el volumen se monta en /app/public según docker-compose.production.yml
const frontendPath =
  process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '../public')
    : path.join(__dirname, '../frontend/dist');
logger.info(`Serving static files from: ${frontendPath}`);

// Middleware para prevenir caché en archivos HTML
app.use((req, res, next) => {
  // Aplicar no-cache solo a archivos HTML y la ruta raíz
  if (req.path.endsWith('.html') || req.path === '/' || req.path === '') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    logger.debug(`No-cache headers set for: ${req.path}`);
  } else if (req.path.startsWith('/assets/') && req.path.match(/\.(js|css)$/)) {
    // Assets pueden ser cacheados ya que Vite les pone hash en el nombre
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
});

app.use(express.static(frontendPath));

// Catch-all route for SPA - serve index.html for any non-API route
app.get('*', (_req: express.Request, res: express.Response) => {
  const indexPath =
    process.env.NODE_ENV === 'production'
      ? path.join(__dirname, '../public/index.html')
      : path.join(__dirname, '../frontend/dist/index.html');
  res.sendFile(indexPath);
});

// Tagging error handler (specific for tagging routes)
// TODO: Fix tag service TypeScript errors before enabling
// app.use(taggingErrorHandler);

// CSRF error handler
app.use(csrfErrorHandler);

// Global error handler
app.use(
  (err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logger.error('Unhandled error:', {
      error: message,
      stack,
      path: req.path,
      method: req.method,
    });

    res.status(500).json({
      error: 'Internal server error',
      path: req.path,
      timestamp: new Date().toISOString(),
    });
  }
);

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
    available_endpoints: [
      'GET /status',
      'POST /api/flow-gen',
      'POST /api/flow-update',
      'POST /api/flow-test',
      'GET /api/flows',
      'GET /api/flows/:id',
      'GET /api/metrics',
      'GET /api/metrics/json',
      'GET /api/performance',
      'POST /api/financial/setup-bbva',
      'POST /api/financial/complete-setup',
      'GET /api/financial/accounts',
      'GET /api/financial/transactions',
      'GET /api/financial/categories',
      'GET /api/financial/transactions/categorized',
      'POST /api/financial/categorize/auto',
      'GET /api/financial/reports/comprehensive',
      'GET /api/financial/metrics/realtime',
      'GET /api/financial/dashboard/overview',
      'GET /api/financial/dashboard/quick-stats',
      'POST /api/financial/sync',
      'GET /api/financial/sync-status',
      'GET /api/financial/health',
      'POST /api/telegram/webhook',
      'POST /api/telegram/send-message',
      'POST /api/telegram/send-alert',
      'POST /api/telegram/setup-webhook',
      'GET /api/telegram/status',
      'POST /api/documents/upload',
      'GET /api/documents',
      'GET /api/documents/:id',
      'GET /api/documents/:id/analysis',
      'POST /api/documents/:id/analyze',
      'POST /api/documents/:id/question',
      'DELETE /api/documents/:id',
      'POST /api/documents/search',
      'GET /api/documents/search',
      'GET /api/documents/stats/overview',
      'GET /api/documents/files/:filename',
      'GET /api/documents/health',
      'GET /neural - Neural system detailed status',
      'GET /api/integrations/types - List available integration types',
      'GET /api/integrations/configs - Get all configurations',
      'GET /api/integrations/configs/:type/:key - Get specific config',
      'POST /api/integrations/configs - Create/update configuration',
      'PUT /api/integrations/configs/:type/:key - Update configuration',
      'DELETE /api/integrations/configs/:type/:key - Delete configuration',
      'POST /api/integrations/test/:type - Test integration configuration',
    ],
  });
});

// Inicialización del bot de Telegram
async function initializeTelegramBot() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;

    // Verificar si está configurado
    if (!botToken || !chatId) {
      logger.warn('⚠️  Telegram bot not configured properly - skipping initialization');
      return;
    }

    logger.info('🤖 Initializing Telegram bot...');

    // Crear instancia del servicio financiero
    const financialService = new FinancialDatabaseService({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'ai_service',
      user: process.env.POSTGRES_USER || 'ai_user',
      password: process.env.POSTGRES_PASSWORD || '',
    });

    // Crear instancia del servicio de Telegram
    const telegramService = new TelegramService(
      {
        botToken,
        chatId,
        webhookUrl,
        alertsEnabled: process.env.TELEGRAM_ALERTS_ENABLED === 'true',
      },
      financialService
    );

    // Configurar webhook si está definido
    if (webhookUrl && webhookUrl.startsWith('https://')) {
      try {
        await telegramService.setWebhook(webhookUrl);
        logger.info(`✅ Telegram webhook configured: ${webhookUrl}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('Failed to set webhook:', msg);
        // No fallar si el webhook no se puede configurar
      }
    } else {
      logger.info('ℹ️  Telegram bot running in polling mode (no webhook)');
    }

    // Guardar instancia global para uso en rutas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).telegramService = telegramService;

    logger.info('✅ Telegram bot initialized successfully');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('❌ Telegram bot initialization failed:', msg);
    // No fallar el startup si Telegram falla
  }
}

// Inicialización de servicios
async function initializeServices() {
  try {
    logger.info('🚀 Starting AI Service initialization...');
    logger.info('🚀 Starting AI Service initialization...');

    // Inicializar base de datos
    logger.info('📊 About to initialize database...');
    logger.info('📊 Initializing database...');

    try {
      await db.initialize();
      logger.info('✅ Database initialized successfully');
      logger.info('✅ Database initialized successfully');
    } catch (dbError: unknown) {
      const msg = dbError instanceof Error ? dbError.message : String(dbError);
      logger.error('❌ Database initialization failed:', msg);
      throw dbError;
    }

    // Inicializar métricas
    logger.info('📈 Initializing metrics service...');
    await metricsService.initialize();
    logger.info('✅ Metrics service initialized successfully');

    // Inicializar document storage
    logger.info('📄 Initializing document storage...');
    const documentStorage = new DocumentStorageService({
      basePath: process.env.DOCUMENT_STORAGE_PATH,
    });
    await documentStorage.init();
    logger.info('✅ Document storage initialized successfully');

    // Inicializar Telegram si está configurado
    await initializeTelegramBot();

    // Inicializar WebSocket service
    logger.info('🔌 Initializing WebSocket service...');
    websocketService = new WebSocketService(httpServer);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).websocketService = websocketService;
    logger.info('✅ WebSocket service initialized successfully');

    // Inicializar Neural Orchestrator
    logger.info('🧠 Initializing Neural Orchestrator...');
    await neuralOrchestrator.startMonitoring();
    logger.info('✅ Neural Orchestrator initialized successfully');

    logger.info('🎉 All services initialized successfully');
    return true;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('❌ Service initialization failed:', msg);
    throw error;
  }
}

// Manejo graceful de shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Stop neural orchestrator monitoring
    neuralOrchestrator.stopMonitoring();
    logger.info('✅ Neural Orchestrator stopped');

    // Cerrar conexiones de base de datos
    await db.close();
    logger.info('✅ Database connections closed');

    // Aquí podrías cerrar otras conexiones (Redis, etc.)

    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('❌ Error during shutdown:', msg);
    process.exit(1);
  }
}

// Registro de señales de shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Función principal de inicio
async function startServer() {
  try {
    // Inicializar servicios
    await initializeServices();

    // Obtener puerto del environment
    const port = process.env.PORT || 3000;

    // Iniciar servidor HTTP con WebSocket
    httpServer.listen(port, () => {
      logger.info(`🚀 AI Service listening on port ${port}`);
      logger.info(`🏦 Financial Dashboard at http://localhost:${port}/dashboard`);
      logger.info(`📊 Metrics available at http://localhost:${port}/api/metrics`);
      logger.info(`🏥 Health check at http://localhost:${port}/status`);
      logger.info(`📈 Performance dashboard at http://localhost:${port}/api/performance`);
      logger.info('🔌 WebSocket server ready for connections');

      // Log de configuración actual
      logger.info('🔧 Configuration:', {
        node_env: process.env.NODE_ENV || 'development',
        log_level: process.env.LOG_LEVEL || 'info',
        postgres_host: process.env.POSTGRES_HOST || 'localhost',
        redis_host: process.env.REDIS_HOST || 'localhost',
        n8n_url: process.env.N8N_API_URL || 'http://localhost:5678',
        openai_configured: !!process.env.OPENAI_API_KEY,
        claude_configured: !!process.env.CLAUDE_API_KEY,
        websocket_enabled: true,
      });
    });

    // Configurar timeout del servidor
    httpServer.timeout = 30000; // 30 segundos

    return httpServer;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to start server:', msg);
    process.exit(1);
  }
}

// Iniciar el servidor solo si este archivo se ejecuta directamente
if (require.main === module) {
  logger.info('🎯 Main module detected, starting server...');
  startServer().catch((error) => {
    logger.error('💥 Fatal error starting server:', error);
    process.exit(1);
  });
}

export { app, startServer };
