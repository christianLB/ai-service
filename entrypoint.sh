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

# Start the application
echo "🎯 Starting Node.js application..."
exec node dist/src/index.js