#!/bin/bash
set -e

echo "🚀 Starting production deployment..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build
cd ..

# Copy frontend build to production
echo "📋 Copying frontend build to NAS..."
ssh synology "mkdir -p /volume1/docker/ai-service/frontend/dist"
scp -r frontend/dist/* synology:/volume1/docker/ai-service/frontend/dist/

# Build and push Docker image
echo "🐳 Building Docker image..."
docker build -t ghcr.io/christianlb/ai-service:latest .

echo "📤 Pushing to GitHub Container Registry..."
docker push ghcr.io/christianlb/ai-service:latest

# Deploy to Synology
echo "🚢 Deploying to Synology NAS..."
ssh synology "cd /volume1/docker/ai-service && docker-compose pull && docker-compose up -d"

# Apply database migrations
echo "🗄️ Applying database migrations..."
ssh synology "docker exec ai-postgres psql -U ai_user -d ai_service_db -f /docker-entrypoint-initdb.d/01-init.sql || true"

echo "✅ Deployment complete!"
echo "🌐 Access the service at: http://192.168.1.11:3000"