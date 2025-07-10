#!/bin/bash
# Migration script for v2 architecture

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== AI Service v2 Architecture Migration ===${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.production.yml" ]; then
    echo -e "${RED}Error: docker-compose.production.yml not found${NC}"
    echo "Please run this script from the ai-service directory"
    exit 1
fi

# Step 1: Backup current setup
echo -e "${YELLOW}Step 1: Creating backup of current configuration...${NC}"
BACKUP_NAME="docker-compose.production.yml.backup-$(date +%Y%m%d-%H%M%S)"
cp docker-compose.production.yml "$BACKUP_NAME"
echo -e "${GREEN}✓ Backup created: $BACKUP_NAME${NC}"

# Step 2: Check for running containers
echo -e "${YELLOW}Step 2: Checking current containers...${NC}"
RUNNING_CONTAINERS=$(docker ps --filter "name=ai-service" --format "{{.Names}}")
if [ -n "$RUNNING_CONTAINERS" ]; then
    echo "Found running containers:"
    echo "$RUNNING_CONTAINERS"
else
    echo "No ai-service containers currently running"
fi

# Step 3: Prepare for migration
echo -e "${YELLOW}Step 3: Preparing v2 configuration...${NC}"
if [ -f "docker-compose.production.v2.yml" ]; then
    echo -e "${GREEN}✓ v2 configuration found${NC}"
else
    echo -e "${RED}Error: docker-compose.production.v2.yml not found${NC}"
    exit 1
fi

# Step 4: Ask for confirmation
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will:${NC}"
echo "  - Stop current containers"
echo "  - Switch to separated frontend/backend architecture"
echo "  - Start new containers"
echo ""
read -p "Continue with migration? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Migration cancelled${NC}"
    exit 0
fi

# Step 5: Stop current containers
echo -e "${YELLOW}Step 5: Stopping current containers...${NC}"
docker-compose down
echo -e "${GREEN}✓ Containers stopped${NC}"

# Step 6: Switch to v2
echo -e "${YELLOW}Step 6: Switching to v2 architecture...${NC}"
cp docker-compose.production.v2.yml docker-compose.production.yml
echo -e "${GREEN}✓ Configuration updated${NC}"

# Step 7: Pull new images
echo -e "${YELLOW}Step 7: Pulling new images...${NC}"
docker-compose pull
echo -e "${GREEN}✓ Images updated${NC}"

# Step 8: Start new containers
echo -e "${YELLOW}Step 8: Starting v2 containers...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Containers started${NC}"

# Step 9: Health check
echo -e "${YELLOW}Step 9: Performing health checks...${NC}"
sleep 10  # Wait for containers to start

# Check API health
if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ API health check passed${NC}"
else
    echo -e "${RED}✗ API health check failed${NC}"
fi

# Check Frontend health
if curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend health check passed${NC}"
else
    echo -e "${RED}✗ Frontend health check failed${NC}"
fi

# Check API proxy
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ API proxy check passed${NC}"
else
    echo -e "${RED}✗ API proxy check failed${NC}"
fi

# Step 10: Show status
echo ""
echo -e "${BLUE}=== Migration Complete ===${NC}"
echo ""
docker ps --filter "name=ai-service" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo -e "${GREEN}✅ v2 architecture is now running!${NC}"
echo ""
echo -e "${YELLOW}Important notes:${NC}"
echo "  • Frontend now updates automatically via Watchtower"
echo "  • API and Frontend deploy independently"
echo "  • Access the app at http://localhost:3000"
echo ""
echo -e "${YELLOW}If you need to rollback:${NC}"
echo "  docker-compose down"
echo "  cp $BACKUP_NAME docker-compose.production.yml"
echo "  docker-compose up -d"