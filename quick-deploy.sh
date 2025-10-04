#!/bin/bash
set -e

# Quick deployment script - builds locally, then deploys to NAS
NAS_HOST="192.168.1.11"
NAS_USER="k2600x"
NAS_DIR="/volume1/homes/k2600x/services/ai-service"

echo "=== Quick AI Service Deployment ==="
echo ""

# Step 1: Build locally
echo "[1/4] Building Docker image locally..."
cd services/ai-service
docker build -t ai-service:latest .
cd ../..

# Step 2: Save and transfer image
echo "[2/4] Saving and transferring Docker image..."
docker save ai-service:latest | gzip > ai-service.tar.gz
scp ai-service.tar.gz ${NAS_USER}@${NAS_HOST}:/tmp/
rm ai-service.tar.gz

# Step 3: Load image on NAS
echo "[3/4] Loading image on NAS..."
ssh ${NAS_USER}@${NAS_HOST} << 'EOF'
cd /tmp
gunzip -c ai-service.tar.gz | sudo docker load
rm ai-service.tar.gz
EOF

# Step 4: Start services
echo "[4/4] Starting services on NAS..."
ssh ${NAS_USER}@${NAS_HOST} << EOF
cd ${NAS_DIR}

# Create simple docker-compose
cat > docker-compose.yml << 'COMPOSE'
version: "3.9"

services:
  redis:
    image: redis:7-alpine
    container_name: ai-redis
    restart: always
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  ai-service:
    image: ai-service:latest
    container_name: ai-service
    restart: always
    ports:
      - "4030:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LOG_LEVEL=info
      - REDIS_URL=redis://redis:6379
      - ALLOWED_SERVICES=test,finance,trading,content
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=\${ANTHROPIC_API_KEY}
    depends_on:
      - redis

volumes:
  redis_data:
COMPOSE

# Start services
sudo docker-compose down || true
sudo docker-compose up -d

# Show status
sleep 5
sudo docker-compose ps
EOF

echo ""
echo "=== Deployment Complete ==="
echo "Service URL: http://${NAS_HOST}:4030"
echo ""
echo "To add API keys:"
echo "  ssh ${NAS_USER}@${NAS_HOST}"
echo "  cd ${NAS_DIR}"
echo "  export OPENAI_API_KEY='your-key'"
echo "  export ANTHROPIC_API_KEY='your-key'"
echo "  sudo docker-compose up -d"