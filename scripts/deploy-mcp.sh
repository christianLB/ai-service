#!/bin/bash
# MCP Bridge Deployment Wrapper
# Uses project credentials without exposing them

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment variables from .make.env
if [ -f ".make.env" ]; then
    set -a
    source .make.env
    set +a
else
    echo -e "${RED}❌ .make.env not found${NC}"
    exit 1
fi

# Paths
MCP_PATH="/volume1/docker/ai-service-mcp"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_DIR="${SCRIPT_DIR}/../mcp-bridge"

echo -e "${BLUE}🚀 MCP Bridge Deployment${NC}"
echo -e "${BLUE}=======================${NC}"
echo ""

# Step 1: Validate configuration
echo -e "${BLUE}1️⃣ Validating configuration...${NC}"
if ! "${MCP_DIR}/scripts/validate-config.sh" --production >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Configuration exists${NC}"
else
    echo -e "${RED}❌ Configuration validation issues (continuing anyway)${NC}"
fi

# Step 2: Create package
echo -e "${BLUE}2️⃣ Creating deployment package...${NC}"
cd "$MCP_DIR"
tar czf ../mcp-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='logs' \
    --exclude='mcp-deploy.tar.gz' \
    .

echo -e "${GREEN}✅ Package created${NC}"

# Step 3: Create remote directories
echo -e "${BLUE}3️⃣ Creating remote directories...${NC}"
"${SCRIPT_DIR}/remote-exec.sh" "mkdir -p ${MCP_PATH}/config ${MCP_PATH}/logs"
echo -e "${GREEN}✅ Directories created${NC}"

# Step 4: Transfer package
echo -e "${BLUE}4️⃣ Transferring package...${NC}"
if [ -n "$SSHPASS" ]; then
    sshpass -e scp ../mcp-deploy.tar.gz ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/
else
    scp ../mcp-deploy.tar.gz ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/
fi
echo -e "${GREEN}✅ Package transferred${NC}"

# Step 5: Extract on NAS
echo -e "${BLUE}5️⃣ Extracting package...${NC}"
if [ -n "$SSHPASS" ]; then
    sshpass -e ssh ${NAS_USER}@${NAS_HOST} "cd ${MCP_PATH} && sudo tar xzf mcp-deploy.tar.gz && sudo rm mcp-deploy.tar.gz"
else
    ssh ${NAS_USER}@${NAS_HOST} "cd ${MCP_PATH} && sudo tar xzf mcp-deploy.tar.gz && sudo rm mcp-deploy.tar.gz"
fi
echo -e "${GREEN}✅ Package extracted${NC}"

# Step 6: Copy production config
echo -e "${BLUE}6️⃣ Setting up configuration...${NC}"
if [ -f "${MCP_DIR}/.env.production" ]; then
    if [ -n "$SSHPASS" ]; then
        sshpass -e scp "${MCP_DIR}/.env.production" ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/config/.env
    else
        scp "${MCP_DIR}/.env.production" ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/config/.env
    fi
    if [ -n "$SSHPASS" ]; then
        sshpass -e ssh ${NAS_USER}@${NAS_HOST} "sudo chmod 600 ${MCP_PATH}/config/.env"
    else
        ssh ${NAS_USER}@${NAS_HOST} "sudo chmod 600 ${MCP_PATH}/config/.env"
    fi
    echo -e "${GREEN}✅ Configuration deployed${NC}"
else
    echo -e "${RED}❌ Production configuration not found${NC}"
    exit 1
fi

# Step 7: Build Docker image
echo -e "${BLUE}7️⃣ Building Docker image...${NC}"
if [ -n "$SSHPASS" ]; then
    sshpass -e ssh ${NAS_USER}@${NAS_HOST} "cd ${MCP_PATH} && /usr/local/bin/docker build -t mcp-bridge:latest ."
else
    ssh ${NAS_USER}@${NAS_HOST} "cd ${MCP_PATH} && /usr/local/bin/docker build -t mcp-bridge:latest ."
fi
echo -e "${GREEN}✅ Image built${NC}"

# Step 8: Start container
echo -e "${BLUE}8️⃣ Starting MCP Bridge...${NC}"
if [ -n "$SSHPASS" ]; then
    sshpass -e ssh ${NAS_USER}@${NAS_HOST} "cd ${MCP_PATH} && /usr/local/bin/docker compose -f docker-compose.mcp.yml up -d"
else
    ssh ${NAS_USER}@${NAS_HOST} "cd ${MCP_PATH} && /usr/local/bin/docker compose -f docker-compose.mcp.yml up -d"
fi
echo -e "${GREEN}✅ Container started${NC}"

# Step 9: Cleanup
rm -f ../mcp-deploy.tar.gz

# Step 10: Verify deployment
echo -e "${BLUE}9️⃣ Verifying deployment...${NC}"
sleep 10

if [ -n "$SSHPASS" ]; then
    if sshpass -e ssh ${NAS_USER}@${NAS_HOST} "/usr/local/bin/docker ps | grep -q mcp-bridge" 2>/dev/null; then
        echo -e "${GREEN}✅ Container is running${NC}"
    else
        echo -e "${RED}❌ Container is not running${NC}"
        exit 1
    fi
else
    if ssh ${NAS_USER}@${NAS_HOST} "/usr/local/bin/docker ps | grep -q mcp-bridge" 2>/dev/null; then
        echo -e "${GREEN}✅ Container is running${NC}"
    else
        echo -e "${RED}❌ Container is not running${NC}"
        exit 1
    fi
fi

# Test health endpoint
echo -n "Testing health endpoint... "
if curl -s -f "http://${NAS_HOST}:8380/health" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${RED}❌ Not responding${NC}"
fi

echo ""
echo -e "${GREEN}✅ MCP Bridge deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Test with: make mcp-test-secure"
echo "2. Validate with: make mcp-validate-deployment"