/**
 * @ai/observability - Simplified Observability Package
 * 
 * Provides basic observability tools for services
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Simple health check handler
export class StandardHealthHandler {
  private serviceName: string;
  private version?: string;
  private environment?: string;

  constructor(config: {
    serviceName: string;
    version?: string;
    environment?: string;
    dependencies?: any[];
  }) {
    this.serviceName = config.serviceName;
    this.version = config.version;
    this.environment = config.environment;
  }

  health = (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: this.serviceName,
      version: this.version,
      environment: this.environment,
      timestamp: new Date().toISOString(),
    });
  };

  liveness = (req: Request, res: Response) => {
    res.json({ status: 'alive' });
  };

  readiness = (req: Request, res: Response) => {
    res.json({ status: 'ready' });
  };
}

// Simple metrics registry placeholder
export class MetricsRegistry {
  private serviceName: string;

  constructor(config: {
    serviceName: string;
    enableDefaultMetrics?: boolean;
    enableHttpMetrics?: boolean;
  }) {
    this.serviceName = config.serviceName;
  }

  httpMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Placeholder for metrics collection
      next();
    };
  }

  metricsEndpoint = (req: Request, res: Response) => {
    res.type('text/plain');
    res.send(`# HELP service_info Service information
# TYPE service_info gauge
service_info{service="${this.serviceName}"} 1
`);
  };
}

// Dependency checkers
export interface DependencyCheckersConfig {
  database?: { connectionString: string };
  redis?: { url: string };
  services?: Array<{ name: string; url: string }>;
}

export function createDependencyCheckers(config: DependencyCheckersConfig) {
  return [];
}

export function createDatabaseChecker(options: any) {
  return { check: async () => ({ healthy: true }) };
}

export function createRedisChecker(options: any) {
  return { check: async () => ({ healthy: true }) };
}

export function createHttpChecker(options: any) {
  return { check: async () => ({ healthy: true }) };
}

// Main factory function
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

  return {
    healthHandler,
    metricsRegistry,
    traceMiddleware: undefined,
    eventLogger: undefined,
    setupExpress: (app: any) => {
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