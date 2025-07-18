#!/bin/bash
# Secure Setup Script for MCP Bridge
# Generates and configures secrets without exposing them

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
ENV_PROD_FILE="${SCRIPT_DIR}/../.env.production"
ENV_EXAMPLE_FILE="${SCRIPT_DIR}/../.env.example"

# Function to generate secure random string
generate_secure_string() {
    local length=$1
    openssl rand -hex $length 2>/dev/null || (echo "Error: OpenSSL not available" && exit 1)
}

# Function to check if running in production mode
is_production() {
    [[ "$1" == "--production" || "$1" == "-p" ]]
}

# Main setup function
main() {
    echo -e "${BLUE}🔐 MCP Bridge Secure Setup${NC}"
    echo -e "${BLUE}=========================${NC}"
    echo ""

    # Determine target file
    local TARGET_ENV="$ENV_FILE"
    local ENV_TYPE="development"
    
    if is_production "$1"; then
        TARGET_ENV="$ENV_PROD_FILE"
        ENV_TYPE="production"
        echo -e "${YELLOW}⚠️  Setting up PRODUCTION configuration${NC}"
    else
        echo -e "${BLUE}Setting up development configuration${NC}"
    fi

    # Check if env file already exists
    if [ -f "$TARGET_ENV" ]; then
        echo -e "${YELLOW}⚠️  Configuration file already exists: $(basename $TARGET_ENV)${NC}"
        read -p "Do you want to regenerate all secrets? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Aborted. No changes made.${NC}"
            exit 0
        fi
        # Backup existing file
        cp "$TARGET_ENV" "${TARGET_ENV}.backup.$(date +%Y%m%d_%H%M%S)"
        echo -e "${GREEN}✅ Backup created${NC}"
    fi

    # Create env file from example if it doesn't exist
    if [ ! -f "$ENV_EXAMPLE_FILE" ]; then
        # Create a default template
        cat > "$TARGET_ENV" << 'EOF'
# MCP Bridge Server Configuration

# Server
NODE_ENV=production
PORT=8380
HOST=0.0.0.0

# JWT Configuration
JWT_SECRET=WILL_BE_GENERATED
JWT_EXPIRES_IN=7d

# API Key Authentication
API_KEYS=WILL_BE_GENERATED

# AI Service Configuration
AI_SERVICE_URL=http://ai-service:3000
AI_SERVICE_TIMEOUT=30000

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://192.168.1.11:3000,http://ai-service.local

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Redis Configuration
REDIS_HOST=ai-redis
REDIS_PORT=6379
REDIS_DB=2
REDIS_KEY_PREFIX=mcp:

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# MCP Specific
MCP_MAX_CONCURRENT_TOOLS=10
MCP_TOOL_TIMEOUT=30000
EOF
    else
        cp "$ENV_EXAMPLE_FILE" "$TARGET_ENV"
    fi

    echo -e "${BLUE}Generating secure secrets...${NC}"

    # Generate JWT Secret (64 hex = 128 chars)
    local JWT_SECRET=$(generate_secure_string 64)
    
    # Generate API Keys
    local API_KEYS=""
    for i in {1..3}; do
        local key_name="mcp-key-$i"
        local key_value=$(generate_secure_string 32)
        if [ -z "$API_KEYS" ]; then
            API_KEYS="${key_name}:${key_value}"
        else
            API_KEYS="${API_KEYS},${key_name}:${key_value}"
        fi
    done

    # Update the env file with generated values
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$TARGET_ENV"
        sed -i '' "s|API_KEYS=.*|API_KEYS=${API_KEYS}|" "$TARGET_ENV"
        
        # Update NODE_ENV based on type
        if is_production "$1"; then
            sed -i '' "s|NODE_ENV=.*|NODE_ENV=production|" "$TARGET_ENV"
        else
            sed -i '' "s|NODE_ENV=.*|NODE_ENV=development|" "$TARGET_ENV"
        fi
    else
        # Linux
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$TARGET_ENV"
        sed -i "s|API_KEYS=.*|API_KEYS=${API_KEYS}|" "$TARGET_ENV"
        
        # Update NODE_ENV based on type
        if is_production "$1"; then
            sed -i "s|NODE_ENV=.*|NODE_ENV=production|" "$TARGET_ENV"
        else
            sed -i "s|NODE_ENV=.*|NODE_ENV=development|" "$TARGET_ENV"
        fi
    fi

    # Set secure permissions
    chmod 600 "$TARGET_ENV"

    # Validate the configuration
    echo -e "${BLUE}Validating configuration...${NC}"
    
    # Check JWT secret length
    JWT_CHECK=$(grep "^JWT_SECRET=" "$TARGET_ENV" | cut -d'=' -f2)
    if [ ${#JWT_CHECK} -lt 32 ]; then
        echo -e "${RED}❌ JWT_SECRET validation failed${NC}"
        exit 1
    fi

    # Check API keys format
    API_CHECK=$(grep "^API_KEYS=" "$TARGET_ENV" | cut -d'=' -f2)
    if ! echo "$API_CHECK" | grep -q ".*:.*"; then
        echo -e "${RED}❌ API_KEYS validation failed${NC}"
        exit 1
    fi

    # Success message
    echo -e "${GREEN}✅ ${ENV_TYPE^} configuration generated successfully${NC}"
    echo -e "${GREEN}✅ Secrets stored in: $(basename $TARGET_ENV)${NC}"
    echo -e "${GREEN}✅ File permissions set to 600 (read/write owner only)${NC}"
    
    # Additional instructions
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Run: ./validate-config.sh"
    echo "2. Deploy with: make mcp-deploy-secure"
    
    if is_production "$1"; then
        echo ""
        echo -e "${YELLOW}⚠️  For production deployment:${NC}"
        echo "- The .env.production file will be used"
        echo "- Ensure AI_SERVICE_URL points to the correct service"
        echo "- Review all settings before deployment"
    fi
}

# Run main function
main "$@"