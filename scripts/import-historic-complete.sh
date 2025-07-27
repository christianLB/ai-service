#!/bin/bash
# Complete historical transactions import with all dependencies

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
BLUE='\033[0;34m'
NC='\033[0m'

# Check if export file exists
EXPORT_FILE="$1"
if [ ! -f "$EXPORT_FILE" ]; then
    echo -e "${RED}❌ Usage: $0 <export_file.sql>${NC}"
    exit 1
fi

echo -e "${YELLOW}📤 Uploading export file to NAS...${NC}"
scp "$EXPORT_FILE" "${NAS_HOST}:${NAS_PATH}/historic_import.sql"

echo -e "${YELLOW}🔍 Setting up dependencies in production...${NC}"

# First, get the account info from development
echo -e "${BLUE}Getting account information from development...${NC}"
ACCOUNT_INFO=$(docker exec ai-service-postgres psql -U ai_user -d ai_service -t -c "
SELECT id, name, institution_id, currency_id, account_type, account_number, sort_code, iban, bic, balance, available_balance, is_active
FROM financial.accounts 
WHERE id = '44eef950-e08e-45b8-8315-6bfd41f4c10d';")

if [ -z "$ACCOUNT_INFO" ]; then
    echo -e "${RED}❌ Account not found in development database${NC}"
    exit 1
fi

# Parse account info
IFS='|' read -r ACC_ID ACC_NAME INST_ID CURR_ID ACC_TYPE ACC_NUM SORT_CODE IBAN BIC BALANCE AVAIL_BAL IS_ACTIVE <<< "$ACCOUNT_INFO"

# Clean up whitespace
ACC_NAME=$(echo "$ACC_NAME" | xargs)
INST_ID=$(echo "$INST_ID" | xargs)

echo -e "${BLUE}Found account: $ACC_NAME${NC}"

# Setup dependencies in production
ssh "${NAS_HOST}" "sudo /usr/local/bin/docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME}" << EOF
BEGIN;

-- Ensure EUR currency exists
INSERT INTO financial.currencies (id, code, name, symbol, decimals, created_at, updated_at)
VALUES ('32e61502-edc4-48fe-8473-e54d97eb8198', 'EUR', 'Euro', '€', 2, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Ensure institution exists (if needed)
DO \$\$
BEGIN
    IF '$INST_ID' != '' AND '$INST_ID' IS NOT NULL THEN
        INSERT INTO financial.institutions (id, name, country, bic, created_at, updated_at)
        VALUES ('$INST_ID'::uuid, 'BBVA', 'ES', 'BBVAESMMXXX', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    END IF;
END \$\$;

-- Ensure account exists
INSERT INTO financial.accounts (
    id, name, institution_id, currency_id, account_type, 
    account_number, sort_code, iban, bic, balance, 
    available_balance, is_active, created_at, updated_at
)
VALUES (
    '44eef950-e08e-45b8-8315-6bfd41f4c10d'::uuid,
    '$ACC_NAME',
    NULLIF('$INST_ID', '')::uuid,
    '32e61502-edc4-48fe-8473-e54d97eb8198'::uuid,  -- EUR
    COALESCE(NULLIF('$ACC_TYPE', ''), 'checking'),
    NULLIF('$ACC_NUM', ''),
    NULLIF('$SORT_CODE', ''),
    NULLIF('$IBAN', ''),
    NULLIF('$BIC', ''),
    COALESCE(NULLIF('$BALANCE', '')::decimal, 0),
    COALESCE(NULLIF('$AVAIL_BAL', '')::decimal, 0),
    COALESCE(NULLIF('$IS_ACTIVE', '')::boolean, true),
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
EOF

echo -e "${YELLOW}📥 Importing historical transactions...${NC}"
# Copy the file into the container
ssh "${NAS_HOST}" "sudo /usr/local/bin/docker cp ${NAS_PATH}/historic_import.sql ${CONTAINER_NAME}:/tmp/historic_import.sql"

# Run the import
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

-- Show import summary
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT account_id) as unique_accounts,
    MIN(date) as earliest_date,
    MAX(date) as latest_date,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_credits,
    SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as total_debits
FROM historic_import;

-- Check for duplicates
SELECT COUNT(*) as existing_duplicates 
FROM historic_import h
WHERE EXISTS (
    SELECT 1 FROM financial.transactions t 
    WHERE t.reference = h.reference
);

-- Import non-duplicate transactions
INSERT INTO financial.transactions 
SELECT h.* FROM historic_import h
WHERE NOT EXISTS (
    SELECT 1 FROM financial.transactions t 
    WHERE t.reference = h.reference
);

-- Show results
SELECT 
    COUNT(*) as imported_count,
    SUM(amount) as net_amount
FROM financial.transactions 
WHERE reference LIKE 'HIST_%' 
  AND created_at >= NOW() - INTERVAL '1 minute';

COMMIT;
EOF

# Clean up
ssh "${NAS_HOST}" "sudo /usr/local/bin/docker exec ${CONTAINER_NAME} rm -f /tmp/historic_import.sql"
ssh "${NAS_HOST}" "rm ${NAS_PATH}/historic_import.sql"

echo -e "${GREEN}✅ Import completed successfully!${NC}"

# Show final status
echo -e "${BLUE}📊 Checking imported data in production...${NC}"
ssh "${NAS_HOST}" "sudo /usr/local/bin/docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME}" << 'EOF'
SELECT 
    COUNT(*) as total_historic_transactions,
    MIN(date) as earliest_transaction,
    MAX(date) as latest_transaction,
    SUM(amount) as net_balance
FROM financial.transactions 
WHERE reference LIKE 'HIST_%';
EOF