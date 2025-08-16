#!/usr/bin/env sh
set -eu

# ============================================================================
# API Gateway Entrypoint - F5 Enhanced Version
# ============================================================================
# Features:
# - Environment validation with @ai/config
# - Prisma client generation and migrations
# - Health check dependencies (DB, Redis)
# - Graceful error handling with retries
# ============================================================================

SERVICE_NAME="api-gateway"
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
  const env = getEnv('api-gateway');
  console.log('✅ Environment validation successful');
  console.log('  NODE_ENV:', env.NODE_ENV);
  console.log('  PORT:', env.PORT);
  console.log('  JWT configured:', env.JWT_SECRET ? 'Yes' : 'No');
  console.log('  Service URLs configured');
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
# Step 3: Wait for Redis
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
# Step 4: Wait for Backend Services
# ============================================================================
echo "[$SERVICE_NAME] Waiting for backend services..."

# Financial Service
FINANCIAL_HOST="financial-svc"
FINANCIAL_PORT=3001
i=0
while [ $i -lt 30 ]; do
  if nc -z "$FINANCIAL_HOST" "$FINANCIAL_PORT" 2>/dev/null; then
    echo "[$SERVICE_NAME] ✅ Financial service is ready"
    break
  fi
  i=$((i+1))
  echo "[$SERVICE_NAME] Waiting for financial service (attempt $i/30)..."
  sleep 2
done

# Trading Service
TRADING_HOST="trading-svc"
TRADING_PORT=3002
i=0
while [ $i -lt 30 ]; do
  if nc -z "$TRADING_HOST" "$TRADING_PORT" 2>/dev/null; then
    echo "[$SERVICE_NAME] ✅ Trading service is ready"
    break
  fi
  i=$((i+1))
  echo "[$SERVICE_NAME] Waiting for trading service (attempt $i/30)..."
  sleep 2
done

# ============================================================================
# Step 5: Ensure Database Schemas Exist
# ============================================================================
echo "[$SERVICE_NAME] Ensuring database schemas exist (public, financial, trading, tagging)..."
printf "CREATE SCHEMA IF NOT EXISTS public;\nCREATE SCHEMA IF NOT EXISTS financial;\nCREATE SCHEMA IF NOT EXISTS trading;\nCREATE SCHEMA IF NOT EXISTS tagging;\n" | \
  npx prisma db execute --stdin --schema "$SCHEMA_PATH" || {
    echo "[$SERVICE_NAME] WARNING: Failed to create schemas, migrations may handle this" >&2
  }

# ============================================================================
# Step 6: Prisma Client Generation
# ============================================================================
if [ -f "$SCHEMA_PATH" ]; then
  echo "[$SERVICE_NAME] Generating Prisma client..."
  npx prisma generate --schema "$SCHEMA_PATH" || {
    echo "[$SERVICE_NAME] WARNING: Prisma generate failed, retrying..." >&2
    sleep "$SLEEP"
    npx prisma generate --schema "$SCHEMA_PATH" || {
      echo "[$SERVICE_NAME] ERROR: Prisma generate failed" >&2
      exit 1
    }
  }
  echo "[$SERVICE_NAME] ✅ Prisma client generated"
fi

# ============================================================================
# Step 7: Apply Database Migrations
# ============================================================================
if [ -f "$SCHEMA_PATH" ]; then
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
fi

# ============================================================================
# Step 8: Start Application
# ============================================================================
echo "[$SERVICE_NAME] Starting application on port ${PORT:-3000}..."
echo "[$SERVICE_NAME] Environment: ${NODE_ENV:-development}"
echo "[$SERVICE_NAME] ============================================"

# Use exec to replace shell with node process for proper signal handling
exec node dist/index.js