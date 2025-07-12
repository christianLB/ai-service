export const config = {
  // Database
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'ai_service',
    user: process.env.POSTGRES_USER || 'ai_user',
    password: process.env.POSTGRES_PASSWORD || ''
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
  },
  
  // Security
  security: {
    allowRegistration: process.env.ALLOW_REGISTRATION === 'true',
    authBypass: process.env.NODE_ENV === 'development' && process.env.AUTH_BYPASS === 'true',
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },
  
  // Other existing config...
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    alertsEnabled: process.env.TELEGRAM_ALERTS_ENABLED === 'true'
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  }
};