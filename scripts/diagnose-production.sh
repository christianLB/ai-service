#!/bin/bash

# Production Diagnostic Script
# Helps diagnose issues with the AI Service in production

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROD_HOST="192.168.1.11"
PROD_USER="k2600x"

echo -e "${BLUE}🔍 AI Service Production Diagnostics${NC}"
echo "================================================"
echo ""

# Check container status
echo -e "${YELLOW}1. Container Status:${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' | grep -E 'NAMES|ai-service'" 2>/dev/null || echo "Unable to check containers"
echo ""

# Check recent logs
echo -e "${YELLOW}2. Recent API Logs (last 30 lines):${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker logs ai-service --tail 30 2>&1" 2>/dev/null || echo "Unable to get logs"
echo ""

# Check for migration errors
echo -e "${YELLOW}3. Migration Related Logs:${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker logs ai-service 2>&1 | grep -i -E 'migration|prisma|database|schema'" 2>/dev/null | tail -20 || echo "No migration logs found"
echo ""

# Check for error messages
echo -e "${YELLOW}4. Error Messages:${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker logs ai-service 2>&1 | grep -i -E 'error|failed|fatal|crash'" 2>/dev/null | tail -20 || echo "No errors found"
echo ""

# Check restart count
echo -e "${YELLOW}5. Container Restart Information:${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker inspect ai-service --format='RestartCount: {{.RestartCount}}' 2>/dev/null" || echo "Unable to get restart count"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker inspect ai-service --format='Status: {{.State.Status}}' 2>/dev/null" || echo "Unable to get status"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker inspect ai-service --format='StartedAt: {{.State.StartedAt}}' 2>/dev/null" || echo "Unable to get start time"
echo ""

# Check database connection
echo -e "${YELLOW}6. Database Connection Test:${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker exec ai-postgres pg_isready -U ai_user -d ai_service 2>/dev/null" && echo -e "${GREEN}✓ Database is ready${NC}" || echo -e "${RED}✗ Database not ready${NC}"
echo ""

# Check if prisma directory exists in container
echo -e "${YELLOW}7. Prisma Files in Container:${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker exec ai-service ls -la prisma/ 2>/dev/null | head -5" || echo "Prisma directory not found or container not running"
echo ""

# Check environment variables (without showing sensitive data)
echo -e "${YELLOW}8. Environment Check:${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker exec ai-service sh -c 'echo DATABASE_URL: \${DATABASE_URL:+SET} && echo NODE_ENV: \$NODE_ENV' 2>/dev/null" || echo "Unable to check environment"
echo ""

echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}Diagnostic complete!${NC}"
echo ""
echo "Common issues and solutions:"
echo "1. If container is restarting: Check error logs above"
echo "2. If 'Prisma directory not found': Need to rebuild image with prisma included"
echo "3. If DATABASE_URL not set: Check docker-compose environment variables"
echo "4. If migration errors: May need to run migrations manually"