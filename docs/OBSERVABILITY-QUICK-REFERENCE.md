# Observability Quick Reference Guide

Quick commands, endpoints, and troubleshooting for the AI Service observability system.

## 🚀 Quick Setup

```typescript
import { createStandardObservability } from '@ai/observability';

const observability = createStandardObservability({
  serviceName: 'my-service',
  dependencies: {
    database: { client: dbClient },
    redis: { client: redisClient },
  },
});

observability.setupExpress(app);
```

## 📋 Health Check Endpoints

| Endpoint            | Purpose              | Use Case                            |
| ------------------- | -------------------- | ----------------------------------- |
| `GET /health/live`  | Liveness probe       | Kubernetes/Docker health checks     |
| `GET /health/ready` | Readiness probe      | Load balancer health checks         |
| `GET /health`       | Comprehensive health | Detailed diagnostics and monitoring |
| `GET /metrics`      | Prometheus metrics   | Metrics scraping and monitoring     |

## 🔧 Common Commands

### Check Service Health

```bash
# Quick health check
curl http://localhost:3001/health/live

# Detailed health with dependencies
curl http://localhost:3001/health | jq

# Check readiness for traffic
curl http://localhost:3001/health/ready

# Get metrics for monitoring
curl http://localhost:3001/metrics
```

### Docker Health Checks

```bash
# Check container health status
docker ps --format "table {{.Names}}\t{{.Status}}"

# View health check logs
docker inspect financial-service --format='{{json .State.Health}}' | jq

# Test health check command manually
docker exec financial-service curl -f http://localhost:3001/health/live
```

### Service Testing

```bash
# Test all services in compose
for port in 3000 3001 3002 3003; do
  echo "Service on port $port:"
  curl -s http://localhost:$port/health/live | jq '.alive'
done

# Test dependency failures
docker-compose stop postgres
curl http://localhost:3001/health/ready  # Should return 503

# Test graceful shutdown
kill -TERM $(cat .server-3001.pid)
curl http://localhost:3001/health/live   # Should return 503
```

## 📊 Metric Names Reference

### Standard HTTP Metrics

```prometheus
# Request count by method, status, route
http_requests_total{method="GET",status_code="200",route="/health"}

# Request duration histogram
http_request_duration_seconds{method="GET",status_code="200",route="/health"}

# Request/response sizes
http_request_size_bytes{method="POST",route="/api/trade"}
http_response_size_bytes{method="GET",status_code="200",route="/health"}
```

### Node.js Metrics

```prometheus
# Memory usage
nodejs_heap_size_total_bytes{service="financial-service"}
nodejs_heap_size_used_bytes{service="financial-service"}

# Garbage collection
nodejs_gc_duration_seconds_total{service="financial-service"}

# Event loop lag
nodejs_eventloop_lag_seconds{service="financial-service"}
```

### Custom Business Metrics

```typescript
// Counter: Increment-only values
const tradesCounter = metrics.createCounter('trades_executed_total', 'Total trades executed', [
  'symbol',
  'strategy',
  'status',
]);
tradesCounter.inc({ symbol: 'BTC', strategy: 'arbitrage', status: 'success' });

// Gauge: Values that can go up and down
const portfolioGauge = metrics.createGauge('portfolio_value_usd', 'Current portfolio value', [
  'account',
]);
portfolioGauge.set({ account: 'main' }, 10000.5);

// Histogram: Measure distributions
const latencyHistogram = metrics.createHistogram(
  'order_latency_seconds',
  'Order execution latency',
  ['exchange']
);
latencyHistogram.observe({ exchange: 'binance' }, 0.045);
```

## 🐳 Docker Compose Configuration

### Health Check Setup

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
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5
```

### Startup Order

```yaml
# Correct dependency chain
postgres → redis → financial-service → api-gateway → nginx
```

## 🔍 Troubleshooting Checklist

### Service Won't Start

```bash
# 1. Check dependency health
curl http://localhost:5432        # Postgres
redis-cli ping                   # Redis

# 2. Check environment variables
docker-compose config | grep -A 5 environment

# 3. Check service logs
docker-compose logs financial-service

# 4. Verify health check command
docker exec financial-service curl -v http://localhost:3001/health/live
```

### Health Checks Failing

```bash
# 1. Test health endpoints directly
curl -v http://localhost:3001/health/live
curl -v http://localhost:3001/health/ready

# 2. Check dependency connectivity
# From inside container:
docker exec financial-service curl postgres:5432
docker exec financial-service redis-cli -h redis ping

# 3. Verify health check configuration
docker inspect financial-service | jq '.[0].Config.Healthcheck'
```

### Metrics Not Appearing

```bash
# 1. Verify metrics endpoint
curl http://localhost:3001/metrics | head -20

# 2. Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[].health'

# 3. Verify service discovery
docker-compose logs prometheus | grep "financial-service"
```

### Trace IDs Not Working

```bash
# 1. Test trace ID generation
curl -H "x-trace-id: test-123" http://localhost:3001/health

# 2. Verify response headers
curl -I http://localhost:3001/health | grep x-trace-id

# 3. Check service logs for trace ID
docker-compose logs financial-service | grep "test-123"
```

## ⚡ Performance Commands

### Load Testing

```bash
# Install tools
npm install -g autocannon k6

# Quick load test with autocannon
autocannon -c 10 -d 30s http://localhost:3001/health

