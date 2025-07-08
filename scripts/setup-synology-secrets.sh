#!/bin/bash
# Setup script for Synology NAS deployment with optimized secrets management
# This script implements the recommended env_file approach

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SYNOLOGY_HOST="${SYNOLOGY_HOST:-}"
SYNOLOGY_USER="${SYNOLOGY_USER:-admin}"
PROJECT_DIR="/volume1/docker/ai-service"
CONFIG_DIR="${PROJECT_DIR}/config"
ENV_FILE="${CONFIG_DIR}/production.env"

echo -e "${BLUE}🔐 Synology NAS Secrets Setup${NC}"
echo -e "${BLUE}=============================${NC}"

# Check if we're running on Synology or remotely
if [[ -z "$SYNOLOGY_HOST" ]]; then
    echo -e "${YELLOW}🏠 Running locally on Synology NAS${NC}"
    LOCAL_SETUP=true
else
    echo -e "${YELLOW}🌐 Running remote setup for: $SYNOLOGY_HOST${NC}"
    LOCAL_SETUP=false
fi

# Function to execute commands (local or remote)
execute_command() {
    local cmd="$1"
    if [[ "$LOCAL_SETUP" == true ]]; then
        eval "$cmd"
    else
        ssh "${SYNOLOGY_USER}@${SYNOLOGY_HOST}" "$cmd"
    fi
}

# Function to copy files (local or remote)
copy_file() {
    local src="$1"
    local dst="$2"
    if [[ "$LOCAL_SETUP" == true ]]; then
        cp "$src" "$dst"
    else
        scp "$src" "${SYNOLOGY_USER}@${SYNOLOGY_HOST}:$dst"
    fi
}

echo -e "${YELLOW}📂 Creating directory structure...${NC}"
execute_command "mkdir -p ${CONFIG_DIR}"
execute_command "mkdir -p ${PROJECT_DIR}/{postgres,redis,logs,workflows,documents,knowledge}"

echo -e "${YELLOW}📝 Setting up production.env file...${NC}"

# Create production.env template if it doesn't exist
if [[ "$LOCAL_SETUP" == true ]]; then
    ENV_EXISTS=$(test -f "$ENV_FILE" && echo "true" || echo "false")
else
    ENV_EXISTS=$(ssh "${SYNOLOGY_USER}@${SYNOLOGY_HOST}" "test -f $ENV_FILE && echo true || echo false")
fi

if [[ "$ENV_EXISTS" == "false" ]]; then
    echo -e "${YELLOW}📄 Creating production.env template...${NC}"
    
    # Create temporary env file
    temp_env=$(mktemp)
    cat > "$temp_env" << 'EOF'
# Database Configuration
POSTGRES_PASSWORD=ultra_secure_password_2025_CHANGE_THIS
REDIS_PASSWORD=redis_secure_password_2025_CHANGE_THIS
DATABASE_URL=postgresql://ai_user:ultra_secure_password_2025_CHANGE_THIS@postgres:5432/ai_service

# API Keys - REPLACE WITH REAL VALUES
OPENAI_API_KEY=sk-proj-your-real-openai-key-here
CLAUDE_API_KEY=your-real-claude-key-here

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-real-telegram-token-here
TELEGRAM_CHAT_ID=your-telegram-chat-id-here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook

# Application Settings
NODE_ENV=production
LOG_LEVEL=info
PORT=3000

# Optional: Banking Integration
GOCARDLESS_SECRET_ID=your-gocardless-secret-id
GOCARDLESS_SECRET_KEY=your-gocardless-secret-key
EOF

    # Copy template to target
    copy_file "$temp_env" "$ENV_FILE"
    rm "$temp_env"
    
    echo -e "${GREEN}✅ Created production.env template${NC}"
    echo -e "${RED}⚠️  IMPORTANT: Edit $ENV_FILE with real values!${NC}"
else
    echo -e "${GREEN}✅ production.env already exists${NC}"
fi

echo -e "${YELLOW}🔒 Setting secure permissions...${NC}"
execute_command "chmod 600 $ENV_FILE"
execute_command "chown root:root $ENV_FILE || true"  # Ignore if not root

echo -e "${YELLOW}📥 Downloading optimized Docker Compose...${NC}"
compose_url="https://raw.githubusercontent.com/k2600x/ai-service/main/docker-compose.synology-optimized.yml"
execute_command "curl -s -o ${PROJECT_DIR}/docker-compose.yml '$compose_url'"

echo -e "${YELLOW}🔍 Verifying setup...${NC}"

# Verify files exist and have correct permissions
if [[ "$LOCAL_SETUP" == true ]]; then
    if [[ -f "$ENV_FILE" ]]; then
        echo -e "${GREEN}✅ production.env exists${NC}"
        echo -e "${BLUE}📋 Permissions: $(ls -la $ENV_FILE)${NC}"
    else
        echo -e "${RED}❌ production.env missing${NC}"
        exit 1
    fi
else
    # Remote verification
    if execute_command "test -f $ENV_FILE"; then
        echo -e "${GREEN}✅ production.env exists${NC}"
        echo -e "${BLUE}📋 Permissions: $(execute_command "ls -la $ENV_FILE")${NC}"
    else
        echo -e "${RED}❌ production.env missing${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "1. Edit the environment file:"
echo -e "   ${YELLOW}nano $ENV_FILE${NC}"
echo -e "   ${YELLOW}# Replace all placeholder values with real secrets${NC}"
echo ""
echo -e "2. Deploy the application:"
echo -e "   ${YELLOW}cd $PROJECT_DIR${NC}"
echo -e "   ${YELLOW}docker-compose down${NC}"
echo -e "   ${YELLOW}docker-compose up -d${NC}"
echo ""
echo -e "3. Verify deployment:"
echo -e "   ${YELLOW}docker-compose ps${NC}"
echo -e "   ${YELLOW}docker-compose logs ai-service-prod${NC}"
echo ""
echo -e "4. Test the application:"
echo -e "   ${YELLOW}curl http://localhost:3003/status${NC}"
echo ""
echo -e "${BLUE}🔐 Security Notes:${NC}"
echo -e "• Environment file has restricted permissions (600)"
echo -e "• Never commit production.env to version control"
echo -e "• Regularly rotate API keys and passwords"
echo -e "• Monitor application logs for security issues"
echo ""
echo -e "${GREEN}✅ Ready for production deployment!${NC}"