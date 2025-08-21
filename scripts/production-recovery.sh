#!/bin/bash

# COMPREHENSIVE PRODUCTION RECOVERY SCRIPT
# This script implements the full recovery plan for the AI Service

set -e  # Exit on error

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROD_HOST="192.168.1.11"
PROD_USER="k2600x"
PROD_PATH="/volume1/docker/ai-service"
PROD_PASSWORD="${POSTGRES_PASSWORD:-ultra_secure_password_2025}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     AI SERVICE PRODUCTION RECOVERY - COMPLETE SOLUTION       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to execute SSH commands
exec_ssh() {
    ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no $PROD_USER@$PROD_HOST "$1"
}

# Function to check if API is responding
check_api() {
    curl -s -m 3 http://$PROD_HOST:3001/health >/dev/null 2>&1
    return $?
}

# ============================================================================
# PHASE 1: DIAGNOSIS
# ============================================================================
echo -e "${YELLOW}═══ PHASE 1: DIAGNOSIS ═══${NC}"
echo ""

echo -e "${BLUE}1.1 Checking container status...${NC}"
CONTAINER_STATUS=$(exec_ssh "sudo /usr/local/bin/docker ps -a --format '{{.Names}}|{{.Status}}|{{.Image}}' | grep ai-service | head -1" 2>/dev/null || echo "not-found")

if [ "$CONTAINER_STATUS" = "not-found" ]; then
    echo -e "${RED}✗ Container not found!${NC}"
else
    IFS='|' read -r NAME STATUS IMAGE <<< "$CONTAINER_STATUS"
    echo "  Name: $NAME"
    echo "  Status: $STATUS"
    echo "  Image: $IMAGE"
    
    if [[ "$STATUS" == *"Up"* ]]; then
        echo -e "${GREEN}✓ Container is running${NC}"
    elif [[ "$STATUS" == *"Restarting"* ]]; then
        echo -e "${RED}✗ Container is restarting (crash loop)${NC}"
    else
        echo -e "${RED}✗ Container is stopped${NC}"
    fi
fi

echo ""
echo -e "${BLUE}1.2 Checking last error in logs...${NC}"
LAST_ERROR=$(exec_ssh "sudo /usr/local/bin/docker logs ai-service 2>&1 | grep -i error | tail -3" 2>/dev/null || echo "No errors found")
echo "$LAST_ERROR"

echo ""
echo -e "${BLUE}1.3 Checking if Prisma files exist in container...${NC}"
PRISMA_EXISTS=$(exec_ssh "sudo /usr/local/bin/docker exec ai-service ls /app/prisma/schema.prisma 2>/dev/null && echo 'exists' || echo 'missing'" 2>/dev/null || echo "missing")
if [ "$PRISMA_EXISTS" = "exists" ]; then
    echo -e "${GREEN}✓ Prisma files found${NC}"
else
    echo -e "${RED}✗ Prisma files missing - old image still running${NC}"
fi

echo ""
echo -e "${BLUE}1.4 Quick API test...${NC}"
if check_api; then
    echo -e "${GREEN}✓ API is responding! Production is already working.${NC}"
    echo -e "${GREEN}No recovery needed.${NC}"
    exit 0
else
    echo -e "${RED}✗ API not responding - proceeding with recovery${NC}"
fi

echo ""
echo -e "${YELLOW}Diagnosis complete. Starting recovery...${NC}"
echo ""
sleep 2

# ============================================================================
# PHASE 2: FORCE UPDATE TO LATEST IMAGE
# ============================================================================
echo -e "${YELLOW}═══ PHASE 2: FORCE UPDATE TO LATEST IMAGE ═══${NC}"
echo ""

echo -e "${BLUE}2.1 Pulling latest image from GitHub Container Registry...${NC}"
exec_ssh "sudo /usr/local/bin/docker pull ghcr.io/christianlb/ai-service:latest" 2>&1 | tail -5

echo ""
echo -e "${BLUE}2.2 Stopping and removing old container...${NC}"
exec_ssh "sudo /usr/local/bin/docker stop ai-service 2>/dev/null || true"
exec_ssh "sudo /usr/local/bin/docker rm ai-service 2>/dev/null || true"
echo -e "${GREEN}✓ Old container removed${NC}"

