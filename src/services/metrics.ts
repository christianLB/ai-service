import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { logger } from '../utils/log';
import { db } from './database';
import { auditCatch } from '../utils/forensic-logger';

class MetricsService {
  private initialized = false;

  // Contadores
  private readonly workflowGenerationCounter = new Counter({
    name: 'ai_service_workflow_generations_total',
    help: 'Total number of workflow generations',
    labelNames: ['status', 'model']
  });

  private readonly workflowValidationCounter = new Counter({
    name: 'ai_service_workflow_validations_total',
    help: 'Total number of workflow validations',
    labelNames: ['status', 'error_type']
  });

  private readonly apiRequestCounter = new Counter({
    name: 'ai_service_api_requests_total',
    help: 'Total number of API requests',
    labelNames: ['method', 'endpoint', 'status_code']
  });

  // Histogramas para tiempo de respuesta
  private readonly workflowGenerationDuration = new Histogram({
    name: 'ai_service_workflow_generation_duration_seconds',
    help: 'Duration of workflow generation in seconds',
    labelNames: ['model'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
  });

  private readonly apiResponseTime = new Histogram({
    name: 'ai_service_api_response_time_seconds',
    help: 'API response time in seconds',
    labelNames: ['method', 'endpoint'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
  });

  private readonly llmResponseTime = new Histogram({
    name: 'ai_service_llm_response_time_seconds',
    help: 'LLM response time in seconds',
    labelNames: ['provider', 'model'],
    buckets: [0.5, 1, 2, 5, 10, 20, 30, 60]
  });

  // Gauges para estado actual
  private readonly activeWorkflows = new Gauge({
    name: 'ai_service_active_workflows',
    help: 'Number of currently active workflows'
  });

  private readonly databaseConnections = new Gauge({
    name: 'ai_service_database_connections',
    help: 'Number of active database connections'
  });

  private readonly memoryUsage = new Gauge({
    name: 'ai_service_memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type']
  });

  constructor() {
    // Recopilar métricas por defecto del sistema
    collectDefaultMetrics({ register });
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Inicializar métricas periódicas
      this.startPeriodicMetrics();
      this.initialized = true;
      logger.info('Metrics service initialized successfully');
    } catch (error: any) {
      logger.error('Metrics initialization failed:', error.message);
      throw error;
    }
  }

  private startPeriodicMetrics(): void {
    // Actualizar métricas cada 30 segundos
    setInterval(async () => {
      try {
        await this.updateWorkflowMetrics();
        await this.updateSystemMetrics();
      } catch (error: any) {
        logger.error('Error updating periodic metrics:', error.message);
        auditCatch('MetricsService.startPeriodicMetrics', error, 'silenced');
      }
    }, 30000);
  }

  private async updateWorkflowMetrics(): Promise<void> {
    try {
      const stats = await db.getWorkflowStats();
      this.activeWorkflows.set(stats.active_workflows);

      // Registrar en la base de datos para persistencia
      await db.recordMetric('active_workflows', stats.active_workflows, 'gauge');
      await db.recordMetric('total_workflows', stats.total_workflows, 'counter');
      await db.recordMetric('executions_24h', stats.executions_last_24h, 'counter');
    } catch (error: any) {
      logger.error('Error updating workflow metrics:', error.message);
      auditCatch('MetricsService.updateWorkflowMetrics', error, 'silenced');
    }
  }

  private updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
    this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
    this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
    this.memoryUsage.set({ type: 'external' }, memUsage.external);

