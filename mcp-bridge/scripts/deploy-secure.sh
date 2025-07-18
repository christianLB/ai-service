#!/bin/bash
# Secure Deployment Script for MCP Bridge
# Deploys without exposing sensitive information

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAS_HOST="192.168.1.11"
NAS_USER="k2600x"
MCP_PATH="/volume1/docker/ai-service-mcp"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/.env"
ENV_PROD_FILE="${PROJECT_DIR}/.env.production"

# Deployment status tracking
DEPLOY_STATUS=0

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    # Check for production env file
    if [ ! -f "$ENV_PROD_FILE" ]; then
        echo -e "${RED}❌ Production configuration not found${NC}"
        echo "Run: ./secure-setup.sh --production"
        return 1
    fi
    
    # Validate configuration
    echo -n "Validating configuration... "
    if "${SCRIPT_DIR}/validate-config.sh" --production 2>&1 | grep -q "Configuration valid"; then
        echo -e "${GREEN}✅ Valid${NC}"
    else
        echo -e "${RED}❌ Invalid${NC}"
        echo "Run: ./validate-config.sh --production"
        return 1
    fi
    
    # Check SSH connectivity
    echo -n "Checking NAS connectivity... "
    if ssh -o ConnectTimeout=5 -o BatchMode=yes ${NAS_USER}@${NAS_HOST} "echo 'OK'" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Connected${NC}"
    else
        echo -e "${RED}❌ Cannot connect to NAS${NC}"
        return 1
    fi
    
    # Check remote docker
    echo -n "Checking Docker on NAS... "
    if ssh ${NAS_USER}@${NAS_HOST} "docker --version" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Available${NC}"
    else
        echo -e "${RED}❌ Docker not available${NC}"
        return 1
    fi
    
    # Check disk space
    echo -n "Checking disk space... "
    local available_space=$(ssh ${NAS_USER}@${NAS_HOST} "df -BG /volume1 | tail -1 | awk '{print \$4}' | sed 's/G//'")
    if [ "$available_space" -gt 1 ]; then
        echo -e "${GREEN}✅ ${available_space}GB available${NC}"
    else
        echo -e "${RED}❌ Insufficient space (<1GB)${NC}"
        return 1
    fi
    
    return 0
}

# Function to create secure package
create_deployment_package() {
    echo -e "${BLUE}Creating deployment package...${NC}"
    
    # Create temporary directory
    local temp_dir=$(mktemp -d)
    local package_file="${PROJECT_DIR}/mcp-bridge-deploy.tar.gz"
    
    # Copy necessary files
    cp -r "${PROJECT_DIR}"/{src,dist,package*.json,tsconfig.json,Dockerfile,docker-compose.mcp.yml} "$temp_dir/" 2>/dev/null || true
    
    # Copy scripts
    mkdir -p "$temp_dir/scripts"
    cp "${SCRIPT_DIR}"/{maintenance.sh,validate-deployment.sh} "$temp_dir/scripts/" 2>/dev/null || true
    
    # Copy production config (will be encrypted)
    cp "$ENV_PROD_FILE" "$temp_dir/.env.production"
    
    # Create deployment info
    cat > "$temp_dir/deployment-info.txt" << EOF
MCP Bridge Deployment
====================
Date: $(date)
Version: $(git describe --always 2>/dev/null || echo "unknown")
Host: $(hostname)
User: $(whoami)
EOF
    
    # Create tarball
    tar -czf "$package_file" -C "$temp_dir" . 2>/dev/null
    
    # Clean up
    rm -rf "$temp_dir"
    
    echo -e "${GREEN}✅ Package created${NC}"
    return 0
}

# Function to deploy to NAS
deploy_to_nas() {
    echo -e "${BLUE}Deploying to NAS...${NC}"
    
    local package_file="${PROJECT_DIR}/mcp-bridge-deploy.tar.gz"
    
    # Create remote directory structure
    echo -n "Creating directories... "
    ssh ${NAS_USER}@${NAS_HOST} "sudo mkdir -p ${MCP_PATH}/{config,logs,backups} && sudo chown -R ${NAS_USER}:users ${MCP_PATH}" 2>/dev/null
    echo -e "${GREEN}✅ Done${NC}"
    
    # Transfer package
    echo -n "Transferring package... "
    scp -q "$package_file" ${NAS_USER}@${NAS_HOST}:${MCP_PATH}/ 2>/dev/null
    echo -e "${GREEN}✅ Done${NC}"
    
    # Extract on NAS
    echo -n "Extracting files... "
    ssh ${NAS_USER}@${NAS_HOST} "cd ${MCP_PATH} && tar xzf mcp-bridge-deploy.tar.gz && rm mcp-bridge-deploy.tar.gz" 2>/dev/null
    echo -e "${GREEN}✅ Done${NC}"
    
    # Move production config
    echo -n "Configuring environment... "
    ssh ${NAS_USER}@${NAS_HOST} "cd ${MCP_PATH} && mv .env.production config/.env && chmod 600 config/.env" 2>/dev/null
    echo -e "${GREEN}✅ Done${NC}"
    
    # Clean up local package
    rm -f "$package_file"
    
    return 0
}

