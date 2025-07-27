#!/bin/bash
# Import historical transactions to production via SSH

# Configuration
NAS_HOST=${NAS_HOST:-nas}  # Use SSH config alias
NAS_PATH=${NAS_PATH:-/volume1/docker/ai-service}
CONTAINER_NAME=${CONTAINER_NAME:-ai-postgres}
DB_NAME=${DB_NAME:-ai_service}
DB_USER=${DB_USER:-ai_user}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if export file exists
EXPORT_FILE="$1"
if [ ! -f "$EXPORT_FILE" ]; then
    echo -e "${RED}❌ Usage: $0 <export_file.sql>${NC}"
    exit 1
fi

echo -e "${YELLOW}📤 Uploading export file to NAS...${NC}"
scp "$EXPORT_FILE" "${NAS_HOST}:${NAS_PATH}/historic_import.sql"

echo -e "${YELLOW}📥 Importing to production database...${NC}"
# First copy the file into the container
ssh "${NAS_HOST}" "sudo /usr/local/bin/docker cp ${NAS_PATH}/historic_import.sql ${CONTAINER_NAME}:/tmp/historic_import.sql"

# Then run the import
ssh "${NAS_HOST}" "sudo /usr/local/bin/docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME}" << 'EOF'
BEGIN;

-- Create temporary table for import
CREATE TEMP TABLE historic_import (
    id UUID,
    transaction_id VARCHAR,
    account_id UUID,
    amount DECIMAL,
    currency_id UUID,
    type VARCHAR,
    status VARCHAR,
    description TEXT,
    reference VARCHAR,
    counterparty_name VARCHAR,
    date TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    metadata JSONB,
    tags TEXT[],
    fee_amount DECIMAL,
    fee_currency_id UUID,
    gocardless_data JSONB,
    transaction_hash VARCHAR,
    block_number BIGINT,
    gas_used DECIMAL,
    gas_price DECIMAL,
    from_address VARCHAR,
    to_address VARCHAR,
    counterparty_account VARCHAR
);

-- Import data
\COPY historic_import FROM '/tmp/historic_import.sql' WITH CSV HEADER;

-- Insert only non-duplicate transactions
INSERT INTO financial.transactions 
SELECT * FROM historic_import h
WHERE NOT EXISTS (
    SELECT 1 FROM financial.transactions t 
    WHERE t.reference = h.reference
);

-- Show results
SELECT COUNT(*) as imported_count FROM historic_import;
SELECT COUNT(*) as duplicates FROM historic_import h
WHERE EXISTS (
    SELECT 1 FROM financial.transactions t 
    WHERE t.reference = h.reference
);

COMMIT;
EOF

# Clean up inside container
ssh "${NAS_HOST}" "sudo /usr/local/bin/docker exec ${CONTAINER_NAME} rm /tmp/historic_import.sql"

echo -e "${GREEN}✅ Import completed${NC}"

# Clean up
ssh "${NAS_HOST}" "rm ${NAS_PATH}/historic_import.sql"