#!/bin/bash
set -e

# Simple deployment - just copy files and run with Node.js directly
NAS_HOST="192.168.1.11"
NAS_USER="k2600x"
NAS_DIR="/volume1/homes/k2600x/services/ai-service"

echo "=== Simple AI Service Deployment ==="
echo ""

# Step 1: Clean old deployment
echo "[1/3] Cleaning old deployment..."
ssh ${NAS_USER}@${NAS_HOST} << EOF
# Stop any running services
sudo docker stop ai-service ai-redis || true
sudo docker rm ai-service ai-redis || true

# Create fresh directory
rm -rf ${NAS_DIR}
mkdir -p ${NAS_DIR}
EOF

# Step 2: Copy service files
echo "[2/3] Copying service files..."
rsync -avz --exclude node_modules --exclude dist --exclude .git \
  -e "ssh -o StrictHostKeyChecking=no" \
  /home/k2600x/dev/ai-service/ ${NAS_USER}@${NAS_HOST}:${NAS_DIR}/

# Step 3: Start with simple docker-compose
echo "[3/3] Starting services..."
ssh ${NAS_USER}@${NAS_HOST} << 'EOF'
cd /volume1/homes/k2600x/services/ai-service

# Create minimal docker-compose
cat > docker-compose.yml << 'COMPOSE'
version: "3.9"

services:
  redis:
    image: redis:7-alpine
    container_name: ai-redis
    restart: always
    command: redis-server --appendonly yes

  ai-service:
    image: node:20-alpine
    container_name: ai-service
    working_dir: /app
    restart: always
    ports:
      - "4030:3000"
    volumes:
      - ./services/ai-service:/app
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LOG_LEVEL=info
      - REDIS_URL=redis://redis:6379
      - ALLOWED_SERVICES=test
    command: sh -c "npm install --production && npm run build && npm start"
    depends_on:
      - redis

volumes:
  redis_data:
COMPOSE

# Start services
sudo docker-compose up -d redis
sleep 5
sudo docker-compose up -d ai-service

echo "Waiting for service to start..."
sleep 30

# Show status
sudo docker-compose ps
sudo docker logs ai-service --tail 20
EOF

echo ""
echo "=== Deployment Complete ==="
echo "Test with: curl http://${NAS_HOST}:4030/health"