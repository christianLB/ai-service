#!/bin/bash
# Import historical transactions to production database

# Get production credentials from environment or .env.production
source .env.production 2>/dev/null || true

PROD_HOST="${NAS_HOST:-192.168.1.11}"
PROD_PORT="${PROD_DB_PORT:-5433}"
PROD_DB="${POSTGRES_DB:-ai_service}"
PROD_USER="${POSTGRES_USER:-ai_user}"
PROD_PASSWORD="${POSTGRES_PASSWORD}"

if [ -z "$PROD_PASSWORD" ]; then
    echo "❌ POSTGRES_PASSWORD not set. Source .env.production first"
    exit 1
fi

# Import file should be provided as argument
IMPORT_FILE="$1"
if [ ! -f "$IMPORT_FILE" ]; then
    echo "❌ Usage: $0 <import_file.sql>"
    exit 1
fi

echo "📥 Importing to production database..."
echo "   Host: $PROD_HOST:$PROD_PORT"
echo "   Database: $PROD_DB"

# Import with transaction for safety
PGPASSWORD="$PROD_PASSWORD" psql -h "$PROD_HOST" -p "$PROD_PORT" -U "$PROD_USER" -d "$PROD_DB" << EOF
BEGIN;

-- Create temporary table for import
CREATE TEMP TABLE historic_import AS 
SELECT * FROM financial.transactions WHERE false;

-- Import data
\COPY historic_import FROM '$IMPORT_FILE' WITH CSV HEADER;

-- Insert only non-duplicate transactions
INSERT INTO financial.transactions 
SELECT * FROM historic_import h
WHERE NOT EXISTS (
    SELECT 1 FROM financial.transactions t 
    WHERE t.reference = h.reference
);

-- Show results
SELECT COUNT(*) as imported_count FROM historic_import;

COMMIT;
EOF

echo "✅ Import completed"