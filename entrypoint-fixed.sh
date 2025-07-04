#!/bin/sh

echo "🚀 Starting AI Service..."

# CRITICAL: Unset any pre-existing environment variables from Docker
# This ensures we load fresh values from the file
unset NODE_ENV
unset POSTGRES_HOST
unset POSTGRES_PORT
unset POSTGRES_DB
unset POSTGRES_USER
unset POSTGRES_PASSWORD

echo "🧹 Cleared pre-existing environment variables"

# Check for environment file in mounted config directory
if [ -f "/config/.env.production" ]; then
    echo "✅ Found .env.production in /config"
    echo "📋 Loading environment variables..."
    
    # Method 1: Try set -a first (fastest)
    set -a
    . /config/.env.production
    set +a
    
    # Method 2: If critical vars still wrong, parse manually
    if [ "${POSTGRES_HOST}" = "localhost" ] || [ -z "${POSTGRES_HOST}" ]; then
        echo "⚠️  Detected incorrect POSTGRES_HOST, parsing manually..."
        
        # Parse each line manually, handling various formats
        while IFS= read -r line; do
            # Skip comments and empty lines
            case "$line" in
                '#'*|'') continue ;;
            esac
            
            # Extract key and value
            key="${line%%=*}"
            value="${line#*=}"
            
            # Remove carriage returns (Windows line endings)
            value=$(echo "$value" | tr -d '\r')
            
            # Remove surrounding quotes if present
            case "$value" in
                '"'*'"') value="${value#\"}"; value="${value%\"}" ;;
                "'"*"'") value="${value#\'}"; value="${value%\'}" ;;
            esac
            
            # Export the variable
            export "$key=$value"
            
        done < /config/.env.production
    fi
    
    echo "✅ Environment loaded successfully"
else
    echo "❌ ERROR: No environment file found at /config/.env.production"
    echo "Please ensure the file is mounted correctly"
    exit 1
fi

# Verify critical variables
echo "🔍 Environment verification:"
echo "  NODE_ENV=${NODE_ENV}"
echo "  PORT=${PORT}"
echo "  POSTGRES_HOST=${POSTGRES_HOST}"
echo "  POSTGRES_USER=${POSTGRES_USER}"
echo "  POSTGRES_DB=${POSTGRES_DB}"
echo "  TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:0:10}..."

# Final check - abort if still wrong
if [ "${POSTGRES_HOST}" = "localhost" ]; then
    echo "❌ CRITICAL ERROR: POSTGRES_HOST is still 'localhost'"
    echo "   This will cause connection failures in Docker"
    echo "   Expected: 'postgres' or another container name"
    echo "   Please check your .env.production file"
    exit 1
fi

# Start the application
echo "🎯 Starting Node.js application..."
exec node dist/index.js