# More detailed with k6
k6 run --vus 10 --duration 30s - <<EOF
import http from 'k6/http';
export default function() {
  http.get('http://localhost:3001/health');
}
EOF
```

### Memory Monitoring

```bash
# Monitor memory usage
watch 'curl -s http://localhost:3001/metrics | grep nodejs_heap_size_used_bytes'

# Check for memory leaks
docker stats financial-service --no-stream

# Heap dump analysis (if enabled)
curl http://localhost:3001/admin/heap-dump > heap.heapsnapshot
```

### Response Time Monitoring

```bash
# Monitor response times
while true; do
  curl -w "@curl-format.txt" -s http://localhost:3001/health > /dev/null
  sleep 1
done

# curl-format.txt content:
cat > curl-format.txt << EOF
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF
```

## 🚨 Alert Conditions

### Critical Alerts (Immediate Action)

```bash
# Service completely down
curl -f http://localhost:3001/health/live || echo "CRITICAL: Service down"

# High error rate (>10% 5xx responses)
curl -s http://localhost:3001/metrics | grep 'http_requests_total.*5[0-9][0-9]'

# Memory usage >90%
curl -s http://localhost:3001/metrics | awk '/nodejs_heap_size_used_bytes/ { used=$2 } /nodejs_heap_size_total_bytes/ { total=$2 } END { if(used/total > 0.9) print "CRITICAL: Memory usage high" }'
```

### Warning Alerts (Monitor Closely)

```bash
# Response time >1s (95th percentile)
curl -s http://localhost:3001/metrics | grep 'http_request_duration_seconds.*le="1"'

# Dependency degraded
curl -s http://localhost:3001/health | jq '.dependencies[] | select(.status == "degraded")'

# High CPU usage
curl -s http://localhost:3001/metrics | grep 'process_cpu_seconds_total'
```

## 🔧 Configuration Examples

### Minimal Setup

```typescript
import { StandardHealthHandler } from '@ai/observability';

const health = new StandardHealthHandler({
  serviceName: 'minimal-service',
});

app.get('/health/live', health.liveness);
```

### Production Setup

```typescript
import {
  createStandardObservability,
  createDatabaseChecker,
  createRedisChecker,
  createHttpChecker,
} from '@ai/observability';

const observability = createStandardObservability({
  serviceName: 'production-service',
  version: process.env.npm_package_version,
  environment: process.env.NODE_ENV,
  dependencies: {
    database: {
      client: dbClient,
      options: { name: 'postgres', timeout: 3000, critical: true },
    },
    redis: {
      client: redisClient,
      options: { name: 'cache', timeout: 2000, critical: false },
    },
    http: [
      {
        name: 'auth-service',
        url: 'https://auth.internal.com/health',
        timeout: 5000,
        critical: true,
      },
    ],
    memory: {
      maxHeapUsedMB: 512,
      maxRssMB: 1024,
    },
  },
});
```

### Custom Metrics

```typescript
import { MetricsRegistry } from '@ai/observability';

const metrics = new MetricsRegistry({
  serviceName: 'trading-service',
  defaultLabels: { version: '1.0.0', cluster: 'production' },
});

// Business metrics
const trades = metrics.createCounter('trades_total', 'Total trades', ['symbol', 'status']);
const balance = metrics.createGauge('balance_usd', 'Account balance', ['account']);
const latency = metrics.createHistogram('operation_duration_seconds', 'Operation time', [
  'operation',
]);

// Use in business logic
trades.inc({ symbol: 'BTC', status: 'success' });
balance.set({ account: 'main' }, 1000.5);
await metrics.timeFunction(
  'trade_execution',
  async () => {
    // Trading logic here
  },
  { symbol: 'BTC' }
);
```

## 📝 Health Check Response Schemas

### Liveness Response

```json
{
  "alive": true,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600,
  "service": "financial-service"
}
```

### Readiness Response

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
    }
  ]
}
```

### Comprehensive Health Response

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.2.3",
  "service": "financial-service",
  "environment": "production",
  "dependencies": [...],
  "metadata": {
    "isShuttingDown": false,
    "memoryUsage": {...},
    "nodeVersion": "v20.10.0",
    "platform": "linux"
  }
}
```

## 🎯 Environment-Specific Commands

### Development

```bash
# Start with observability
npm run dev:financial
curl http://localhost:3001/health

# Debug health checks
DEBUG=@ai/observability:* npm run dev:financial
```

### Production

```bash
# Validate deployment
curl -f https://api.company.com/health/ready || exit 1

# Monitor metrics
curl -s https://api.company.com/metrics | grep http_requests_total

# Check all services
for service in gateway financial trading; do
  curl -s https://$service.company.com/health/live | jq '.alive'
done
```

### Docker Compose

```bash
# Full stack health check
docker-compose ps --filter health=healthy

# Service-specific health
docker-compose exec financial-service curl http://localhost:3001/health/ready

# View all metrics
docker-compose exec financial-service curl http://localhost:3001/metrics
```

---

**Quick Links:**

- [Full Documentation](./OBSERVABILITY.md)
- [Implementation Notes](./leveling/F2-IMPLEMENTATION-NOTES.md)
- [Package Source](../packages/observability/)

**Package Version**: 0.1.0 | **Last Updated**: January 15, 2025
