#!/bin/bash

# Start local MCP server for Claude Code
# This script builds and starts the MCP server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting AI Service MCP Local Server..."

# Check if node_modules exists
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd "$PROJECT_DIR"
    npm install
fi

# Check if .env exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    echo "📝 Please edit .env file with your configuration"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
cd "$PROJECT_DIR"
npm run build

# Get auth token if needed
if [ -z "$AI_SERVICE_AUTH_TOKEN" ]; then
    echo "🔐 Getting auth token from AI Service..."
    # Try to get token from parent project
    if [ -f "$PROJECT_DIR/../Makefile" ]; then
        TOKEN=$(cd "$PROJECT_DIR/.." && make auth-token 2>/dev/null | grep -oP 'Token: \K.*' || echo "")
        if [ -n "$TOKEN" ]; then
            export AI_SERVICE_AUTH_TOKEN="$TOKEN"
            echo "✅ Auth token obtained"
        else
            echo "⚠️  Could not get auth token. Some tools may require authentication."
        fi
    fi
fi

# Start the server
echo "🎯 Starting MCP server..."
exec node "$PROJECT_DIR/dist/server.js"