    // Verificar alertas de recursos
    this.checkResourceAlerts(memUsage);
  }

  private async checkResourceAlerts(memUsage: NodeJS.MemoryUsage): Promise<void> {
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // Alerta si memoria supera 80%
    if (memoryUsagePercent > 80) {
      const alert = {
        level: memoryUsagePercent > 90 ? 'critical' : 'warning',
        metric: 'memory_usage',
        threshold: 80,
        current: memoryUsagePercent,
        message: `Memory usage at ${memoryUsagePercent.toFixed(1)}% (${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(1)}MB)`
      };

      // Log alert
      logger.warn('Resource alert:', alert);

      // Store alert in database
      await db.recordMetric('resource_alerts', 1, 'counter', alert)
        .catch(err => {
          logger.error('Error recording resource alert:', err);
          auditCatch('MetricsService.checkResourceAlerts', err, 'silenced');
        });

      // Trigger notification if Telegram is configured
      try {
        const { TelegramService } = await import('./communication/telegram.service');
        // Skip Telegram notifications for now - requires proper configuration
        // TODO: Implement proper Telegram integration with config
        logger.warn('Telegram notifications not yet configured for alerts');
      } catch (err) {
        // Telegram not configured or error sending
        logger.debug('Could not send Telegram alert:', err);
      }
    }
  }

  // Métodos para registrar eventos
  recordWorkflowGeneration(status: 'success' | 'error', model: string, duration?: number): void {
    this.workflowGenerationCounter.inc({ status, model });

    if (duration !== undefined) {
      this.workflowGenerationDuration.observe({ model }, duration);
    }

    // Persistir métricas críticas
    if (status === 'error') {
      db.recordMetric('workflow_generation_errors', 1, 'counter', { model })
        .catch(err => {
          logger.error('Error recording metric to DB:', err);
          auditCatch('MetricsService.recordWorkflowGeneration', err, 'silenced');
        });
    }
  }

  recordWorkflowValidation(status: 'valid' | 'invalid', errorType?: string): void {
    this.workflowValidationCounter.inc({
      status,
      error_type: errorType || 'none'
    });
  }

  recordApiRequest(method: string, endpoint: string, statusCode: number, duration: number): void {
    this.apiRequestCounter.inc({
      method: method.toUpperCase(),
      endpoint,
      status_code: statusCode.toString()
    });

    this.apiResponseTime.observe({
      method: method.toUpperCase(),
      endpoint
    }, duration);

    // Registrar errores de API
    if (statusCode >= 400) {
      db.recordMetric('api_errors', 1, 'counter', {
        method,
        endpoint,
        status_code: statusCode
      }).catch(err => {
        logger.error('Error recording API error metric:', err);
        auditCatch('MetricsService.recordApiRequest', err, 'silenced');
      });
    }
  }

  recordLLMRequest(provider: string, model: string, duration: number, success: boolean): void {
    this.llmResponseTime.observe({ provider, model }, duration);

    // Persistir métricas de LLM
    db.recordMetric('llm_requests', 1, 'counter', {
      provider,
      model,
      success: success.toString()
    }).catch(err => {
      logger.error('Error recording LLM metric:', err);
      auditCatch('MetricsService.recordLLMRequest', err, 'silenced');
    });

    if (!success) {
      db.recordMetric('llm_errors', 1, 'counter', { provider, model })
        .catch(err => {
          logger.error('Error recording LLM error metric:', err);
          auditCatch('MetricsService.recordLLMRequest-error', err, 'silenced');
        });
    }
  }

  // Middleware para Express
  createApiMetricsMiddleware() {
    return (req: any, res: any, (_next: any) => {
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        const endpoint = this.normalizeEndpoint(req.route?.path || req.path);

        this.recordApiRequest(
          req.method,
          endpoint,
          res.statusCode,
          duration
        );
      });

      next();
    };
  }

  private normalizeEndpoint(path: string): string {
    // Normalizar rutas con parámetros para evitar cardinalidad alta
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[^\/]+\.(json|xml|html)$/g, '/:file');
  }

  // Método para obtener todas las métricas
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Método para obtener métricas específicas en JSON
  async getMetricsJson(): Promise<any> {
    const metrics = await register.getMetricsAsJSON();

    // Añadir métricas de la base de datos
    const dbStats = await db.getWorkflowStats();
    const recentMetrics = await Promise.all([
      db.getMetrics('api_errors', 24),
      db.getMetrics('llm_errors', 24),
      db.getMetrics('workflow_generation_errors', 24)
    ]);

    return {
      prometheus_metrics: metrics,
      database_stats: dbStats,
      recent_errors: {
        api_errors_24h: recentMetrics[0].length,
        llm_errors_24h: recentMetrics[1].length,
        workflow_generation_errors_24h: recentMetrics[2].length
      },
      system_health: {
        database_connected: await db.healthCheck(),
        memory_usage: process.memoryUsage(),
        uptime_seconds: process.uptime()
      }
    };
  }

  // Alertas automáticas
  async checkAlerts(): Promise<any[]> {
    const alerts: any[] = [];

    try {
      // Verificar errores recientes
      const [apiErrors, llmErrors, genErrors] = await Promise.all([
        db.getMetrics('api_errors', 1),
        db.getMetrics('llm_errors', 1),
        db.getMetrics('workflow_generation_errors', 1)
      ]);

      if (apiErrors.length > 10) {
        alerts.push({
          level: 'warning',
          message: `High API error rate: ${apiErrors.length} errors in the last hour`,
          metric: 'api_errors'
        });
      }

      if (llmErrors.length > 5) {
        alerts.push({
          level: 'critical',
          message: `LLM service issues: ${llmErrors.length} errors in the last hour`,
          metric: 'llm_errors'
        });
      }

      if (genErrors.length > 3) {
        alerts.push({
          level: 'warning',
          message: `Workflow generation issues: ${genErrors.length} errors in the last hour`,
          metric: 'workflow_generation_errors'
        });
      }

      // Verificar memoria
      const memUsage = process.memoryUsage();
      const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      if (memUsagePercent > 90) {
        alerts.push({
          level: 'critical',
          message: `High memory usage: ${memUsagePercent.toFixed(1)}%`,
          metric: 'memory_usage'
        });
      }

      // Verificar conectividad de base de datos
      const dbHealthy = await db.healthCheck();
      if (!dbHealthy) {
        alerts.push({
          level: 'critical',
          message: 'Database connection failed',
          metric: 'database_health'
        });
      }

    } catch (error: any) {
      alerts.push({
        level: 'error',
        message: `Error checking alerts: ${error.message}`,
        metric: 'alert_system'
      });
    }

    return alerts;
  }

  // Método para generar reporte de rendimiento
  async getPerformanceReport(hours = 24): Promise<any> {
    try {
      const [apiErrors, llmMetrics, workflowMetrics] = await Promise.all([
        db.getMetrics('api_errors', hours),
        db.getMetrics('llm_requests', hours),
        db.getMetrics('active_workflows', hours)
      ]);

      const stats = await db.getWorkflowStats();

      return {
        period_hours: hours,
        summary: {
          total_workflows: stats.total_workflows,
          active_workflows: stats.active_workflows,
          executions_last_24h: stats.executions_last_24h,
          api_errors: apiErrors.length,
          llm_requests: llmMetrics.length
        },
        system_health: {
          memory_usage: process.memoryUsage(),
          uptime_seconds: process.uptime(),
          database_connected: await db.healthCheck()
        },
        alerts: await this.checkAlerts()
      };
    } catch (error: any) {
      logger.error('Error generating performance report:', error.message);
      throw error;
    }
  }
}

export const metricsService = new MetricsService();