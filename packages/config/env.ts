import { z } from 'zod';

/**
 * Centralized Environment Configuration with Zod Validation
 * Provides type-safe environment variable access for all services
 */

// Base environment schema (shared across all services)
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.coerce.number().positive().default(3000),
  
  // Database
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
  
  // Redis
  REDIS_URL: z.string().url().or(z.string().startsWith('redis://')).default('redis://localhost:6379'),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

// Financial service specific schema
const financialEnvSchema = baseEnvSchema.extend({
  // GoCardless
  GOCARDLESS_ACCESS_TOKEN: z.string().optional(),
  GOCARDLESS_SECRET_ID: z.string().optional(),
  GOCARDLESS_SECRET_KEY: z.string().optional(),
  GOCARDLESS_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  GOCARDLESS_BASE_URL: z.string().url().optional(),
  
  // Invoice settings
  INVOICE_NUMBER_PREFIX: z.string().default('INV'),
  INVOICE_NUMBER_START: z.coerce.number().default(1000),
  
  // Storage
  ATTACHMENT_STORAGE_PATH: z.string().default('./storage/attachments'),
  MAX_ATTACHMENT_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 10MB
});

// Trading service specific schema
const tradingEnvSchema = baseEnvSchema.extend({
  // Exchange APIs
  BINANCE_API_KEY: z.string().optional(),
  BINANCE_API_SECRET: z.string().optional(),
  COINBASE_API_KEY: z.string().optional(),
  COINBASE_API_SECRET: z.string().optional(),
  ALPACA_API_KEY: z.string().optional(),
  ALPACA_API_SECRET: z.string().optional(),
  
  // Trading settings
  TRADING_ENVIRONMENT: z.enum(['paper', 'live']).default('paper'),
  MAX_POSITION_SIZE: z.coerce.number().default(1000),
  RISK_LIMIT_PERCENTAGE: z.coerce.number().min(0).max(100).default(2),
  
  // InfluxDB for time series
  INFLUXDB_URL: z.string().url().optional(),
  INFLUXDB_TOKEN: z.string().optional(),
  INFLUXDB_ORG: z.string().default('ai-service'),
  INFLUXDB_BUCKET: z.string().default('trading'),
});

// AI Core service specific schema
const aiCoreEnvSchema = baseEnvSchema.extend({
  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),
  OPENAI_MAX_TOKENS: z.coerce.number().default(4000),
  
  // Claude
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default('claude-3-opus-20240229'),
  
  // Embeddings
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),
  
  // Vector DB
  QDRANT_URL: z.string().url().optional(),
  QDRANT_API_KEY: z.string().optional(),
});

// Communication service specific schema
const commEnvSchema = baseEnvSchema.extend({
  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_URL: z.string().url().optional(),
  TELEGRAM_ADMIN_CHAT_ID: z.string().optional(),
  
  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  
  // Slack
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
});

// API Gateway specific schema  
const gatewayEnvSchema = baseEnvSchema.extend({
  // Service URLs
  FINANCIAL_SVC_URL: z.string().url().default('http://financial-svc:3001'),
  TRADING_SVC_URL: z.string().url().default('http://trading-svc:3002'),
  COMM_SVC_URL: z.string().url().default('http://comm-svc:3003'),
  AI_CORE_URL: z.string().url().default('http://ai-core:3004'),
  
  // Gateway settings
  PROXY_TIMEOUT: z.coerce.number().default(30000), // 30 seconds
  CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().default(50),
  CIRCUIT_BREAKER_TIMEOUT: z.coerce.number().default(60000), // 1 minute
  
  // Security
  INTEGRATION_CONFIG_KEY: z.string().min(32).optional(),
});

// Worker specific schema
const workerEnvSchema = baseEnvSchema.extend({
  // Queue settings
  QUEUE_CONCURRENCY: z.coerce.number().default(5),
  QUEUE_MAX_RETRIES: z.coerce.number().default(3),
  QUEUE_RETRY_DELAY: z.coerce.number().default(5000),
  
  // Worker settings
  WORKER_NAME: z.string(),
  WORKER_HEARTBEAT_INTERVAL: z.coerce.number().default(30000), // 30 seconds
});

