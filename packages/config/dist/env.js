"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceSchemas = exports.EnvSchema = exports.getServiceUrl = exports.isTest = exports.isDevelopment = exports.isProduction = exports.env = void 0;
exports.getEnv = getEnv;
const zod_1 = require("zod");
/**
 * Comprehensive environment validation schema for AI Service
 * All services must pass validation before starting
 */
// Helper for optional in dev, required in prod
const requiredInProd = (schema) => schema.optional().refine((val) => process.env.NODE_ENV !== "production" || !!val, "Required in production environment");
// Enhanced environment validation schema
const EnvSchema = zod_1.z.object({
    // ===== Core Configuration =====
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    SERVICE_NAME: zod_1.z.string().optional(),
    SERVICE_VERSION: zod_1.z.string().default("1.0.0"),
    LOG_LEVEL: zod_1.z.enum(["error", "warn", "info", "debug", "trace"]).default("info"),
    // ===== Database Configuration =====
    DATABASE_URL: zod_1.z.string()
        .url()
        .or(zod_1.z.string().startsWith("postgres"))
        .or(zod_1.z.string().startsWith("postgresql"))
        .describe("PostgreSQL connection URL"),
    // Legacy DB variables (for compatibility)
    DB_HOST: zod_1.z.string().default("localhost"),
    DB_PORT: zod_1.z.coerce.number().int().positive().default(5432),
    DB_NAME: zod_1.z.string().default("ai_service"),
    DB_USER: zod_1.z.string().default("postgres"),
    DB_PASSWORD: zod_1.z.string().optional(),
    // Connection pool settings
    DB_POOL_MIN: zod_1.z.coerce.number().int().positive().default(2),
    DB_POOL_MAX: zod_1.z.coerce.number().int().positive().default(10),
    // ===== Redis Configuration =====
    REDIS_URL: zod_1.z.string()
        .url()
        .or(zod_1.z.string().startsWith("redis"))
        .describe("Redis connection URL"),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    REDIS_DB: zod_1.z.coerce.number().int().min(0).max(15).default(0),
    REDIS_KEY_PREFIX: zod_1.z.string().default("ai-service:"),
    // ===== Security Configuration =====
    JWT_SECRET: zod_1.z.string()
        .min(32)
        .refine((val) => process.env.NODE_ENV !== "production" || val.length >= 64, "JWT_SECRET must be at least 64 characters in production"),
    JWT_ALGORITHM: zod_1.z.enum(["HS256", "HS384", "HS512", "RS256"]).default("HS256"),
    JWT_EXPIRY: zod_1.z.string().default("24h"),
    JWT_REFRESH_EXPIRY: zod_1.z.string().default("7d"),
    ENCRYPTION_KEY: requiredInProd(zod_1.z.string().min(32)),
    HASH_SALT_ROUNDS: zod_1.z.coerce.number().int().min(10).max(20).default(12),
    // ===== API Keys (Service-Specific) =====
    OPENAI_API_KEY: zod_1.z.string().optional(),
    ANTHROPIC_API_KEY: zod_1.z.string().optional(),
    GOCARDLESS_ACCESS_TOKEN: zod_1.z.string().optional(),
    GOCARDLESS_ENVIRONMENT: zod_1.z.enum(["sandbox", "live"]).default("sandbox"),
    // Telegram Configuration
    TELEGRAM_BOT_TOKEN: zod_1.z.string().optional(),
    TELEGRAM_WEBHOOK_URL: zod_1.z.string().url().optional(),
    TELEGRAM_CHAT_ID: zod_1.z.string().optional(),
    TELEGRAM_ADMIN_CHAT_IDS: zod_1.z.string().optional(),
    TELEGRAM_ALERTS_ENABLED: zod_1.z.coerce.boolean().default(false),
    // Trading APIs
    BINANCE_API_KEY: zod_1.z.string().optional(),
    BINANCE_API_SECRET: zod_1.z.string().optional(),
    COINBASE_API_KEY: zod_1.z.string().optional(),
    COINBASE_API_SECRET: zod_1.z.string().optional(),
    ALPACA_API_KEY: zod_1.z.string().optional(),
    ALPACA_API_SECRET: zod_1.z.string().optional(),
    // ===== Service Discovery (API Gateway) =====
    FINANCIAL_SVC_URL: zod_1.z.string().url().default("http://financial-svc:3001"),
    TRADING_SVC_URL: zod_1.z.string().url().default("http://trading-svc:3002"),
    COMM_SVC_URL: zod_1.z.string().url().default("http://comm-svc:3003"),
    AI_CORE_URL: zod_1.z.string().url().default("http://ai-core:3004"),
    WORKER_FINANCIAL_URL: zod_1.z.string().url().default("http://worker-financial:3101"),
    WORKER_TRADING_URL: zod_1.z.string().url().default("http://worker-trading:3102"),
    // ===== CORS Configuration =====
    CORS_ORIGINS: zod_1.z.string()
        .transform((str) => str.split(",").map(s => s.trim()))
        .default("http://localhost:3000"),
    CORS_CREDENTIALS: zod_1.z.coerce.boolean().default(true),
    // ===== Rate Limiting =====
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().positive().default(900000), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.coerce.number().positive().default(100),
    RATE_LIMIT_SKIP_SUCCESSFUL: zod_1.z.coerce.boolean().default(false),
    // ===== Queue Configuration (BullMQ) =====
    QUEUE_PREFIX: zod_1.z.string().default("ai-service"),
    QUEUE_DEFAULT_REMOVE_ON_COMPLETE: zod_1.z.coerce.boolean().default(true),
    QUEUE_DEFAULT_REMOVE_ON_FAIL: zod_1.z.coerce.boolean().default(false),
    // ===== Monitoring & Observability =====
    METRICS_ENABLED: zod_1.z.coerce.boolean().default(true),
    METRICS_PORT: zod_1.z.coerce.number().int().positive().optional(),
    TRACING_ENABLED: zod_1.z.coerce.boolean().default(false),
    TRACING_SERVICE_NAME: zod_1.z.string().optional(),
    // ===== Feature Flags =====
    FEATURE_TRADING_ENABLED: zod_1.z.coerce.boolean().default(true),
    FEATURE_AI_ENABLED: zod_1.z.coerce.boolean().default(true),
    FEATURE_NOTIFICATIONS_ENABLED: zod_1.z.coerce.boolean().default(true),
    FEATURE_DOCUMENT_PROCESSING_ENABLED: zod_1.z.coerce.boolean().default(true),
    // ===== External Services =====
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().int().positive().default(587),
    SMTP_SECURE: zod_1.z.coerce.boolean().default(false),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASSWORD: zod_1.z.string().optional(),
    SMTP_FROM: zod_1.z.string().email().optional(),
    // Storage
    STORAGE_TYPE: zod_1.z.enum(["local", "s3", "gcs"]).default("local"),
    STORAGE_PATH: zod_1.z.string().default("./storage"),
    S3_BUCKET: zod_1.z.string().optional(),
    S3_REGION: zod_1.z.string().default("us-east-1"),
    S3_ACCESS_KEY: zod_1.z.string().optional(),
    S3_SECRET_KEY: zod_1.z.string().optional(),
    // ===== Infrastructure =====
    DOCKER_ENV: zod_1.z.coerce.boolean().default(false),
    HEALTH_CHECK_TIMEOUT: zod_1.z.coerce.number().int().positive().default(5000),
    SHUTDOWN_TIMEOUT: zod_1.z.coerce.number().int().positive().default(10000),
    // ===== Development Tools =====
    DEBUG: zod_1.z.string().optional(),
    FORCE_COLOR: zod_1.z.coerce.number().int().min(0).max(3).optional(),
});
exports.EnvSchema = EnvSchema;
// Service-specific validation schemas
const ServiceSchemas = {
    "api-gateway": EnvSchema.extend({
        SERVICE_NAME: zod_1.z.literal("api-gateway"),
        FINANCIAL_SVC_URL: zod_1.z.string().url(),
        TRADING_SVC_URL: zod_1.z.string().url(),
        COMM_SVC_URL: zod_1.z.string().url(),
        AI_CORE_URL: zod_1.z.string().url(),
    }),
    "financial-svc": EnvSchema.extend({
        SERVICE_NAME: zod_1.z.literal("financial-svc"),
        GOCARDLESS_ACCESS_TOKEN: requiredInProd(zod_1.z.string()),
        GOCARDLESS_ENVIRONMENT: zod_1.z.enum(["sandbox", "live"]),
    }),
    "trading-svc": EnvSchema.extend({
        SERVICE_NAME: zod_1.z.literal("trading-svc"),
        BINANCE_API_KEY: zod_1.z.string().optional(),
        BINANCE_API_SECRET: zod_1.z.string().optional(),
    }),
    "comm-svc": EnvSchema.extend({
        SERVICE_NAME: zod_1.z.literal("comm-svc"),
        TELEGRAM_BOT_TOKEN: zod_1.z.string().optional(),
        SMTP_HOST: zod_1.z.string().optional(),
    }),
    "ai-core": EnvSchema.extend({
        SERVICE_NAME: zod_1.z.literal("ai-core"),
        OPENAI_API_KEY: requiredInProd(zod_1.z.string()),
        ANTHROPIC_API_KEY: zod_1.z.string().optional(),
    }),
    "worker-financial": EnvSchema.extend({
        SERVICE_NAME: zod_1.z.literal("worker-financial"),
        QUEUE_PREFIX: zod_1.z.string(),
    }),
    "worker-trading": EnvSchema.extend({
        SERVICE_NAME: zod_1.z.literal("worker-trading"),
        QUEUE_PREFIX: zod_1.z.string(),
    }),
};
exports.ServiceSchemas = ServiceSchemas;
// Validation function with detailed error reporting
function validateEnv(serviceName) {
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
let cachedEnv;
function getEnv(serviceName) {
    if (!cachedEnv) {
        cachedEnv = validateEnv(serviceName);
    }
    return cachedEnv;
}
// Export for backwards compatibility
exports.env = getEnv();
// Helper to check if running in production
const isProduction = () => exports.env.NODE_ENV === "production";
exports.isProduction = isProduction;
const isDevelopment = () => exports.env.NODE_ENV === "development";
exports.isDevelopment = isDevelopment;
const isTest = () => exports.env.NODE_ENV === "test";
exports.isTest = isTest;
// Helper to get service URLs
const getServiceUrl = (service) => {
    const urls = {
        financial: exports.env.FINANCIAL_SVC_URL,
        trading: exports.env.TRADING_SVC_URL,
        comm: exports.env.COMM_SVC_URL,
        ai: exports.env.AI_CORE_URL,
    };
    return urls[service];
};
exports.getServiceUrl = getServiceUrl;
