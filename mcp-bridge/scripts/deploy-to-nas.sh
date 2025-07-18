#!/bin/bash
# Deploy MCP Bridge to Synology NAS

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 MCP Bridge Deployment Script${NC}"
echo -e "${BLUE}================================${NC}"

# Load configuration
if [ -f "../../.make.env" ]; then
    source ../../.make.env
else
    echo -e "${RED}❌ .make.env not found. Please create it from .make.env.example${NC}"
    exit 1
fi

# Default values
NAS_HOST=${NAS_HOST:-192.168.1.11}
NAS_USER=${NAS_USER:-admin}
# MCP usa su propio volumen dedicado, separado del AI Service
MCP_PATH="/volume1/docker/ai-service-mcp"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  NAS Host: $NAS_HOST"
echo "  NAS User: $NAS_USER"
echo "  MCP Path: $MCP_PATH"
echo ""

# Step 1: Create directory structure on NAS
echo -e "${BLUE}1️⃣ Creating directory structure on NAS...${NC}"
ssh ${NAS_USER}@${NAS_HOST} "sudo mkdir -p ${MCP_PATH}/{config,logs,scripts,src}"
ssh ${NAS_USER}@${NAS_HOST} "sudo chown -R ${NAS_USER}:users ${MCP_PATH}"

# Step 2: Copy source files to NAS
echo -e "${BLUE}2️⃣ Copying source files to NAS...${NC}"
rsync -avz --exclude='node_modules' --exclude='dist' --exclude='.git' \
    ../../mcp-bridge/ ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/src/

# Step 3: Copy environment configuration
echo -e "${BLUE}3️⃣ Setting up environment configuration...${NC}"
if [ -f ".env" ]; then
    scp .env ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/config/.env
else
    echo -e "${YELLOW}⚠️  No .env file found. Copying .env.example${NC}"
    scp .env.example ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/config/.env
    echo -e "${YELLOW}⚠️  Please edit ${MCP_PATH}/config/.env on the NAS${NC}"
fi

# Copy docker-compose file
scp ../docker-compose.mcp.yml ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/

# Step 4: Build Docker image on NAS
echo -e "${BLUE}4️⃣ Building Docker image on NAS...${NC}"
ssh ${NAS_USER}@${NAS_HOST} "cd ${MCP_PATH}/src && sudo docker build -t mcp-bridge:latest ."

# Step 5: Create shared network if it doesn't exist
echo -e "${BLUE}5️⃣ Creating shared Docker network...${NC}"
ssh ${NAS_USER}@${NAS_HOST} "sudo docker network create ai-service-network || true"

# Step 6: Start MCP Bridge
echo -e "${BLUE}6️⃣ Starting MCP Bridge container...${NC}"
ssh ${NAS_USER}@${NAS_HOST} "cd ${MCP_PATH} && sudo docker-compose -f docker-compose.mcp.yml up -d"

# Step 7: Check status
echo -e "${BLUE}7️⃣ Checking MCP Bridge status...${NC}"
sleep 5
ssh ${NAS_USER}@${NAS_HOST} "sudo docker ps | grep mcp-bridge"

# Step 8: Test health endpoint
echo -e "${BLUE}8️⃣ Testing health endpoint...${NC}"
curl -s http://${NAS_HOST}:8080/health | jq . || echo -e "${RED}❌ Health check failed${NC}"

# Step 9: Configure proxy (optional)
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Configure proxy inverso in Synology DSM:"
echo "   - Source: https://mcp.ai-service.anaxi.net"
echo "   - Destination: http://localhost:8080"
echo ""
echo "2. Set authentication tokens in .env file"
echo ""
echo "3. Test with: ./scripts/mcp-client.py list"
echo ""
echo -e "${GREEN}✅ MCP Bridge deployment complete!${NC}"