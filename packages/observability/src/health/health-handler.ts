import { Request, Response } from 'express';
import {
  HealthCheckConfig,
  DependencyChecker,
  HealthResponse,
  LivenessResponse,
  ReadinessResponse,
  HealthStatus,
  Dependency,
  DependencyCheckResult,
  HealthResponseSchema,
  LivenessResponseSchema,
  ReadinessResponseSchema,
} from '../types/health.types';

export class StandardHealthHandler {
  private readonly serviceName: string;
  private readonly version?: string;
  private readonly environment?: string;
  private readonly dependencies: DependencyChecker[];
  private readonly startTime: Date;
  private readonly gracefulShutdownTimeoutMs: number;
  private isShuttingDown = false;

  constructor(config: HealthCheckConfig) {
    this.serviceName = config.serviceName;
    this.version = config.version || process.env.npm_package_version;
    this.environment = config.environment || process.env.NODE_ENV || 'development';
    this.dependencies = config.dependencies || [];
    this.startTime = new Date();
    this.gracefulShutdownTimeoutMs = config.gracefulShutdownTimeoutMs || 30000;
  }

  /**
   * Liveness probe - indicates if the service is running
   * Should be fast and not check external dependencies
   */
  public liveness = async (req: Request, res: Response): Promise<void> => {
    try {
      const response: LivenessResponse = {
        alive: !this.isShuttingDown,
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
        service: this.serviceName,
      };

      // Validate response
      const validatedResponse = LivenessResponseSchema.parse(response);

      if (!validatedResponse.alive) {
        res.status(503).json(validatedResponse);
      } else {
        res.status(200).json(validatedResponse);
      }
    } catch (error) {
      res.status(500).json({
        alive: false,
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
        service: this.serviceName,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  };

  /**
   * Readiness probe - indicates if the service can handle requests
   * Checks external dependencies
   */
  public readiness = async (req: Request, res: Response): Promise<void> => {
    try {
      const checks = await this.performDependencyChecks();
      const overallStatus = this.calculateOverallStatus(checks);

      const response: ReadinessResponse = {
        ready: overallStatus === 'healthy' && !this.isShuttingDown,
        timestamp: new Date().toISOString(),
        service: this.serviceName,
        checks,
        overall_status: overallStatus,
      };

      // Validate response
      const validatedResponse = ReadinessResponseSchema.parse(response);

      if (!validatedResponse.ready) {
        res.status(503).json(validatedResponse);
      } else {
        res.status(200).json(validatedResponse);
      }
    } catch (error) {
      res.status(500).json({
        ready: false,
        timestamp: new Date().toISOString(),
        service: this.serviceName,
        checks: [],
        overall_status: 'unhealthy' as HealthStatus,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  };

  /**
   * Comprehensive health check - combines liveness and readiness with additional metadata
   */
  public health = async (req: Request, res: Response): Promise<void> => {
    try {
      const dependencies = await this.performDependencyChecks();
      const overallStatus = this.calculateOverallStatus(dependencies);

      const response: HealthResponse = {
        status: this.isShuttingDown ? 'unhealthy' : overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
        version: this.version,
        service: this.serviceName,
        environment: this.environment,
        dependencies,
        metadata: {
          isShuttingDown: this.isShuttingDown,
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      };

      // Validate response
      const validatedResponse = HealthResponseSchema.parse(response);

      const statusCode = this.getHttpStatusCode(validatedResponse.status, this.isShuttingDown);
      res.status(statusCode).json(validatedResponse);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy' as HealthStatus,
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
        service: this.serviceName,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  };

  /**
   * Graceful shutdown handler
   */
  public initiateGracefulShutdown(): void {
    this.isShuttingDown = true;
    
    // Set timeout for forced shutdown
    setTimeout(() => {
      console.error(`[${this.serviceName}] Graceful shutdown timeout exceeded, forcing exit`);
      process.exit(1);
    }, this.gracefulShutdownTimeoutMs);
  }

  /**
   * Add a new dependency checker at runtime
   */
  public addDependencyChecker(checker: DependencyChecker): void {
    this.dependencies.push(checker);
  }

  /**
   * Remove a dependency checker by name
   */
  public removeDependencyChecker(name: string): void {
    const index = this.dependencies.findIndex(dep => dep.name === name);
    if (index !== -1) {
      this.dependencies.splice(index, 1);
    }
  }

  /**
   * Get current service information
   */
  public getServiceInfo() {
    return {
      serviceName: this.serviceName,
      version: this.version,
      environment: this.environment,
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      startTime: this.startTime.toISOString(),
      isShuttingDown: this.isShuttingDown,
    };
  }

  private async performDependencyChecks(): Promise<Dependency[]> {
    const checkPromises = this.dependencies.map(async (checker): Promise<Dependency> => {
      const startTime = Date.now();
      
      try {
        const timeoutPromise = new Promise<DependencyCheckResult>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Health check timeout (${checker.timeout || 5000}ms)`));
          }, checker.timeout || 5000);
        });

        const checkResult = await Promise.race([
          checker.check(),
          timeoutPromise,
        ]);

        const latency = Date.now() - startTime;

        return {
          name: checker.name,
          status: checkResult.status,
          message: checkResult.message,
          latency,
          timestamp: new Date().toISOString(),
          metadata: checkResult.metadata,
        };
      } catch (error) {
        const latency = Date.now() - startTime;
        return {
          name: checker.name,
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
          latency,
          timestamp: new Date().toISOString(),
          metadata: { error: true },
        };
      }
    });

    return await Promise.allSettled(checkPromises).then(results =>
      results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            name: this.dependencies[index].name,
            status: 'unhealthy' as HealthStatus,
            message: 'Health check promise rejected',
            timestamp: new Date().toISOString(),
            metadata: { error: true },
          };
        }
      })
    );
  }

  private calculateOverallStatus(dependencies: Dependency[]): HealthStatus {
    if (dependencies.length === 0) {
      return 'healthy';
    }

    const criticalDeps = this.dependencies.filter(dep => dep.critical !== false);
    const nonCriticalDeps = this.dependencies.filter(dep => dep.critical === false);

    // Check critical dependencies
    const criticalResults = dependencies.filter(dep => 
      criticalDeps.some(criticalDep => criticalDep.name === dep.name)
    );
    
    const hasCriticalFailure = criticalResults.some(dep => dep.status === 'unhealthy');
    if (hasCriticalFailure) {
      return 'unhealthy';
    }

    // Check for degraded state
    const hasDegradedCritical = criticalResults.some(dep => dep.status === 'degraded');
    const hasNonCriticalFailure = dependencies
      .filter(dep => nonCriticalDeps.some(nonCriticalDep => nonCriticalDep.name === dep.name))
      .some(dep => dep.status === 'unhealthy');

    if (hasDegradedCritical || hasNonCriticalFailure) {
      return 'degraded';
    }

    return 'healthy';
  }

  private getHttpStatusCode(status: HealthStatus, isShuttingDown: boolean): number {
    if (isShuttingDown) return 503;
    
    switch (status) {
      case 'healthy':
        return 200;
      case 'degraded':
        return 200; // Still serving requests but with warnings
      case 'unhealthy':
        return 503;
      default:
        return 503;
    }
  }
}