#!/bin/bash

# Quick recovery script - uses make commands for authentication

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           QUICK PRODUCTION RECOVERY                           ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Check current status
echo -e "${YELLOW}Step 1: Checking current status...${NC}"
curl -s -m 2 http://192.168.1.11:3001/health >/dev/null 2>&1 && {
    echo -e "${GREEN}✅ API is already working!${NC}"
    exit 0
} || {
    echo -e "${RED}✗ API not responding, starting recovery...${NC}"
}

# Step 2: Force container restart with latest image
echo ""
echo -e "${YELLOW}Step 2: Pulling latest image and restarting...${NC}"
echo "This will:"
echo "  1. Pull the latest Docker image"
echo "  2. Restart the container"
echo "  3. Run migrations automatically"
echo ""

# Use make commands which have proper SSH auth
echo -e "${BLUE}Executing via Makefile (has SSH credentials)...${NC}"

# Create a command file to execute on remote
cat > /tmp/recovery_commands.sh << 'EOF'
#!/bin/bash
echo "Starting recovery on production server..."

# Pull latest image
echo "1. Pulling latest image..."
sudo /usr/local/bin/docker pull ghcr.io/christianlb/ai-service:latest

# Stop and remove old container
echo "2. Stopping old container..."
sudo /usr/local/bin/docker stop ai-service 2>/dev/null || true
sudo /usr/local/bin/docker rm ai-service 2>/dev/null || true

# Start new container
echo "3. Starting new container..."
cd /volume1/docker/ai-service
sudo /usr/local/bin/docker-compose up -d ai-service

# Wait for startup
echo "4. Waiting for container to start..."
sleep 30

# Check logs
echo "5. Recent logs:"
sudo /usr/local/bin/docker logs ai-service --tail 20 2>&1 | grep -E "migration|Migration|started|Starting|Error|error" || true

echo "Recovery commands completed!"
EOF

# Copy and execute on remote
echo -e "${BLUE}Copying recovery script to production...${NC}"
scp /tmp/recovery_commands.sh k2600x@192.168.1.11:/tmp/ 2>/dev/null || {
    echo -e "${RED}Failed to copy script. Trying direct commands...${NC}"
    
    # Try using the prod-sql command as a workaround
    echo -e "${YELLOW}Using SQL command to check database...${NC}"
    make prod-sql SQL="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1 | grep -E "count|COUNT" || true
}

echo -e "${BLUE}Executing recovery on production...${NC}"
ssh k2600x@192.168.1.11 "bash /tmp/recovery_commands.sh" 2>/dev/null || {
    echo -e "${YELLOW}SSH failed, trying alternative method...${NC}"
    
    # Alternative: use make commands
    echo "y" | make prod-migrate-deploy 2>&1 | grep -E "success|Success|applied|Applied|fail|Fail|error|Error" | head -20
}

# Step 3: Wait and verify
echo ""
echo -e "${YELLOW}Step 3: Waiting for service to stabilize (30 seconds)...${NC}"
for i in {1..6}; do
    echo -n "."
    sleep 5
done
echo ""

# Step 4: Final check
echo ""
echo -e "${YELLOW}Step 4: Verifying recovery...${NC}"

# Test health endpoint
echo -n "Health check: "
curl -s -m 3 http://192.168.1.11:3001/health >/dev/null 2>&1 && {
    echo -e "${GREEN}✅ API is responding!${NC}"
    
    # Test auth
    echo -n "Auth check: "
    AUTH_RESULT=$(curl -s -X POST http://192.168.1.11:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@ai-service.local","password":"admin123"}' 2>/dev/null | grep -o '"success":true' || echo "failed")
    
    if [ "$AUTH_RESULT" = '"success":true' ]; then
        echo -e "${GREEN}✅ Authentication working!${NC}"
    else
        echo -e "${YELLOW}⚠ Auth not working (may need admin user)${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                    RECOVERY SUCCESSFUL!                       ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "✅ Production is now working!"
    echo "📍 URL: http://192.168.1.11:3030"
    echo "🔑 Login: admin@ai-service.local / admin123"
    
} || {
    echo -e "${RED}✗ API still not responding${NC}"
    echo ""
    echo -e "${YELLOW}Manual recovery needed. Try:${NC}"
    echo "1. SSH to server: ssh k2600x@192.168.1.11"
    echo "2. Check logs: sudo /usr/local/bin/docker logs ai-service --tail 50"
    echo "3. Apply emergency schema: make prod-emergency-schema"
    echo ""
    echo "Or wait 5 more minutes for Watchtower to auto-deploy."
}

# Cleanup
rm -f /tmp/recovery_commands.sh