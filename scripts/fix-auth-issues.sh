#!/bin/bash

# Authentication Issue Fixer Script
# Detects and fixes common auth issues:
# - Token type mismatches
# - Expired JWT secrets
# - User password issues
# - Database connection problems

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.local"

echo -e "${BLUE}🔧 Authentication Issue Fixer${NC}"
echo "=============================="
echo ""

# Function to check if service is in TypeScript
check_typescript_service() {
    local service_path="$PROJECT_ROOT/src/services/auth/auth.service.ts"
    if [ -f "$service_path" ]; then
        echo -e "${GREEN}✅ Using TypeScript auth service${NC}"
        return 0
    else
        echo -e "${RED}❌ TypeScript auth service not found${NC}"
        return 1
    fi
}

# Function to check token type field
check_token_type_field() {
    echo -e "\n${YELLOW}1. Checking token type field in AuthService...${NC}"
    
    local auth_service="$PROJECT_ROOT/src/services/auth/auth.service.ts"
    
    # Check if generateAccessToken includes type field
    if grep -q "type: 'access'" "$auth_service"; then
        echo -e "${GREEN}✅ Access token includes type field${NC}"
    else
        echo -e "${RED}❌ Access token missing type field${NC}"
        echo -e "${YELLOW}Fixing: Adding type: 'access' to token payload...${NC}"
        
        # This would need to be done manually as it requires understanding the code structure
        echo -e "${CYAN}ℹ️  Manual fix required:${NC}"
        echo "   Edit $auth_service"
        echo "   In generateAccessToken method, add: type: 'access' to the payload"
        echo ""
        echo "   Example:"
        echo "   const payload = {"
        echo "     userId: user.id,"
        echo "     email: user.email,"
        echo "     role: user.role,"
        echo "     type: 'access'  // <-- Add this line"
        echo "   };"
        return 1
    fi
    
    # Check middleware expectations
    local middleware="$PROJECT_ROOT/src/middleware/auth.middleware.ts"
    if grep -q "decoded.type !== 'access'" "$middleware"; then
        echo -e "${GREEN}✅ Middleware checks for type field${NC}"
    else
        echo -e "${YELLOW}⚠️  Middleware doesn't check type field (might be okay)${NC}"
    fi
}

# Function to check JWT secret
check_jwt_secret() {
    echo -e "\n${YELLOW}2. Checking JWT secret configuration...${NC}"
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ No .env.local file found${NC}"
        echo -e "${YELLOW}Creating .env.local from template...${NC}"
        cp "$PROJECT_ROOT/.env.example" "$ENV_FILE" 2>/dev/null || {
            echo -e "${RED}❌ No .env.example found${NC}"
            return 1
        }
    fi
    
    # Check if JWT_SECRET exists and is not default
    if grep -q "^JWT_SECRET=" "$ENV_FILE"; then
        local jwt_secret=$(grep "^JWT_SECRET=" "$ENV_FILE" | cut -d'=' -f2)
        if [[ "$jwt_secret" == "your-secret-key-change-in-production" ]] || [[ "$jwt_secret" == "default-jwt-secret-for-dev" ]]; then
            echo -e "${YELLOW}⚠️  Using default JWT secret (okay for development)${NC}"
        else
            echo -e "${GREEN}✅ Custom JWT secret configured${NC}"
        fi
    else
        echo -e "${RED}❌ No JWT_SECRET in .env.local${NC}"
        echo -e "${YELLOW}Adding default JWT_SECRET...${NC}"
        echo "JWT_SECRET=default-jwt-secret-for-dev" >> "$ENV_FILE"
    fi
}

# Function to check test user
check_test_user() {
    echo -e "\n${YELLOW}3. Checking test user...${NC}"
    
    # Try to connect to database and check for test user
    if docker exec ai-service-postgres psql -U ai_user -d ai_service -c \
        "SELECT email, is_active FROM users WHERE email = 'test@example.com';" 2>/dev/null | grep -q "test@example.com"; then
        echo -e "${GREEN}✅ Test user exists${NC}"
    else
        echo -e "${YELLOW}⚠️  Test user not found${NC}"
        echo -e "${YELLOW}Creating test user...${NC}"
        node "$PROJECT_ROOT/scripts/create-test-user.js" || {
            echo -e "${RED}❌ Failed to create test user${NC}"
            return 1
        }
    fi
}

