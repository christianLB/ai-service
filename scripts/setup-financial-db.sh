#!/bin/bash

# Setup Financial Database - Initialize PostgreSQL schema for GoCardless integration
# This script creates the financial schema and initializes the database

set -euo pipefail

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🏦 Setting up Financial Database...${NC}"

# Environment detection
ENV_TYPE=${ENV:-development}
echo -e "${YELLOW}Environment: ${ENV_TYPE}${NC}"

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL client (psql) not found. Please install PostgreSQL.${NC}"
    exit 1
fi

# Load environment securely using secure-env-manager
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/secure-env-manager.sh" ]]; then
    echo -e "${YELLOW}🔐 Loading secure environment for ${ENV_TYPE}...${NC}"
    source "${SCRIPT_DIR}/secure-env-manager.sh"
    load_secure_env "$ENV_TYPE" || {
        echo -e "${RED}❌ Failed to load secure environment${NC}"
        echo -e "${YELLOW}💡 Run: ./scripts/secure-env-manager.sh init ${ENV_TYPE}${NC}"
        exit 1
    }
else
    echo -e "${YELLOW}⚠️ Using fallback environment variables${NC}"
    # Fallback to basic environment variables
    DB_HOST=${POSTGRES_HOST:-localhost}
    DB_PORT=${POSTGRES_PORT:-5432}
    DB_NAME=${POSTGRES_DB:-ai_service}
    DB_USER=${POSTGRES_USER:-postgres}
    DB_PASSWORD=${POSTGRES_PASSWORD:-postgres}
fi

# Use loaded environment variables
DB_HOST=${POSTGRES_HOST}
DB_PORT=${POSTGRES_PORT}
DB_NAME=${POSTGRES_DB}
DB_USER=${POSTGRES_USER}
DB_PASSWORD=${POSTGRES_PASSWORD}

# Additional protection for production
if [[ "$ENV_TYPE" == "production" ]]; then
    echo -e "${RED}⚠️ PRODUCTION ENVIRONMENT DETECTED${NC}"
    echo -e "${YELLOW}This will modify the production database schema.${NC}"
    echo -e "${YELLOW}Make sure you have a database backup before proceeding.${NC}"
    echo ""
    echo -e "${YELLOW}Type 'MIGRATE_PRODUCTION' to confirm:${NC}"
    read -r confirmation
    if [[ "$confirmation" != "MIGRATE_PRODUCTION" ]]; then
        echo -e "${YELLOW}Migration cancelled${NC}"
        exit 0
    fi
fi

echo -e "${YELLOW}📊 Database Configuration:${NC}"
echo "  Environment: $ENV_TYPE"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"

# Test database connection
echo "🔍 Testing database connection..."
export PGPASSWORD=$DB_PASSWORD
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Cannot connect to PostgreSQL. Please check your database configuration."
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"

# Create database if it doesn't exist
echo -e "${YELLOW}🗃️ Creating database if not exists...${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo -e "${YELLOW}Database $DB_NAME already exists${NC}"

# Run the financial schema script
SCHEMA_FILE="$(dirname "$0")/financial-schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Schema file not found: $SCHEMA_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Applying financial schema...${NC}"
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCHEMA_FILE"; then
    echo -e "${GREEN}✅ Financial schema applied successfully${NC}"
else
    echo -e "${RED}❌ Failed to apply financial schema${NC}"
    exit 1
fi

# Verify schema creation
echo -e "${YELLOW}🔍 Verifying schema creation...${NC}"
TABLES_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'financial';" | xargs)

if [ "$TABLES_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Financial schema verified: $TABLES_COUNT tables created${NC}"
    
    # List created tables
    echo -e "${YELLOW}📊 Created tables:${NC}"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'financial' 
        ORDER BY table_name;
    "
    
    # Show default currencies
    echo -e "${YELLOW}💰 Default currencies:${NC}"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        SELECT code, name, type, symbol 
        FROM financial.currencies 
        WHERE is_active = true 
        ORDER BY type, code;
    "
else
    echo -e "${RED}❌ Schema verification failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Financial database setup completed successfully!${NC}"
echo ""

# Environment-specific next steps
if [[ "$ENV_TYPE" == "production" ]]; then
    echo -e "${YELLOW}📝 Production Next Steps:${NC}"
    echo -e "1. Test the new endpoints:"
    echo -e "   ${BLUE}curl https://ai-service.anaxi.net/api/financial/dashboard/health${NC}"
    echo ""
    echo -e "2. Setup BBVA account:"
    echo -e "   ${BLUE}curl -X POST https://ai-service.anaxi.net/api/financial/setup-bbva${NC}"
    echo ""
    echo -e "3. Verify revenue metrics:"
    echo -e "   ${BLUE}curl https://ai-service.anaxi.net/api/financial/dashboard/revenue-metrics${NC}"
else
    echo -e "${YELLOW}📝 Development Next Steps:${NC}"
    echo -e "1. Set your GoCardless credentials in secure environment:"
    echo -e "   ${BLUE}./scripts/secure-env-manager.sh init development${NC}"
    echo ""
    echo -e "2. Start the AI Service:"
    echo -e "   ${BLUE}make dev${NC}"
    echo ""
    echo -e "3. Test financial health:"
    echo -e "   ${BLUE}curl http://localhost:3000/api/financial/health${NC}"
fi

echo ""
echo -e "${GREEN}✨ Ready to sync your banking data!${NC}"