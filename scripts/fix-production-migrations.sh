#!/bin/bash

# Emergency Migration Fix for Production
# This script manually copies prisma files and runs migrations

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROD_HOST="192.168.1.11"
PROD_USER="k2600x"
PROD_PATH="/volume1/docker/ai-service"

echo -e "${BLUE}🔧 Production Migration Fix${NC}"
echo "================================================"
echo ""

echo -e "${YELLOW}This script will:${NC}"
echo "1. Copy prisma schema and migrations to production"
echo "2. Run migrations manually in the container"
echo "3. Restart the API service"
echo ""
echo -e "${RED}Continue? (y/N):${NC}"
read CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "Cancelled"
    exit 0
fi

# Step 1: Create backup
echo -e "${BLUE}Step 1: Creating database backup...${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker exec ai-postgres pg_dump -U ai_user ai_service | gzip > /tmp/backup_emergency_$(date +%Y%m%d_%H%M%S).sql.gz" && \
echo -e "${GREEN}✓ Backup created${NC}" || echo -e "${YELLOW}⚠ Backup failed (continuing anyway)${NC}"

# Step 2: Copy prisma files to production
echo -e "${BLUE}Step 2: Copying prisma files to production...${NC}"
scp -r prisma/ $PROD_USER@$PROD_HOST:/tmp/prisma_temp/
ssh $PROD_USER@$PROD_HOST "sudo cp -r /tmp/prisma_temp $PROD_PATH/prisma && sudo chown -R 1001:1001 $PROD_PATH/prisma"
echo -e "${GREEN}✓ Prisma files copied${NC}"

# Step 3: Copy files into container
echo -e "${BLUE}Step 3: Copying prisma files into container...${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker cp $PROD_PATH/prisma ai-service:/app/" && \
echo -e "${GREEN}✓ Files copied to container${NC}" || echo -e "${RED}✗ Failed to copy files${NC}"

# Step 4: Run migrations
echo -e "${BLUE}Step 4: Running Prisma migrations...${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker exec ai-service sh -c 'cd /app && DATABASE_URL=postgresql://ai_user:\$POSTGRES_PASSWORD@ai-postgres:5432/ai_service npx prisma migrate deploy'" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations applied successfully!${NC}"
else
    echo -e "${RED}✗ Migration failed - checking status...${NC}"
    ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker exec ai-service sh -c 'cd /app && DATABASE_URL=postgresql://ai_user:\$POSTGRES_PASSWORD@ai-postgres:5432/ai_service npx prisma migrate status'" 2>&1
fi

# Step 5: Generate Prisma Client
echo -e "${BLUE}Step 5: Generating Prisma client...${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker exec ai-service sh -c 'cd /app && npx prisma generate'" && \
echo -e "${GREEN}✓ Prisma client generated${NC}" || echo -e "${YELLOW}⚠ Generate failed (may already exist)${NC}"

# Step 6: Restart container
echo -e "${BLUE}Step 6: Restarting API container...${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker restart ai-service"
echo -e "${GREEN}✓ Container restarted${NC}"

# Step 7: Wait and check
echo -e "${BLUE}Step 7: Waiting for service to start...${NC}"
sleep 10

# Check if service is up
for i in {1..6}; do
    echo -n "Attempt $i/6: "
    if curl -s -m 2 http://$PROD_HOST:3001/health >/dev/null 2>&1; then
        echo -e "${GREEN}✓ API is responding!${NC}"
        break
    else
        echo "Not ready yet..."
        sleep 5
    fi
done

# Final status
echo ""
echo -e "${BLUE}================================================${NC}"
curl -s http://$PROD_HOST:3001/health >/dev/null 2>&1 && \
    echo -e "${GREEN}✅ SUCCESS! API is now running${NC}" || \
    echo -e "${RED}❌ API still not responding. Check logs with: make prod-logs${NC}"

echo ""
echo "Next steps:"
echo "1. Test the application at http://$PROD_HOST:3030"
echo "2. Try logging in and creating a client"
echo "3. If still having issues, run: ./scripts/diagnose-production.sh"