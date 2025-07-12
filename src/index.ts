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

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createAuthRoutes } from './routes/auth/auth.routes';
import { authMiddleware } from './middleware/auth.middleware';
import flowGen from './routes/flow-gen';
import flowUpdate from './routes/flow-update';
import flowTest from './routes/flow-test';
import financialRoutes from './routes/financial';
import versionRoutes from './routes/version';
import telegramRoutes from './routes/telegram';
import documentRoutes from './routes/documents';
import { logger } from './utils/log';
import { db } from './services/database';
import { metricsService } from './services/metrics';
import { TelegramService } from './services/communication/telegram.service';
import { FinancialDatabaseService } from './services/financial/database.service';
import { DocumentStorageService } from './services/document-intelligence/storage.service';
import { neuralOrchestrator } from './services/neural-orchestrator';
import { forensicLogger, showForensicLogs } from './utils/forensic-logger';

const app = express();

// Security middleware - Elena's implementation
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

// Middleware básico
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos del frontend
// En producción, el volumen se monta en /app/public según docker-compose.production.yml
const frontendPath = process.env.NODE_ENV === 'production' 
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

// API info endpoint (public)
app.get('/api/info', (_req: express.Request, res: express.Response) => {
  res.json({
    service: 'AI Service API',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    message: 'Use /health for health check or /api/* for API endpoints'
  });
});

