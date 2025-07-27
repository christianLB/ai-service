#!/bin/bash
# Export historical transactions from development database

# Configuration
DEV_DB="postgresql://ai_user:ultra_secure_password_2025@localhost:5434/ai_service"
OUTPUT_FILE="historic_transactions_export_$(date +%Y%m%d_%H%M%S).sql"

echo "📤 Exporting historical transactions from development..."

# Export only HIST_ prefixed transactions
psql "$DEV_DB" << SQL > "$OUTPUT_FILE"
-- Export historical transactions
COPY (
  SELECT * FROM financial.transactions 
  WHERE reference LIKE 'HIST_%'
  ORDER BY date
) TO STDOUT WITH CSV HEADER;
SQL

echo "✅ Exported to $OUTPUT_FILE"