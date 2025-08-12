#!/bin/bash

# Apply emergency schema to production database
# Use this if Prisma migrations fail completely

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROD_HOST="192.168.1.11"
PROD_USER="synoadmin"

echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║           EMERGENCY SCHEMA APPLICATION                       ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${RED}WARNING: This will create tables directly in the database${NC}"
echo -e "${RED}Only use if Prisma migrations fail completely!${NC}"
echo ""
echo "Continue? (y/N): "
read CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "Cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}1. Copying schema file to production...${NC}"
scp scripts/emergency-schema.sql $PROD_USER@$PROD_HOST:/tmp/

echo -e "${BLUE}2. Applying schema to database...${NC}"
ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker exec -i ai-postgres psql -U ai_user -d ai_service < /tmp/emergency-schema.sql"

echo -e "${BLUE}3. Verifying tables...${NC}"
TABLES=$(ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('User', 'Client', 'Invoice', 'users', 'clients', 'invoices');\" -t" | tr -d ' ')

echo "  Tables created: $TABLES"

if [ "$TABLES" -ge "3" ]; then
    echo -e "${GREEN}✅ Schema applied successfully!${NC}"
    echo ""
    echo -e "${BLUE}4. Restarting API container...${NC}"
    ssh $PROD_USER@$PROD_HOST "sudo /usr/local/bin/docker restart ai-service"
    echo -e "${GREEN}✅ Container restarted${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Wait 30 seconds for container to start"
    echo "2. Test API: curl http://$PROD_HOST:3001/health"
    echo "3. Login with: admin@ai-service.local / admin123"
else
    echo -e "${RED}✗ Schema application may have failed${NC}"
    echo "Check logs for errors"
fi

echo ""
echo -e "${BLUE}5. Cleaning up...${NC}"
ssh $PROD_USER@$PROD_HOST "rm /tmp/emergency-schema.sql"
echo -e "${GREEN}Done!${NC}"