// Service type enum
export enum ServiceType {
  GATEWAY = 'gateway',
  FINANCIAL = 'financial-svc',
  TRADING = 'trading-svc',
  AI_CORE = 'ai-core',
  COMM = 'comm-svc',
  WORKER_FINANCIAL = 'worker-financial',
  WORKER_TRADING = 'worker-trading',
  BASE = 'base'
}

// Schema mapping
const schemaMap = {
  [ServiceType.GATEWAY]: gatewayEnvSchema,
  [ServiceType.FINANCIAL]: financialEnvSchema,
  [ServiceType.TRADING]: tradingEnvSchema,
  [ServiceType.AI_CORE]: aiCoreEnvSchema,
  [ServiceType.COMM]: commEnvSchema,
  [ServiceType.WORKER_FINANCIAL]: workerEnvSchema,
  [ServiceType.WORKER_TRADING]: workerEnvSchema,
  [ServiceType.BASE]: baseEnvSchema,
};

// Type inference helpers
export type BaseEnv = z.infer<typeof baseEnvSchema>;
export type FinancialEnv = z.infer<typeof financialEnvSchema>;
export type TradingEnv = z.infer<typeof tradingEnvSchema>;
export type AICoreEnv = z.infer<typeof aiCoreEnvSchema>;
export type CommEnv = z.infer<typeof commEnvSchema>;
export type GatewayEnv = z.infer<typeof gatewayEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

// Main environment configuration class
export class EnvConfig {
  private static instances: Map<ServiceType, any> = new Map();
  
  /**
   * Get validated environment configuration for a specific service
   */
  static getEnv<T extends ServiceType>(
    serviceType: T
  ): T extends ServiceType.GATEWAY ? GatewayEnv :
     T extends ServiceType.FINANCIAL ? FinancialEnv :
     T extends ServiceType.TRADING ? TradingEnv :
     T extends ServiceType.AI_CORE ? AICoreEnv :
     T extends ServiceType.COMM ? CommEnv :
     T extends ServiceType.WORKER_FINANCIAL ? WorkerEnv :
     T extends ServiceType.WORKER_TRADING ? WorkerEnv :
     BaseEnv {
    // Check cache
    if (this.instances.has(serviceType)) {
      return this.instances.get(serviceType);
    }
    
    // Get schema for service type
    const schema = schemaMap[serviceType];
    if (!schema) {
      throw new Error(`Unknown service type: ${serviceType}`);
    }
    
    // Parse and validate environment
    const result = schema.safeParse(process.env);
    
    if (!result.success) {
      const errors = result.error.format();
      console.error('Environment validation failed:', errors);
      
      // Format error message
      const errorMessages = result.error.issues.map(issue => {
        return `  - ${issue.path.join('.')}: ${issue.message}`;
      }).join('\n');
      
      throw new Error(`Environment validation failed for ${serviceType}:\n${errorMessages}`);
    }
    
    // Cache and return
    this.instances.set(serviceType, result.data);
    return result.data as any;
  }
  
  /**
   * Validate environment without throwing
   */
  static validateEnv(serviceType: ServiceType): { 
    valid: boolean; 
    errors?: z.ZodError 
  } {
    const schema = schemaMap[serviceType];
    if (!schema) {
      return { valid: false };
    }
    
    const result = schema.safeParse(process.env);
    return {
      valid: result.success,
      errors: result.success ? undefined : result.error
    };
  }
  
  /**
   * Get required environment variables for a service
   */
  static getRequiredVars(serviceType: ServiceType): string[] {
    const schema = schemaMap[serviceType];
    if (!schema) return [];
    
    // Extract required fields from schema
    const shape = (schema as any)._def.shape();
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(shape)) {
      if (!(value as any).isOptional()) {
        required.push(key);
      }
    }
    
    return required;
  }
  
  /**
   * Clear cache (useful for testing)
   */
  static clearCache(): void {
    this.instances.clear();
  }
}

// Export convenience functions
export function getEnv<T extends ServiceType>(serviceType: T) {
  return EnvConfig.getEnv(serviceType);
}

export function validateEnv(serviceType: ServiceType) {
  return EnvConfig.validateEnv(serviceType);
}

// Export for backward compatibility
export const env = EnvConfig.getEnv(ServiceType.BASE);

// Export schemas for advanced usage
export {
  baseEnvSchema,
  financialEnvSchema,
  tradingEnvSchema,
  aiCoreEnvSchema,
  commEnvSchema,
  gatewayEnvSchema,
  workerEnvSchema
};