import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Event Logger for audit trail and distributed tracing
 * Integrates with the EventLog table in the database
 */
export class EventLogger {
  private prisma: any;
  
  constructor(prisma?: any) {
    this.prisma = prisma || null;
  }

  /**
   * Express middleware for request tracing and event logging
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Generate or extract trace ID
      const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
      const spanId = uuidv4();
      const parentSpanId = req.headers['x-parent-span-id'] as string;
      
      // Add trace context to request
      (req as any).traceContext = {
        traceId,
        spanId,
        parentSpanId,
      };
      
      // Add trace headers to response
      res.setHeader('X-Trace-Id', traceId);
      res.setHeader('X-Span-Id', spanId);
      
      const startTime = Date.now();
      const service = process.env.SERVICE_NAME || 'unknown-service';
      
      // Capture response details
      const originalSend = res.send;
      let responseBody: any;
      
      res.send = function(data: any) {
        responseBody = data;
        return originalSend.call(this, data);
      };
      
      // Log request on completion
      res.on('finish', async () => {
        const duration = Date.now() - startTime;
        const userId = (req as any).user?.id || null;
        
        try {
          await this.logEvent({
            traceId,
            spanId,
            parentSpanId,
            service,
            operation: `${req.method} ${req.path}`,
            level: this.getLogLevel(res.statusCode),
            userId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            message: `${req.method} ${req.path} completed`,
            metadata: {
              query: req.query,
              params: req.params,
              headers: this.sanitizeHeaders(req.headers),
            },
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
          });
        } catch (error) {
          console.error('Failed to log event:', error);
        }
      });
      
      next();
    };
  }
  
  /**
   * Log an event to the database
   */
  async logEvent(event: {
    traceId: string;
    spanId?: string;
    parentSpanId?: string;
    service: string;
    operation: string;
    level?: string;
    userId?: string | null;
    method?: string;
    path?: string;
    statusCode?: number;
    duration?: number;
    message: string;
    metadata?: any;
    error?: any;
    ip?: string;
    userAgent?: string;
  }) {
    if (!this.prisma) {
      // Just log to console if Prisma is not available
      console.log(`[EventLog] ${event.level || 'info'}: ${event.message}`);
      return;
    }
    try {
      await this.prisma.eventLog.create({
        data: {
          traceId: event.traceId,
          spanId: event.spanId || null,
          parentSpanId: event.parentSpanId || null,
          service: event.service,
          operation: event.operation,
          level: event.level || 'info',
          userId: event.userId || null,
          method: event.method || null,
          path: event.path || null,
          statusCode: event.statusCode || null,
          duration: event.duration || null,
          message: event.message,
          metadata: event.metadata || {},
          error: event.error || null,
          ip: event.ip || null,
          userAgent: event.userAgent || null,
        },
      });
    } catch (error) {
      console.error('Failed to write to EventLog:', error);
      // Don't throw - logging should not break the application
    }
  }
  
  /**
   * Log an error event
   */
  async logError(
    traceId: string,
    service: string,
    operation: string,
    error: any,
    metadata?: any
  ) {
    await this.logEvent({
      traceId,
      service,
      operation,
      level: 'error',
      message: error.message || 'An error occurred',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      metadata,
    });
  }
  
  /**
   * Determine log level based on status code
   */
  private getLogLevel(statusCode: number): string {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    if (statusCode >= 300) return 'info';
    return 'info';
  }
  
  /**
   * Remove sensitive headers before logging
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-csrf-token',
    ];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
  
  /**
   * Create a child span for distributed tracing
   */
  createChildSpan(parentTraceId: string, parentSpanId: string): {
    traceId: string;
    spanId: string;
    parentSpanId: string;
  } {
    return {
      traceId: parentTraceId,
      spanId: uuidv4(),
      parentSpanId: parentSpanId,
    };
  }
  
  /**
   * Query events by trace ID
   */
  async getTraceEvents(traceId: string) {
    if (!this.prisma) return [];
    return await this.prisma.eventLog.findMany({
      where: { traceId },
      orderBy: { createdAt: 'asc' },
    });
  }
  
  /**
   * Query events by service and time range
   */
  async getServiceEvents(
    service: string,
    startTime: Date,
    endTime: Date,
    level?: string
  ) {
    if (!this.prisma) return [];
    return await this.prisma.eventLog.findMany({
      where: {
        service,
        createdAt: {
          gte: startTime,
          lte: endTime,
        },
        ...(level && { level }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  
  /**
   * Clean up old events (retention policy)
   */
  async cleanupOldEvents(retentionDays: number = 30) {
    if (!this.prisma) return 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const result = await this.prisma.eventLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
    
    return result.count;
  }
}

// Export a singleton instance (without Prisma for now)
export const eventLogger = new EventLogger();