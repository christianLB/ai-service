#!/usr/bin/env sh
set -eu

# default schema path inside image
SCHEMA_PATH="/app/prisma/schema.prisma"
RETRIES=${RETRIES:-60}
SLEEP=${SLEEP:-2}

echo "[financial-svc] entrypoint: applying Prisma migrations before start"

# Try to apply migrations until it succeeds or retries exhausted
i=0
while [ $i -lt $RETRIES ]; do
  if npx prisma migrate deploy --schema "$SCHEMA_PATH"; then
    echo "[financial-svc] migrations applied"
    break
  fi
  i=$((i+1))
  echo "[financial-svc] migrate deploy failed (attempt $i/$RETRIES), retrying in ${SLEEP}s..."
  sleep "$SLEEP"
done

if [ $i -ge $RETRIES ]; then
  echo "[financial-svc] ERROR: could not apply migrations after $RETRIES attempts" >&2
  exit 1
fi

# Start service
exec node dist/index.js
