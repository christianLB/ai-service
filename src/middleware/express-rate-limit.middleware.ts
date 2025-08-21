import rateLimit from 'express-rate-limit';

// Standard rate limit - 100 requests per minute
export const standardRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use x-forwarded-for if available, otherwise fall back to req.ip
    return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  },
});

// Database rate limit - 30 requests per minute for database-intensive operations
export const databaseRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many database requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use x-forwarded-for if available, otherwise fall back to req.ip
    return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  },
});

// AI rate limit - 20 requests per minute
export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Too many AI requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use x-forwarded-for if available, otherwise fall back to req.ip
    return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  },
});

// Batch rate limit - 5 requests per minute
export const batchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many batch requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use x-forwarded-for if available, otherwise fall back to req.ip
    return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  },
});

// Search rate limit - 50 requests per minute
export const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  message: 'Too many search requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use x-forwarded-for if available, otherwise fall back to req.ip
    return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  },
});

// Dynamic rate limiter based on endpoint (for compatibility)
export function dynamicRateLimit(req: any, res: any, next: any): void {
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

// Rate limit info for compatibility
export const rateLimitInfo = {
  standard: {
    type: 'standard',
    limit: 100,
    window: '60 seconds',
    blockDuration: 'none',
  },
  database: {
    type: 'database',
    limit: 30,
    window: '60 seconds',
    blockDuration: 'none',
  },
  ai: {
    type: 'ai',
    limit: 20,
    window: '60 seconds',
    blockDuration: 'none',
  },
  batch: {
    type: 'batch',
    limit: 5,
    window: '60 seconds',
    blockDuration: 'none',
  },
  search: {
    type: 'search',
    limit: 50,
    window: '60 seconds',
    blockDuration: 'none',
  },
};

// Helper function for compatibility
export function getRateLimitInfo(type: keyof typeof rateLimitInfo = 'standard') {
  return rateLimitInfo[type];
}
