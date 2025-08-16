import { z } from "zod";

/**
 * Comprehensive environment validation schema for AI Service
 * All services must pass validation before starting
 */

// Helper for optional in dev, required in prod
const requiredInProd = (schema: z.ZodString) => 
  schema.optional().refine(
    (val) => process.env.NODE_ENV !== "production" || !!val,
    "Required in production environment"
  );

// Enhanced environment validation schema
const EnvSchema = z.object({
  // ===== Core Configuration =====
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  SERVICE_NAME: z.string().optional(),
  SERVICE_VERSION: z.string().default("1.0.0"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug", "trace"]).default("info"),
  
  // ===== Database Configuration =====
  DATABASE_URL: z.string()
    .url()
    .or(z.string().startsWith("postgres"))
    .or(z.string().startsWith("postgresql"))
    .describe("PostgreSQL connection URL"),
  
  // Legacy DB variables (for compatibility)
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().default("ai_service"),
  DB_USER: z.string().default("postgres"),
  DB_PASSWORD: z.string().optional(),
  
  // Connection pool settings
  DB_POOL_MIN: z.coerce.number().int().positive().default(2),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  
  // ===== Redis Configuration =====
  REDIS_URL: z.string()
    .url()
    .or(z.string().startsWith("redis"))
    .describe("Redis connection URL"),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),
  REDIS_KEY_PREFIX: z.string().default("ai-service:"),
  
  // ===== Security Configuration =====
  JWT_SECRET: z.string()
    .min(32)
    .refine(
      (val) => process.env.NODE_ENV !== "production" || val.length >= 64,
      "JWT_SECRET must be at least 64 characters in production"
    ),
  JWT_ALGORITHM: z.enum(["HS256", "HS384", "HS512", "RS256"]).default("HS256"),
  JWT_EXPIRY: z.string().default("24h"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),
  
  ENCRYPTION_KEY: requiredInProd(z.string().min(32)),
  HASH_SALT_ROUNDS: z.coerce.number().int().min(10).max(20).default(12),
  
  // ===== API Keys (Service-Specific) =====
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOCARDLESS_ACCESS_TOKEN: z.string().optional(),
  GOCARDLESS_ENVIRONMENT: z.enum(["sandbox", "live"]).default("sandbox"),
  
  // Telegram Configuration
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_URL: z.string().url().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  TELEGRAM_ADMIN_CHAT_IDS: z.string().optional(),
  TELEGRAM_ALERTS_ENABLED: z.coerce.boolean().default(false),
  
  // Trading APIs
  BINANCE_API_KEY: z.string().optional(),
  BINANCE_API_SECRET: z.string().optional(),
  COINBASE_API_KEY: z.string().optional(),
  COINBASE_API_SECRET: z.string().optional(),
  ALPACA_API_KEY: z.string().optional(),
  ALPACA_API_SECRET: z.string().optional(),
  
  // ===== Service Discovery (API Gateway) =====
  FINANCIAL_SVC_URL: z.string().url().default("http://financial-svc:3001"),
  TRADING_SVC_URL: z.string().url().default("http://trading-svc:3002"),
  COMM_SVC_URL: z.string().url().default("http://comm-svc:3003"),
  AI_CORE_URL: z.string().url().default("http://ai-core:3004"),
  WORKER_FINANCIAL_URL: z.string().url().default("http://worker-financial:3101"),
  WORKER_TRADING_URL: z.string().url().default("http://worker-trading:3102"),
  
  // ===== CORS Configuration =====
  CORS_ORIGINS: z.string()
    .transform((str) => str.split(",").map(s => s.trim()))
    .default("http://localhost:3000"),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),
  
  // ===== Rate Limiting =====
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(100),
  RATE_LIMIT_SKIP_SUCCESSFUL: z.coerce.boolean().default(false),
  
  // ===== Queue Configuration (BullMQ) =====
  QUEUE_PREFIX: z.string().default("ai-service"),
  QUEUE_DEFAULT_REMOVE_ON_COMPLETE: z.coerce.boolean().default(true),
  QUEUE_DEFAULT_REMOVE_ON_FAIL: z.coerce.boolean().default(false),
  
  // ===== Monitoring & Observability =====
  METRICS_ENABLED: z.coerce.boolean().default(true),
  METRICS_PORT: z.coerce.number().int().positive().optional(),
  TRACING_ENABLED: z.coerce.boolean().default(false),
  TRACING_SERVICE_NAME: z.string().optional(),
  
  // ===== Feature Flags =====
  FEATURE_TRADING_ENABLED: z.coerce.boolean().default(true),
  FEATURE_AI_ENABLED: z.coerce.boolean().default(true),
  FEATURE_NOTIFICATIONS_ENABLED: z.coerce.boolean().default(true),
  FEATURE_DOCUMENT_PROCESSING_ENABLED: z.coerce.boolean().default(true),
  
  // ===== External Services =====
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  
  // Storage
  STORAGE_TYPE: z.enum(["local", "s3", "gcs"]).default("local"),
  STORAGE_PATH: z.string().default("./storage"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  
  // ===== Infrastructure =====
  DOCKER_ENV: z.coerce.boolean().default(false),
  HEALTH_CHECK_TIMEOUT: z.coerce.number().int().positive().default(5000),
  SHUTDOWN_TIMEOUT: z.coerce.number().int().positive().default(10000),
  
  // ===== Development Tools =====
  DEBUG: z.string().optional(),
  FORCE_COLOR: z.coerce.number().int().min(0).max(3).optional(),
});

