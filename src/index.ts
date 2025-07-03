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
  res.redirect('/public/financial-dashboard.html');
});

// Health check endpoint
app.get('/status', async (_req: express.Request, res: express.Response) => {
  try {
    const dbHealthy = await db.healthCheck();
    const alerts = await metricsService.checkAlerts();
    
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbHealthy ? 'connected' : 'disconnected',
      alerts: alerts.length,
      version: process.env.npm_package_version || '1.0.0'
    };
    
    const httpStatus = dbHealthy && alerts.filter(a => a.level === 'critical').length === 0 ? 200 : 503;
    res.status(httpStatus).json(status);
  } catch (error: any) {
    logger.error('Health check failed:', error.message);
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
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