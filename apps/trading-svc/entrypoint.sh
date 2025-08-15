#!/usr/bin/env sh
set -eu

# Default schema path inside image
SCHEMA_PATH="/app/prisma/schema.prisma"
RETRIES=${RETRIES:-60}
SLEEP=${SLEEP:-2}

echo "[trading-svc] entrypoint: checking for Prisma schema and migrations"

# Only run Prisma operations if schema.prisma exists
if [ -f "$SCHEMA_PATH" ]; then
  echo "[trading-svc] Prisma schema found, generating client and applying migrations"
  
  # Ensure required Postgres schemas exist before applying Prisma migrations
  echo "[trading-svc] ensuring database schemas exist (financial, public, tagging, trading)"
  printf "CREATE SCHEMA IF NOT EXISTS financial;\nCREATE SCHEMA IF NOT EXISTS public;\nCREATE SCHEMA IF NOT EXISTS tagging;\nCREATE SCHEMA IF NOT EXISTS trading;\n" | npx prisma db execute --stdin --schema "$SCHEMA_PATH" || {
    echo "[trading-svc] WARNING: prisma db execute failed to ensure schemas; continuing (migrate may create as needed)" >&2
  }
  
  # Generate Prisma client (idempotent)
  if ! npx prisma generate --schema "$SCHEMA_PATH"; then
    echo "[trading-svc] WARNING: prisma generate failed once, retrying in ${SLEEP}s..."
    sleep "$SLEEP"
    npx prisma generate --schema "$SCHEMA_PATH" || {
      echo "[trading-svc] ERROR: prisma generate failed" >&2
      exit 1
    }
  fi
  
  # Try to apply migrations until it succeeds or retries exhausted
  i=0
  while [ $i -lt $RETRIES ]; do
    if npx prisma migrate deploy --schema "$SCHEMA_PATH"; then
      echo "[trading-svc] migrations applied"
      break
    fi
    i=$((i+1))
    echo "[trading-svc] migrate deploy failed (attempt $i/$RETRIES), retrying in ${SLEEP}s..."
    sleep "$SLEEP"
  done
  
  if [ $i -ge $RETRIES ]; then
    echo "[trading-svc] ERROR: could not apply migrations after $RETRIES attempts" >&2
    exit 1
  fi
else
  echo "[trading-svc] No Prisma schema found, skipping Prisma operations"
  
  # For now, ensure trading schema exists for raw SQL operations
  echo "[trading-svc] ensuring trading schema exists for raw SQL operations"
  # Wait for database to be ready
  i=0
  while [ $i -lt $RETRIES ]; do
    if echo "SELECT 1" | psql "$DATABASE_URL" > /dev/null 2>&1; then
      echo "CREATE SCHEMA IF NOT EXISTS trading;" | psql "$DATABASE_URL" || true
      echo "[trading-svc] trading schema ensured"
      break
    fi
    i=$((i+1))
    echo "[trading-svc] waiting for database (attempt $i/$RETRIES)..."
    sleep "$SLEEP"
  done
fi

# Start service
exec node dist/index.js