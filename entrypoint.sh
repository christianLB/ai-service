#!/bin/sh

echo "🚀 Starting AI Service..."

# Check for environment file in mounted config directory
if [ -f "/config/.env.production" ]; then
    echo "✅ Found .env.production in /config"
    echo "📋 Loading environment variables..."
    export $(cat /config/.env.production | grep -v '^#' | grep -v '^$' | xargs)
    echo "✅ Environment loaded successfully"
elif [ -f "/config/production.env" ]; then
    echo "✅ Found production.env in /config"
    echo "📋 Loading environment variables..."
    export $(cat /config/production.env | grep -v '^#' | grep -v '^$' | xargs)
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
echo "  TELEGRAM_BOT_TOKEN=$(echo ${TELEGRAM_BOT_TOKEN} | cut -c1-10)..."

# Start the application
echo "🎯 Starting Node.js application..."
exec node dist/index.js