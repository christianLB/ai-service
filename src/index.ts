// Load environment variables from .env.local if it exists
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('📁 Environment variables loaded from .env.local');
}

import express from 'express';
import flowGen from './routes/flow-gen';
import flowUpdate from './routes/flow-update';
import flowTest from './routes/flow-test';
import financialRoutes from './routes/financial';
import telegramRoutes from './routes/telegram';
import { logger } from './utils/log';
import { db } from './services/database';
import { metricsService } from './services/metrics';
import { TelegramService } from './services/communication/telegram.service';
import { FinancialDatabaseService } from './services/financial/database.service';

const app = express();

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use('/public', express.static(path.join(__dirname, '../public')));

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

// Main route redirect to dashboard
app.get('/', (_req: express.Request, res: express.Response) => {
  res.redirect('/dashboard');
});

// Dashboard redirect
app.get('/dashboard', (_req: express.Request, res: express.Response) => {
  // Direct serve instead of redirect to avoid 404 issues
  res.sendFile(path.join(__dirname, '../public/financial-dashboard.html'));
});

// Health check endpoint
app.get('/status', async (_req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  try {
    // Run health check with detailed diagnostics
    const dbHealthy = await db.healthCheck();
    const healthCheckDuration = Date.now() - startTime;
    
    // Get pool statistics
    const poolStats = {
      total: db.pool.totalCount,
      idle: db.pool.idleCount,
      waiting: db.pool.waitingCount
    };
    
    const status = {
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        connected: dbHealthy,
        poolStats,
        healthCheckDuration: `${healthCheckDuration}ms`
      },
      alerts: 0,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    // Log health check result
    if (!dbHealthy) {
      logger.warn('Health check returned degraded status', { poolStats, duration: healthCheckDuration });
    }
    
    // Simplified health check - only fail if DB is down
    const httpStatus = dbHealthy ? 200 : 503;
    res.status(httpStatus).json(status);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('Health check failed:', { 
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

// API Routes
app.use('/api', flowGen);
app.use('/api', flowUpdate);
app.use('/api', flowTest);
app.use('/api/financial', financialRoutes);
app.use('/api/telegram', telegramRoutes);

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
      'GET /dashboard - Financial Dashboard',
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
      'GET /api/telegram/status'
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
    logger.info('🚀 Starting AI Service initialization...');
    
    // Inicializar base de datos
    logger.info('📊 Initializing database...');
    await db.initialize();
    logger.info('✅ Database initialized successfully');
    
    // Inicializar métricas
    logger.info('📈 Initializing metrics service...');
    await metricsService.initialize();
    logger.info('✅ Metrics service initialized successfully');
    
    // Inicializar Telegram si está configurado
    await initializeTelegramBot();
    
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
  startServer();
}

export { app, startServer };