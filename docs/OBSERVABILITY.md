# AI Service Observability System

Comprehensive observability implementation for the AI Service ecosystem, providing health checks, metrics collection, distributed tracing, and operational insights.

## 🎯 Overview

The AI Service observability system is built around the `@ai/observability` package, which provides:

- **Health Checks**: Liveness, readiness, and comprehensive health endpoints
- **Metrics Collection**: Prometheus-compatible metrics with custom business metrics
- **Distributed Tracing**: Request tracing with UUID v4 trace IDs
- **Dependency Monitoring**: Automated health checks for databases, Redis, HTTP services
- **Docker Integration**: Health check configurations for container orchestration

## 🏗️ Architecture

### Core Components

```
@ai/observability Package
├── health/
│   ├── health-handler.ts      # StandardHealthHandler class
│   └── dependency-checkers.ts # Database, Redis, HTTP, Memory checkers
├── metrics/
│   └── metrics-registry.ts    # Prometheus metrics collection
├── middleware/
│   └── trace-id.ts           # Distributed tracing middleware
└── types/
    └── health.types.ts       # TypeScript interfaces and schemas
```

### Health Check Architecture

The system implements three levels of health checks following Kubernetes best practices:

1. **Liveness** (`/health/live`): Indicates if the service is running
2. **Readiness** (`/health/ready`): Indicates if the service can handle requests
3. **Comprehensive** (`/health`): Detailed health with dependency status and metadata

### Metrics Architecture

Built on Prometheus client with:

- **Default Node.js Metrics**: Memory, CPU, garbage collection
- **HTTP Metrics**: Request count, duration, request/response sizes
- **Custom Business Metrics**: Counters, gauges, histograms, summaries
- **Automatic Labeling**: Service name, version, environment

### Tracing Architecture

UUID v4-based request tracing with:

- **Automatic Generation**: Creates trace IDs if not present
- **Header Propagation**: Forwards trace IDs across service boundaries
- **Validation**: Ensures trace ID format compliance
- **Context Management**: Maintains trace context in async operations

## 🚀 Quick Start

### Basic Setup

```typescript
import express from 'express';
import { createStandardObservability } from '@ai/observability';

const app = express();

// One-line setup with all observability features
const observability = createStandardObservability({
  serviceName: 'my-service',
  version: '1.0.0',
  environment: 'production',
  dependencies: {
    database: {
      client: dbClient,
      options: { name: 'postgres', timeout: 3000 },
    },
    redis: {
      client: redisClient,
      options: { name: 'cache' },
    },
  },
});

// Apply all middleware and endpoints
observability.setupExpress(app);

// Endpoints automatically available:
// GET /health      - Comprehensive health check
// GET /health/live - Liveness probe
// GET /health/ready - Readiness probe
// GET /metrics     - Prometheus metrics
```

### Custom Health Checks

```typescript
import {
  StandardHealthHandler,
  createDatabaseChecker,
  createRedisChecker,
  createHttpChecker,
  createMemoryChecker,
} from '@ai/observability';

const healthHandler = new StandardHealthHandler({
  serviceName: 'financial-service',
  dependencies: [
    createDatabaseChecker(dbClient, {
      name: 'postgres',
      timeout: 3000,
      critical: true,
    }),
    createRedisChecker(redisClient, {
      name: 'session-store',
      critical: false,
    }),
    createHttpChecker({
      name: 'external-api',
      url: 'https://api.external.com/health',
      timeout: 5000,
      expectedStatus: 200,
    }),
    createMemoryChecker({
      name: 'memory-check',
      maxHeapUsedMB: 512,
      maxRssMB: 1024,
    }),
  ],
});

app.get('/health', healthHandler.health);
```

### Custom Metrics

```typescript
import { MetricsRegistry } from '@ai/observability';

const metrics = new MetricsRegistry({
  serviceName: 'trading-service',
  enableDefaultMetrics: true,
  enableHttpMetrics: true,
});

// Create custom metrics
const tradeCounter = metrics.createCounter(
  'trades_executed_total',
  'Total number of trades executed',
  ['symbol', 'strategy', 'status']
);

const portfolioValue = metrics.createGauge(
  'portfolio_value_usd',
  'Current portfolio value in USD',
  ['account']
);

const orderLatency = metrics.createHistogram(
  'order_execution_duration_seconds',
  'Time to execute orders',
  ['exchange', 'symbol']
);

// Use metrics in business logic
tradeCounter.inc({ symbol: 'BTC', strategy: 'arbitrage', status: 'success' });
portfolioValue.set({ account: 'main' }, 10000.5);
orderLatency.observe({ exchange: 'binance', symbol: 'BTC' }, 0.045);
```

