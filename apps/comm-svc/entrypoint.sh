#!/usr/bin/env sh
set -eu

# ============================================================================
# Communication Service Entrypoint - F5 Enhanced Version
# ============================================================================
# Features:
# - Environment validation with @ai/config
# - Health check dependencies (Redis only)
# - Telegram/SMTP configuration validation
# - Graceful error handling with retries
# ============================================================================

SERVICE_NAME="comm-svc"
export SERVICE_NAME

# Configuration
RETRIES=${RETRIES:-60}
SLEEP=${SLEEP:-2}

echo "[$SERVICE_NAME] Starting entrypoint..."

# ============================================================================
# Step 1: Environment Validation
# ============================================================================
echo "[$SERVICE_NAME] Validating environment configuration..."
node -e "
const { getEnv } = require('@ai/config');
try {
  const env = getEnv('comm-svc');
  console.log('✅ Environment validation successful');
  console.log('  NODE_ENV:', env.NODE_ENV);
  console.log('  PORT:', env.PORT || 3003);
  console.log('  Telegram:', env.TELEGRAM_BOT_TOKEN ? 'Configured' : 'Not configured');
  console.log('  SMTP:', env.SMTP_HOST ? 'Configured' : 'Not configured');
  console.log('  Alerts Enabled:', env.TELEGRAM_ALERTS_ENABLED || false);
  if (!env.TELEGRAM_BOT_TOKEN && !env.SMTP_HOST) {
    console.warn('⚠️  WARNING: No communication channels configured');
  }
} catch (error) {
  console.error('❌ Environment validation failed');
  process.exit(1);
}
" || {
  echo "[$SERVICE_NAME] ERROR: Environment validation failed" >&2
  echo "[$SERVICE_NAME] Check .env.template for required variables" >&2
  exit 1
}

# ============================================================================
# Step 2: Wait for Redis
# ============================================================================
REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PORT=${REDIS_PORT:-6379}

echo "[$SERVICE_NAME] Waiting for Redis at $REDIS_HOST:$REDIS_PORT..."
i=0
while [ $i -lt $RETRIES ]; do
  if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
    echo "[$SERVICE_NAME] ✅ Redis is ready"
    break
  fi
  i=$((i+1))
  echo "[$SERVICE_NAME] Waiting for Redis (attempt $i/$RETRIES)..."
  sleep "$SLEEP"
done

if [ $i -ge $RETRIES ]; then
  echo "[$SERVICE_NAME] ERROR: Redis not ready after $RETRIES attempts" >&2
  exit 1
fi

# ============================================================================
# Step 3: Start Application
# ============================================================================
echo "[$SERVICE_NAME] Starting application on port ${PORT:-3003}..."
echo "[$SERVICE_NAME] Environment: ${NODE_ENV:-development}"
echo "[$SERVICE_NAME] Telegram: ${TELEGRAM_BOT_TOKEN:+Configured}"
echo "[$SERVICE_NAME] SMTP: ${SMTP_HOST:+Configured}"
echo "[$SERVICE_NAME] ============================================"

# Use exec to replace shell with node process for proper signal handling
exec node dist/index.js