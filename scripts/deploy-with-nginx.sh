#!/bin/bash
# Deploy with nginx reverse proxy

set -e

echo "🚀 Deploying AI Service with Nginx Reverse Proxy"
echo "================================================"

# Load environment
source .make.env 2>/dev/null || true

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}1. Stopping any local development servers...${NC}"
pkill -f "ts-node-dev.*src/index.ts" 2>/dev/null || true
echo "✅ Local servers stopped"

echo -e "${YELLOW}2. Waiting for GitHub Actions to complete...${NC}"
# Wait for build to complete (max 5 minutes)
WAIT_TIME=0
MAX_WAIT=300
while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    STATUS=$(curl -s https://api.github.com/repos/christianLB/ai-service/actions/runs?per_page=1 | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ "$STATUS" != "in_progress" ]; then
        echo -e "${GREEN}✅ Build completed with status: $STATUS${NC}"
        break
    fi
    echo -n "."
    sleep 10
    WAIT_TIME=$((WAIT_TIME + 10))
done

echo -e "${YELLOW}3. Pulling latest images...${NC}"
sshpass -e ssh $NAS_USER@$NAS_HOST "cd $NAS_PATH && docker-compose -f docker-compose.production.yml pull"

echo -e "${YELLOW}4. Stopping old containers...${NC}"
sshpass -e ssh $NAS_USER@$NAS_HOST "cd $NAS_PATH && docker-compose -f docker-compose.production.yml down"

echo -e "${YELLOW}5. Starting services with nginx...${NC}"
sshpass -e ssh $NAS_USER@$NAS_HOST "cd $NAS_PATH && docker-compose -f docker-compose.production.yml up -d"

echo -e "${YELLOW}6. Waiting for services to be healthy...${NC}"
sleep 10

echo -e "${YELLOW}7. Checking service health...${NC}"
# Check nginx on port 80
NGINX_HEALTH=$(sshpass -e ssh $NAS_USER@$NAS_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost/health" || echo "000")
if [ "$NGINX_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Nginx proxy is healthy${NC}"
else
    echo -e "${RED}❌ Nginx proxy health check failed (HTTP $NGINX_HEALTH)${NC}"
fi

# Check API directly
API_HEALTH=$(sshpass -e ssh $NAS_USER@$NAS_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:3002/health" || echo "000")
if [ "$API_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ API service is healthy${NC}"
else
    echo -e "${RED}❌ API health check failed (HTTP $API_HEALTH)${NC}"
fi

# Check frontend directly
FRONTEND_HEALTH=$(sshpass -e ssh $NAS_USER@$NAS_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:3003/health" || echo "000")
if [ "$FRONTEND_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Frontend service is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed (HTTP $FRONTEND_HEALTH)${NC}"
fi

echo -e "${YELLOW}8. Testing API endpoints through nginx...${NC}"
# Test a financial endpoint
ENDPOINT_TEST=$(sshpass -e ssh $NAS_USER@$NAS_HOST "curl -s http://localhost/api/financial/dashboard/health | grep -o '\"status\":\"[^\"]*\"'" || echo "failed")
if [[ "$ENDPOINT_TEST" == *"healthy"* ]]; then
    echo -e "${GREEN}✅ API endpoints are working through nginx${NC}"
else
    echo -e "${RED}❌ API endpoints not accessible through nginx${NC}"
fi

echo -e "${GREEN}
========================================
Deployment Complete!
========================================

Access points:
- Main URL: http://$NAS_HOST/ (nginx proxy)
- API Direct: http://$NAS_HOST:3002/
- Frontend Direct: http://$NAS_HOST:3003/

The nginx proxy on port 80 will:
- Serve frontend on /
- Proxy API requests from /api to the backend
- Provide unified access point

${NC}"

# Show container status
echo -e "${YELLOW}Container Status:${NC}"
sshpass -e ssh $NAS_USER@$NAS_HOST "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'ai-service|NAME'"