### Distributed Tracing

```typescript
import {
  traceIdMiddleware,
  getTraceId,
  createTracedHeaders,
  TraceContext,
} from '@ai/observability';

// Enable tracing for all requests
app.use(
  traceIdMiddleware({
    generateIfMissing: true,
    setResponseHeader: true,
    validator: isValidUuidV4,
  })
);

// Use trace ID in business logic
app.post('/api/trade', async (req, res) => {
  const traceId = getTraceId(req);
  console.log(`Processing trade with trace ID: ${traceId}`);

  // Forward trace ID to external services
  const headers = createTracedHeaders(req, {
    Authorization: 'Bearer token',
  });

  const response = await fetch('https://api.exchange.com/orders', {
    method: 'POST',
    headers,
    body: JSON.stringify(req.body),
  });

  res.json({ traceId, orderId: response.data.id });
});
```

## 📊 Health Check Endpoints

### Liveness Probe - `/health/live`

Lightweight check indicating if the service is running. Does not check external dependencies.

**Response:**

```json
{
  "alive": true,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600,
  "service": "financial-service"
}
```

**Status Codes:**

- `200`: Service is alive
- `503`: Service is shutting down
- `500`: Internal error

### Readiness Probe - `/health/ready`

Checks if the service can handle requests by testing external dependencies.

**Response:**

```json
{
  "ready": true,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "service": "financial-service",
  "overall_status": "healthy",
  "checks": [
    {
      "name": "postgres",
      "status": "healthy",
      "message": "Database connection successful",
      "latency": 45,
      "timestamp": "2025-01-15T10:30:00.000Z"
    },
    {
      "name": "redis",
      "status": "healthy",
      "message": "Redis connection successful",
      "latency": 12,
      "timestamp": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Health Status Values:**

- `healthy`: All critical dependencies are working
- `degraded`: Non-critical dependencies failing or critical dependencies slow
- `unhealthy`: Critical dependencies are failing

**Status Codes:**

- `200`: Service is ready (healthy/degraded)
- `503`: Service is not ready (unhealthy or shutting down)
- `500`: Internal error

### Comprehensive Health - `/health`

Detailed health check with service metadata and complete dependency status.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.2.3",
  "service": "financial-service",
  "environment": "production",
  "dependencies": [
    {
      "name": "postgres",
      "status": "healthy",
      "message": "Database connection successful",
      "latency": 45,
      "timestamp": "2025-01-15T10:30:00.000Z",
      "metadata": {
        "query": "SELECT 1 as health_check",
        "connectionType": "postgresql"
      }
    }
  ],
  "metadata": {
    "isShuttingDown": false,
    "memoryUsage": {
      "rss": 52428800,
      "heapTotal": 41943040,
      "heapUsed": 31457280,
      "external": 2134016,
      "arrayBuffers": 1048576
    },
    "nodeVersion": "v20.10.0",
    "platform": "linux",
    "arch": "x64"
  }
}
```

## 📈 Metrics Endpoints

### Prometheus Metrics - `/metrics`

Exposes metrics in Prometheus format for scraping.

**Standard Metrics:**

```prometheus
# HTTP Request Metrics
http_requests_total{method="GET",status_code="200",route="/health"} 142
http_request_duration_seconds_bucket{method="GET",status_code="200",route="/health",le="0.005"} 120
http_request_size_bytes_bucket{method="POST",route="/api/trade",le="1000"} 45
http_response_size_bytes_bucket{method="GET",status_code="200",route="/health",le="1000"} 142

# Node.js Metrics
nodejs_heap_size_total_bytes{service="financial-service"} 41943040
nodejs_heap_size_used_bytes{service="financial-service"} 31457280
nodejs_gc_duration_seconds_total{service="financial-service"} 0.123

# Custom Business Metrics
trades_executed_total{symbol="BTC",strategy="arbitrage",status="success"} 23
portfolio_value_usd{account="main"} 10000.50
order_execution_duration_seconds_bucket{exchange="binance",symbol="BTC",le="0.1"} 156
```

## 🔧 Dependency Checkers

