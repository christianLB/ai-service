import express from 'express';
import cors from 'cors';
import { Logger } from './utils/logger';
import { tradingRoutes } from './routes';
import { checkDatabaseHealth } from './lib/prisma';

const logger = new Logger('TradingService');
const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
    });
  });
  
  next();
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled request error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message }),
  });
});

// API Routes
app.use('/api/trading', tradingRoutes);

// Root health check
app.get('/', (req, res) => {
  res.json({ 
    service: 'AI Service - Trading Module',
    status: 'healthy', 
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      strategies: '/api/trading/strategies',
      positions: '/api/trading/positions',
      marketData: '/api/trading/market-data',
      backtest: '/api/trading/backtest',
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Add any cleanup logic here
      logger.info('Cleanup completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during cleanup', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
}

// Start server with error handling
const server = app.listen(PORT, async () => {
  logger.info(`Trading Service started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid,
  });

  // Check database connection on startup
  try {
    const dbHealth = await checkDatabaseHealth();
    if (dbHealth.connected) {
      logger.info('Database connection verified', { latency: dbHealth.latency });
    } else {
      logger.warn('Database connection failed', { error: dbHealth.error });
    }
  } catch (error) {
    logger.error('Database health check error', error);
  }
});

server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
  } else {
    logger.error('Server error', error);
  }
  process.exit(1);
});

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

export { app };