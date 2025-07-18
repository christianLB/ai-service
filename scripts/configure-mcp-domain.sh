#!/bin/bash
# Script to help configure mcp.anaxi.net domain
# This provides instructions for manual configuration

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🌐 MCP Bridge Domain Configuration Guide${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}📝 Step 1: Configure Cloudflare DNS${NC}"
echo "1. Log in to Cloudflare Dashboard"
echo "2. Select the anaxi.net domain"
echo "3. Go to DNS settings"
echo "4. Add a new A record:"
echo "   - Type: A"
echo "   - Name: mcp"
echo "   - IPv4 address: [Same IP as ai-service.anaxi.net]"
echo "   - Proxy status: Proxied (orange cloud)"
echo "   - TTL: Auto"
echo ""
read -p "Press Enter when DNS is configured..."

echo ""
echo -e "${YELLOW}📝 Step 2: Configure Synology DSM Reverse Proxy${NC}"
echo "1. Log in to Synology DSM"
echo "2. Open Control Panel → Login Portal → Advanced → Reverse Proxy"
echo "3. Click 'Create' to add a new rule"
echo "4. Configure as follows:"
echo ""
echo "   ${GREEN}General Settings:${NC}"
echo "   - Description: MCP Bridge"
echo "   - Source:"
echo "     - Protocol: HTTPS"
echo "     - Hostname: mcp.anaxi.net"
echo "     - Port: 443"
echo ""
echo "   ${GREEN}Destination:${NC}"
echo "   - Protocol: HTTP"
echo "   - Hostname: localhost"
echo "   - Port: 8080"
echo ""
echo "   ${GREEN}Custom Header (click on 'Custom Header' tab):${NC}"
echo "   - Click 'Create' → 'WebSocket'"
echo "   - Add these headers:"
echo "     - X-Real-IP: \$remote_addr"
echo "     - X-Forwarded-For: \$proxy_add_x_forwarded_for"
echo "     - X-Forwarded-Proto: \$scheme"
echo "     - Host: \$host"
echo ""
read -p "Press Enter when Reverse Proxy is configured..."

echo ""
echo -e "${YELLOW}📝 Step 3: Test Configuration${NC}"
echo "Testing local endpoint..."
if curl -s -f http://192.168.1.11:8080/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Local endpoint is working${NC}"
else
    echo -e "${RED}❌ Local endpoint is not responding${NC}"
    exit 1
fi

echo ""
echo "Waiting for DNS propagation (this may take a few minutes)..."
echo "Testing https://mcp.anaxi.net/health"

# Test with retries
for i in {1..10}; do
    if curl -s -f https://mcp.anaxi.net/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Domain is working!${NC}"
        echo ""
        echo -e "${GREEN}🎉 Configuration Complete!${NC}"
        echo "MCP Bridge is now available at: https://mcp.anaxi.net"
        echo ""
        echo "Test commands:"
        echo "  curl https://mcp.anaxi.net/health"
        echo "  curl https://mcp.anaxi.net/mcp/capabilities"
        exit 0
    else
        echo -n "."
        sleep 30
    fi
done

echo ""
echo -e "${YELLOW}⚠️  Domain not yet accessible${NC}"
echo "This could be due to:"
echo "1. DNS propagation delay (can take up to 48 hours)"
echo "2. Cloudflare configuration issue"
echo "3. Synology reverse proxy configuration issue"
echo ""
echo "You can check DNS propagation at: https://www.whatsmydns.net/#A/mcp.anaxi.net"