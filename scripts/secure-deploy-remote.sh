#!/bin/bash
# Secure Remote Deployment Script
# Uses SSH key authentication - NO PASSWORDS IN ENV FILES

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PRODUCTION_HOST="ai-service.anaxi.net"
PRODUCTION_USER="anaxi"
PROJECT_PATH="~/ai-service"

echo -e "${BLUE}🔐 Secure Remote Deployment to Production${NC}"

# Check if SSH key exists and is configured
echo -e "${YELLOW}🔍 Checking SSH configuration...${NC}"

# Test SSH connection without executing commands
if ! ssh -o BatchMode=yes -o ConnectTimeout=10 "${PRODUCTION_USER}@${PRODUCTION_HOST}" exit 2>/dev/null; then
    echo -e "${RED}❌ SSH connection failed${NC}"
    echo -e "${YELLOW}💡 SSH Key Setup Required:${NC}"
    echo -e "1. Generate SSH key: ${BLUE}ssh-keygen -t ed25519 -C 'deployment-key'${NC}"
    echo -e "2. Copy to server: ${BLUE}ssh-copy-id ${PRODUCTION_USER}@${PRODUCTION_HOST}${NC}"
    echo -e "3. Test connection: ${BLUE}ssh ${PRODUCTION_USER}@${PRODUCTION_HOST}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SSH connection verified${NC}"

# Confirmation
echo -e "${YELLOW}⚠️ This will deploy to PRODUCTION server${NC}"
echo -e "${YELLOW}Server: ${PRODUCTION_HOST}${NC}"
echo -e "${YELLOW}User: ${PRODUCTION_USER}${NC}"
echo -e "${YELLOW}Path: ${PROJECT_PATH}${NC}"
echo ""
echo -e "${YELLOW}Type 'DEPLOY_PRODUCTION' to confirm:${NC}"
read -r confirmation

if [[ "$confirmation" != "DEPLOY_PRODUCTION" ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Execute deployment remotely
echo -e "${YELLOW}🚀 Executing remote deployment...${NC}"

ssh "${PRODUCTION_USER}@${PRODUCTION_HOST}" << 'ENDSSH'
    set -euo pipefail
    
    echo "📂 Navigating to project directory..."
    cd ~/ai-service
    
    echo "📥 Pulling latest project updates..."
    git pull
    
    echo "🐋 Pulling latest Docker image..."
    docker pull ghcr.io/k2600x/ai-service:latest
    
    echo "🔄 Stopping current stack..."
    docker compose down
    
    echo "🚀 Starting stack with Watchtower..."
    docker compose up -d
    
    echo "⏳ Waiting for services to start..."
    sleep 15
    
    echo "🔍 Checking service status..."
    docker compose ps
    
    echo "📊 Checking health..."
    curl -f http://localhost:3000/status || echo "Health check pending..."
    
    echo "✅ Deployment completed successfully"
    echo "💡 Watchtower is now active for auto-updates"
ENDSSH

deployment_exit_code=$?

if [[ $deployment_exit_code -eq 0 ]]; then
    echo -e "${GREEN}🎉 Remote deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "• Watchtower is now active for auto-updates"
    echo -e "• Future pushes will auto-deploy"
    echo -e "• Check logs: ${YELLOW}ssh ${PRODUCTION_USER}@${PRODUCTION_HOST} 'cd ${PROJECT_PATH} && docker compose logs watchtower'${NC}"
    echo -e "• Test notification: ${YELLOW}curl -X POST https://${PRODUCTION_HOST}/api/test-notification${NC}"
else
    echo -e "${RED}❌ Remote deployment failed${NC}"
    exit 1
fi