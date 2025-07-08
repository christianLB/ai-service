#!/bin/bash
# Definitive Synology NAS Production Setup Script
# This script addresses all deployment issues identified by previous analysis

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_DIR="/volume1/docker/ai-service"
CONFIG_DIR="${BASE_DIR}/config"
SCRIPTS_DIR="${BASE_DIR}/scripts"
ENV_FILE="${CONFIG_DIR}/production.env"
COMPOSE_FILE="${BASE_DIR}/docker-compose.yml"
INIT_DB_FILE="${CONFIG_DIR}/init-db.sql"

echo -e "${BLUE}🚀 AI Service Production Setup for Synology NAS${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
echo -e "${YELLOW}This script will set up the AI Service for production deployment${NC}"
echo -e "${YELLOW}on your Synology NAS with all issues from previous deployments fixed.${NC}"
echo ""

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}❌ This script must be run as root or with sudo${NC}"
    echo -e "${YELLOW}Please run: sudo $0${NC}"
    exit 1
fi

echo -e "${YELLOW}📂 Step 1: Creating directory structure...${NC}"

# Create all required directories
mkdir -p "${BASE_DIR}"/{config,logs,postgres,redis,workflows,documents,knowledge}
mkdir -p "${BASE_DIR}/documents"/{inbox,storage,temp,thumbnails}
mkdir -p "${BASE_DIR}/knowledge"/{embeddings,categories,metadata}
mkdir -p "${BASE_DIR}/workflows"/{storage,templates}

echo -e "${GREEN}✅ Directory structure created${NC}"

echo -e "${YELLOW}🔐 Step 2: Setting correct permissions...${NC}"

# Set ownership for Docker containers
# Most Docker containers run as user 1000 or specific UIDs
chown -R 1000:1000 "${BASE_DIR}/logs"
chown -R 1000:1000 "${BASE_DIR}/workflows"
chown -R 1000:1000 "${BASE_DIR}/documents"
chown -R 1000:1000 "${BASE_DIR}/knowledge"

# PostgreSQL runs as user postgres (999)
chown -R 999:999 "${BASE_DIR}/postgres"

# Redis runs as user redis (999)
chown -R 999:999 "${BASE_DIR}/redis"

# Set proper permissions
chmod -R 755 "${BASE_DIR}/logs"
chmod -R 755 "${BASE_DIR}/workflows"
chmod -R 755 "${BASE_DIR}/documents"
chmod -R 755 "${BASE_DIR}/knowledge"
chmod -R 750 "${BASE_DIR}/postgres"
chmod -R 750 "${BASE_DIR}/redis"

echo -e "${GREEN}✅ Permissions set correctly${NC}"

echo -e "${YELLOW}📥 Step 3: Downloading latest configuration files...${NC}"

# Download the corrected docker-compose file
echo -e "${BLUE}   Downloading docker-compose.yml...${NC}"
curl -fsSL "https://raw.githubusercontent.com/k2600x/ai-service/main/docker-compose.production.yml" \
    -o "${COMPOSE_FILE}" || {
    echo -e "${RED}❌ Failed to download docker-compose.yml${NC}"
    exit 1
}

# Download the database initialization script
echo -e "${BLUE}   Downloading init-db.sql...${NC}"
curl -fsSL "https://raw.githubusercontent.com/k2600x/ai-service/main/scripts/init-db.sql" \
    -o "${INIT_DB_FILE}" || {
    echo -e "${RED}❌ Failed to download init-db.sql${NC}"
    exit 1
}

# Download the environment template
echo -e "${BLUE}   Downloading production.env template...${NC}"
curl -fsSL "https://raw.githubusercontent.com/k2600x/ai-service/main/production.env.template" \
    -o "${ENV_FILE}.template" || {
    echo -e "${RED}❌ Failed to download production.env template${NC}"
    exit 1
}

echo -e "${GREEN}✅ Configuration files downloaded${NC}"

