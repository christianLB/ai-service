import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema
const configSchema = z.object({
  // Server Configuration
  server: z.object({
    port: z.number().min(1).max(65535),
    host: z.string(),
    environment: z.enum(['development', 'production', 'test']),
  }),

  // AI Service Configuration
  aiService: z.object({
    url: z.string().url(),
    timeout: z.number().min(1000),
    retryAttempts: z.number().min(0).max(5),
  }),

  // Authentication
  auth: z.object({
    jwtSecret: z.string().min(32),
    jwtExpiresIn: z.string(),
    apiKeyHeader: z.string(),
    enableApiKey: z.boolean(),
  }),

  // Redis Configuration
  redis: z.object({
    host: z.string(),
    port: z.number().min(1).max(65535),
    password: z.string().optional(),
    db: z.number().min(0).max(15),
    keyPrefix: z.string(),
  }),

  // Rate Limiting
  rateLimit: z.object({
    windowMs: z.number().min(1000),
    maxRequests: z.number().min(1),
    skipSuccessfulRequests: z.boolean(),
  }),

  // CORS Configuration
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string()), z.boolean()]),
    credentials: z.boolean(),
  }),

  // Logging
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']),
    format: z.enum(['json', 'simple']),
  }),

  // MCP Specific
  mcp: z.object({
    name: z.string(),
    version: z.string(),
    description: z.string(),
    maxConcurrentTools: z.number().min(1).max(100),
    toolTimeout: z.number().min(1000),
  }),
});

// Build configuration from environment
const config = configSchema.parse({
  server: {
    port: parseInt(process.env.MCP_PORT || '8080', 10),
    host: process.env.MCP_HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development',
  },

  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://ai-service:3000',
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10),
    retryAttempts: parseInt(process.env.AI_SERVICE_RETRY_ATTEMPTS || '3', 10),
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    apiKeyHeader: process.env.API_KEY_HEADER || 'x-api-key',
    enableApiKey: process.env.ENABLE_API_KEY === 'true',
  },

  redis: {
    host: process.env.REDIS_HOST || 'ai-redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '1', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'mcp:',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
  },

  cors: {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : true,
    credentials: process.env.CORS_CREDENTIALS !== 'false',
  },

  logging: {
    level: (process.env.LOG_LEVEL || 'info') as any,
    format: (process.env.LOG_FORMAT || 'json') as any,
  },

  mcp: {
    name: 'AI Service MCP Bridge',
    version: '1.0.0',
    description: 'Model Context Protocol bridge for AI Service capabilities',
    maxConcurrentTools: parseInt(process.env.MCP_MAX_CONCURRENT_TOOLS || '10', 10),
    toolTimeout: parseInt(process.env.MCP_TOOL_TIMEOUT || '30000', 10),
  },
});

export default config;
export type Config = z.infer<typeof configSchema>;