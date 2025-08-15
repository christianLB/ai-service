#!/usr/bin/env sh
set -eu

# Derive DB settings
# Prefer DATABASE_URL if provided; otherwise fall back to compose defaults
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_NAME=${DB_NAME:-ai_service}

if [ -n "${DATABASE_URL:-}" ]; then
  # Basic parser for postgresql://user:pass@host:port/dbname
  proto_removed=${DATABASE_URL#postgresql://}
  creds_host=${proto_removed%@*}
  host_db=${proto_removed#*@}
  DB_USER=${DB_USER:-${creds_host%%:*}}
  DB_PASSWORD=${DB_PASSWORD:-${creds_host#*:}}
  host_port=${host_db%%/*}
  DB_NAME=${DB_NAME:-${host_db#*/}}
  DB_HOST=${DB_HOST:-${host_port%%:*}}
  DB_PORT=${DB_PORT:-${host_port#*:}}
fi

# Wait for database to be ready
echo "[api-gateway] Waiting for database to be ready... ($DB_USER@$DB_HOST:$DB_PORT/$DB_NAME)"
RETRIES=${RETRIES:-60}
SLEEP=${SLEEP:-2}

i=0
while [ $i -lt $RETRIES ]; do
  if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "[api-gateway] Database is ready"
    break
  fi
  i=$((i+1))
  echo "[api-gateway] Waiting for database (attempt $i/$RETRIES)..."
  sleep "$SLEEP"
done

if [ $i -ge $RETRIES ]; then
  echo "[api-gateway] ERROR: Database not ready after $RETRIES attempts" >&2
  exit 1
fi

# Ensure required schemas exist
echo "[api-gateway] Ensuring database schemas exist..."
export PGPASSWORD="$DB_PASSWORD"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF 2>/dev/null || true
CREATE SCHEMA IF NOT EXISTS financial;
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS tagging;
CREATE SCHEMA IF NOT EXISTS trading;
EOF

# Run node-pg-migrate migrations if configured
if [ -f ".pgmrc" ] && [ -d "migrations/pgm" ]; then
  echo "[api-gateway] Running node-pg-migrate migrations..."
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
    npx node-pg-migrate up --migrations-dir migrations/pgm || {
    echo "[api-gateway] WARNING: Migrations failed, continuing anyway" >&2
  }
fi

echo "[api-gateway] Starting application..."
exec node dist/index.js