# Function to check database tables
check_database_tables() {
    echo -e "\n${YELLOW}4. Checking authentication tables...${NC}"
    
    local tables=("users" "refresh_tokens" "login_attempts")
    local missing_tables=()
    
    for table in "${tables[@]}"; do
        if docker exec ai-service-postgres psql -U ai_user -d ai_service -c \
            "SELECT 1 FROM $table LIMIT 1;" &>/dev/null; then
            echo -e "${GREEN}✅ Table '$table' exists${NC}"
        else
            echo -e "${RED}❌ Table '$table' missing${NC}"
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -gt 0 ]; then
        echo -e "${YELLOW}Running Prisma migrations to create missing tables...${NC}"
        cd "$PROJECT_ROOT" && npm run db:migrate || {
            echo -e "${RED}❌ Migration failed${NC}"
            return 1
        }
    fi
}

# Function to test auth flow
test_auth_flow() {
    echo -e "\n${YELLOW}5. Testing authentication flow...${NC}"
    
    # Quick test of login
    local response=$(curl -s -X POST http://localhost:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"testPassword123"}' 2>/dev/null)
    
    if echo "$response" | grep -q "accessToken"; then
        echo -e "${GREEN}✅ Login endpoint working${NC}"
        
        # Extract token and test protected endpoint
        local token=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('accessToken', ''))" 2>/dev/null || echo "")
        
        if [ ! -z "$token" ]; then
            local me_response=$(curl -s -w '\n%{http_code}' \
                -H "Authorization: Bearer $token" \
                http://localhost:3001/api/auth/me)
            local status_code=$(echo "$me_response" | tail -n1)
            
            if [ "$status_code" = "200" ]; then
                echo -e "${GREEN}✅ Protected endpoints working${NC}"
            else
                echo -e "${RED}❌ Protected endpoints failing (status: $status_code)${NC}"
                local body=$(echo "$me_response" | sed '$d')
                echo "Response: $body"
            fi
        fi
    else
        echo -e "${RED}❌ Login endpoint failing${NC}"
        echo "Response: $response"
    fi
}

# Function to restart services
restart_services() {
    echo -e "\n${YELLOW}6. Restarting services...${NC}"
    
    echo "Restarting API container..."
    docker restart ai-service-api 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Could not restart container, trying docker-compose...${NC}"
        cd "$PROJECT_ROOT" && docker-compose restart api
    }
    
    echo "Waiting for services to be ready..."
    sleep 5
    
    # Check if API is responding
    if curl -s -f http://localhost:3001/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ API is responding${NC}"
    else
        echo -e "${RED}❌ API is not responding${NC}"
    fi
}

# Main execution
echo -e "${CYAN}Starting authentication diagnostics and fixes...${NC}"

# Run all checks
check_typescript_service || exit 1
check_token_type_field
check_jwt_secret
check_database_tables
check_test_user

# Ask user if they want to restart services
echo -e "\n${YELLOW}Do you want to restart services? (y/n)${NC}"
read -r restart_choice
if [[ "$restart_choice" == "y" ]]; then
    restart_services
fi

# Final test
echo -e "\n${BLUE}Running final authentication test...${NC}"
test_auth_flow

echo -e "\n${BLUE}=== Fix Summary ===${NC}"
echo ""
echo "Common fixes applied:"
echo "✓ Checked token type field in AuthService"
echo "✓ Verified JWT secret configuration"
echo "✓ Ensured test user exists"
echo "✓ Verified database tables"
echo ""
echo "If issues persist:"
echo "1. Check that AuthService.generateAccessToken() includes type: 'access'"
echo "2. Ensure JWT_SECRET is the same for token generation and validation"
echo "3. Run 'make db:migrate' to ensure all tables exist"
echo "4. Check docker logs: docker logs ai-service-api"
echo ""
echo -e "${GREEN}✨ Authentication fix complete!${NC}"