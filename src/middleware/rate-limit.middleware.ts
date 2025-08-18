import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { RateLimitError } from '../services/tagging/errors';
import logger from '../utils/logger';

// Rate limiter configurations
interface RateLimitConfig {
  points: number; // Number of requests
  duration: number; // Per duration in seconds
  blockDuration?: number; // Block duration in seconds after limit exceeded
}

// Different rate limits for different endpoint types
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  standard: {
    points: 100,
    duration: 60, // 100 requests per minute
    blockDuration: 60,
  },
  ai: {
    points: 20,
    duration: 60, // 20 requests per minute
    blockDuration: 120,
  },
  batch: {
    points: 5,
    duration: 60, // 5 requests per minute
    blockDuration: 300,
  },
  search: {
    points: 50,
    duration: 60, // 50 requests per minute
    blockDuration: 60,
  },
  database: {
    points: 30,
    duration: 60, // 30 requests per minute for database-intensive operations
    blockDuration: 60,
  },
};

// Initialize rate limiters
const rateLimiters: Record<string, RateLimiterMemory | RateLimiterRedis> = {};

// Check if Redis is available
const redisClient = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

// Initialize rate limiters based on environment
Object.entries(rateLimitConfigs).forEach(([key, config]) => {
  if (redisClient) {
    rateLimiters[key] = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: `rl:${key}:`,
      points: config.points,
      duration: config.duration,
      blockDuration: config.blockDuration,
      execEvenly: false,
    });
  } else {
    rateLimiters[key] = new RateLimiterMemory({
      points: config.points,
      duration: config.duration,
      blockDuration: config.blockDuration,
      execEvenly: false,
    });
  }
});

// Rate limiting middleware factory
export function createRateLimiter(type: keyof typeof rateLimitConfigs = 'standard') {
  const limiter = rateLimiters[type];
  const config = rateLimitConfigs[type];

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Use user ID if authenticated, otherwise use IP
      const key = (req as any).user?.userId || req.ip;

      // Consume 1 point
      const rateLimiterRes = await limiter.consume(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.points.toString());
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints.toString());
      res.setHeader(
        'X-RateLimit-Reset',
        new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
      );

      next();
    } catch (rejRes: any) {
      // Rate limit exceeded
      const resetDate = new Date(Date.now() + rejRes.msBeforeNext);

      res.setHeader('X-RateLimit-Limit', config.points.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', resetDate.toISOString());
      res.setHeader('Retry-After', Math.round(rejRes.msBeforeNext / 1000).toString());

      const error = new RateLimitError(config.points, resetDate);

      logger.warn('Rate limit exceeded', {
        type,
        key: (req as any).user?.userId || req.ip,
        endpoint: req.path,
      });

      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  };
}

// Specific rate limiters for different endpoint types
export const standardRateLimit = createRateLimiter('standard');
export const aiRateLimit = createRateLimiter('ai');
export const batchRateLimit = createRateLimiter('batch');
export const searchRateLimit = createRateLimiter('search');
export const databaseRateLimit = createRateLimiter('database');

// Dynamic rate limiter based on endpoint
export function dynamicRateLimit(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;

  // Determine which rate limiter to use based on endpoint
  if (path.includes('/batch') || path.includes('/retag')) {
    batchRateLimit(req, res, next);
  } else if (path.includes('/tag') && req.method === 'POST' && !path.includes('/tags')) {
    aiRateLimit(req, res, next);
  } else if (path.includes('/search')) {
    searchRateLimit(req, res, next);
  } else {
    standardRateLimit(req, res, next);
  }
}

// Rate limit info endpoint
export function getRateLimitInfo(type: keyof typeof rateLimitConfigs = 'standard') {
  const config = rateLimitConfigs[type];
  return {
    type,
    limit: config.points,
    window: `${config.duration} seconds`,
    blockDuration: config.blockDuration ? `${config.blockDuration} seconds` : 'none',
  };
}

// Export rate limit info for all types
export const rateLimitInfo = Object.keys(rateLimitConfigs).reduce(
  (acc, key) => {
    acc[key] = getRateLimitInfo(key as keyof typeof rateLimitConfigs);
    return acc;
  },
  {} as Record<string, any>
);
