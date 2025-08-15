#!/usr/bin/env sh
set -eu

# default schema path inside image
SCHEMA_PATH="/app/prisma/schema.prisma"
RETRIES=${RETRIES:-60}
SLEEP=${SLEEP:-2}

echo "[financial-svc] entrypoint: generating Prisma client and applying migrations before start"

# Ensure required Postgres schemas exist before applying Prisma migrations
# Prisma multiSchema does not auto-create DB schemas; create them idempotently.
echo "[financial-svc] ensuring database schemas exist (financial, public, tagging, trading)"
printf "CREATE SCHEMA IF NOT EXISTS financial;\nCREATE SCHEMA IF NOT EXISTS public;\nCREATE SCHEMA IF NOT EXISTS tagging;\nCREATE SCHEMA IF NOT EXISTS trading;\n" | npx prisma db execute --stdin --schema "$SCHEMA_PATH" || {
  echo "[financial-svc] WARNING: prisma db execute failed to ensure schemas; continuing (migrate may create as needed)" >&2
}

# Generate Prisma client (idempotent). This ensures node_modules/.prisma/client exists in runtime image
if ! npx prisma generate --schema "$SCHEMA_PATH"; then
  echo "[financial-svc] WARNING: prisma generate failed once, retrying in ${SLEEP}s..."
  sleep "$SLEEP"
  npx prisma generate --schema "$SCHEMA_PATH" || {
    echo "[financial-svc] ERROR: prisma generate failed" >&2
    exit 1
  }
fi

# Try to apply migrations until it succeeds or retries exhausted
i=0
while [ $i -lt $RETRIES ]; do
  if npx prisma migrate deploy --schema "$SCHEMA_PATH"; then
    echo "[financial-svc] migrations applied"
    break
  else
    # Detect P3005 (schema is not empty). This should be non-fatal in environments where DB is pre-seeded/baselined.
    if npx prisma migrate deploy --schema "$SCHEMA_PATH" 2>&1 | grep -q "P3005"; then
      echo "[financial-svc] migrate deploy returned P3005 (schema not empty) — continuing without applying migrations"
      break
    fi
  fi
  i=$((i+1))
  echo "[financial-svc] migrate deploy failed (attempt $i/$RETRIES), retrying in ${SLEEP}s..."
  sleep "$SLEEP"
done

if [ $i -ge $RETRIES ]; then
  echo "[financial-svc] ERROR: could not apply migrations after $RETRIES attempts (non-P3005)" >&2
  exit 1
fi

# Start service
exec node dist/index.js
