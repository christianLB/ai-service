#!/bin/bash
# Simple deployment script for MCP Bridge

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 MCP Bridge Simple Deployment${NC}"
echo "================================"

# Configuration
NAS_HOST="${NAS_HOST:-192.168.1.11}"
NAS_USER="${NAS_USER:-k2600x}"
MCP_PATH="/volume1/docker/ai-service-mcp"

# Step 1: Create tarball excluding unnecessary files
echo -e "${BLUE}1️⃣ Creating deployment package...${NC}"
cd ..
tar czf mcp-bridge.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='logs' \
    --exclude='mcp-bridge.tar.gz' \
    mcp-bridge/
cd mcp-bridge

# Step 2: Transfer to NAS
echo -e "${BLUE}2️⃣ Transferring to NAS...${NC}"
../scripts/remote-exec.sh "mkdir -p ${MCP_PATH}"
if [ -n "$SSHPASS" ]; then
    sshpass -e scp ../mcp-bridge.tar.gz ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/
else
    scp ../mcp-bridge.tar.gz ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/
fi

# Step 3: Extract and setup on NAS
echo -e "${BLUE}3️⃣ Extracting on NAS...${NC}"
../scripts/remote-exec.sh "cd ${MCP_PATH} && tar xzf mcp-bridge.tar.gz && rm mcp-bridge.tar.gz"

# Step 4: Copy config
echo -e "${BLUE}4️⃣ Copying configuration...${NC}"
../scripts/remote-exec.sh "mkdir -p ${MCP_PATH}/config ${MCP_PATH}/logs"
if [ -n "$SSHPASS" ]; then
    sshpass -e scp .env.production ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/config/.env
else
    scp .env.production ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/config/.env
fi

# Step 5: Build Docker image on NAS
echo -e "${BLUE}5️⃣ Building Docker image on NAS...${NC}"
../scripts/remote-exec.sh "cd ${MCP_PATH}/mcp-bridge && docker build -t mcp-bridge:latest ."

# Step 6: Start container
echo -e "${BLUE}6️⃣ Starting MCP Bridge...${NC}"
../scripts/remote-exec.sh "cd ${MCP_PATH}/mcp-bridge && docker-compose -f docker-compose.mcp.yml up -d"

# Clean up local tarball
rm -f ../mcp-bridge.tar.gz

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Check logs: docker logs mcp-bridge"
echo "2. Test health: curl http://${NAS_HOST}:8380/health"