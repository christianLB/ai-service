import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables
dotenvConfig({ path: path.join(__dirname, '..', '.env') });

// Configuration schema
const ConfigSchema = z.object({
  aiService: z.object({
    url: z.string().url().default('http://localhost:3001'),
    authToken: z.string().optional(),
    timeout: z.number().default(30000),
  }),
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().default(300), // 5 minutes
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
});

// Parse and validate configuration
const configData = {
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:3001',
    authToken: process.env.AI_SERVICE_AUTH_TOKEN,
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10),
  },
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.CACHE_TTL || '300', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export const config = ConfigSchema.parse(configData);