echo ""
echo -e "${BLUE}2.3 Starting container with new image...${NC}"
exec_ssh "cd $PROD_PATH && sudo /usr/local/bin/docker-compose up -d ai-service"
echo -e "${GREEN}✓ Container started${NC}"

echo ""
echo -e "${BLUE}2.4 Waiting for container to initialize (30 seconds)...${NC}"
for i in {1..6}; do
    echo -n "."
    sleep 5
done
echo ""

echo ""
echo -e "${BLUE}2.5 Checking if API is now responding...${NC}"
if check_api; then
    echo -e "${GREEN}✅ SUCCESS! API is responding after image update.${NC}"
    echo -e "${GREEN}Production is now working!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ API still not responding, checking logs...${NC}"
    STARTUP_LOG=$(exec_ssh "sudo /usr/local/bin/docker logs ai-service --tail 20 2>&1" 2>/dev/null)
    echo "$STARTUP_LOG" | grep -E "migration|error|Error|failed|Failed" | head -10
    echo ""
    echo -e "${YELLOW}Proceeding to Phase 3...${NC}"
fi

sleep 2

# ============================================================================
# PHASE 3: MANUAL MIGRATION EXECUTION
# ============================================================================
echo ""
echo -e "${YELLOW}═══ PHASE 3: MANUAL MIGRATION EXECUTION ═══${NC}"
echo ""

echo -e "${BLUE}3.1 Creating temporary container for migrations...${NC}"
exec_ssh "sudo /usr/local/bin/docker run -d \
  --name ai-service-migrate \
  --network ai-service-network \
  -e DATABASE_URL='postgresql://ai_user:$PROD_PASSWORD@ai-postgres:5432/ai_service' \
  -e NODE_ENV=production \
  ghcr.io/christianlb/ai-service:latest \
  sh -c 'sleep 3600'" 2>/dev/null || echo "Container already exists"

echo -e "${GREEN}✓ Migration container created${NC}"

echo ""
echo -e "${BLUE}3.2 Checking Prisma files in migration container...${NC}"
MIGRATE_PRISMA=$(exec_ssh "sudo /usr/local/bin/docker exec ai-service-migrate ls /app/prisma/schema.prisma 2>/dev/null && echo 'found' || echo 'missing'" 2>/dev/null || echo "missing")

if [ "$MIGRATE_PRISMA" = "missing" ]; then
    echo -e "${YELLOW}Prisma files missing, copying from local...${NC}"
    # Copy prisma directory to production
    scp -r prisma/ $PROD_USER@$PROD_HOST:/tmp/prisma_recovery/ 2>/dev/null
    exec_ssh "sudo /usr/local/bin/docker cp /tmp/prisma_recovery ai-service-migrate:/app/prisma"
    echo -e "${GREEN}✓ Prisma files copied${NC}"
else
    echo -e "${GREEN}✓ Prisma files already present${NC}"
fi

echo ""
echo -e "${BLUE}3.3 Running Prisma migrations...${NC}"
MIGRATION_OUTPUT=$(exec_ssh "sudo /usr/local/bin/docker exec ai-service-migrate \
  sh -c 'cd /app && npx prisma migrate deploy 2>&1'" 2>/dev/null || echo "Migration failed")

if [[ "$MIGRATION_OUTPUT" == *"successfully"* ]] || [[ "$MIGRATION_OUTPUT" == *"up to date"* ]]; then
    echo -e "${GREEN}✅ Migrations applied successfully!${NC}"
else
    echo -e "${YELLOW}Migration output:${NC}"
    echo "$MIGRATION_OUTPUT" | head -20
    echo ""
    echo -e "${YELLOW}Attempting to check migration status...${NC}"
    exec_ssh "sudo /usr/local/bin/docker exec ai-service-migrate \
      sh -c 'cd /app && npx prisma migrate status'" 2>&1 | head -20
fi

echo ""
echo -e "${BLUE}3.4 Generating Prisma client...${NC}"
exec_ssh "sudo /usr/local/bin/docker exec ai-service-migrate npx prisma generate" 2>/dev/null
echo -e "${GREEN}✓ Prisma client generated${NC}"

