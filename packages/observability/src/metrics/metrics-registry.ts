import { Request, Response, NextFunction } from 'express';
import * as client from 'prom-client';

// Standard metric names following Prometheus conventions
export const METRIC_NAMES = {
  HTTP_REQUESTS_TOTAL: 'http_requests_total',
  HTTP_REQUEST_DURATION_SECONDS: 'http_request_duration_seconds',
  HTTP_REQUEST_SIZE_BYTES: 'http_request_size_bytes',
  HTTP_RESPONSE_SIZE_BYTES: 'http_response_size_bytes',
  NODEJS_HEAP_SIZE_TOTAL_BYTES: 'nodejs_heap_size_total_bytes',
  NODEJS_HEAP_SIZE_USED_BYTES: 'nodejs_heap_size_used_bytes',
  DATABASE_CONNECTIONS_ACTIVE: 'database_connections_active',
  DATABASE_QUERY_DURATION_SECONDS: 'database_query_duration_seconds',
  BUSINESS_METRIC_TOTAL: 'business_metric_total',
} as const;

export interface MetricsConfig {
  serviceName: string;
  enableDefaultMetrics?: boolean;
  enableHttpMetrics?: boolean;
  defaultLabels?: Record<string, string>;
  prefix?: string;
}

export interface HttpMetricsOptions {
  includeMethod?: boolean;
  includeStatusCode?: boolean;
  includePath?: boolean;
  normalizeStatusCode?: boolean;
  skipRoutes?: string[];
  customLabels?: (req: Request) => Record<string, string>;
}

export class MetricsRegistry {
  private readonly registry: client.Registry;
  private readonly serviceName: string;
  private readonly prefix: string;
  
  // Standard HTTP metrics
  private httpRequestsTotal?: client.Counter<string>;
  private httpRequestDuration?: client.Histogram<string>;
  private httpRequestSize?: client.Histogram<string>;
  private httpResponseSize?: client.Histogram<string>;
  
  // Custom metrics storage
  private customMetrics: Map<string, client.Metric> = new Map();

  constructor(config: MetricsConfig) {
    this.registry = new client.Registry();
    this.serviceName = config.serviceName;
    this.prefix = config.prefix || '';
    
    // Set default labels
    const defaultLabels = {
      service: this.serviceName,
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      ...config.defaultLabels,
    };
    
    this.registry.setDefaultLabels(defaultLabels);
    
    if (config.enableDefaultMetrics !== false) {
      this.initDefaultMetrics();
    }
    
    if (config.enableHttpMetrics !== false) {
      this.initHttpMetrics();
    }
  }

  /**
   * Get the Prometheus registry instance
   */
  public getRegistry(): client.Registry {
    return this.registry;
  }

  /**
   * Get metrics in Prometheus format
   */
  public async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  /**
   * Express middleware for HTTP metrics collection
   */
  public httpMiddleware(options: HttpMetricsOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip if route is in skip list
      if (options.skipRoutes?.some(route => req.path.startsWith(route))) {
        return next();
      }

      const startTime = Date.now();
      const startHrTime = process.hrtime();

      // Capture request size
      const requestSize = parseInt(req.get('Content-Length') || '0', 10);
      if (this.httpRequestSize && requestSize > 0) {
        this.httpRequestSize.observe(
          this.getHttpLabels(req, res, options),
          requestSize
        );
      }

      // Intercept response to capture metrics
      const originalSend = res.send;
      res.send = function(body: any) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const [seconds, nanoseconds] = process.hrtime(startHrTime);
        const durationSeconds = seconds + nanoseconds / 1e9;

        // Get response size
        const responseSize = Buffer.isBuffer(body) 
          ? body.length 
          : Buffer.byteLength(body || '', 'utf8');

        const metricsInstance = (req as any).__metrics_registry__;
        if (metricsInstance) {
          const labels = metricsInstance.getHttpLabels(req, res, options);
          
          // Record metrics
          if (metricsInstance.httpRequestsTotal) {
            metricsInstance.httpRequestsTotal.inc(labels);
          }
          
          if (metricsInstance.httpRequestDuration) {
            metricsInstance.httpRequestDuration.observe(labels, durationSeconds);
          }
          
          if (metricsInstance.httpResponseSize && responseSize > 0) {
            metricsInstance.httpResponseSize.observe(labels, responseSize);
          }
        }

        return originalSend.call(this, body);
      };

      // Store metrics instance in request for access in response handler
      (req as any).__metrics_registry__ = this;
      
