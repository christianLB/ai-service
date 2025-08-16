import {
  DependencyChecker,
  DependencyCheckResult,
  DatabaseCheckOptions,
  RedisCheckOptions,
  HttpCheckOptions,
  CustomCheckOptions,
  HealthStatus,
} from '../types/health.types';

/**
 * Create a PostgreSQL database health checker
 */
export function createDatabaseChecker(
  dbClient: { query: (text: string) => Promise<any> },
  options: DatabaseCheckOptions = {}
): DependencyChecker {
  return {
    name: options.name || 'database',
    timeout: options.timeout || 5000,
    critical: options.critical !== false,
    check: async (): Promise<DependencyCheckResult> => {
      const startTime = Date.now();
      
      try {
        const query = options.query || 'SELECT 1 as health_check';
        await dbClient.query(query);
        
        const latency = Date.now() - startTime;
        
        return {
          status: 'healthy',
          message: 'Database connection successful',
          latency,
          metadata: {
            query,
            connectionType: 'postgresql',
          },
        };
      } catch (error) {
        const latency = Date.now() - startTime;
        
        return {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Database connection failed',
          latency,
          metadata: {
            error: true,
            connectionType: 'postgresql',
          },
        };
      }
    },
  };
}

/**
 * Create a Redis health checker
 */
export function createRedisChecker(
  redisClient: { ping: () => Promise<string>; status?: string },
  options: RedisCheckOptions = {}
): DependencyChecker {
  return {
    name: options.name || 'redis',
    timeout: options.timeout || 3000,
    critical: options.critical !== false,
    check: async (): Promise<DependencyCheckResult> => {
      const startTime = Date.now();
      
      try {
        // Check connection status first (if available)
        if ('status' in redisClient && redisClient.status === 'end') {
          return {
            status: 'unhealthy',
            message: 'Redis connection is closed',
            latency: Date.now() - startTime,
            metadata: {
              error: true,
              connectionStatus: redisClient.status,
            },
          };
        }
        
        const pong = await redisClient.ping();
        const latency = Date.now() - startTime;
        
        if (pong === 'PONG') {
          return {
            status: 'healthy',
            message: 'Redis connection successful',
            latency,
            metadata: {
              response: pong,
              connectionStatus: redisClient.status,
            },
          };
        } else {
          return {
            status: 'degraded',
            message: `Unexpected ping response: ${pong}`,
            latency,
            metadata: {
              response: pong,
              connectionStatus: redisClient.status,
            },
          };
        }
      } catch (error) {
        const latency = Date.now() - startTime;
        
        return {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Redis connection failed',
          latency,
          metadata: {
            error: true,
            connectionStatus: redisClient.status,
          },
        };
      }
    },
  };
}

/**
 * Create an HTTP endpoint health checker
 */
export function createHttpChecker(options: HttpCheckOptions): DependencyChecker {
  return {
    name: options.name,
    timeout: options.timeout || 5000,
    critical: options.critical !== false,
    check: async (): Promise<DependencyCheckResult> => {
      const startTime = Date.now();
      const expectedStatus = options.expectedStatus || 200;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || 5000);
        
        const response = await fetch(options.url, {
          method: 'GET',
          headers: options.headers,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;
        
        if (response.status === expectedStatus) {
          return {
            status: 'healthy',
            message: `HTTP endpoint responding (${response.status})`,
            latency,
            metadata: {
              url: options.url,
              statusCode: response.status,
              statusText: response.statusText,
            },
          };
        } else if (response.status >= 200 && response.status < 300) {
          return {
            status: 'degraded',
            message: `HTTP endpoint responding with unexpected status (${response.status})`,
            latency,
            metadata: {
              url: options.url,
              statusCode: response.status,
              statusText: response.statusText,
              expectedStatus,
            },
          };
        } else {
          return {
            status: 'unhealthy',
            message: `HTTP endpoint error (${response.status})`,
            latency,
            metadata: {
              url: options.url,
              statusCode: response.status,
              statusText: response.statusText,
              expectedStatus,
            },
          };
        }
      } catch (error) {
        const latency = Date.now() - startTime;
        
        // Handle timeout specifically
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            status: 'unhealthy',
            message: `HTTP endpoint timeout (${options.timeout}ms)`,
            latency,
            metadata: {
              url: options.url,
              error: true,
              timeout: true,
            },
          };
        }
        
        return {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'HTTP endpoint check failed',
          latency,
          metadata: {
            url: options.url,
            error: true,
          },
        };
      }
    },
  };
}

/**
 * Create a memory usage health checker
 */
