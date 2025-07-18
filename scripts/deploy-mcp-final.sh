#!/bin/bash
# MCP Bridge Deployment Script - Final Version
# Handles long build times and proper docker access

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

echo -e "${BLUE}🚀 MCP Bridge Deployment${NC}"
echo "========================="
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

# Step 6: Build Docker image (with proper timeout)
echo -e "${BLUE}6️⃣ Building Docker image...${NC}"
echo -e "${YELLOW}⚠️  This may take 3-5 minutes for the first build...${NC}"

# Create a build script on the remote host
if [ -n "$SSHPASS" ]; then
    sshpass -e ssh ${NAS_USER}@${NAS_HOST} "cat > ${MCP_PATH}/build-mcp.sh << 'EOF'
#!/bin/bash
cd ${MCP_PATH}
# Stop and remove old container if exists
sudo /usr/local/bin/docker stop mcp-bridge 2>/dev/null || true
sudo /usr/local/bin/docker rm mcp-bridge 2>/dev/null || true
# Build new image
sudo /usr/local/bin/docker build -t mcp-bridge:latest .
# Start container
sudo /usr/local/bin/docker compose -f docker-compose.mcp.yml up -d
EOF"
    sshpass -e ssh ${NAS_USER}@${NAS_HOST} "chmod +x ${MCP_PATH}/build-mcp.sh"
    
    # Run the build script with nohup to avoid timeout
    echo "Starting build process on NAS..."
    sshpass -e ssh ${NAS_USER}@${NAS_HOST} "nohup ${MCP_PATH}/build-mcp.sh > ${MCP_PATH}/build.log 2>&1 &"
else
    ssh ${NAS_USER}@${NAS_HOST} "cat > ${MCP_PATH}/build-mcp.sh << 'EOF'
#!/bin/bash
cd ${MCP_PATH}
# Stop and remove old container if exists
sudo /usr/local/bin/docker stop mcp-bridge 2>/dev/null || true
sudo /usr/local/bin/docker rm mcp-bridge 2>/dev/null || true
# Build new image
sudo /usr/local/bin/docker build -t mcp-bridge:latest .
# Start container
sudo /usr/local/bin/docker compose -f docker-compose.mcp.yml up -d
EOF"
    ssh ${NAS_USER}@${NAS_HOST} "chmod +x ${MCP_PATH}/build-mcp.sh"
    
    # Run the build script with nohup to avoid timeout
    echo "Starting build process on NAS..."
    ssh ${NAS_USER}@${NAS_HOST} "nohup ${MCP_PATH}/build-mcp.sh > ${MCP_PATH}/build.log 2>&1 &"
fi

echo -e "${GREEN}✅ Build started in background${NC}"

# Step 7: Monitor build progress
echo -e "${BLUE}7️⃣ Monitoring build progress...${NC}"
echo "Waiting for Docker build to complete..."

# Wait and check build status
for i in {1..30}; do
    sleep 10
    echo -n "."
    
    # Check if container is running
    if [ -n "$SSHPASS" ]; then
        if sshpass -e ssh ${NAS_USER}@${NAS_HOST} "sudo /usr/local/bin/docker ps | grep -q mcp-bridge" 2>/dev/null; then
            echo ""
            echo -e "${GREEN}✅ Container is running!${NC}"
            break
        fi
    else
        if ssh ${NAS_USER}@${NAS_HOST} "sudo /usr/local/bin/docker ps | grep -q mcp-bridge" 2>/dev/null; then
            echo ""
            echo -e "${GREEN}✅ Container is running!${NC}"
            break
        fi
    fi
    
    # After 5 minutes, show build log tail
    if [ $i -eq 30 ]; then
        echo ""
        echo -e "${YELLOW}Build is taking longer than expected. Checking logs...${NC}"
        if [ -n "$SSHPASS" ]; then
            sshpass -e ssh ${NAS_USER}@${NAS_HOST} "tail -20 ${MCP_PATH}/build.log"
        else
            ssh ${NAS_USER}@${NAS_HOST} "tail -20 ${MCP_PATH}/build.log"
        fi
    fi
done

# Step 8: Cleanup
rm -f ../mcp-deploy.tar.gz

# Step 9: Final verification
echo -e "${BLUE}8️⃣ Verifying deployment...${NC}"
sleep 5

# Check container status one more time
echo -n "Container status: "
if [ -n "$SSHPASS" ]; then
    if sshpass -e ssh ${NAS_USER}@${NAS_HOST} "sudo /usr/local/bin/docker ps | grep -q mcp-bridge" 2>/dev/null; then
        echo -e "${GREEN}Running${NC}"
    else
        echo -e "${RED}Not running${NC}"
        echo ""
        echo "Checking recent logs..."
        sshpass -e ssh ${NAS_USER}@${NAS_HOST} "tail -50 ${MCP_PATH}/build.log"
        exit 1
    fi
else
    if ssh ${NAS_USER}@${NAS_HOST} "sudo /usr/local/bin/docker ps | grep -q mcp-bridge" 2>/dev/null; then
        echo -e "${GREEN}Running${NC}"
    else
        echo -e "${RED}Not running${NC}"
        echo ""
        echo "Checking recent logs..."
        ssh ${NAS_USER}@${NAS_HOST} "tail -50 ${MCP_PATH}/build.log"
        exit 1
    fi
fi

# Test health endpoint
echo -n "Health endpoint: "
if curl -s -f "http://${NAS_HOST}:8380/health" >/dev/null 2>&1; then
    echo -e "${GREEN}Responsive${NC}"
else
    echo -e "${YELLOW}Not yet responsive (may still be starting)${NC}"
fi

echo ""
echo -e "${GREEN}✅ MCP Bridge deployment complete!${NC}"
echo ""
echo "Commands:"
echo "- Check status: make mcp-status"
echo "- View logs: make mcp-logs"
echo "- Test tools: make mcp-test-secure"
echo "- Validate: make mcp-validate-deployment"