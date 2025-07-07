#!/bin/bash
# Production Deployment Script
# Executes zero-downtime deployment with automatic migrations

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$HOME/ai-service-backups"
LOG_FILE="$HOME/ai-service-deployments.log"

# Ensure directories exist
mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Error handler
error_handler() {
    local line_no=$1
    echo -e "${RED}❌ Error on line $line_no. Deployment failed!${NC}"
    log "ERROR: Deployment failed on line $line_no"
    
    # Optional: Rollback logic here
    echo -e "${YELLOW}💡 Check logs: $LOG_FILE${NC}"
    exit 1
}

trap 'error_handler $LINENO' ERR

echo -e "${BLUE}🚀 Starting Production Deployment${NC}"
log "=== PRODUCTION DEPLOYMENT STARTED ==="

# Validate environment
if [[ ! -f "$PROJECT_DIR/.env.local" ]]; then
    echo -e "${RED}❌ .env.local not found!${NC}"
    exit 1
fi

# Load environment
set -a
source "$PROJECT_DIR/.env.local"
set +a

# Validate required variables
REQUIRED_VARS=(
    "POSTGRES_DB" "POSTGRES_USER" "POSTGRES_PASSWORD"
    "OPENAI_API_KEY" "TELEGRAM_BOT_TOKEN"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        echo -e "${RED}❌ Required variable $var is not set${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Environment validation passed${NC}"

# Step 1: Create backup
echo -e "${YELLOW}📸 Creating backup...${NC}"
BACKUP_ID="backup-$(date +%Y%m%d-%H%M%S)"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_ID"
mkdir -p "$BACKUP_PATH"

# Backup current state
cp -r "$PROJECT_DIR/docker-compose.prod.yml" "$BACKUP_PATH/" 2>/dev/null || true
docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" ps > "$BACKUP_PATH/services.txt" 2>/dev/null || true

# Database backup
echo -e "${YELLOW}🗄️ Creating database backup...${NC}"
docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T postgres pg_dump \
    -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_PATH/database.sql" || {
    echo -e "${RED}❌ Database backup failed${NC}"
    exit 1
}

log "Backup created: $BACKUP_ID"
echo -e "${GREEN}✅ Backup created: $BACKUP_ID${NC}"

# Step 2: Check if financial schema migration is needed
echo -e "${YELLOW}🔍 Checking database schema...${NC}"
TABLES_COUNT=$(docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'financial';" | xargs || echo "0")

if [[ "$TABLES_COUNT" -eq 0 ]]; then
    echo -e "${YELLOW}📋 Financial schema not found, will apply migration...${NC}"
    NEED_MIGRATION=true
else
    echo -e "${GREEN}✅ Financial schema exists ($TABLES_COUNT tables)${NC}"
    NEED_MIGRATION=false
fi

# Step 3: Pull new image
NEW_IMAGE="${AI_SERVICE_IMAGE:-ghcr.io/k2600x/ai-service:latest}"
echo -e "${YELLOW}📥 Pulling new image: $NEW_IMAGE${NC}"
docker pull "$NEW_IMAGE"
log "Pulled image: $NEW_IMAGE"

# Step 4: Apply database migrations if needed
if [[ "$NEED_MIGRATION" == "true" ]]; then
    echo -e "${YELLOW}🔄 Applying financial schema migration...${NC}"
    
    # Apply the financial schema
    docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T postgres \
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /docker-entrypoint-initdb.d/financial-schema.sql || {
        
        # If file doesn't exist in container, copy it
        docker cp "$SCRIPT_DIR/financial-schema.sql" \
            $(docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" ps -q postgres):/tmp/financial-schema.sql
        
        docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T postgres \
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/financial-schema.sql
    }
    
    # Verify migration
    TABLES_COUNT_AFTER=$(docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T postgres \
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'financial';" | xargs)
    
    if [[ "$TABLES_COUNT_AFTER" -gt 0 ]]; then
        echo -e "${GREEN}✅ Financial migration completed: $TABLES_COUNT_AFTER tables${NC}"
        log "Financial migration completed: $TABLES_COUNT_AFTER tables"
    else
        echo -e "${RED}❌ Financial migration failed${NC}"
        exit 1
    fi
fi

# Step 5: Zero-downtime deployment
echo -e "${YELLOW}🔄 Performing zero-downtime deployment...${NC}"

# Update the image in environment
export AI_SERVICE_IMAGE="$NEW_IMAGE"

# Scale up new container
echo -e "${YELLOW}⬆️ Starting new container...${NC}"
docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" up -d --no-deps --scale ai-service=2 ai-service

# Wait for new container to be healthy
echo -e "${YELLOW}⏳ Waiting for new container to be healthy...${NC}"
sleep 15

# Check health of new container
for i in {1..12}; do
    if curl -f http://localhost:3000/status >/dev/null 2>&1; then
        echo -e "${GREEN}✅ New container is healthy${NC}"
        break
    fi
    
    if [[ $i -eq 12 ]]; then
        echo -e "${RED}❌ New container failed health check${NC}"
        # Scale back down
        docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" up -d --no-deps --scale ai-service=1 ai-service
        exit 1
    fi
    
    echo -e "${YELLOW}⏳ Health check attempt $i/12...${NC}"
    sleep 5
done

# Scale down to single container (removes old one)
echo -e "${YELLOW}⬇️ Removing old container...${NC}"
docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" up -d --no-deps --scale ai-service=1 ai-service

# Step 6: Verify deployment
echo -e "${YELLOW}🔍 Verifying deployment...${NC}"

# Health checks
sleep 10

# Service health
if ! curl -f http://localhost:3000/status >/dev/null 2>&1; then
    echo -e "${RED}❌ Service health check failed${NC}"
    exit 1
fi

# Financial endpoints health
if curl -f http://localhost:3000/api/financial/dashboard/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Financial services are healthy${NC}"
else
    echo -e "${YELLOW}⚠️ Financial services may need attention${NC}"
fi

# Clean up old images
echo -e "${YELLOW}🧹 Cleaning up old images...${NC}"
docker image prune -f

# Step 7: Success
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
log "Deployment completed successfully with image: $NEW_IMAGE"

# Show status
echo ""
echo -e "${BLUE}📊 Current Status:${NC}"
docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" ps

echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "  • Backup: ${BACKUP_ID}"
echo -e "  • Image: ${NEW_IMAGE}"
echo -e "  • Migration: $([ "$NEED_MIGRATION" == "true" ] && echo "Applied" || echo "Not needed")"
echo -e "  • Status: ${GREEN}SUCCESSFUL${NC}"
echo ""
echo -e "${GREEN}🌐 Service available at: https://ai-service.anaxi.net${NC}"

log "=== DEPLOYMENT COMPLETED SUCCESSFULLY ==="