#!/bin/bash
# Setup Watchtower for GitHub Container Registry (GHCR)

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🐋 Setting up Watchtower for GHCR authentication...${NC}"

# Create Docker config for GHCR authentication
mkdir -p ~/.docker

# Generate GitHub Token for Watchtower
echo -e "${YELLOW}📝 Para configurar Watchtower con GHCR necesitas:${NC}"
echo -e "1. Un GitHub Personal Access Token con permisos 'read:packages'"
echo -e "2. Tu username de GitHub"
echo -e "3. Token de Telegram para notificaciones (opcional)"
echo ""

read -p "GitHub Username: " GITHUB_USER
read -s -p "GitHub Token (con read:packages): " GITHUB_TOKEN
echo ""
read -p "Telegram Bot Token (opcional, Enter para saltar): " TELEGRAM_TOKEN

# Create Docker config with GHCR credentials
cat > ~/.docker/config.json << EOF
{
  "auths": {
    "ghcr.io": {
      "auth": "$(echo -n "${GITHUB_USER}:${GITHUB_TOKEN}" | base64 -w 0)"
    }
  }
}
EOF

echo "✅ Docker config created for GHCR authentication"

# Update the watchtower environment in production
echo "🔄 Updating Watchtower configuration..."

# Add to .env.local file
echo -e "${YELLOW}🔧 Updating .env.local with Watchtower configuration...${NC}"

# Backup existing .env.local
if [[ -f ".env.local" ]]; then
    cp .env.local .env.local.backup.$(date +%Y%m%d-%H%M%S)
fi

# Update or add Watchtower variables
{
    echo ""
    echo "# === WATCHTOWER CONFIGURATION ==="
    echo "GITHUB_USER=${GITHUB_USER}"
    echo "GITHUB_TOKEN=${GITHUB_TOKEN}"
    if [[ -n "${TELEGRAM_TOKEN}" ]]; then
        echo "TELEGRAM_BOT_TOKEN=${TELEGRAM_TOKEN}"
    fi
    echo ""
} >> .env.local

echo -e "${GREEN}✅ Watchtower environment configured${NC}"

# Create docker-compose override for immediate testing
echo -e "${YELLOW}🔄 Creating docker-compose override for testing...${NC}"

cat > docker-compose.override.yml << EOF
version: '3.8'
services:
  ai-service:
    image: ghcr.io/k2600x/ai-service:latest
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
      - "com.centurylinklabs.watchtower.scope=ai-service"
  
  watchtower:
    image: containrrr/watchtower:latest
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=60  # Check every minute for testing
      - WATCHTOWER_DEBUG=true
      - REPO_USER=${GITHUB_USER}
      - REPO_PASS=${GITHUB_TOKEN}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ~/.docker/config.json:/config.json:ro
    command: --scope ai-service --cleanup --interval 60
EOF

echo -e "${GREEN}✅ Docker Compose override created for testing${NC}"

echo ""
echo -e "${BLUE}🎯 Próximos pasos:${NC}"
echo -e "1. ${YELLOW}Reiniciar stack:${NC} docker-compose down && docker-compose up -d"
echo -e "2. ${YELLOW}Verificar logs:${NC} docker-compose logs -f watchtower"
echo -e "3. ${YELLOW}Test manual:${NC} curl -X POST http://localhost:3000/api/test-notification"
echo -e "4. ${YELLOW}Verificar versión:${NC} curl http://localhost:3000/api/version"
echo ""
echo -e "${GREEN}✨ Watchtower configurado para auto-updates desde GHCR!${NC}"
echo -e "${YELLOW}💡 Las notificaciones de deployment se enviarán automáticamente${NC}"