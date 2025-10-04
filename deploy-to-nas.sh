#!/bin/bash
set -e

# Configuration
NAS_HOST="192.168.1.11"
NAS_USER="k2600x"
NAS_DIR="/volume1/homes/k2600x/services/ai-service"
LOCAL_DIR="$(pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== AI Service NAS Deployment ===${NC}"
echo "Target: ${NAS_USER}@${NAS_HOST}:${NAS_DIR}"
echo ""

# Step 1: Check SSH connection
echo -e "${YELLOW}[1/8] Testing SSH connection...${NC}"
if ! ssh -o ConnectTimeout=5 ${NAS_USER}@${NAS_HOST} "echo 'SSH connection successful'"; then
    echo -e "${RED}Error: Cannot connect to NAS${NC}"
    exit 1
fi

# Step 2: Stop and remove old containers
echo -e "${YELLOW}[2/8] Removing old AI service containers...${NC}"
ssh ${NAS_USER}@${NAS_HOST} << 'ENDSSH'
# Stop any running ai-service containers
echo "Stopping old containers..."
sudo docker ps -a | grep -E "ai-service|ai_service" | awk '{print $1}' | xargs -r sudo docker stop || true
sudo docker ps -a | grep -E "ai-service|ai_service" | awk '{print $1}' | xargs -r sudo docker rm || true

# Remove old images
echo "Removing old images..."
sudo docker images | grep -E "ai-service|ai_service" | awk '{print $3}' | xargs -r sudo docker rmi -f || true

# Clean up any old volumes
echo "Cleaning up volumes..."
sudo docker volume ls | grep -E "ai-service|ai_service" | awk '{print $2}' | xargs -r sudo docker volume rm || true
ENDSSH

# Step 3: Create directory structure on NAS
echo -e "${YELLOW}[3/8] Creating directory structure on NAS...${NC}"
ssh ${NAS_USER}@${NAS_HOST} << ENDSSH
# Remove old directory if exists
if [ -d "${NAS_DIR}" ]; then
    echo "Removing old deployment..."
    sudo rm -rf ${NAS_DIR}
fi

# Create new directory structure
mkdir -p ${NAS_DIR}/services/ai-service/{src/policies,contracts,logs,data}
mkdir -p ${NAS_DIR}/volumes/{redis,ollama}
ENDSSH

# Step 4: Copy files to NAS
echo -e "${YELLOW}[4/8] Copying files to NAS...${NC}"

# Create tarball excluding node_modules and other unnecessary files
tar -czf /tmp/ai-service-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='coverage' \
    --exclude='*.log' \
    --exclude='.env' \
    services/ai-service/ \
    docker-compose.yml \
    BOOTSTRAP_PLAN.md

# Copy and extract on NAS
scp /tmp/ai-service-deploy.tar.gz ${NAS_USER}@${NAS_HOST}:/tmp/
ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_DIR} && tar -xzf /tmp/ai-service-deploy.tar.gz && rm /tmp/ai-service-deploy.tar.gz"
rm /tmp/ai-service-deploy.tar.gz

# Step 5: Create production docker-compose
echo -e "${YELLOW}[5/8] Creating production configuration...${NC}"
cat > /tmp/docker-compose.prod.yml << 'EOF'
version: "3.9"

networks:
  ai_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16

volumes:
  redis_data:
    driver: local
  ollama_models:
    driver: local

services:
  redis:
    image: redis:7-alpine
    container_name: ai-redis
    restart: always
    networks:
      ai_net:
        ipv4_address: 172.25.0.10
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  ollama:
    image: ollama/ollama:latest
    container_name: ai-ollama
    restart: always
    networks:
      ai_net:
        ipv4_address: 172.25.0.11
    volumes:
      - ollama_models:/root/.ollama
    environment:
      - OLLAMA_KEEP_ALIVE=24h
      - OLLAMA_HOST=0.0.0.0
    ports:
      - "11434:11434"
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  ai-service:
    build: 
      context: ./services/ai-service
      dockerfile: Dockerfile
    image: ai-service:latest
    container_name: ai-service
    restart: always
    networks:
      ai_net:
        ipv4_address: 172.25.0.20
    ports:
      - "4030:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LOG_LEVEL=info
      - REDIS_URL=redis://172.25.0.10:6379
      - OLLAMA_HOST=http://172.25.0.11:11434
      - AI_POLICIES_DIR=/app/policies
      - ALLOWED_SERVICES=test,finance,trading,content
      # API Keys will be added from .env file
    env_file:
      - ./services/ai-service/.env.production
    volumes:
      - ./services/ai-service/src/policies:/app/policies:ro
      - ./logs:/app/logs
    depends_on:
      redis:
        condition: service_healthy
      ollama:
        condition: service_started
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"
EOF