### Database Checker

Validates PostgreSQL database connectivity with configurable queries.

```typescript
const dbChecker = createDatabaseChecker(dbClient, {
  name: 'primary-db',
  timeout: 3000,
  critical: true,
  query: 'SELECT 1 as health_check',
});
```

**Features:**

- Custom SQL query execution
- Connection latency measurement
- Error handling and reporting
- Configurable timeout and criticality

### Redis Checker

Monitors Redis connectivity using PING command.

```typescript
const redisChecker = createRedisChecker(redisClient, {
  name: 'cache',
  timeout: 2000,
  critical: false,
});
```

**Features:**

- PING/PONG validation
- Connection status monitoring
- Response time tracking
- Non-critical option for cache layers

### HTTP Service Checker

Validates external HTTP service availability.

```typescript
const httpChecker = createHttpChecker({
  name: 'auth-service',
  url: 'https://auth.company.com/health',
  timeout: 5000,
  expectedStatus: 200,
  headers: { Authorization: 'Bearer token' },
  critical: true,
});
```

**Features:**

- Configurable HTTP method and headers
- Expected status code validation
- Request timeout handling
- SSL certificate validation

### Memory Checker

Monitors Node.js memory usage patterns.

```typescript
const memoryChecker = createMemoryChecker({
  name: 'memory-monitor',
  maxHeapUsedMB: 512,
  maxRssMB: 1024,
  critical: false,
});
```

**Features:**

- Heap and RSS memory monitoring
- Configurable thresholds
- Memory pressure detection
- Garbage collection impact analysis

### Disk Space Checker

Monitors available disk space (Linux/macOS).

```typescript
const diskChecker = createDiskSpaceChecker({
  name: 'disk-space',
  path: '/app/data',
  minFreeMB: 1000,
  critical: true,
});
```

**Features:**

- Path-specific disk usage
- Free space thresholds
- Percentage usage calculation
- Platform compatibility handling

### Custom Checker

Create custom health checks for specific business logic.

```typescript
const customChecker = createCustomChecker(
  async () => {
    // Custom health check logic
    const apiKey = await validateApiKey();
    if (!apiKey.valid) {
      return {
        status: 'unhealthy',
        message: 'API key expired',
        metadata: { expiredAt: apiKey.expiredAt },
      };
    }

    return {
      status: 'healthy',
      message: 'API key valid',
      metadata: { expiresAt: apiKey.expiresAt },
    };
  },
  {
    name: 'api-key-validation',
    timeout: 1000,
    critical: true,
  }
);
```

## 🐳 Docker Integration

### Health Check Configuration

Configure Docker health checks in `docker-compose.yml`:

```yaml
services:
  financial-service:
    build: ./apps/financial-svc
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3001/health/live']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:15
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U $POSTGRES_USER -d $POSTGRES_DB']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 3s
      retries: 3
```

### Service Dependencies

Configure proper startup order with health check dependencies:

```yaml
services:
  api-gateway:
    depends_on:
      financial-service:
        condition: service_healthy
      trading-service:
        condition: service_healthy

  financial-service:
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

## 🔍 Monitoring and Alerting

### Prometheus Configuration

Configure Prometheus to scrape metrics from all services:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'ai-service'
    static_configs:
      - targets:
          - 'api-gateway:3000'
          - 'financial-service:3001'
          - 'trading-service:3002'
          - 'communication-service:3003'
    metrics_path: '/metrics'
    scrape_interval: 10s
```

### Grafana Dashboards

Key metrics to monitor:

**Service Health:**

- Service uptime and availability
- Health check success rates
- Dependency failure rates
- Response time percentiles

**Performance Metrics:**

- HTTP request rate and latency
- Memory and CPU usage
- Database connection pool size
- Error rates and status codes

**Business Metrics:**

- Trade execution rates
- Portfolio values and changes
- API request volumes
- User activity patterns

### Alert Rules

Example Prometheus alerting rules:

```yaml
groups:
  - name: ai-service-alerts
    rules:
      - alert: ServiceDown
        expr: up{job="ai-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Service {{ $labels.instance }} is down'

      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: 'High error rate on {{ $labels.instance }}'

      - alert: HighMemoryUsage
        expr: nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High memory usage on {{ $labels.instance }}'
```

## 🛠️ Development and Testing

### Local Development

Start services with observability enabled:

