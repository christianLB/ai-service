#!/bin/sh

echo "🚀 Starting AI Service..."

# Function to load environment file
load_env_file() {
    local env_file=$1
    echo "📋 Loading environment variables from $env_file..."
    
    # Read file line by line and export variables
    while IFS='=' read -r key value; do
        # Skip empty lines and comments
        case "$key" in
            ''|\#*) continue ;;
        esac
        
        # Remove quotes if present
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        
        # Export the variable
        export "$key=$value"
        echo "  ✓ Set $key"
    done < "$env_file"
}

# Check for environment file in mounted config directory
if [ -f "/config/.env.production" ]; then
    echo "✅ Found .env.production in /config"
    load_env_file "/config/.env.production"
    echo "✅ Environment loaded successfully"
elif [ -f "/config/production.env" ]; then
    echo "✅ Found production.env in /config"
    load_env_file "/config/production.env"
    echo "✅ Environment loaded successfully"
else
    echo "⚠️  WARNING: No environment file found in /config/"
    echo "Expected /config/.env.production or /config/production.env"
    echo "Using environment variables from Docker..."
fi

# Debug: Show some loaded variables (without sensitive data)
echo "🔍 Environment check:"
echo "  NODE_ENV=${NODE_ENV}"
echo "  PORT=${PORT}"
echo "  POSTGRES_HOST=${POSTGRES_HOST}"
echo "  POSTGRES_USER=${POSTGRES_USER}"
echo "  TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:0:10}..."
echo "  TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}"

# Ensure data directories exist with proper permissions
echo "📁 Ensuring data directories exist..."

# Only create directories if they don't exist (preserves existing data)
mkdir -p /app/data/documents/storage /app/data/documents/temp /app/data/documents/thumbnails
mkdir -p /app/data/knowledge
mkdir -p /app/data/workflows/storage

# Check write permissions
echo "🔍 Checking write permissions..."
if touch /app/data/documents/storage/.write_test 2>/dev/null; then
    rm -f /app/data/documents/storage/.write_test
    echo "✅ Write permissions OK for document storage"
else
    echo "⚠️  WARNING: No write permissions in /app/data/documents/storage"
    echo "   Running as user: $(id)"
    echo "   Directory owner: $(ls -ld /app/data/documents/storage 2>/dev/null || echo 'Directory not accessible')"
fi

echo "✅ Data directories ready"

# Run Prisma migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
    echo "🔄 Checking database migrations..."
    
    # Wait for database to be ready
    MAX_RETRIES=30
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if npx prisma migrate status 2>/dev/null | grep -q "Database schema is up to date"; then
            echo "✅ Database schema is up to date"
            break
        elif npx prisma migrate status 2>/dev/null | grep -q "Following migrations have not yet been applied"; then
            echo "📦 Applying pending migrations..."
            if npx prisma migrate deploy; then
                echo "✅ Migrations applied successfully"
            else
                echo "❌ Migration failed! Check logs for details"
                exit 1
            fi
            break
        else
            echo "⏳ Waiting for database to be ready... ($RETRY_COUNT/$MAX_RETRIES)"
            sleep 2
            RETRY_COUNT=$((RETRY_COUNT + 1))
        fi
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "❌ Database connection timeout after $MAX_RETRIES attempts"
        echo "   Please check DATABASE_URL and database availability"
        exit 1
    fi
    
    # Generate Prisma client (in case it's missing)
    echo "🔧 Ensuring Prisma client is generated..."
    npx prisma generate 2>/dev/null || echo "⚠️  Prisma generate skipped (client may already exist)"
else
    echo "⚠️  DATABASE_URL not set - skipping migrations"
    echo "   This may cause database-related errors!"
fi

# Start the application
echo "🎯 Starting Node.js application..."
exec node dist/src/index.js