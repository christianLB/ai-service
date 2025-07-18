#!/bin/bash
# MCP Bridge Deployment Script V2
# Simplified deployment with proper docker handling

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment variables
if [ -f ".make.env" ]; then
    set -a
    source .make.env
    set +a
else
    echo -e "${RED}❌ .make.env not found${NC}"
    exit 1
fi

# Configuration
MCP_PATH="/volume1/docker/ai-service-mcp"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_DIR="${SCRIPT_DIR}/../mcp-bridge"

echo -e "${BLUE}🚀 MCP Bridge Deployment V2${NC}"
echo "============================"
echo ""

# Step 1: Validate configuration
echo -e "${BLUE}1️⃣ Validating configuration...${NC}"
if [ -f "${MCP_DIR}/.env.production" ]; then
    echo -e "${GREEN}✅ Production configuration found${NC}"
else
    echo -e "${RED}❌ Production configuration not found${NC}"
    echo "Run: cd mcp-bridge/scripts && ./secure-setup.sh --production"
    exit 1
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

# Step 3: Setup remote directories
echo -e "${BLUE}3️⃣ Setting up remote directories...${NC}"
if [ -n "$SSHPASS" ]; then
    sshpass -e ssh ${NAS_USER}@${NAS_HOST} "
        sudo mkdir -p ${MCP_PATH}/config ${MCP_PATH}/logs
        sudo chown -R ${NAS_USER}:users ${MCP_PATH}
    "
else
    ssh ${NAS_USER}@${NAS_HOST} "
        sudo mkdir -p ${MCP_PATH}/config ${MCP_PATH}/logs
        sudo chown -R ${NAS_USER}:users ${MCP_PATH}
    "
fi
echo -e "${GREEN}✅ Directories created${NC}"

# Step 4: Transfer and extract
echo -e "${BLUE}4️⃣ Transferring package...${NC}"
if [ -n "$SSHPASS" ]; then
    sshpass -e scp ../mcp-deploy.tar.gz ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/
    sshpass -e ssh ${NAS_USER}@${NAS_HOST} "
        cd ${MCP_PATH}
        tar xzf mcp-deploy.tar.gz
        rm mcp-deploy.tar.gz
    "
else
    scp ../mcp-deploy.tar.gz ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/
    ssh ${NAS_USER}@${NAS_HOST} "
        cd ${MCP_PATH}
        tar xzf mcp-deploy.tar.gz
        rm mcp-deploy.tar.gz
    "
fi
echo -e "${GREEN}✅ Package deployed${NC}"

# Step 5: Deploy configuration
echo -e "${BLUE}5️⃣ Setting up configuration...${NC}"
if [ -n "$SSHPASS" ]; then
    sshpass -e scp "${MCP_DIR}/.env.production" ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/config/.env
    sshpass -e ssh ${NAS_USER}@${NAS_HOST} "chmod 600 ${MCP_PATH}/config/.env"
else
    scp "${MCP_DIR}/.env.production" ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/config/.env
    ssh ${NAS_USER}@${NAS_HOST} "chmod 600 ${MCP_PATH}/config/.env"
fi
echo -e "${GREEN}✅ Configuration deployed${NC}"

# Step 6: Build and run with docker
echo -e "${BLUE}6️⃣ Building and starting container...${NC}"
if [ -n "$SSHPASS" ]; then
    # Build image
    echo "Building Docker image..."
    sshpass -e ssh ${NAS_USER}@${NAS_HOST} "
        cd ${MCP_PATH}
        # Use sudo for docker commands
        sudo /usr/local/bin/docker build -t mcp-bridge:latest .
    "
    
    # Start container
    echo "Starting container..."
    sshpass -e ssh ${NAS_USER}@${NAS_HOST} "
        cd ${MCP_PATH}
        # Use sudo for docker commands
        sudo /usr/local/bin/docker compose -f docker-compose.mcp.yml up -d
    "
else
    # Build image
    echo "Building Docker image..."
    ssh ${NAS_USER}@${NAS_HOST} "
        cd ${MCP_PATH}
        # Use sudo for docker commands
        sudo /usr/local/bin/docker build -t mcp-bridge:latest .
    "
    
    # Start container
    echo "Starting container..."
    ssh ${NAS_USER}@${NAS_HOST} "
        cd ${MCP_PATH}
        # Use sudo for docker commands
        sudo /usr/local/bin/docker compose -f docker-compose.mcp.yml up -d
    "
fi
echo -e "${GREEN}✅ Container started${NC}"

# Step 7: Cleanup
rm -f ../mcp-deploy.tar.gz

# Step 8: Verify deployment
echo -e "${BLUE}7️⃣ Verifying deployment...${NC}"
sleep 10

# Check container status
if [ -n "$SSHPASS" ]; then
    if sshpass -e ssh ${NAS_USER}@${NAS_HOST} "sudo /usr/local/bin/docker ps | grep -q mcp-bridge" 2>/dev/null; then
        echo -e "${GREEN}✅ Container is running${NC}"
    else
        echo -e "${RED}❌ Container is not running${NC}"
        exit 1
    fi
else
    if ssh ${NAS_USER}@${NAS_HOST} "sudo /usr/local/bin/docker ps | grep -q mcp-bridge" 2>/dev/null; then
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