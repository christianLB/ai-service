#!/bin/bash

# Deployment script for Synology NAS
# This script should be run on the Synology NAS

echo "=== AI Service Synology Deployment ==="
echo ""

# Variables
DOCKER_COMPOSE_URL="https://raw.githubusercontent.com/christianLB/ai-service/main/docker-compose.synology.yml"
PROMETHEUS_CONFIG_URL="https://raw.githubusercontent.com/christianLB/ai-service/main/prometheus.yml"
BASE_DIR="/volume1/docker/ai-service"

# Create directories if they don't exist
echo "1. Creating directories..."
mkdir -p $BASE_DIR/config
mkdir -p $BASE_DIR/postgres
mkdir -p $BASE_DIR/redis
mkdir -p $BASE_DIR/prometheus
mkdir -p $BASE_DIR/logs
mkdir -p $BASE_DIR/workflows/storage
mkdir -p $BASE_DIR/documents/storage
mkdir -p $BASE_DIR/documents/temp
mkdir -p $BASE_DIR/documents/thumbnails
mkdir -p $BASE_DIR/knowledge

# Set correct permissions for nodejs user (UID 1001)
echo "   Setting permissions..."
if [ "$EUID" -eq 0 ]; then
    chown -R 1001:1001 $BASE_DIR/documents
    chown -R 1001:1001 $BASE_DIR/knowledge
    chown -R 1001:1001 $BASE_DIR/workflows
    chown -R 1001:1001 $BASE_DIR/logs
    echo "   ✅ Permissions set for nodejs user"
else
    echo "   ⚠️  WARNING: Not running as root, cannot set permissions"
    echo "   Run: sudo chown -R 1001:1001 $BASE_DIR/documents"
fi

# Check if .env.production exists
if [ ! -f "$BASE_DIR/config/.env.production" ]; then
    echo ""
    echo "⚠️  WARNING: .env.production not found!"
    echo "Please create $BASE_DIR/config/.env.production with your configuration"
    echo "You can use .env.production from the repository as a template"
    echo ""
    exit 1
fi

# Download latest docker-compose file
echo ""
echo "2. Downloading latest docker-compose.yml..."
curl -o docker-compose.yml $DOCKER_COMPOSE_URL

# Download prometheus config
echo ""
echo "3. Downloading prometheus.yml..."
curl -o prometheus.yml $PROMETHEUS_CONFIG_URL

# Load environment variables for docker-compose
export $(cat $BASE_DIR/config/.env.production | grep -v '^#' | xargs)

# Pull latest images
echo ""
echo "4. Pulling latest images..."
docker-compose -f docker-compose.yml pull

# Stop existing containers
echo ""
echo "5. Stopping existing containers..."
docker-compose -f docker-compose.yml down

# Start new containers
echo ""
echo "6. Starting services..."
docker-compose -f docker-compose.yml up -d

# Wait for services to be ready
echo ""
echo "7. Waiting for services to be ready..."
sleep 10

# Check service status
echo ""
echo "8. Checking service status..."
docker-compose -f docker-compose.yml ps

# Check logs for errors
echo ""
echo "9. Recent logs:"
docker logs ai-service-prod --tail 50

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Services:"
echo "- AI Service: http://your-nas:3001"
echo "- Dashboard: http://your-nas:3001/dashboard"
echo "- Prometheus: http://your-nas:9091"
echo ""
echo "To view logs:"
echo "docker logs -f ai-service-prod"
echo ""