# @ai/observability

A comprehensive observability package for the AI Service ecosystem, providing standardized health checks, metrics collection, and request tracing.

## Features

- **Health Checks**: Liveness, readiness, and comprehensive health endpoints
- **Metrics**: Prometheus-compatible metrics collection and exposure
- **Tracing**: Request tracing with trace IDs for distributed systems
- **Dependency Monitoring**: Built-in checkers for databases, Redis, HTTP endpoints, and more
- **Type Safety**: Full TypeScript support with Zod schema validation

## Quick Start

### Basic Setup

```typescript
import express from 'express';
import { createStandardObservability } from '@ai/observability';

const app = express();

// Setup observability with sensible defaults
const observability = createStandardObservability({
  serviceName: 'my-service',
  version: '1.0.0',
  environment: 'production',
});

// Apply all observability middleware and endpoints
observability.setupExpress(app);

app.listen(3000);
```

This gives you:

- `GET /health` - Comprehensive health check
- `GET /health/live` - Liveness probe (K8s compatible)
- `GET /health/ready` - Readiness probe (K8s compatible)
- `GET /metrics` - Prometheus metrics
- Automatic request tracing
- HTTP metrics collection

### Custom Health Checks

```typescript
import {
  StandardHealthHandler,
  createDatabaseChecker,
  createRedisChecker,
  createHttpChecker,
} from '@ai/observability';
import { Pool } from 'pg';
import Redis from 'ioredis';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);

const healthHandler = new StandardHealthHandler({
  serviceName: 'financial-svc',
  version: '1.0.0',
  dependencies: [
    createDatabaseChecker(pool, { name: 'postgres', timeout: 3000 }),
    createRedisChecker(redis, { name: 'redis-cache' }),
    createHttpChecker({
      name: 'external-api',
      url: 'https://api.external.com/health',
      timeout: 5000,
      critical: false, // Non-critical dependency
    }),
  ],
});

app.get('/health', healthHandler.health);
app.get('/health/live', healthHandler.liveness);
app.get('/health/ready', healthHandler.readiness);
```

### Metrics Collection

```typescript
import { MetricsRegistry } from '@ai/observability';

const metrics = new MetricsRegistry({
  serviceName: 'trading-svc',
  enableDefaultMetrics: true,
  enableHttpMetrics: true,
});

// Apply HTTP metrics middleware
app.use(metrics.httpMiddleware());

// Create custom business metrics
const tradesProcessed = metrics.createCounter(
  'trades_processed_total',
  'Total number of trades processed',
  ['strategy', 'status']
);

const tradeLatency = metrics.createHistogram(
  'trade_execution_duration_seconds',
  'Time taken to execute trades',
  ['strategy']
);

// Use in your business logic
tradesProcessed.inc({ strategy: 'arbitrage', status: 'success' });
tradeLatency.observe({ strategy: 'arbitrage' }, 0.245);

// Expose metrics endpoint
app.get('/metrics', metrics.metricsEndpoint);
```

### Request Tracing

```typescript
import { traceIdMiddleware, getTraceId, createTracedHeaders } from '@ai/observability';

// Apply tracing middleware
app.use(
  traceIdMiddleware({
    headerName: 'x-trace-id',
    generateIfMissing: true,
    setResponseHeader: true,
  })
);

// Use trace IDs in your handlers
app.post('/api/trades', async (req, res) => {
  const traceId = getTraceId(req);
  console.log(`Processing trade request`, { traceId });

  // Pass trace ID to downstream services
  const headers = createTracedHeaders(req, {
    Authorization: 'Bearer token',
  });

  const response = await fetch('http://external-service/api/data', { headers });
  // ...
});
```

## Service Integration Examples

### API Gateway Pattern

```typescript
import { createStandardObservability, createHttpChecker } from '@ai/observability';

const observability = createStandardObservability({
  serviceName: 'api-gateway',
  dependencies: {
    http: [
      { name: 'financial-svc', url: 'http://financial-svc:3001/health' },
      { name: 'trading-svc', url: 'http://trading-svc:3002/health' },
      { name: 'ai-core', url: 'http://ai-core:3003/health' },
    ],
  },
});

observability.setupExpress(app);
```

### Microservice with Database

```typescript
import { createStandardObservability } from '@ai/observability';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const observability = createStandardObservability({
  serviceName: 'financial-svc',
  dependencies: {
    database: { client: pool },
    memory: { maxHeapUsedMB: 256, maxRssMB: 512 },
  },
});

observability.setupExpress(app);
```

## Health Check Response Format

All health endpoints return standardized JSON responses:

### Liveness Response

```json
{
  "alive": true,
  "timestamp": "2025-08-15T10:30:00.000Z",
  "uptime": 3600,
  "service": "my-service"
}
```

### Readiness Response

```json
{
  "ready": true,
  "timestamp": "2025-08-15T10:30:00.000Z",
  "service": "my-service",
  "overall_status": "healthy",
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "message": "Database connection successful",
      "latency": 12,
      "timestamp": "2025-08-15T10:30:00.000Z"
    }
  ]
}
```

### Comprehensive Health Response

```json
{
  "status": "healthy",
  "timestamp": "2025-08-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "service": "my-service",
  "environment": "production",
  "dependencies": [...],
  "metadata": {
    "isShuttingDown": false,
    "memoryUsage": {...},
    "nodeVersion": "v20.0.0",
    "platform": "linux",
    "arch": "x64"
  }
}
```

## Kubernetes Integration

The package provides Kubernetes-compatible health probes:

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: my-service
      image: my-service:latest
      livenessProbe:
        httpGet:
          path: /health/live
          port: 3000
        initialDelaySeconds: 30
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 3000
        initialDelaySeconds: 5
        periodSeconds: 5
```

## Prometheus Integration

Metrics are exposed in Prometheus format at `/metrics`:

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status_code="200",route="/api/health"} 42

# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",status_code="200",route="/api/health",le="0.005"} 40
```

## Error Handling

The package includes comprehensive error handling:

- Health checks have configurable timeouts
- Failed dependency checks are properly categorized
- Graceful shutdown handling
- Request tracing survives errors
- Metrics collection is failure-resistant

## Production Considerations

- Use `critical: false` for non-essential dependencies
- Set appropriate timeouts for health checks
- Monitor memory usage with built-in memory checker
- Use trace IDs for debugging distributed requests
- Configure proper Prometheus scraping intervals

## API Reference

See the TypeScript definitions for complete API documentation. All functions and classes are fully typed with comprehensive JSDoc comments.
