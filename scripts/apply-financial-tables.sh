#!/bin/bash
# Script to apply financial tables to a running PostgreSQL instance
# Can be used in both development and production environments

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="ai_user"
DB_NAME="ai_service_db"
SQL_FILE="../config/init-financial-tables.sql"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -p|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -U|--user)
            DB_USER="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -f|--file)
            SQL_FILE="$2"
            shift 2
            ;;
        --docker)
            USE_DOCKER="true"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -h, --host       Database host (default: localhost)"
            echo "  -p, --port       Database port (default: 5432)"
            echo "  -U, --user       Database user (default: ai_user)"
            echo "  -d, --database   Database name (default: ai_service_db)"
            echo "  -f, --file       SQL file path (default: ../config/init-financial-tables.sql)"
            echo "  --docker         Apply to Docker container (ai-postgres)"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Resolve SQL file path
if [[ ! "$SQL_FILE" = /* ]]; then
    SQL_FILE="$SCRIPT_DIR/$SQL_FILE"
fi

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}Error: SQL file not found: $SQL_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Applying financial tables...${NC}"
echo "Database: $DB_NAME@$DB_HOST:$DB_PORT"
echo "SQL File: $SQL_FILE"

# Function to check if tables exist
check_tables() {
    local query="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'financial' AND table_name IN ('account_insights', 'transactions', 'accounts', 'currencies');"
    
    if [ "$USE_DOCKER" = "true" ]; then
        result=$(docker exec -i ai-postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "$query" 2>/dev/null | tr -d ' ')
    else
        result=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$query" 2>/dev/null | tr -d ' ')
    fi
    
    echo "$result"
}

# Function to apply SQL file
apply_sql() {
    if [ "$USE_DOCKER" = "true" ]; then
        # Copy file to container and execute
        docker cp "$SQL_FILE" ai-postgres:/tmp/init-financial-tables.sql
        docker exec -i ai-postgres psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/init-financial-tables.sql
        result=$?
        docker exec ai-postgres rm /tmp/init-financial-tables.sql
    else
        # Apply directly using psql
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"
        result=$?
    fi
    
    return $result
}

# Check current state
echo -e "${YELLOW}Checking current database state...${NC}"
table_count=$(check_tables)

if [ -z "$table_count" ] || [ "$table_count" = "" ]; then
    echo -e "${RED}Error: Could not connect to database${NC}"
    echo "Please ensure:"
    echo "1. PostgreSQL is running"
    echo "2. Credentials are correct"
    echo "3. If using Docker, container 'ai-postgres' is running"
    exit 1
fi

echo "Found $table_count financial tables"

# Apply SQL file
echo -e "${YELLOW}Applying SQL script...${NC}"
if apply_sql; then
    echo -e "${GREEN}✓ SQL script applied successfully${NC}"
    
    # Verify tables were created
    new_table_count=$(check_tables)
    echo -e "${GREEN}✓ Now have $new_table_count financial tables${NC}"
    
    # Update account insights
    echo -e "${YELLOW}Updating account insights...${NC}"
    if [ "$USE_DOCKER" = "true" ]; then
        docker exec -i ai-postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT financial.update_account_insights();"
    else
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT financial.update_account_insights();"
    fi
    
    echo -e "${GREEN}✓ Financial tables setup complete!${NC}"
else
    echo -e "${RED}✗ Failed to apply SQL script${NC}"
    exit 1
fi