#!/bin/bash

# Setup Financial Dashboard - Prepares financial categorization system and dashboard

set -e

echo "🏦 Setting up Financial Dashboard and Categorization System..."

# Load environment variables from .env.local if it exists
if [ -f "$(dirname "$0")/../.env.local" ]; then
    echo "📁 Loading environment variables from .env.local"
    export $(grep -v '^#' "$(dirname "$0")/../.env.local" | xargs)
fi

# Check for required environment variables
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ POSTGRES_PASSWORD environment variable is required"
    echo "   Set it in .env.local or as an environment variable"
    exit 1
fi

echo ""
echo "🎯 This script will:"
echo "   1. Update database schema with categorization tables"
echo "   2. Prepare dashboard static files"
echo "   3. Verify all components are ready"
echo ""

# 1. Update categorization schema
echo "📊 Updating database schema..."
bash "$(dirname "$0")/update-categorization-schema.sh"

if [ $? -eq 0 ]; then
    echo "✅ Database schema updated successfully"
else
    echo "❌ Failed to update database schema"
    exit 1
fi

# 2. Verify dashboard files exist
echo "🔍 Verifying dashboard files..."
DASHBOARD_FILE="$(dirname "$0")/../public/financial-dashboard.html"

if [ -f "$DASHBOARD_FILE" ]; then
    echo "✅ Dashboard HTML file found"
else
    echo "❌ Dashboard HTML file not found at: $DASHBOARD_FILE"
    exit 1
fi

# 3. Build the application
echo "🔨 Building application..."
cd "$(dirname "$0")/.."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Application built successfully"
else
    echo "❌ Failed to build application"
    exit 1
fi

# 4. Test database connection
echo "🔌 Testing database connection..."
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5434}
DB_NAME=${POSTGRES_DB:-ai_service}
DB_USER=${POSTGRES_USER:-ai_user}

export PGPASSWORD=$POSTGRES_PASSWORD
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM financial.transactions;" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Failed to connect to database"
    exit 1
fi

echo ""
echo "🎉 Financial Dashboard Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Start the service:"
echo "   npm run dev   # Development mode"
echo "   npm start     # Production mode"
echo ""
echo "2. Access the dashboard:"
echo "   http://localhost:3000/dashboard"
echo ""
echo "3. API endpoints available:"
echo "   GET /api/financial/dashboard/overview - Real-time dashboard data"
echo "   GET /api/financial/categories - Category management"
echo "   POST /api/financial/categorize/auto - Auto-categorization"
echo ""
echo "✨ Your financial system is ready with:"
echo "   • Real BBVA banking data integration"
echo "   • AI-powered transaction categorization"
echo "   • Real-time metrics and reporting"
echo "   • Responsive web dashboard"
echo "   • GoCardless API integration"