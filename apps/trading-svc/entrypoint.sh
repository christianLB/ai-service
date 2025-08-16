#!/usr/bin/env sh
set -eu

# ============================================================================
# Trading Service Entrypoint - F5 Enhanced Version
# ============================================================================
# Features:
# - Environment validation with @ai/config
# - Prisma client generation and migrations
# - Health check dependencies (DB, Redis)
# - Trading API configuration validation
# - Graceful error handling with retries
# ============================================================================

SERVICE_NAME="trading-svc"
export SERVICE_NAME

# Configuration
RETRIES=${RETRIES:-60}
SLEEP=${SLEEP:-2}
SCHEMA_PATH="/app/prisma/schema.prisma"

echo "[$SERVICE_NAME] Starting entrypoint..."

# ============================================================================
# Step 1: Environment Validation
# ============================================================================
echo "[$SERVICE_NAME] Validating environment configuration..."
node -e "
const { getEnv } = require('@ai/config');
try {
  const env = getEnv('trading-svc');
  console.log('✅ Environment validation successful');
  console.log('  NODE_ENV:', env.NODE_ENV);
  console.log('  PORT:', env.PORT || 3002);
  console.log('  Binance:', env.BINANCE_API_KEY ? 'Configured' : 'Not configured');
  console.log('  Coinbase:', env.COINBASE_API_KEY ? 'Configured' : 'Not configured');
  console.log('  Alpaca:', env.ALPACA_API_KEY ? 'Configured' : 'Not configured');
  if (!env.BINANCE_API_KEY && !env.COINBASE_API_KEY && !env.ALPACA_API_KEY) {
    console.warn('⚠️  WARNING: No trading APIs configured');
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
# Step 2: Wait for Database
# ============================================================================
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}

echo "[$SERVICE_NAME] Waiting for database at $DB_HOST:$DB_PORT..."
i=0
while [ $i -lt $RETRIES ]; do
  if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "[$SERVICE_NAME] ✅ Database is ready"
    break
  fi
  i=$((i+1))
  echo "[$SERVICE_NAME] Waiting for database (attempt $i/$RETRIES)..."
  sleep "$SLEEP"
done

if [ $i -ge $RETRIES ]; then
  echo "[$SERVICE_NAME] ERROR: Database not ready after $RETRIES attempts" >&2
  exit 1
fi

# ============================================================================
# Step 3: Wait for Redis (Critical for Trading Cache)
# ============================================================================
REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PORT=${REDIS_PORT:-6379}

echo "[$SERVICE_NAME] Waiting for Redis at $REDIS_HOST:$REDIS_PORT..."
i=0
while [ $i -lt $RETRIES ]; do
  if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
    echo "[$SERVICE_NAME] ✅ Redis is ready (critical for market data cache)"
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
# Step 4: Ensure Database Schemas Exist
# ============================================================================
echo "[$SERVICE_NAME] Ensuring database schemas exist (trading, public)..."
printf "CREATE SCHEMA IF NOT EXISTS trading;\nCREATE SCHEMA IF NOT EXISTS public;\n" | \
  npx prisma db execute --stdin --schema "$SCHEMA_PATH" || {
    echo "[$SERVICE_NAME] WARNING: Failed to create schemas, migrations may handle this" >&2
  }

# ============================================================================
# Step 5: Prisma Client Generation
# ============================================================================
echo "[$SERVICE_NAME] Generating Prisma client..."
if ! npx prisma generate --schema "$SCHEMA_PATH"; then
  echo "[$SERVICE_NAME] WARNING: Prisma generate failed once, retrying in ${SLEEP}s..."
  sleep "$SLEEP"
  npx prisma generate --schema "$SCHEMA_PATH" || {
    echo "[$SERVICE_NAME] ERROR: Prisma generate failed" >&2
    exit 1
  }
fi
echo "[$SERVICE_NAME] ✅ Prisma client generated"

# ============================================================================
# Step 6: Apply Database Migrations
# ============================================================================
echo "[$SERVICE_NAME] Applying database migrations..."
i=0
while [ $i -lt $RETRIES ]; do
  if npx prisma migrate deploy --schema "$SCHEMA_PATH" 2>&1 | tee /tmp/migrate.log; then
    echo "[$SERVICE_NAME] ✅ Migrations applied successfully"
    break
  else
    # Check for P3005 error (schema not empty - non-fatal in production)
    if grep -q "P3005" /tmp/migrate.log; then
      echo "[$SERVICE_NAME] Schema not empty (P3005) - continuing without applying migrations"
      break
    fi
    # Check for P3009 error (migrations already applied)
    if grep -q "P3009" /tmp/migrate.log; then
      echo "[$SERVICE_NAME] Migrations already applied (P3009) - continuing"
      break
    fi
  fi
  i=$((i+1))
  echo "[$SERVICE_NAME] Migration failed (attempt $i/$RETRIES), retrying in ${SLEEP}s..."
  sleep "$SLEEP"
done

if [ $i -ge $RETRIES ]; then
  echo "[$SERVICE_NAME] ERROR: Could not apply migrations after $RETRIES attempts" >&2
  exit 1
fi

# ============================================================================
# Step 7: Start Application
# ============================================================================
echo "[$SERVICE_NAME] Starting application on port ${PORT:-3002}..."
echo "[$SERVICE_NAME] Environment: ${NODE_ENV:-development}"
echo "[$SERVICE_NAME] Trading APIs configured: $(node -e "
const env = process.env;
const apis = [];
if (env.BINANCE_API_KEY) apis.push('Binance');
if (env.COINBASE_API_KEY) apis.push('Coinbase');
if (env.ALPACA_API_KEY) apis.push('Alpaca');
console.log(apis.length ? apis.join(', ') : 'None');
")"
echo "[$SERVICE_NAME] ============================================"

# Use exec to replace shell with node process for proper signal handling
exec node dist/index.js