#!/usr/bin/env sh
set -eu

# Default schema path inside image
SCHEMA_PATH="/app/prisma/schema.prisma"
RETRIES=${RETRIES:-60}
SLEEP=${SLEEP:-2}

echo "[worker-financial] entrypoint: checking for Prisma schema"

# Only run Prisma operations if schema.prisma exists (future-proofing)
if [ -f "$SCHEMA_PATH" ]; then
  echo "[worker-financial] Prisma schema found, generating client and applying migrations"
  
  # Ensure required Postgres schemas exist
  echo "[worker-financial] ensuring database schemas exist (financial, public, tagging, trading)"
  printf "CREATE SCHEMA IF NOT EXISTS financial;\nCREATE SCHEMA IF NOT EXISTS public;\nCREATE SCHEMA IF NOT EXISTS tagging;\nCREATE SCHEMA IF NOT EXISTS trading;\n" | npx prisma db execute --stdin --schema "$SCHEMA_PATH" || {
    echo "[worker-financial] WARNING: prisma db execute failed to ensure schemas; continuing" >&2
  }
  
  # Generate Prisma client
  if ! npx prisma generate --schema "$SCHEMA_PATH"; then
    echo "[worker-financial] WARNING: prisma generate failed once, retrying in ${SLEEP}s..."
    sleep "$SLEEP"
    npx prisma generate --schema "$SCHEMA_PATH" || {
      echo "[worker-financial] ERROR: prisma generate failed" >&2
      exit 1
    }
  fi
  
  # Apply migrations with retries
  i=0
  while [ $i -lt $RETRIES ]; do
    if npx prisma migrate deploy --schema "$SCHEMA_PATH"; then
      echo "[worker-financial] migrations applied"
      break
    fi
    i=$((i+1))
    echo "[worker-financial] migrate deploy failed (attempt $i/$RETRIES), retrying in ${SLEEP}s..."
    sleep "$SLEEP"
  done
  
  if [ $i -ge $RETRIES ]; then
    echo "[worker-financial] ERROR: could not apply migrations after $RETRIES attempts" >&2
    exit 1
  fi
else
  echo "[worker-financial] No Prisma schema found, starting without database setup"
fi

# Start service
exec node dist/index.js