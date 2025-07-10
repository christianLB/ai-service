#!/bin/bash
# Force deployment of v2 architecture

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

echo -e "${BLUE}=== FORCE DEPLOYMENT V2 ARCHITECTURE ===${NC}"

# Step 1: Update docker-compose.yml on NAS
echo -e "${YELLOW}1. Updating docker-compose.yml...${NC}"
sshpass -p "$SSHPASS" scp docker-compose.production.yml ${NAS_USER}@${NAS_HOST}:${NAS_PATH}/docker-compose.yml

# Step 2: Check if we need to setup GitHub auth
echo -e "${YELLOW}2. Setting up GitHub Container Registry authentication...${NC}"
sshpass -p "$SSHPASS" ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_PATH} && echo '$SUDO_PASS' | sudo -S sh -c 'echo $GITHUB_TOKEN | /usr/local/bin/docker login ghcr.io -u $GITHUB_USER --password-stdin || true'"

# Step 3: Stop old services
echo -e "${YELLOW}3. Stopping old services...${NC}"
sshpass -p "$SSHPASS" ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_PATH} && echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker-compose down --remove-orphans || true"

# Step 4: Pull new images
echo -e "${YELLOW}4. Pulling new images...${NC}"
sshpass -p "$SSHPASS" ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_PATH} && echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker-compose pull --ignore-pull-failures"

# Step 5: Start new services
echo -e "${YELLOW}5. Starting new services...${NC}"
sshpass -p "$SSHPASS" ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_PATH} && echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker-compose up -d --force-recreate"

# Step 6: Check status
echo -e "${YELLOW}6. Checking status...${NC}"
sleep 10
sshpass -p "$SSHPASS" ssh ${NAS_USER}@${NAS_HOST} "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker ps | grep ai-"

echo -e "${GREEN}=== DEPLOYMENT COMPLETED ===${NC}"
echo -e "${YELLOW}Frontend should be accessible on port 3003${NC}"
echo -e "${YELLOW}API should be accessible on port 3000${NC}"