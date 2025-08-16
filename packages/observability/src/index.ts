/**
 * @ai/observability - Standardized Observability Package
 * 
 * Provides comprehensive observability tools for the AI Service ecosystem:
 * - Health checks (liveness, readiness, comprehensive health)
 * - Prometheus metrics collection and exposure
 * - Request tracing with trace IDs
 * - Dependency health monitoring
 * - Standard response schemas and validation
 */

// Health Check System
export { StandardHealthHandler } from './health/health-handler';
export {
  createDatabaseChecker,
  createRedisChecker,
  createHttpChecker,
  createMemoryChecker,
  createDiskSpaceChecker,
  createCustomChecker,
  createDependencyCheckers,
  type DependencyCheckersConfig,
} from './health/dependency-checkers';

// Metrics System
export { MetricsRegistry, METRIC_NAMES } from './metrics/metrics-registry';
export type { MetricsConfig, HttpMetricsOptions } from './metrics/metrics-registry';

// Tracing Middleware
export {
  traceIdMiddleware,
  traceIdWithLoggingMiddleware,
  getTraceId,
  setTraceId,
  isValidUuidV4,
  createChildTraceId,
  createTracedHeaders,
  TraceContext,
} from './middleware/trace-id';
export type { TraceIdOptions, TracedRequest } from './middleware/trace-id';

// Type Definitions and Schemas
export type {
  HealthStatus,
  Dependency,
  HealthResponse,
  LivenessResponse,
  ReadinessResponse,
  HealthCheckConfig,
  DependencyChecker,
  DependencyCheckResult,
  DatabaseCheckOptions,
  RedisCheckOptions,
  HttpCheckOptions,
  CustomCheckOptions,
} from './types/health.types';

export {
  DependencySchema,
  HealthResponseSchema,
  LivenessResponseSchema,
  ReadinessResponseSchema,
} from './types/health.types';

// Event Logging System
export { EventLogger, eventLogger } from './event-logger';

// Re-export common external dependencies for convenience
export { Registry as PrometheusRegistry } from 'prom-client';

// Import the internal modules for use in the function
import { StandardHealthHandler } from './health/health-handler';
import { MetricsRegistry } from './metrics/metrics-registry';
import { traceIdMiddleware, isValidUuidV4 } from './middleware/trace-id';
import { createDependencyCheckers, type DependencyCheckersConfig } from './health/dependency-checkers';
import { EventLogger } from './event-logger';

/**
 * Quick setup function for common observability patterns
 */
export function createStandardObservability(config: {
  serviceName: string;
  version?: string;
  environment?: string;
  enableMetrics?: boolean;
  enableTracing?: boolean;
  enableEventLogging?: boolean;
  dependencies?: DependencyCheckersConfig;
  prismaClient?: any;
}) {
  const healthHandler = new StandardHealthHandler({
    serviceName: config.serviceName,
    version: config.version,
    environment: config.environment,
    dependencies: config.dependencies ? createDependencyCheckers(config.dependencies) : [],
  });

  const metricsRegistry = config.enableMetrics !== false ? new MetricsRegistry({
    serviceName: config.serviceName,
    enableDefaultMetrics: true,
    enableHttpMetrics: true,
  }) : undefined;

  const traceMiddleware = config.enableTracing !== false ? traceIdMiddleware({
    generateIfMissing: true,
    setResponseHeader: true,
    validator: isValidUuidV4,
  }) : undefined;

  const eventLogger = config.enableEventLogging !== false ? 
    new EventLogger(config.prismaClient) : undefined;

  return {
    healthHandler,
    metricsRegistry,
    traceMiddleware,
    eventLogger,
    // Convenience method to setup all middleware
    setupExpress: (app: any) => {
      if (traceMiddleware) {
        app.use(traceMiddleware);
      }
      if (eventLogger) {
        app.use(eventLogger.middleware());
      }
      if (metricsRegistry) {
        app.use(metricsRegistry.httpMiddleware());
        app.get('/metrics', metricsRegistry.metricsEndpoint);
      }
      app.get('/health', healthHandler.health);
      app.get('/health/live', healthHandler.liveness);
      app.get('/health/ready', healthHandler.readiness);
    },
  };
}

/**
 * Default configuration for common AI Service patterns
 */
export function getDefaultObservabilityConfig() {
  return {
    healthCheck: {
      gracefulShutdownTimeoutMs: 30000,
    },
    metrics: {
      enableDefaultMetrics: true,
      enableHttpMetrics: true,
    },
    tracing: {
      headerName: 'x-trace-id',
      generateIfMissing: true,
      setResponseHeader: true,
      validator: isValidUuidV4,
    },
  } as const;
}