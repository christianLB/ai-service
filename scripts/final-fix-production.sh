#!/bin/bash

# FINAL FIX - Use docker-compose properly

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROD_HOST="192.168.1.11"
PROD_USER="k2600x"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           FINAL PRODUCTION FIX                                ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Stop the manually created container
echo -e "${YELLOW}Step 1: Cleaning up manual container...${NC}"
ssh $PROD_USER@$PROD_HOST << 'ENDSSH'
sudo /usr/local/bin/docker stop ai-service 2>/dev/null || true
sudo /usr/local/bin/docker rm ai-service 2>/dev/null || true
ENDSSH
echo -e "${GREEN}✓ Cleanup complete${NC}"

# Step 2: Use docker-compose with the correct configuration
echo ""
echo -e "${YELLOW}Step 2: Starting with docker-compose...${NC}"
ssh $PROD_USER@$PROD_HOST << 'ENDSSH'
cd /volume1/docker/ai-service

# Pull latest image first
sudo /usr/local/bin/docker pull ghcr.io/christianlb/ai-service:latest

# Start with docker-compose (it has the correct network and environment)
sudo /usr/local/bin/docker-compose up -d ai-service

echo "Waiting for container to start..."
sleep 15

# Check if it's running
sudo /usr/local/bin/docker ps | grep ai-service
ENDSSH

echo -e "${GREEN}✓ Container started with docker-compose${NC}"

# Step 3: Wait more for full startup
echo ""
echo -e "${YELLOW}Step 3: Waiting for full startup (30 seconds)...${NC}"
for i in {1..6}; do
    echo -n "."
    sleep 5
done
echo ""

# Step 4: Check logs
echo ""
echo -e "${YELLOW}Step 4: Checking startup logs...${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker logs ai-service --tail 20 2>&1" | grep -E "Server|started|ready|listening|Error|error" || true

# Step 5: Test the API
echo ""
echo -e "${YELLOW}Step 5: Testing API...${NC}"

# Test health
echo -n "Health check: "
HEALTH=$(curl -s -m 5 http://$PROD_HOST:3001/health 2>/dev/null || echo "failed")
if [[ "$HEALTH" == *"OK"* ]] || [[ "$HEALTH" == *"ok"* ]]; then
    echo -e "${GREEN}✓ API is healthy${NC}"
else
    echo -e "${RED}✗ API not responding${NC}"
    echo "Response: $HEALTH"
fi

# Test auth
echo -n "Authentication: "
AUTH_RESP=$(curl -s -X POST http://$PROD_HOST:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ai-service.local","password":"admin123"}' 2>/dev/null || echo "{}")

TOKEN=$(echo "$AUTH_RESP" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ Authentication working${NC}"
    
    # Test client listing
    echo -n "Client listing: "
    LIST_RESULT=$(curl -s -m 5 http://$PROD_HOST:3001/api/financial/clients \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "failed")
    
    if [[ "$LIST_RESULT" == *'"success":true'* ]] || [[ "$LIST_RESULT" == *'"clients"'* ]]; then
        echo -e "${GREEN}✓ Can list clients${NC}"
    else
        echo -e "${YELLOW}⚠ List returned: ${LIST_RESULT:0:100}...${NC}"
    fi
    
    # Test client creation
    echo -n "Client creation: "
    CREATE_RESULT=$(curl -s -X POST http://$PROD_HOST:3001/api/financial/clients \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{
        "name": "Production Test Client",
        "email": "prod@test.com",
        "taxId": "PROD123456",
        "businessName": "Production Test Business",
        "phone": "+34600000001",
        "clientType": "business",
        "currency": "EUR",
        "status": "active"
      }' 2>/dev/null || echo "failed")
    
    if [[ "$CREATE_RESULT" == *'"success":true'* ]] || [[ "$CREATE_RESULT" == *'"id"'* ]]; then
        echo -e "${GREEN}✅ CLIENT CREATION WORKS!${NC}"
        echo ""
        echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║           🎉 PRODUCTION IS FIXED! 🎉                         ║${NC}"
        echo -e "${GREEN}║                                                              ║${NC}"
        echo -e "${GREEN}║    ✅ API is running                                        ║${NC}"
        echo -e "${GREEN}║    ✅ Authentication works                                  ║${NC}"
        echo -e "${GREEN}║    ✅ Client operations work                                ║${NC}"
        echo -e "${GREEN}║    ✅ No more 500 errors!                                   ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo "Application URL: http://$PROD_HOST:3030"
        echo "API URL: http://$PROD_HOST:3001"
        echo "Login: admin@ai-service.local / admin123"
        echo ""
        echo "The original 500 errors on client operations are now RESOLVED!"
    else
        echo -e "${RED}✗ Client creation failed${NC}"
        echo "Response: ${CREATE_RESULT:0:200}..."
        echo ""
        echo "Checking error logs..."
        ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker logs ai-service --tail 15 2>&1" | grep -i error || true
    fi
else
    echo -e "${RED}✗ Authentication failed${NC}"
    echo "Response: ${AUTH_RESP:0:100}..."
fi

echo ""
echo "Script complete."