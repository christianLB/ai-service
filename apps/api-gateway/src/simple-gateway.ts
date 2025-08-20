import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    routes: {
      monolith: 'http://localhost:3001',
      financial: 'http://localhost:3002',
      trading: 'http://localhost:3003',
      ai: 'http://localhost:3004',
      communication: 'http://localhost:3005'
    }
  });
});

// Service discovery endpoint
app.get('/api/services', (req, res) => {
  res.json({
    services: [
      {
        name: 'monolith',
        url: 'http://localhost:3001',
        status: 'active',
        endpoints: ['/api/dashboard', '/api/auth', '/api/users']
      },
      {
        name: 'financial',
        url: 'http://localhost:3002',
        status: 'active',
        endpoints: ['/api/financial/accounts', '/api/financial/clients', '/api/financial/invoices', '/api/financial/transactions']
      },
      {
        name: 'trading',
        url: 'http://localhost:3003',
        status: 'active',
        endpoints: ['/api/trading/strategies', '/api/trading/positions', '/api/trading/market-data', '/api/trading/backtest']
      }
    ]
  });
});

// Proxy configuration for each service
const proxyOptions = {
  changeOrigin: true,
  logLevel: 'debug' as const,
  onError: (err: any, req: any, res: any) => {
    console.error('Proxy error:', err);
    res.status(503).json({
      error: 'Service temporarily unavailable',
      message: err.message
    });
  },
  onProxyReq: (proxyReq: any, req: any) => {
    console.log(`Proxying ${req.method} ${req.path} to service`);
  }
};

// Financial Service routes
app.use('/api/financial', createProxyMiddleware({
  target: 'http://localhost:3002',
  ...proxyOptions
}));

// Trading Service routes
app.use('/api/trading', createProxyMiddleware({
  target: 'http://localhost:3003',
  ...proxyOptions
}));

// AI Service routes (NOT IMPLEMENTED YET)
app.use('/api/ai', (req, res) => {
  res.status(501).json({
    error: 'AI Service not implemented',
    message: 'This service will be developed in a future phase'
  });
});

// Communication Service routes (NOT IMPLEMENTED YET)
app.use('/api/comm', (req, res) => {
  res.status(501).json({
    error: 'Communication Service not implemented',
    message: 'This service will be developed in a future phase'
  });
});

// Dashboard and other routes to monolith (fallback)
app.use('/api/dashboard', createProxyMiddleware({
  target: 'http://localhost:3001',
  ...proxyOptions
}));

// Auth routes to monolith
app.use('/api/auth', createProxyMiddleware({
  target: 'http://localhost:3001',
  ...proxyOptions
}));

// User routes to monolith
app.use('/api/users', createProxyMiddleware({
  target: 'http://localhost:3001',
  ...proxyOptions
}));

// Default fallback to monolith for unmatched API routes
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3001',
  ...proxyOptions
}));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'API Gateway',
    version: '1.0.0',
    description: 'Central API Gateway for AI Service Microservices',
    health: '/health',
    services: '/api/services',
    documentation: {
      financial: '/api/financial/* → Port 3002',
      trading: '/api/trading/* → Port 3003',
      ai: '/api/ai/* → Not Implemented (501)',
      communication: '/api/comm/* → Not Implemented (501)',
      monolith: '/api/* → Port 3001 (fallback)'
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 API Gateway Running
====================
Port: ${PORT}
Health: http://localhost:${PORT}/health
Services: http://localhost:${PORT}/api/services

Routing Configuration:
- /api/financial/* → Financial Service (3002)
- /api/trading/*   → Trading Service (3003)
- /api/ai/*        → Not Implemented (501)
- /api/comm/*      → Not Implemented (501)
- /api/*           → Monolith API (3001)

Ready to route requests to microservices!
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;