export function createMemoryChecker(
  options: CustomCheckOptions & {
    maxHeapUsedMB?: number;
    maxRssMB?: number;
  } = { name: 'memory' }
): DependencyChecker {
  return {
    name: options.name || 'memory',
    timeout: options.timeout || 1000,
    critical: options.critical !== false,
    check: async (): Promise<DependencyCheckResult> => {
      const startTime = Date.now();
      
      try {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const rssMB = Math.round(memUsage.rss / 1024 / 1024);
        
        const maxHeapUsedMB = options.maxHeapUsedMB || 512;
        const maxRssMB = options.maxRssMB || 1024;
        
        let status: HealthStatus = 'healthy';
        let message = 'Memory usage within acceptable limits';
        
        if (heapUsedMB > maxHeapUsedMB || rssMB > maxRssMB) {
          status = 'degraded';
          message = 'Memory usage is high';
        }
        
        if (heapUsedMB > maxHeapUsedMB * 1.5 || rssMB > maxRssMB * 1.5) {
          status = 'unhealthy';
          message = 'Memory usage is critically high';
        }
        
        return {
          status,
          message,
          latency: Date.now() - startTime,
          metadata: {
            heapUsedMB,
            heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
            rssMB,
            externalMB: Math.round(memUsage.external / 1024 / 1024),
            arrayBuffersMB: Math.round(memUsage.arrayBuffers / 1024 / 1024),
            maxHeapUsedMB,
            maxRssMB,
          },
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Memory check failed',
          latency: Date.now() - startTime,
          metadata: {
            error: true,
          },
        };
      }
    },
  };
}

/**
 * Create a disk space health checker (if available)
 */
export function createDiskSpaceChecker(
  options: CustomCheckOptions & {
    path?: string;
    minFreeMB?: number;
  } = { name: 'disk_space' }
): DependencyChecker {
  return {
    name: options.name || 'disk_space',
    timeout: options.timeout || 2000,
    critical: options.critical !== false,
    check: async (): Promise<DependencyCheckResult> => {
      const startTime = Date.now();
      
      try {
        const fs = await import('fs');
        const path = options.path || process.cwd();
        const minFreeMB = options.minFreeMB || 100;
        
        // Get disk stats
        const stats = await fs.promises.statfs?.(path);
        
        if (!stats) {
          return {
            status: 'degraded',
            message: 'Disk space check not available on this platform',
            latency: Date.now() - startTime,
            metadata: {
              platform: process.platform,
              error: true,
            },
          };
        }
        
        const freeBytes = stats.bavail * stats.bsize;
        const totalBytes = stats.blocks * stats.bsize;
        const freeMB = Math.round(freeBytes / 1024 / 1024);
        const totalMB = Math.round(totalBytes / 1024 / 1024);
        const usedPercent = Math.round(((totalBytes - freeBytes) / totalBytes) * 100);
        
        let status: HealthStatus = 'healthy';
        let message = 'Disk space is adequate';
        
        if (freeMB < minFreeMB) {
          status = 'degraded';
          message = `Disk space is low: ${freeMB}MB free`;
        }
        
        if (freeMB < minFreeMB / 2 || usedPercent > 95) {
          status = 'unhealthy';
          message = `Disk space is critically low: ${freeMB}MB free (${usedPercent}% used)`;
        }
        
        return {
          status,
          message,
          latency: Date.now() - startTime,
          metadata: {
            path,
            freeMB,
            totalMB,
            usedPercent,
            minFreeMB,
          },
        };
      } catch (error) {
        return {
          status: 'degraded',
          message: error instanceof Error ? error.message : 'Disk space check failed',
          latency: Date.now() - startTime,
          metadata: {
            error: true,
            path: options.path || process.cwd(),
          },
        };
      }
    },
  };
}

/**
 * Create a custom health checker
 */
export function createCustomChecker(
  checkFunction: () => Promise<DependencyCheckResult>,
  options: CustomCheckOptions
): DependencyChecker {
  return {
    name: options.name,
    timeout: options.timeout || 5000,
    critical: options.critical !== false,
    check: checkFunction,
  };
}

/**
 * Helper to create multiple dependency checkers at once
 */
export interface DependencyCheckersConfig {
  database?: {
    client: { query: (text: string) => Promise<any> };
    options?: DatabaseCheckOptions;
  };
  redis?: {
    client: { ping: () => Promise<string>; status?: string };
    options?: RedisCheckOptions;
  };
  http?: HttpCheckOptions[];
  memory?: CustomCheckOptions & {
    maxHeapUsedMB?: number;
    maxRssMB?: number;
  };
  diskSpace?: CustomCheckOptions & {
    path?: string;
    minFreeMB?: number;
  };
  custom?: Array<{
    checkFunction: () => Promise<DependencyCheckResult>;
    options: CustomCheckOptions;
  }>;
}

export function createDependencyCheckers(config: DependencyCheckersConfig): DependencyChecker[] {
  const checkers: DependencyChecker[] = [];
  
  // Database checker
  if (config.database) {
    checkers.push(createDatabaseChecker(config.database.client, config.database.options));
  }
  
  // Redis checker
  if (config.redis) {
    checkers.push(createRedisChecker(config.redis.client, config.redis.options));
  }
  
  // HTTP checkers
  if (config.http) {
    config.http.forEach(httpOptions => {
      checkers.push(createHttpChecker(httpOptions));
    });
  }
  
  // Memory checker
  if (config.memory) {
    checkers.push(createMemoryChecker(config.memory));
  }
  
  // Disk space checker
  if (config.diskSpace) {
    checkers.push(createDiskSpaceChecker(config.diskSpace));
  }
  
  // Custom checkers
  if (config.custom) {
    config.custom.forEach(({ checkFunction, options }) => {
      checkers.push(createCustomChecker(checkFunction, options));
    });
  }
  
  return checkers;
}