// Forensic logs endpoint
app.get('/forensic-logs', (_req: express.Request, res: express.Response) => {
  const summary = forensicLogger.getSummary();
  res.json({
    summary,
    logFile: forensicLogger.getLogFile(),
    message: 'Check console for detailed output or view the log file directly'
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
      waiting: db.pool.waitingCount
    };
    
    const status = {
      // Neural system status
      neural: {
        mode: neuralState.mode,
        overallHealth: neuralState.overallHealth,
        activeHemispheres: neuralState.activeHemispheres,
        offlineExtremities: neuralState.offlineExtremities,
        lastEvaluation: neuralState.lastEvaluation
      },
      // Traditional status for backward compatibility
      status: neuralState.overallHealth === 'optimal' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        connected: dbHealthy,
        poolStats,
        healthCheckDuration: `${healthCheckDuration}ms`
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    // Determine HTTP status based on neural health
    let httpStatus = 200;
    if (neuralState.overallHealth === 'offline') httpStatus = 503;
    else if (neuralState.overallHealth === 'critical') httpStatus = 503;
    else if (neuralState.overallHealth === 'degraded') httpStatus = 200; // Still functional
    
    res.status(httpStatus).json(status);
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('Neural health check failed:', { 
      error: error.message, 
      duration: `${duration}ms`,
      stack: error.stack 
    });
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`
    });
  }
});

// Detailed neural status endpoint
app.get('/neural', async (_req: express.Request, res: express.Response) => {
  try {
    const neuralReport = neuralOrchestrator.getNeuralReport();
    res.json({
      success: true,
      data: neuralReport
    });
  } catch (error: any) {
    logger.error('Error getting neural report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', async (_req: express.Request, res: express.Response) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error: any) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Protected API Routes - Apply auth middleware to all
app.use('/api', authMiddleware, flowGen);
app.use('/api', authMiddleware, flowUpdate);
app.use('/api', authMiddleware, flowTest);
app.use('/api/financial', authMiddleware, financialRoutes);
app.use('/api', authMiddleware, versionRoutes);
app.use('/api/telegram', authMiddleware, telegramRoutes);
app.use('/api/documents', authMiddleware, documentRoutes);

// Catch-all route for SPA - serve index.html for any non-API route
app.get('*', (_req: express.Request, res: express.Response) => {
  const indexPath = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, '../public/index.html')
    : path.join(__dirname, '../frontend/dist/index.html');
  res.sendFile(indexPath);
});

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
      'GET /neural - Neural system detailed status'
    ]
  });
});

// Inicialización del bot de Telegram
async function initializeTelegramBot() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    
    // Verificar si está configurado
    if (!botToken || botToken === 'your-telegram-bot-token' || !chatId || chatId === 'your-telegram-chat-id') {
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
      password: process.env.POSTGRES_PASSWORD || ''
    });
    
    // Crear instancia del servicio de Telegram
    const telegramService = new TelegramService(
      {
        botToken,
        chatId,
        webhookUrl,
        alertsEnabled: process.env.TELEGRAM_ALERTS_ENABLED === 'true'
      },
      financialService
    );
    
    // Configurar webhook si está definido
    if (webhookUrl && webhookUrl.startsWith('https://')) {
      try {
        await telegramService.setWebhook(webhookUrl);
        logger.info(`✅ Telegram webhook configured: ${webhookUrl}`);
      } catch (error: any) {
        logger.error('Failed to set webhook:', error.message);
        // No fallar si el webhook no se puede configurar
      }
    } else {
      logger.info('ℹ️  Telegram bot running in polling mode (no webhook)');
    }
    
    // Guardar instancia global para uso en rutas
    (global as any).telegramService = telegramService;
    
    logger.info('✅ Telegram bot initialized successfully');
  } catch (error: any) {
    logger.error('❌ Telegram bot initialization failed:', error.message);
    // No fallar el startup si Telegram falla
  }
}

// Inicialización de servicios
async function initializeServices() {
  try {
    console.log('🚀 [CONSOLE] Starting AI Service initialization...');
    logger.info('🚀 Starting AI Service initialization...');
    
    // Inicializar base de datos
    console.log('📊 [CONSOLE] About to initialize database...');
    logger.info('📊 Initializing database...');
    
    try {
      await db.initialize();
      console.log('✅ [CONSOLE] Database initialized successfully');
      logger.info('✅ Database initialized successfully');
    } catch (dbError: any) {
      console.error('❌ [CONSOLE] Database initialization failed:', dbError.message);
      logger.error('❌ Database initialization failed:', dbError);
      throw dbError;
    }
    
    // Inicializar métricas
    logger.info('📈 Initializing metrics service...');
    await metricsService.initialize();
    logger.info('✅ Metrics service initialized successfully');
    
    // Inicializar document storage
    logger.info('📄 Initializing document storage...');
    const documentStorage = new DocumentStorageService({
      basePath: process.env.DOCUMENT_STORAGE_PATH
    });
    await documentStorage.init();
    logger.info('✅ Document storage initialized successfully');
    
    // Inicializar Telegram si está configurado
    await initializeTelegramBot();
    
    // Inicializar Neural Orchestrator
    logger.info('🧠 Initializing Neural Orchestrator...');
    await neuralOrchestrator.startMonitoring();
    logger.info('✅ Neural Orchestrator initialized successfully');
    
    logger.info('🎉 All services initialized successfully');
    return true;
  } catch (error: any) {
    logger.error('❌ Service initialization failed:', error.message);
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
  } catch (error: any) {
    logger.error('❌ Error during shutdown:', error.message);
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
    
    // Iniciar servidor
    const server = app.listen(port, () => {
      logger.info(`🚀 AI Service listening on port ${port}`);
      logger.info(`🏦 Financial Dashboard at http://localhost:${port}/dashboard`);
      logger.info(`📊 Metrics available at http://localhost:${port}/api/metrics`);
      logger.info(`🏥 Health check at http://localhost:${port}/status`);
      logger.info(`📈 Performance dashboard at http://localhost:${port}/api/performance`);
      
      // Log de configuración actual
      logger.info('🔧 Configuration:', {
        node_env: process.env.NODE_ENV || 'development',
        log_level: process.env.LOG_LEVEL || 'info',
        postgres_host: process.env.POSTGRES_HOST || 'localhost',
        redis_host: process.env.REDIS_HOST || 'localhost',
        n8n_url: process.env.N8N_API_URL || 'http://localhost:5678',
        openai_configured: !!process.env.OPENAI_API_KEY,
        claude_configured: !!process.env.CLAUDE_API_KEY
      });
    });
    
    // Configurar timeout del servidor
    server.timeout = 30000; // 30 segundos
    
    return server;
  } catch (error: any) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Iniciar el servidor solo si este archivo se ejecuta directamente
if (require.main === module) {
  console.log('🎯 [CONSOLE] Main module detected, starting server...');
  startServer().catch(error => {
    console.error('💥 [CONSOLE] Fatal error starting server:', error);
    process.exit(1);
  });
}

export { app, startServer };