scp /tmp/docker-compose.prod.yml ${NAS_USER}@${NAS_HOST}:${NAS_DIR}/docker-compose.prod.yml
rm /tmp/docker-compose.prod.yml

# Step 6: Create production environment file
echo -e "${YELLOW}[6/8] Creating production environment file...${NC}"

# Check if local .env exists and use it as base
if [ -f "./services/ai-service/.env" ]; then
    echo "Using local .env as base..."
    scp ./services/ai-service/.env ${NAS_USER}@${NAS_HOST}:${NAS_DIR}/services/ai-service/.env.production
else
    echo "Creating new .env.production from example..."
    scp ./services/ai-service/.env.example ${NAS_USER}@${NAS_HOST}:${NAS_DIR}/services/ai-service/.env.production
fi

# Update production-specific settings
ssh ${NAS_USER}@${NAS_HOST} << ENDSSH
cd ${NAS_DIR}/services/ai-service
# Ensure NODE_ENV is production
sed -i 's/NODE_ENV=.*/NODE_ENV=production/' .env.production
# Update Redis URL for production
sed -i 's|REDIS_URL=.*|REDIS_URL=redis://172.25.0.10:6379|' .env.production
# Update Ollama host
sed -i 's|OLLAMA_HOST=.*|OLLAMA_HOST=http://172.25.0.11:11434|' .env.production

echo ""
echo "================================"
echo "IMPORTANT: Edit .env.production to add your API keys:"
echo "  ${NAS_DIR}/services/ai-service/.env.production"
echo "================================"
ENDSSH

# Step 7: Build and start services
echo -e "${YELLOW}[7/8] Building and starting services...${NC}"
ssh ${NAS_USER}@${NAS_HOST} << ENDSSH
cd ${NAS_DIR}

# Install dependencies and build
echo "Installing dependencies..."
cd services/ai-service
npm install --production=false
npm run build
cd ../..

# Build Docker image
echo "Building Docker image..."
sudo docker-compose -f docker-compose.prod.yml build ai-service

# Start services
echo "Starting services..."
sudo docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Show status
sudo docker-compose -f docker-compose.prod.yml ps
ENDSSH

# Step 8: Pull Ollama models
echo -e "${YELLOW}[8/8] Pulling Ollama models (this may take a while)...${NC}"
ssh ${NAS_USER}@${NAS_HOST} << 'ENDSSH'
echo "Pulling llama3.1:8b..."
sudo docker exec ai-ollama ollama pull llama3.1:8b || true
echo "Pulling mistral:7b..."
sudo docker exec ai-ollama ollama pull mistral:7b || true
echo "Pulling nomic-embed-text..."
sudo docker exec ai-ollama ollama pull nomic-embed-text || true
ENDSSH

# Final status check
echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Checking service health..."
sleep 5

# Test the health endpoint
if curl -s -f http://${NAS_HOST}:4030/health > /dev/null; then
    echo -e "${GREEN}✓ AI Service is healthy and running${NC}"
    echo ""
    echo "Service URLs:"
    echo "  - AI Service: http://${NAS_HOST}:4030"
    echo "  - Ollama: http://${NAS_HOST}:11434"
    echo ""
    echo "Next steps:"
    echo "  1. SSH to NAS: ssh ${NAS_USER}@${NAS_HOST}"
    echo "  2. Navigate to: cd ${NAS_DIR}"
    echo "  3. Edit API keys: nano services/ai-service/.env.production"
    echo "  4. Restart service: docker-compose -f docker-compose.prod.yml restart ai-service"
    echo "  5. View logs: docker-compose -f docker-compose.prod.yml logs -f ai-service"
else
    echo -e "${YELLOW}⚠ Service deployed but health check failed${NC}"
    echo "Check logs with:"
    echo "  ssh ${NAS_USER}@${NAS_HOST} 'cd ${NAS_DIR} && docker-compose -f docker-compose.prod.yml logs ai-service'"
fi