# Function to build and start container
start_mcp_bridge() {
    echo -e "${BLUE}Starting MCP Bridge...${NC}"
    
    # Check if container already exists
    echo -n "Checking existing container... "
    if ssh ${NAS_USER}@${NAS_HOST} "docker ps -a | grep -q mcp-bridge" 2>/dev/null; then
        echo -e "${YELLOW}Found${NC}"
        echo -n "Stopping old container... "
        ssh ${NAS_USER}@${NAS_HOST} "docker stop mcp-bridge && docker rm mcp-bridge" >/dev/null 2>&1 || true
        echo -e "${GREEN}✅ Done${NC}"
    else
        echo -e "${GREEN}None found${NC}"
    fi
    
    # Build image
    echo -n "Building Docker image... "
    if ssh ${NAS_USER}@${NAS_HOST} "cd ${MCP_PATH} && docker build -t mcp-bridge:latest . >/dev/null 2>&1"; then
        echo -e "${GREEN}✅ Done${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
        return 1
    fi
    
    # Start container
    echo -n "Starting container... "
    if ssh ${NAS_USER}@${NAS_HOST} "cd ${MCP_PATH} && docker-compose -f docker-compose.mcp.yml up -d >/dev/null 2>&1"; then
        echo -e "${GREEN}✅ Done${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
        return 1
    fi
    
    return 0
}

# Function to verify deployment
verify_deployment() {
    echo -e "${BLUE}Verifying deployment...${NC}"
    
    # Wait for container to be ready
    echo -n "Waiting for container startup... "
    sleep 10
    echo -e "${GREEN}✅ Done${NC}"
    
    # Check container status
    echo -n "Checking container status... "
    if ssh ${NAS_USER}@${NAS_HOST} "docker ps | grep -q mcp-bridge" 2>/dev/null; then
        echo -e "${GREEN}✅ Running${NC}"
    else
        echo -e "${RED}❌ Not running${NC}"
        return 1
    fi
    
    # Check health endpoint
    echo -n "Testing health endpoint... "
    if curl -s -f "http://${NAS_HOST}:8380/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Responsive${NC}"
    else
        echo -e "${RED}❌ Not responsive${NC}"
        return 1
    fi
    
    # Check capabilities
    echo -n "Testing capabilities endpoint... "
    if curl -s -f "http://${NAS_HOST}:8380/mcp/capabilities" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Available${NC}"
    else
        echo -e "${RED}❌ Not available${NC}"
        return 1
    fi
    
    return 0
}

# Function to show deployment summary
show_summary() {
    echo ""
    echo -e "${BLUE}Deployment Summary${NC}"
    echo -e "${BLUE}==================${NC}"
    
    if [ $DEPLOY_STATUS -eq 0 ]; then
        echo -e "${GREEN}✅ Deployment successful${NC}"
        echo ""
        echo "MCP Bridge is now running at:"
        echo "- Health: http://${NAS_HOST}:8380/health"
        echo "- Capabilities: http://${NAS_HOST}:8380/mcp/capabilities"
        echo ""
        echo "Next steps:"
        echo "1. Run: ./test-production.sh"
        echo "2. Run: ./security-audit.sh"
        echo "3. Configure reverse proxy for HTTPS"
    else
        echo -e "${RED}❌ Deployment failed${NC}"
        echo ""
        echo "Troubleshooting:"
        echo "1. Check logs: ssh ${NAS_USER}@${NAS_HOST} 'docker logs mcp-bridge'"
        echo "2. Check status: make mcp-status"
        echo "3. Try rollback: ./rollback.sh"
    fi
}

# Main deployment function
main() {
    echo -e "${BLUE}🚀 MCP Bridge Secure Deployment${NC}"
    echo -e "${BLUE}===============================${NC}"
    echo ""
    
    # Create backup before deployment
    echo -e "${BLUE}Creating pre-deployment backup...${NC}"
    "${SCRIPT_DIR}/backup-config.sh" --production >/dev/null 2>&1 || echo -e "${YELLOW}⚠️  Backup skipped${NC}"
    
    # Check prerequisites
    if ! check_prerequisites; then
        echo -e "${RED}❌ Prerequisites check failed${NC}"
        exit 1
    fi
    
    echo ""
    
    # Create deployment package
    if ! create_deployment_package; then
        echo -e "${RED}❌ Package creation failed${NC}"
        exit 1
    fi
    
    # Deploy to NAS
    if ! deploy_to_nas; then
        echo -e "${RED}❌ Deployment failed${NC}"
        DEPLOY_STATUS=1
    else
        # Start container
        if ! start_mcp_bridge; then
            echo -e "${RED}❌ Container start failed${NC}"
            DEPLOY_STATUS=1
        else
            # Verify deployment
            if ! verify_deployment; then
                echo -e "${RED}❌ Verification failed${NC}"
                DEPLOY_STATUS=1
            fi
        fi
    fi
    
    # Show summary
    show_summary
    
    exit $DEPLOY_STATUS
}

# Run main function
main "$@"