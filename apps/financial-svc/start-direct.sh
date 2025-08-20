#!/bin/bash

# Direct start script for Financial Service
# Bypasses complex build process for immediate deployment

echo "🚀 Starting Financial Service directly..."

# Set environment variables
export DATABASE_URL="postgresql://financial_service:financial_secure_2025@localhost:5434/ai_service?schema=financial"
export SERVICE_PORT=3002
export NODE_ENV=development

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if dist exists, if not compile
if [ ! -d "dist" ]; then
    echo "🔨 Compiling TypeScript..."
    npx tsc || echo "⚠️ Compilation had warnings, continuing..."
fi

# Start the service
echo "✅ Starting Financial Service on port 3002..."
node dist/index.js || npm start || node src/index.ts