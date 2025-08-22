#!/bin/bash

# Emergency Production Deployment Script
# Use this when you need to deploy immediately, bypassing all TypeScript checks

set -e

echo "╔════════════════════════════════════════════════╗"
echo "║    🚀 EMERGENCY PRODUCTION DEPLOYMENT         ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "⚠️  WARNING: This script bypasses all TypeScript checks!"
echo "Only use in emergency situations."
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production not found!"
    echo "Creating from .env.local..."
    cp .env.local .env.production
    echo "✅ Created .env.production - Please edit with production values"
fi

# Build with no TypeScript checks
echo "📦 Building applications (no TypeScript checks)..."

echo "   Building backend..."
npm run build:backend:nocheck

echo "   Building frontend..."
cd frontend
BUILD_TIME=$(date -Iseconds)
BUILD_VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
VITE_BUILD_TIME="$BUILD_TIME" VITE_BUILD_VERSION="$BUILD_VERSION" NODE_ENV=production npx vite build
cd ..

echo "✅ Build complete"

# Deploy type selection
echo ""
echo "Select deployment type:"
echo "1) Docker deployment"
echo "2) Manual deployment (systemd)"
echo "3) NAS deployment"
read -p "Choice (1-3): " DEPLOY_TYPE

case $DEPLOY_TYPE in
    1)
        echo "🐳 Docker deployment..."
        
        # Create docker-compose.production.yml if missing
        if [ ! -f "docker-compose.production.yml" ]; then
            echo "Creating docker-compose.production.yml..."
            cat > docker-compose.production.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ai_service
      POSTGRES_USER: ai_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5434:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    restart: unless-stopped

  monolith:
    build:
      context: .
      dockerfile: Dockerfile
    env_file: .env.production
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      REDIS_HOST: redis
    ports:
      - "3001:3001"
      - "80:3000"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

volumes:
  postgres_data:
EOF
        fi
        
        echo "Starting Docker containers..."
        docker-compose -f docker-compose.production.yml up -d --build
        echo "✅ Docker deployment complete"
        ;;
        
    2)
        echo "🔧 Manual deployment..."
        
        # Stop existing services
        echo "Stopping existing services..."
        lsof -ti:3001 | xargs kill -9 2>/dev/null || true
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
        
        # Start services
        echo "Starting services..."
        source .env.production
        nohup npm start > /tmp/ai-service.log 2>&1 &
        echo "✅ Service started on port 3001"
        
        # Serve frontend
        echo "Frontend available at: frontend/dist"
        echo "Configure nginx to serve from this directory"
        ;;
        
    3)
        echo "🏠 NAS deployment..."
        ./ai-cli.js prod deploy nas
        ;;
        
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║        🎉 DEPLOYMENT COMPLETE!                 ║"
echo "╠════════════════════════════════════════════════╣"
echo "║ Services:                                      ║"
echo "║   • API: http://localhost:3001                ║"
echo "║   • Frontend: http://localhost:3000           ║"
echo "║                                                ║"
echo "║ Next Steps:                                    ║"
echo "║   1. Test the deployment                      ║"
echo "║   2. Configure nginx/reverse proxy            ║"
echo "║   3. Set up SSL certificates                  ║"
echo "║   4. Monitor logs for issues                  ║"
echo "╚════════════════════════════════════════════════╝"

# Quick health check
echo ""
echo "Running health check in 5 seconds..."
sleep 5

if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ API is responding"
else
    echo "⚠️  API not responding yet - check logs"
fi