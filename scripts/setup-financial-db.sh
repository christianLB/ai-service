#!/bin/bash

# Setup Financial Database - Initialize PostgreSQL schema for GoCardless integration
# This script creates the financial schema and initializes the database

set -e

echo "🏦 Setting up Financial Database..."

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) not found. Please install PostgreSQL."
    exit 1
fi

# Default values
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-ai_service}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-postgres}

echo "📊 Database Configuration:"
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

echo "✅ Database connection successful"

# Create database if it doesn't exist
echo "🗃️ Creating database if not exists..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database $DB_NAME already exists"

# Run the financial schema script
SCHEMA_FILE="$(dirname "$0")/financial-schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo "❌ Schema file not found: $SCHEMA_FILE"
    exit 1
fi

echo "📋 Applying financial schema..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCHEMA_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Financial schema applied successfully"
else
    echo "❌ Failed to apply financial schema"
    exit 1
fi

# Verify schema creation
echo "🔍 Verifying schema creation..."
TABLES_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'financial';")

if [ "$TABLES_COUNT" -gt 0 ]; then
    echo "✅ Financial schema verified: $TABLES_COUNT tables created"
    
    # List created tables
    echo "📊 Created tables:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'financial' 
        ORDER BY table_name;
    "
    
    # Show default currencies
    echo "💰 Default currencies:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        SELECT code, name, type, symbol 
        FROM financial.currencies 
        WHERE is_active = true 
        ORDER BY type, code;
    "
else
    echo "❌ Schema verification failed"
    exit 1
fi

echo ""
echo "🎉 Financial database setup completed successfully!"
echo ""
echo "📝 Next Steps:"
echo "1. Set your GoCardless credentials in .env:"
echo "   GO_SECRET_ID=your_secret_id"
echo "   GO_SECRET_KEY=your_secret_key"
echo ""
echo "2. Start the AI Service:"
echo "   npm run dev  # or node dist/index.js"
echo ""
echo "3. Initialize BBVA account setup:"
echo "   curl -X POST http://localhost:3000/api/financial/setup-bbva"
echo ""
echo "4. Check financial service health:"
echo "   curl http://localhost:3000/api/financial/health"
echo ""
echo "✨ Ready to sync your banking data!"