      next();
    };
  }

  /**
   * Express endpoint for metrics exposure
   */
  public metricsEndpoint = async (req: Request, res: Response): Promise<void> => {
    try {
      res.set('Content-Type', this.registry.contentType);
      res.end(await this.registry.metrics());
    } catch (error) {
      res.status(500).end(error instanceof Error ? error.message : 'Internal server error');
    }
  };

  /**
   * Create a custom counter metric
   */
  public createCounter(
    name: string,
    help: string,
    labelNames: string[] = []
  ): client.Counter<string> {
    const fullName = this.prefix + name;
    const counter = new client.Counter({
      name: fullName,
      help,
      labelNames,
      registers: [this.registry],
    });
    
    this.customMetrics.set(fullName, counter);
    return counter;
  }

  /**
   * Create a custom gauge metric
   */
  public createGauge(
    name: string,
    help: string,
    labelNames: string[] = []
  ): client.Gauge<string> {
    const fullName = this.prefix + name;
    const gauge = new client.Gauge({
      name: fullName,
      help,
      labelNames,
      registers: [this.registry],
    });
    
    this.customMetrics.set(fullName, gauge);
    return gauge;
  }

  /**
   * Create a custom histogram metric
   */
  public createHistogram(
    name: string,
    help: string,
    labelNames: string[] = [],
    buckets?: number[]
  ): client.Histogram<string> {
    const fullName = this.prefix + name;
    const histogram = new client.Histogram({
      name: fullName,
      help,
      labelNames,
      buckets,
      registers: [this.registry],
    });
    
    this.customMetrics.set(fullName, histogram);
    return histogram;
  }

  /**
   * Create a custom summary metric
   */
  public createSummary(
    name: string,
    help: string,
    labelNames: string[] = [],
    percentiles?: number[],
    maxAgeSeconds?: number,
    ageBuckets?: number
  ): client.Summary<string> {
    const fullName = this.prefix + name;
    const summary = new client.Summary({
      name: fullName,
      help,
      labelNames,
      percentiles,
      maxAgeSeconds,
      ageBuckets,
      registers: [this.registry],
    });
    
    this.customMetrics.set(fullName, summary);
    return summary;
  }

  /**
   * Get a previously created custom metric
   */
  public getMetric(name: string): client.Metric | undefined {
    const fullName = this.prefix + name;
    return this.customMetrics.get(fullName);
  }

  /**
   * Record a business metric event
   */
  public recordBusinessMetric(
    metricName: string,
    value: number = 1,
    labels: Record<string, string> = {}
  ): void {
    const counter = this.getMetric(metricName) as client.Counter<string>;
    if (counter && 'inc' in counter) {
      counter.inc(labels, value);
    }
  }

  /**
   * Set a gauge value for operational metrics
   */
  public setGaugeValue(
    metricName: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    const gauge = this.getMetric(metricName) as client.Gauge<string>;
    if (gauge && 'set' in gauge) {
      gauge.set(labels, value);
    }
  }

  /**
   * Observe a duration for timing metrics
   */
  public observeDuration(
    metricName: string,
    durationSeconds: number,
    labels: Record<string, string> = {}
  ): void {
    const metric = this.getMetric(metricName);
    if (metric && ('observe' in metric)) {
      (metric as client.Histogram<string> | client.Summary<string>).observe(labels, durationSeconds);
    }
  }

  /**
   * Helper to time a function and record the duration
   */
  public async timeFunction<T>(
    metricName: string,
    fn: () => Promise<T>,
    labels: Record<string, string> = {}
  ): Promise<T> {
    const startTime = process.hrtime();
    try {
      const result = await fn();
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const durationSeconds = seconds + nanoseconds / 1e9;
      this.observeDuration(metricName, durationSeconds, { ...labels, status: 'success' });
      return result;
    } catch (error) {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const durationSeconds = seconds + nanoseconds / 1e9;
      this.observeDuration(metricName, durationSeconds, { ...labels, status: 'error' });
      throw error;
    }
  }

  private initDefaultMetrics(): void {
    // Enable default Node.js metrics (memory, CPU, etc.)
    client.collectDefaultMetrics({
      register: this.registry,
      prefix: this.prefix,
    });
  }

  private initHttpMetrics(): void {
    // HTTP request counter
    this.httpRequestsTotal = new client.Counter({
      name: this.prefix + METRIC_NAMES.HTTP_REQUESTS_TOTAL,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'status_code', 'route'],
      registers: [this.registry],
    });

    // HTTP request duration histogram
    this.httpRequestDuration = new client.Histogram({
      name: this.prefix + METRIC_NAMES.HTTP_REQUEST_DURATION_SECONDS,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'status_code', 'route'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
      registers: [this.registry],
    });

    // HTTP request size histogram
    this.httpRequestSize = new client.Histogram({
      name: this.prefix + METRIC_NAMES.HTTP_REQUEST_SIZE_BYTES,
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });

    // HTTP response size histogram
    this.httpResponseSize = new client.Histogram({
      name: this.prefix + METRIC_NAMES.HTTP_RESPONSE_SIZE_BYTES,
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'status_code', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });
  }

  private getHttpLabels(
    req: Request,
    res: Response,
    options: HttpMetricsOptions
  ): Record<string, string> {
    const labels: Record<string, string> = {};

    if (options.includeMethod !== false) {
      labels.method = req.method;
    }

    if (options.includeStatusCode !== false) {
      const statusCode = res.statusCode.toString();
      labels.status_code = options.normalizeStatusCode 
        ? statusCode.charAt(0) + 'xx' 
        : statusCode;
    }

    if (options.includePath !== false) {
      // Use route pattern if available, otherwise use path
      const route = (req as any).route?.path || req.path || 'unknown';
      labels.route = route;
    }

    // Add custom labels
    if (options.customLabels) {
      const customLabels = options.customLabels(req);
      Object.assign(labels, customLabels);
    }

    return labels;
  }
}