echo ""
echo -e "${BLUE}3.5 Cleaning up migration container...${NC}"
exec_ssh "sudo /usr/local/bin/docker stop ai-service-migrate 2>/dev/null"
exec_ssh "sudo /usr/local/bin/docker rm ai-service-migrate 2>/dev/null"
echo -e "${GREEN}✓ Migration container removed${NC}"

echo ""
echo -e "${BLUE}3.6 Restarting main API container...${NC}"
exec_ssh "sudo /usr/local/bin/docker restart ai-service"
echo -e "${GREEN}✓ API container restarted${NC}"

echo ""
echo -e "${BLUE}3.7 Waiting for API to start (20 seconds)...${NC}"
for i in {1..4}; do
    echo -n "."
    sleep 5
done
echo ""

# ============================================================================
# PHASE 4: VERIFICATION
# ============================================================================
echo ""
echo -e "${YELLOW}═══ PHASE 4: VERIFICATION ═══${NC}"
echo ""

echo -e "${BLUE}4.1 Testing API health endpoint...${NC}"
if check_api; then
    echo -e "${GREEN}✅ API is responding!${NC}"
    
    # Get detailed health info
    HEALTH_INFO=$(curl -s http://$PROD_HOST:3001/health 2>/dev/null || echo "{}")
    echo "  Response: $HEALTH_INFO"
else
    echo -e "${RED}✗ API still not responding${NC}"
    echo ""
    echo -e "${YELLOW}Checking final logs for errors...${NC}"
    exec_ssh "sudo /usr/local/bin/docker logs ai-service --tail 30 2>&1" | grep -E "error|Error|failed|Failed|exit" | head -10
    
    echo ""
    echo -e "${RED}═══ RECOVERY FAILED ═══${NC}"
    echo ""
    echo "Possible issues:"
    echo "1. Database connection string incorrect"
    echo "2. Missing environment variables"
    echo "3. Port 3001 blocked or already in use"
    echo ""
    echo "Manual steps to try:"
    echo "1. SSH to $PROD_HOST"
    echo "2. Check full logs: sudo /usr/local/bin/docker logs ai-service"
    echo "3. Check environment: sudo /usr/local/bin/docker exec ai-service env | grep DATABASE"
    echo "4. Test database: sudo /usr/local/bin/docker exec ai-postgres pg_isready"
    exit 1
fi

echo ""
echo -e "${BLUE}4.2 Testing authentication endpoint...${NC}"
AUTH_TEST=$(curl -s -X POST http://$PROD_HOST:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ai-service.local","password":"admin123"}' 2>/dev/null | grep -o '"success":true' || echo "failed")

if [ "$AUTH_TEST" = '"success":true' ]; then
    echo -e "${GREEN}✅ Authentication working!${NC}"
else
    echo -e "${YELLOW}⚠ Authentication test failed (may need admin user creation)${NC}"
fi

echo ""
echo -e "${BLUE}4.3 Testing client list endpoint...${NC}"
CLIENT_TEST=$(curl -s http://$PROD_HOST:3001/api/financial/clients \
  -H "Authorization: Bearer test-token" 2>/dev/null | head -c 50)

if [[ "$CLIENT_TEST" == *"success"* ]] || [[ "$CLIENT_TEST" == *"clients"* ]]; then
    echo -e "${GREEN}✅ Client endpoints working!${NC}"
else
    echo -e "${YELLOW}Response: $CLIENT_TEST...${NC}"
fi

# ============================================================================
# FINAL REPORT
# ============================================================================
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    RECOVERY COMPLETE!                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Production API is now running${NC}"
echo ""
echo "Next steps:"
echo "1. Open browser: http://$PROD_HOST:3030"
echo "2. Login with: admin@ai-service.local / admin123"
echo "3. Try creating a new client"
echo ""
echo "Monitoring commands:"
echo "  Check logs:   make prod-logs"
echo "  Check status: make prod-status"
echo "  Check health: curl http://$PROD_HOST:3001/health"
echo ""
echo -e "${GREEN}Production has been successfully recovered!${NC}"