#!/bin/sh

echo "🚀 Starting AI Service..."

# Check for environment file in mounted config directory
if [ -f "/config/.env.production" ]; then
    echo "✅ Found .env.production in /config"
    echo "📋 Loading environment variables..."
    # Use set -a to export all variables
    set -a
    . /config/.env.production
    set +a
    echo "✅ Environment loaded successfully"
elif [ -f "/config/production.env" ]; then
    echo "✅ Found production.env in /config"
    echo "📋 Loading environment variables..."
    # Use set -a to export all variables
    set -a
    . /config/production.env
    set +a
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

# Start the application
echo "🎯 Starting Node.js application..."
exec node dist/index.js