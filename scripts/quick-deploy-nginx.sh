#!/bin/bash
# Quick deploy with nginx

set -e

echo "🚀 Quick Deploy with Nginx"
echo "=========================="

# Docker commands to run on NAS
COMMANDS='
cd /volume1/docker/ai-service

echo "1. Pulling latest images..."
docker-compose -f docker-compose.production.yml pull

echo "2. Stopping existing containers..."
docker-compose -f docker-compose.production.yml down

echo "3. Starting services with nginx..."
docker-compose -f docker-compose.production.yml up -d

echo "4. Waiting for services to start..."
sleep 10

echo "5. Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "ai-service|NAMES"

echo "6. Testing nginx proxy..."
curl -s -o /dev/null -w "Nginx health: HTTP %{http_code}\n" http://localhost/health || echo "Nginx not responding"

echo "7. Testing API through nginx..."
curl -s http://localhost/api/financial/dashboard/health | grep -o "status" && echo "✅ API working through nginx" || echo "❌ API not accessible"
'

# Execute on NAS
ssh k2600x@192.168.1.11 "$COMMANDS"

echo "
Deployment complete!
Access the service at: http://192.168.1.11/
"