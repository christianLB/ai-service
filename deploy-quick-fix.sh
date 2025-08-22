#!/bin/bash

echo "🚀 Quick Production Deployment - GoCardless Fix"
echo "=============================================="
echo ""

# Use the existing image that's already built
echo "📦 Using existing Docker image: ai-service:latest (built 22 hours ago)"
echo ""

# Deploy to NAS
echo "🔄 Deploying to NAS..."
sshpass -p '89761' ssh admin@192.168.1.11 << 'EOF'
echo "Connected to NAS..."

# Stop existing container
echo "Stopping current container..."
docker stop ai-service-prod 2>/dev/null || true
docker rm ai-service-prod 2>/dev/null || true

# Run new container with same config
echo "Starting new container..."
docker run -d \
  --name ai-service-prod \
  --network ai-service-network \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://ai_user:ultra_secure_password_2025@ai-postgres:5432/ai_service?schema=public" \
  -e AUTH_DATABASE_URL="postgresql://ai_user:ultra_secure_password_2025@ai-postgres:5432/ai_service?schema=auth" \
  -e FINANCIAL_DATABASE_URL="postgresql://financial_user:financial_secure_2025@financial-postgres:5432/financial_db?schema=financial" \
  -e JWT_SECRET="ultra_secret_jwt_key_2025_production" \
  -e REDIS_URL="redis://ai-service-redis:6379" \
  -e NEXTAUTH_URL="https://ai-service.anaxi.net" \
  -e SITE_URL="https://ai-service.anaxi.net" \
  ai-service:latest

# Wait for container to be ready
echo "Waiting for container to be ready..."
sleep 10

# Check status
docker ps | grep ai-service-prod
echo ""

echo "✅ Deployment complete!"
EOF

echo ""
echo "🎯 Next steps:"
echo "1. Fix existing GoCardless configs in production database"
echo "2. Test at https://ai-service.anaxi.net"