#!/bin/bash
set -e

NAS_HOST="192.168.1.11"
NAS_USER="k2600x"
NAS_DIR="/volume1/homes/k2600x/services/ai-service"

echo "=== AI Service Tar Deployment ==="
echo ""

# Create tar archive
echo "Creating archive..."
tar -czf /tmp/ai-service.tar.gz \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='*.log' \
  -C /home/k2600x/dev ai-service

# Transfer and extract
echo "Transferring to NAS..."
scp /tmp/ai-service.tar.gz ${NAS_USER}@${NAS_HOST}:/tmp/

echo "Extracting on NAS..."
ssh ${NAS_USER}@${NAS_HOST} << EOF
# Clean old deployment
sudo docker stop ai-service ai-redis 2>/dev/null || true
sudo docker rm ai-service ai-redis 2>/dev/null || true
rm -rf ${NAS_DIR}
mkdir -p /volume1/homes/k2600x/services

# Extract
cd /volume1/homes/k2600x/services
tar -xzf /tmp/ai-service.tar.gz
rm /tmp/ai-service.tar.gz

# Start services
cd ai-service
cat > docker-compose.yml << 'COMPOSE'
version: "3"
services:
  redis:
    image: redis:7-alpine
    container_name: ai-redis
    restart: always
  
  ai-service:
    image: node:20-alpine
    container_name: ai-service
    working_dir: /app
    ports:
      - "4030:3000"
    volumes:
      - ./services/ai-service:/app
    environment:
      - NODE_ENV=production
      - PORT=3000
      - REDIS_URL=redis://redis:6379
      - ALLOWED_SERVICES=test
    command: sh -c "echo 'Starting AI Service...' && npm install && npm run build && npm start"
    depends_on:
      - redis
COMPOSE

sudo docker-compose up -d
sleep 10
sudo docker-compose ps
EOF

rm /tmp/ai-service.tar.gz
echo "Deployment complete!"
echo "Test: curl http://${NAS_HOST}:4030/health"