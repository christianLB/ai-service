#!/bin/bash
# Simple script to create admin user in production
# This uses a pre-generated bcrypt hash to avoid installation issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Production settings
PROD_HOST=${PROD_HOST:-192.168.1.11}
PROD_USER=${PROD_USER:-k2600x}
PROD_DB_CONTAINER=ai-postgres
PROD_DB_USER=ai_user
PROD_DB_NAME=ai_service

echo -e "${BLUE}👤 Creating admin user in production...${NC}"

# Get email
read -p "Enter email for admin user [admin@ai-service.local]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@ai-service.local}

# Get name
read -p "Enter full name [System Administrator]: " ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-System Administrator}

# Get password
echo -e "${YELLOW}Choose password option:${NC}"
echo "  1) Use temporary password 'admin123' (change after first login)"
echo "  2) Enter custom password"
read -p "Choice (1 or 2): " CHOICE

if [ "$CHOICE" = "2" ]; then
    read -s -p "Enter password (min 12 chars): " ADMIN_PASS
    echo
    if [ ${#ADMIN_PASS} -lt 12 ]; then
        echo -e "${RED}❌ Password must be at least 12 characters${NC}"
        exit 1
    fi
    echo -e "${RED}⚠️  Note: Custom password requires manual hashing. Using temporary password instead.${NC}"
    echo -e "${YELLOW}You can change it after logging in.${NC}"
fi

# For simplicity, use a pre-generated hash for 'admin123'
# This was generated with: bcrypt.hash('admin123', 10)
HASH='$2b$10$X4kv7j5ZcG39WgogSl16yupWBaBvL3aWOHlxXoLCLaJQbvVwG2W/.'
TEMP_PASS='admin123'

echo -e "${YELLOW}📝 Creating user in database...${NC}"

# Create the SQL command
SQL_CMD="INSERT INTO users (email, password_hash, full_name, role, is_active) 
         VALUES ('$ADMIN_EMAIL', '$HASH', '$ADMIN_NAME', 'admin', true) 
         ON CONFLICT (email) DO UPDATE 
         SET password_hash='$HASH', full_name='$ADMIN_NAME', role='admin', updated_at=now() 
         RETURNING email, full_name, role;"

# Execute via SSH
ssh ${PROD_USER}@${PROD_HOST} "sudo /usr/local/bin/docker exec ${PROD_DB_CONTAINER} psql -U ${PROD_DB_USER} -d ${PROD_DB_NAME} -c \"${SQL_CMD}\"" || {
    echo -e "${RED}❌ Failed to create user${NC}"
    exit 1
}

echo -e "${GREEN}✅ Admin user created/updated successfully${NC}"
echo -e "${CYAN}📧 Email: $ADMIN_EMAIL${NC}"
echo -e "${CYAN}👤 Name: $ADMIN_NAME${NC}"
echo -e "${YELLOW}🔑 Temporary Password: $TEMP_PASS${NC}"
echo -e "${RED}⚠️  IMPORTANT: Change this password after first login!${NC}"