```bash
# Start infrastructure
docker-compose -f infra/compose/docker-compose.dev.yml up -d postgres redis prometheus grafana

# Start services with observability
npm run dev:financial  # Includes health checks and metrics
npm run dev:trading    # Includes health checks and metrics
npm run dev:gateway    # Includes health checks and metrics

# Check service health
curl http://localhost:3001/health/live
curl http://localhost:3001/health/ready
curl http://localhost:3001/metrics
```

### Testing Health Checks

```bash
# Test all health endpoints
for port in 3000 3001 3002 3003; do
  echo "Testing service on port $port:"
  curl -s http://localhost:$port/health/live | jq '.alive'
  curl -s http://localhost:$port/health/ready | jq '.ready'
  echo "---"
done

# Test dependency failures
docker-compose stop postgres
curl http://localhost:3001/health/ready  # Should return 503

# Test graceful shutdown
curl -X POST http://localhost:3001/admin/shutdown
curl http://localhost:3001/health/live   # Should return 503
```

### Load Testing

Test observability under load:

```bash
# Install k6 for load testing
npm install -g k6

# Create load test script
cat << 'EOF' > load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 50 },
    { duration: '1m', target: 0 },
  ],
};

export default function() {
  let response = http.get('http://localhost:3001/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
EOF

# Run load test
k6 run load-test.js

# Monitor metrics during load test
curl http://localhost:3001/metrics | grep http_request_duration_seconds
```

## 🔒 Security Best Practices

### Sensitive Information

- **Never log sensitive data** in health check responses
- **Sanitize error messages** to avoid information disclosure
- **Use secure headers** in trace ID propagation
- **Validate trace IDs** to prevent injection attacks

### Access Control

```typescript
// Restrict metrics endpoint in production
if (process.env.NODE_ENV === 'production') {
  app.get('/metrics', authenticate, metrics.metricsEndpoint);
} else {
  app.get('/metrics', metrics.metricsEndpoint);
}

// Health checks should remain publicly accessible for orchestration
app.get('/health/live', healthHandler.liveness);
app.get('/health/ready', healthHandler.readiness);
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Rate limit health checks to prevent abuse
const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/health', healthLimiter);
app.use('/metrics', rateLimit({ windowMs: 60000, max: 10 }));
```

## 🐛 Troubleshooting

### Common Issues

**Health checks failing during startup:**

```bash
# Check service logs
docker-compose logs financial-service

# Verify dependencies are ready
curl http://localhost:5432  # Postgres should be accessible
redis-cli ping              # Redis should respond PONG

# Check health check configuration
curl -v http://localhost:3001/health/live
```

**Metrics not appearing in Prometheus:**

```bash
# Verify metrics endpoint is accessible
curl http://localhost:3001/metrics

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify Prometheus configuration
docker-compose exec prometheus cat /etc/prometheus/prometheus.yml
```

**Trace IDs not propagating:**

```bash
# Verify trace ID middleware is applied
curl -H "x-trace-id: test-123" http://localhost:3001/health

# Check trace ID in logs
docker-compose logs financial-service | grep "test-123"

# Verify outbound requests include trace ID
# Check downstream service logs for trace ID
```

### Debug Mode

Enable debug logging for observability components:

```typescript
process.env.DEBUG = '@ai/observability:*';

// Or set specific debug levels
process.env.LOG_LEVEL = 'debug';
```

### Health Check Debugging

```typescript
// Add detailed logging to health checks
const healthHandler = new StandardHealthHandler({
  serviceName: 'debug-service',
  dependencies: [
    createDatabaseChecker(dbClient, {
      name: 'postgres',
      timeout: 3000,
      // Custom checker with debug logging
      check: async () => {
        console.log('Starting database health check...');
        const start = Date.now();
        try {
          await dbClient.query('SELECT 1');
          const latency = Date.now() - start;
          console.log(`Database health check passed in ${latency}ms`);
          return {
            status: 'healthy',
            message: 'Database connection successful',
            latency,
            metadata: { debugMode: true },
          };
        } catch (error) {
          console.error('Database health check failed:', error);
          throw error;
        }
      },
    }),
  ],
});
```

## 📚 API Reference

### StandardHealthHandler

Main class for handling health check endpoints.