echo -e "${YELLOW}📝 Step 4: Setting up environment file...${NC}"

if [[ -f "${ENV_FILE}" ]]; then
    echo -e "${YELLOW}⚠️  production.env already exists. Creating backup...${NC}"
    cp "${ENV_FILE}" "${ENV_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
    echo -e "${GREEN}✅ Backup created${NC}"
else
    echo -e "${BLUE}   Creating new production.env from template...${NC}"
    cp "${ENV_FILE}.template" "${ENV_FILE}"
    echo -e "${GREEN}✅ production.env created from template${NC}"
fi

# Set secure permissions on environment file
chmod 600 "${ENV_FILE}"
chown root:root "${ENV_FILE}"

echo -e "${GREEN}✅ Environment file configured${NC}"

echo -e "${YELLOW}🔍 Step 5: Verifying setup...${NC}"

# Verify all required files exist
REQUIRED_FILES=(
    "${COMPOSE_FILE}"
    "${ENV_FILE}"
    "${INIT_DB_FILE}"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${RED}❌ $file missing${NC}"
        exit 1
    fi
done

# Verify directory structure
REQUIRED_DIRS=(
    "${BASE_DIR}/logs"
    "${BASE_DIR}/postgres"
    "${BASE_DIR}/redis"
    "${BASE_DIR}/workflows"
    "${BASE_DIR}/documents"
    "${BASE_DIR}/knowledge"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        echo -e "${GREEN}✅ $dir exists${NC}"
    else
        echo -e "${RED}❌ $dir missing${NC}"
        exit 1
    fi
done

echo -e "${YELLOW}⚙️ Step 6: Pre-deployment checks...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Check if ports are available
if netstat -tuln | grep -q ':3003 '; then
    echo -e "${YELLOW}⚠️  Port 3003 is already in use${NC}"
    echo -e "${YELLOW}   You may need to stop the existing service${NC}"
fi

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

echo -e "${YELLOW}🎯 Step 7: Final setup tasks...${NC}"

# Create systemd service file for easy management (optional)
cat > /etc/systemd/system/ai-service.service << 'EOF'
[Unit]
Description=AI Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/volume1/docker/ai-service
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ai-service

echo -e "${GREEN}✅ Systemd service created${NC}"

echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 NEXT STEPS:${NC}"
echo ""
echo -e "${YELLOW}1. Edit the environment file with your real secrets:${NC}"
echo -e "   nano ${ENV_FILE}"
echo -e "   ${RED}⚠️  IMPORTANT: Replace ALL values marked with 'CHANGE_THIS'${NC}"
echo ""
echo -e "${YELLOW}2. Navigate to the project directory:${NC}"
echo -e "   cd ${BASE_DIR}"
echo ""
echo -e "${YELLOW}3. Start the services:${NC}"
echo -e "   docker-compose up -d"
echo -e "   ${BLUE}OR${NC}"
echo -e "   systemctl start ai-service"
echo ""
echo -e "${YELLOW}4. Verify the deployment:${NC}"
echo -e "   docker-compose ps"
echo -e "   curl http://localhost:3003/status"
echo ""
echo -e "${YELLOW}5. Monitor the logs:${NC}"
echo -e "   docker-compose logs -f ai-service-prod"
echo ""
echo -e "${BLUE}🔐 SECURITY REMINDERS:${NC}"
echo -e "• Environment file has restricted permissions (600)"
echo -e "• Never commit production.env to version control"
echo -e "• Regularly rotate API keys and passwords"
echo -e "• Monitor logs for security issues"
echo ""
echo -e "${BLUE}📞 SUPPORT:${NC}"
echo -e "• Configuration files: ${CONFIG_DIR}"
echo -e "• Logs location: ${BASE_DIR}/logs"
echo -e "• Backup location: ${ENV_FILE}.backup-*"
echo ""
echo -e "${GREEN}✅ AI Service is ready for production deployment!${NC}"