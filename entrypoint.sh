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

# Start the application
echo "🎯 Starting Node.js application..."
exec node dist/index.js