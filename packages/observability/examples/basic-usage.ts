/**
 * Basic usage example for @ai/observability package
 * 
 * This example shows how to set up observability for a typical AI Service microservice
 */

import express from 'express';
import {
  createStandardObservability,
  StandardHealthHandler,
  MetricsRegistry,
  createDatabaseChecker,
  createRedisChecker,
  createHttpChecker,
  traceIdMiddleware,
  getTraceId,
} from '../src/index';

// Mock dependencies for the example
const mockDatabase = {
  query: async (text: string) => {
    // Simulate database query
    return { rows: [{ health_check: 1 }] };
  }
};

const mockRedis = {
  ping: async () => 'PONG',
  status: 'ready'
};

async function createExampleService() {
  const app = express();

  // Example 1: Quick setup with createStandardObservability
  console.log('🚀 Setting up standard observability...');
  
  const observability = createStandardObservability({
    serviceName: 'example-service',
    version: '1.0.0',
    environment: 'development',
    dependencies: {
      database: { 
        client: mockDatabase,
        options: { name: 'postgres', timeout: 3000 }
      },
      redis: { 
        client: mockRedis,
        options: { name: 'redis-cache' }
      },
      http: [
        {
          name: 'external-api',
          url: 'https://httpbin.org/status/200',
          timeout: 5000,
          critical: false,
        }
      ],
      memory: {
        name: 'memory-check',
        maxHeapUsedMB: 256,
        maxRssMB: 512,
      }
    }
  });

  // Apply all middleware and endpoints
  observability.setupExpress(app);

  // Example 2: Custom health check setup
  console.log('⚕️ Setting up custom health checks...');
  
  const customHealthHandler = new StandardHealthHandler({
    serviceName: 'custom-health-service',
    dependencies: [
      createDatabaseChecker(mockDatabase, { name: 'primary-db', timeout: 2000 }),
      createRedisChecker(mockRedis, { name: 'session-store', critical: false }),
      createHttpChecker({
        name: 'auth-service',
        url: 'https://httpbin.org/status/200',
        timeout: 3000,
      }),
    ],
  });

  app.get('/custom-health', customHealthHandler.health);

  // Example 3: Custom metrics
  console.log('📊 Setting up custom metrics...');
  
  const customMetrics = new MetricsRegistry({
    serviceName: 'example-service',
    enableDefaultMetrics: true,
  });

  const requestCounter = customMetrics.createCounter(
    'business_requests_total',
    'Total business requests processed',
    ['operation', 'status']
  );

  const operationDuration = customMetrics.createHistogram(
    'business_operation_duration_seconds',
    'Duration of business operations',
    ['operation']
  );

  // Example business endpoint with metrics
  app.post('/api/process', async (req, res) => {
    const traceId = getTraceId(req);
    const startTime = Date.now();
    
    try {
      console.log(`Processing request with trace ID: ${traceId}`);
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      const duration = (Date.now() - startTime) / 1000;
      
      // Record metrics
      requestCounter.inc({ operation: 'process', status: 'success' });
      operationDuration.observe({ operation: 'process' }, duration);
      
      res.json({ 
        success: true, 
        traceId,
        processingTime: `${duration}s`
      });
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      
      requestCounter.inc({ operation: 'process', status: 'error' });
      operationDuration.observe({ operation: 'process' }, duration);
      
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId 
      });
    }
  });

  // Example 4: Manual tracing middleware
  app.use(traceIdMiddleware({
    generateIfMissing: true,
    setResponseHeader: true,
  }));

  // Simple info endpoint
  app.get('/api/info', (req, res) => {
    const traceId = getTraceId(req);
    res.json({
      service: 'example-service',
      version: '1.0.0',
      traceId,
      timestamp: new Date().toISOString(),
    });
  });

  return { app, observability };
}

// Test the service if run directly
if (require.main === module) {
  createExampleService().then(({ app, observability }) => {
    const port = process.env.PORT || 3000;
    
    app.listen(port, () => {
      console.log(`\n🎯 Example service running on port ${port}`);
      console.log('\n📋 Available endpoints:');
      console.log('  GET  /health       - Standard health check');
      console.log('  GET  /health/live  - Liveness probe');
      console.log('  GET  /health/ready - Readiness probe');
      console.log('  GET  /metrics      - Prometheus metrics');
      console.log('  GET  /custom-health- Custom health check');
      console.log('  GET  /api/info     - Service info with trace ID');
      console.log('  POST /api/process  - Example business endpoint');
      console.log('\n🧪 Test commands:');
      console.log('  curl http://localhost:' + port + '/health');
      console.log('  curl http://localhost:' + port + '/health/ready');
      console.log('  curl http://localhost:' + port + '/metrics');
      console.log('  curl -X POST http://localhost:' + port + '/api/process');
    });

    // Graceful shutdown example
    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, initiating graceful shutdown...');
      if (observability?.healthHandler) {
        observability.healthHandler.initiateGracefulShutdown();
      }
    });

    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, initiating graceful shutdown...');
      if (observability?.healthHandler) {
        observability.healthHandler.initiateGracefulShutdown();
      }
    });
  }).catch(error => {
    console.error('❌ Failed to start example service:', error);
    process.exit(1);
  });
}

export { createExampleService };