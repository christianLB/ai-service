#!/bin/bash
# Deploy with GitHub Container Registry authentication

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment
if [ -f .make.env ]; then
    source .make.env
fi

NAS_HOST="${NAS_HOST:-192.168.1.11}"
NAS_USER="${NAS_USER:-k2600x}"
NAS_PATH="${NAS_PATH:-/volume1/docker/ai-service}"

echo -e "${BLUE}=== DEPLOYMENT WITH GHCR AUTHENTICATION ===${NC}"

# Step 1: Authenticate Docker with GitHub Container Registry
echo -e "${YELLOW}1. Authenticating with GitHub Container Registry...${NC}"
sshpass -p "$SSHPASS" ssh ${NAS_USER}@${NAS_HOST} "echo '$SUDO_PASS' | sudo -S sh -c 'echo ${GHCR_TOKEN} | /usr/local/bin/docker login ghcr.io -u ${GITHUB_USERNAME} --password-stdin'"

# Step 2: Copy docker-compose.yml
echo -e "${YELLOW}2. Copying docker-compose.yml...${NC}"
sshpass -p "$SSHPASS" scp docker-compose.production.yml ${NAS_USER}@${NAS_HOST}:${NAS_PATH}/docker-compose.yml

# Step 3: Create .env file on NAS with required variables
echo -e "${YELLOW}3. Creating .env file with credentials...${NC}"
sshpass -p "$SSHPASS" ssh ${NAS_USER}@${NAS_HOST} "cat > ${NAS_PATH}/.env << EOF
POSTGRES_DB=ai_service
POSTGRES_USER=ai_user
POSTGRES_PASSWORD=ultra_secure_password_2025
REDIS_PASSWORD=redis_secure_password_2025
GO_SECRET_ID=${GO_SECRET_ID:-placeholder}
GO_SECRET_KEY=${GO_SECRET_KEY:-placeholder}
OPENAI_API_KEY=${OPENAI_API_KEY:-placeholder}
JWT_SECRET=ultra_secure_jwt_secret_key_2025
GITHUB_USERNAME=${GITHUB_USERNAME}
GHCR_TOKEN=${GHCR_TOKEN}
WATCHTOWER_HTTP_API_TOKEN=watchtower-token-2025
EOF"

# Step 4: Stop old services
echo -e "${YELLOW}4. Stopping old services...${NC}"
sshpass -p "$SSHPASS" ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_PATH} && echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker-compose down --remove-orphans || true"

# Step 5: Check existing images and use ai-service:simple temporarily
echo -e "${YELLOW}5. Checking existing images...${NC}"
sshpass -p "$SSHPASS" ssh ${NAS_USER}@${NAS_HOST} "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker images | grep ai-service"

# Temporarily update docker-compose to use existing image
echo -e "${YELLOW}5a. Temporarily using ai-service:simple image...${NC}"
sshpass -p "$SSHPASS" ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_PATH} && sed -i 's|ghcr.io/christianlb/ai-service-api:latest|ai-service:simple|g' docker-compose.yml"
sshpass -p "$SSHPASS" ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_PATH} && sed -i 's|ghcr.io/christianlb/ai-service-frontend:latest|nginx:alpine|g' docker-compose.yml"

# Step 6: Start new services
echo -e "${YELLOW}6. Starting new services...${NC}"
sshpass -p "$SSHPASS" ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_PATH} && echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker-compose up -d --force-recreate"

# Step 7: Check status
echo -e "${YELLOW}7. Checking status...${NC}"
sleep 10
sshpass -p "$SSHPASS" ssh ${NAS_USER}@${NAS_HOST} "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker ps | grep ai-"

echo -e "${GREEN}=== DEPLOYMENT COMPLETED ===${NC}"
echo -e "${YELLOW}Frontend should be accessible on port 3003${NC}"
echo -e "${YELLOW}API should be accessible on port 3000${NC}"