```typescript
interface HealthCheckConfig {
  serviceName: string;
  version?: string;
  environment?: string;
  dependencies?: DependencyChecker[];
  gracefulShutdownTimeoutMs?: number;
}

class StandardHealthHandler {
  constructor(config: HealthCheckConfig);

  // Express route handlers
  liveness(req: Request, res: Response): Promise<void>;
  readiness(req: Request, res: Response): Promise<void>;
  health(req: Request, res: Response): Promise<void>;

  // Lifecycle management
  initiateGracefulShutdown(): void;
  addDependencyChecker(checker: DependencyChecker): void;
  removeDependencyChecker(name: string): void;
  getServiceInfo(): ServiceInfo;
}
```

### MetricsRegistry

Prometheus metrics management.

```typescript
interface MetricsConfig {
  serviceName: string;
  enableDefaultMetrics?: boolean;
  enableHttpMetrics?: boolean;
  defaultLabels?: Record<string, string>;
  prefix?: string;
}

class MetricsRegistry {
  constructor(config: MetricsConfig);

  // Metric creation
  createCounter(name: string, help: string, labelNames?: string[]): Counter;
  createGauge(name: string, help: string, labelNames?: string[]): Gauge;
  createHistogram(name: string, help: string, labelNames?: string[], buckets?: number[]): Histogram;
  createSummary(name: string, help: string, labelNames?: string[]): Summary;

  // Express integration
  httpMiddleware(options?: HttpMetricsOptions): RequestHandler;
  metricsEndpoint(req: Request, res: Response): Promise<void>;

  // Utility methods
  recordBusinessMetric(name: string, value?: number, labels?: Record<string, string>): void;
  timeFunction<T>(name: string, fn: () => Promise<T>, labels?: Record<string, string>): Promise<T>;
}
```

### Trace ID Middleware

Distributed tracing functionality.

```typescript
interface TraceIdOptions {
  headerName?: string;
  generateIfMissing?: boolean;
  generator?: () => string;
  setResponseHeader?: boolean;
  validator?: (traceId: string) => boolean;
  overrideInvalid?: boolean;
}

// Middleware functions
function traceIdMiddleware(options?: TraceIdOptions): RequestHandler;
function traceIdWithLoggingMiddleware(logger: Logger, options?: TraceIdOptions): RequestHandler;

// Utility functions
function getTraceId(req: Request): string | undefined;
function setTraceId(req: Request, traceId: string): void;
function isValidUuidV4(traceId: string): boolean;
function createChildTraceId(parentTraceId: string, suffix?: string): string;
function createTracedHeaders(
  req: Request,
  additionalHeaders?: Record<string, string>
): Record<string, string>;
```

## 🎯 Best Practices

1. **Always implement all three health check types** for proper container orchestration
2. **Use meaningful dependency names** that clearly identify the external service
3. **Set appropriate timeouts** for health checks based on service SLAs
4. **Mark dependencies as critical or non-critical** based on business impact
5. **Include trace IDs in all log messages** for distributed debugging
6. **Use structured logging** with consistent field names across services
7. **Monitor health check response times** as indicators of system performance
8. **Implement graceful shutdown handlers** to ensure clean container termination
9. **Test health checks under failure conditions** to validate alerting
10. **Keep metrics cardinality low** to avoid Prometheus performance issues

## 📋 Migration Guide

### From Legacy Health Checks

If you have existing health check implementations:

```typescript
// Before: Custom health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// After: Standard observability
const observability = createStandardObservability({
  serviceName: 'my-service',
  dependencies: {
    database: { client: dbClient },
  },
});
observability.setupExpress(app);
```

### Adding to Existing Services

1. **Install the package**: `npm install @ai/observability`
2. **Replace health endpoints** with StandardHealthHandler
3. **Add dependency checkers** for external services
4. **Configure Docker health checks** in compose files
5. **Update monitoring** to scrape new metrics endpoints
6. **Test the implementation** with failure scenarios

### Service-by-Service Rollout

1. **Start with non-critical services** to validate the implementation
2. **Add database and Redis checkers** for stateful services
3. **Configure HTTP checkers** for service-to-service dependencies
4. **Update load balancer health checks** to use new endpoints
5. **Monitor metrics** in Grafana to validate data collection
6. **Set up alerting rules** based on the new health check data

---

**Package Version**: 0.1.0  
**Last Updated**: January 15, 2025  
**Maintained by**: AI Service Development Team

For issues or feature requests, see the `@ai/observability` package documentation or create an issue in the main repository.
