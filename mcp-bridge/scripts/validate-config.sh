#!/bin/bash
# Configuration Validation Script for MCP Bridge
# Validates configuration without exposing sensitive values

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

# Validation results
ERRORS=0
WARNINGS=0

# Function to check if value exists and meets criteria
check_config() {
    local file=$1
    local key=$2
    local min_length=$3
    local description=$4
    local required=${5:-true}
    
    local value=$(grep "^${key}=" "$file" 2>/dev/null | cut -d'=' -f2)
    
    if [ -z "$value" ]; then
        if [ "$required" = true ]; then
            echo -e "${RED}❌ ${key}: Not found${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠️  ${key}: Not set (optional)${NC}"
            ((WARNINGS++))
        fi
        return 1
    fi
    
    if [ -n "$min_length" ] && [ ${#value} -lt $min_length ]; then
        echo -e "${RED}❌ ${key}: Too short (minimum ${min_length} characters)${NC}"
        ((ERRORS++))
        return 1
    fi
    
    echo -e "${GREEN}✅ ${key}: ${description}${NC}"
    return 0
}

# Function to validate URL format
validate_url() {
    local file=$1
    local key=$2
    local value=$(grep "^${key}=" "$file" 2>/dev/null | cut -d'=' -f2)
    
    if [[ ! "$value" =~ ^https?:// ]]; then
        echo -e "${RED}❌ ${key}: Invalid URL format${NC}"
        ((ERRORS++))
        return 1
    fi
    
    echo -e "${GREEN}✅ ${key}: Valid URL format${NC}"
    return 0
}

# Function to validate port number
validate_port() {
    local file=$1
    local key=$2
    local value=$(grep "^${key}=" "$file" 2>/dev/null | cut -d'=' -f2)
    
    if ! [[ "$value" =~ ^[0-9]+$ ]] || [ "$value" -lt 1 ] || [ "$value" -gt 65535 ]; then
        echo -e "${RED}❌ ${key}: Invalid port number${NC}"
        ((ERRORS++))
        return 1
    fi
    
    echo -e "${GREEN}✅ ${key}: Valid port (${value})${NC}"
    return 0
}

# Function to validate API keys format
validate_api_keys() {
    local file=$1
    local value=$(grep "^VALID_API_KEYS=" "$file" 2>/dev/null | cut -d'=' -f2)
    
    if [ -z "$value" ]; then
        echo -e "${RED}❌ VALID_API_KEYS: Not found${NC}"
        ((ERRORS++))
        return 1
    fi
    
    # Check format (should contain name:key pairs)
    if ! echo "$value" | grep -q ".*:.*"; then
        echo -e "${RED}❌ VALID_API_KEYS: Invalid format (expected name:key,name2:key2)${NC}"
        ((ERRORS++))
        return 1
    fi
    
    # Count number of keys
    local key_count=$(echo "$value" | tr ',' '\n' | wc -l)
    echo -e "${GREEN}✅ VALID_API_KEYS: Valid format (${key_count} keys configured)${NC}"
    return 0
}

# Main validation function
validate_file() {
    local file=$1
    local file_type=$2
    
    echo -e "${BLUE}Validating ${file_type} configuration...${NC}"
    echo -e "${BLUE}File: $(basename $file)${NC}"
    echo ""
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Configuration file not found: $file${NC}"
        return 1
    fi
    
    # Check file permissions
    local perms=$(stat -c %a "$file" 2>/dev/null || stat -f %p "$file" | cut -c4-6)
    if [ "$perms" != "600" ]; then
        echo -e "${YELLOW}⚠️  File permissions: ${perms} (recommended: 600)${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✅ File permissions: Secure (600)${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Core Configuration:${NC}"
    
    # Server configuration
    check_config "$file" "NODE_ENV" "" "Environment set"
    check_config "$file" "MCP_PORT" "" "Port configured"
    validate_port "$file" "MCP_PORT"
    check_config "$file" "MCP_HOST" "" "Host configured"
    
    echo ""
    echo -e "${BLUE}Security Configuration:${NC}"
    
    # JWT configuration
    check_config "$file" "JWT_SECRET" 32 "Secure length"
    check_config "$file" "JWT_EXPIRES_IN" "" "Expiry configured"
    
    # API Keys
    validate_api_keys "$file"
    
    echo ""
    echo -e "${BLUE}Service Configuration:${NC}"
    
    # AI Service
    check_config "$file" "AI_SERVICE_URL" "" "URL configured"
    validate_url "$file" "AI_SERVICE_URL"
    check_config "$file" "AI_SERVICE_TIMEOUT" "" "Timeout configured"
    
    echo ""
    echo -e "${BLUE}Infrastructure:${NC}"
    
    # Redis
    check_config "$file" "REDIS_HOST" "" "Host configured"
    validate_port "$file" "REDIS_PORT"
    check_config "$file" "REDIS_DB" "" "Database configured"
    check_config "$file" "REDIS_KEY_PREFIX" "" "Key prefix set"
    
    # CORS
    check_config "$file" "CORS_ORIGINS" "" "Origins configured" false
    
    # Rate limiting
    check_config "$file" "RATE_LIMIT_WINDOW_MS" "" "Window configured"
    check_config "$file" "RATE_LIMIT_MAX_REQUESTS" "" "Max requests set"
    
    # Logging
    check_config "$file" "LOG_LEVEL" "" "Log level set"
    check_config "$file" "LOG_FORMAT" "" "Log format set"
    
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}🔍 MCP Bridge Configuration Validator${NC}"
    echo -e "${BLUE}====================================${NC}"
    echo ""
    
    # Check which file to validate
    if [ "$1" == "--production" ] || [ "$1" == "-p" ]; then
        if [ -f "$ENV_PROD_FILE" ]; then
            validate_file "$ENV_PROD_FILE" "PRODUCTION"
        else
            echo -e "${RED}❌ Production configuration not found${NC}"
            echo "Run: ./secure-setup.sh --production"
            exit 1
        fi
    else
        if [ -f "$ENV_FILE" ]; then
            validate_file "$ENV_FILE" "DEVELOPMENT"
        else
            echo -e "${RED}❌ Development configuration not found${NC}"
            echo "Run: ./secure-setup.sh"
            exit 1
        fi
    fi
    
    # Summary
    echo -e "${BLUE}Summary:${NC}"
    echo -e "${BLUE}========${NC}"
    
    if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✅ All configurations valid${NC}"
        echo -e "${GREEN}✅ Ready for deployment${NC}"
        exit 0
    elif [ $ERRORS -eq 0 ]; then
        echo -e "${GREEN}✅ Configuration valid with ${WARNINGS} warning(s)${NC}"
        exit 0
    else
        echo -e "${RED}❌ Configuration invalid: ${ERRORS} error(s), ${WARNINGS} warning(s)${NC}"
        echo ""
        echo "Please fix the errors and run validation again."
        exit 1
    fi
}

# Run main function
main "$@"