// Service-specific validation schemas
const ServiceSchemas = {
  "api-gateway": EnvSchema.extend({
    SERVICE_NAME: z.literal("api-gateway"),
    FINANCIAL_SVC_URL: z.string().url(),
    TRADING_SVC_URL: z.string().url(),
    COMM_SVC_URL: z.string().url(),
    AI_CORE_URL: z.string().url(),
  }),
  
  "financial-svc": EnvSchema.extend({
    SERVICE_NAME: z.literal("financial-svc"),
    GOCARDLESS_ACCESS_TOKEN: requiredInProd(z.string()),
    GOCARDLESS_ENVIRONMENT: z.enum(["sandbox", "live"]),
  }),
  
  "trading-svc": EnvSchema.extend({
    SERVICE_NAME: z.literal("trading-svc"),
    BINANCE_API_KEY: z.string().optional(),
    BINANCE_API_SECRET: z.string().optional(),
  }),
  
  "comm-svc": EnvSchema.extend({
    SERVICE_NAME: z.literal("comm-svc"),
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    SMTP_HOST: z.string().optional(),
  }),
  
  "ai-core": EnvSchema.extend({
    SERVICE_NAME: z.literal("ai-core"),
    OPENAI_API_KEY: requiredInProd(z.string()),
    ANTHROPIC_API_KEY: z.string().optional(),
  }),
  
  "worker-financial": EnvSchema.extend({
    SERVICE_NAME: z.literal("worker-financial"),
    QUEUE_PREFIX: z.string(),
  }),
  
  "worker-trading": EnvSchema.extend({
    SERVICE_NAME: z.literal("worker-trading"),
    QUEUE_PREFIX: z.string(),
  }),
};

// Export the validated environment
export type Env = z.infer<typeof EnvSchema>;
export type ServiceName = keyof typeof ServiceSchemas;

// Validation function with detailed error reporting
function validateEnv(serviceName?: ServiceName): Env {
  try {
    const schema = serviceName && ServiceSchemas[serviceName] 
      ? ServiceSchemas[serviceName] 
      : EnvSchema;
    
    const env = schema.parse(process.env);
    
    // Log successful validation in development
    if (process.env.NODE_ENV === "development") {
      console.log(`✅ Environment validation successful${serviceName ? ` for ${serviceName}` : ""}`);
    }
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:");
      console.error("Missing or invalid environment variables:\n");
      
      error.errors.forEach(err => {
        const path = err.path.join(".");
        console.error(`  ${path}: ${err.message}`);
        
        // Provide helpful hints
        if (path.includes("DATABASE_URL")) {
          console.error("    💡 Example: postgresql://user:password@localhost:5432/dbname");
        }
        if (path.includes("REDIS_URL")) {
          console.error("    💡 Example: redis://localhost:6379");
        }
        if (path.includes("JWT_SECRET")) {
          console.error("    💡 Generate with: openssl rand -base64 64");
        }
      });
      
      console.error("\n📋 Check .env.template for all required variables");
      process.exit(1);
    }
    throw error;
  }
}

// Get validated environment (singleton)
let cachedEnv: Env | undefined;

export function getEnv(serviceName?: ServiceName): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv(serviceName);
  }
  return cachedEnv;
}

// Export for backwards compatibility
export const env = getEnv();

// Helper to check if running in production
export const isProduction = () => env.NODE_ENV === "production";
export const isDevelopment = () => env.NODE_ENV === "development";
export const isTest = () => env.NODE_ENV === "test";

// Helper to get service URLs
export const getServiceUrl = (service: "financial" | "trading" | "comm" | "ai") => {
  const urls = {
    financial: env.FINANCIAL_SVC_URL,
    trading: env.TRADING_SVC_URL,
    comm: env.COMM_SVC_URL,
    ai: env.AI_CORE_URL,
  };
  return urls[service];
};

// Export schemas for testing
export { EnvSchema, ServiceSchemas };