#!/bin/bash

# Test Script for Prisma Dashboard Migration
# This script tests the feature flags in local development

echo "🧪 Prisma Dashboard Migration Test Script"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if service is running
check_service() {
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health | grep -q "200"; then
        echo -e "${GREEN}✓${NC} API service is running"
        return 0
    else
        echo -e "${RED}✗${NC} API service is not running"
        echo "  Please run: make dev-up"
        return 1
    fi
}

# Function to get auth token
get_token() {
    echo "Getting authentication token..."
    TOKEN=$(make auth-token 2>/dev/null | grep -oP 'Token: \K.*')
    if [ -z "$TOKEN" ]; then
        echo -e "${RED}✗${NC} Failed to get auth token"
        return 1
    fi
    echo -e "${GREEN}✓${NC} Auth token obtained"
    return 0
}

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo -n "Testing $description... "
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:3001/api/financial/dashboard/$endpoint")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        # Check which service was used
        if echo "$BODY" | grep -q '"service":"prisma"'; then
            echo -e "${GREEN}✓${NC} Using Prisma service"
        elif echo "$BODY" | grep -q '"service":"sql"'; then
            echo -e "${YELLOW}⚠${NC} Using SQL service (feature flag disabled)"
        else
            echo -e "${RED}✗${NC} Unknown service"
        fi
        
        # Show sample data
        if command -v jq &> /dev/null; then
            echo "  Sample response:"
            echo "$BODY" | jq -r '.data | keys[]' 2>/dev/null | head -5 | sed 's/^/    - /'
        fi
    else
        echo -e "${RED}✗${NC} Failed (HTTP $HTTP_CODE)"
        echo "  Error: $(echo "$BODY" | jq -r '.error' 2>/dev/null || echo "$BODY")"
    fi
    echo ""
}

# Function to check feature flags
check_feature_flags() {
    echo "Checking feature flag status..."
    
    RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3001/api/financial/dashboard/health")
    
    if command -v jq &> /dev/null; then
        PRISMA_ENABLED=$(echo "$RESPONSE" | jq -r '.featureFlags.prismaEnabled')
        VALIDATION_ENABLED=$(echo "$RESPONSE" | jq -r '.featureFlags.validationEnabled')
        PERFORMANCE_ENABLED=$(echo "$RESPONSE" | jq -r '.featureFlags.performanceLoggingEnabled')
        
        echo "  USE_PRISMA_DASHBOARD: $PRISMA_ENABLED"
        echo "  ENABLE_SQL_VALIDATION: $VALIDATION_ENABLED"
        echo "  LOG_QUERY_PERFORMANCE: $PERFORMANCE_ENABLED"
    else
        echo "$RESPONSE"
    fi
    echo ""
}

# Function to update .env.local
update_env_file() {
    local flag=$1
    local value=$2
    
    if [ -f ".env.local" ]; then
        # Check if flag exists
        if grep -q "^$flag=" .env.local; then
            # Update existing flag
            sed -i.bak "s/^$flag=.*/$flag=$value/" .env.local
        else
            # Add new flag
            echo "$flag=$value" >> .env.local
        fi
        echo -e "${GREEN}✓${NC} Updated $flag=$value in .env.local"
    else
        echo -e "${RED}✗${NC} .env.local not found"
        return 1
    fi
}

# Main test flow
main() {
    echo "1. Checking service status..."
    if ! check_service; then
        exit 1
    fi
    echo ""
    
    echo "2. Getting authentication..."
    if ! get_token; then
        exit 1
    fi
    echo ""
    
    echo "3. Current feature flag status:"
    check_feature_flags
    
    echo "4. Testing endpoints with current configuration:"
    test_endpoint "health" "Health check"
    test_endpoint "revenue-metrics" "Revenue metrics"
    test_endpoint "invoice-stats" "Invoice statistics"
    test_endpoint "client-metrics" "Client metrics"
    test_endpoint "metrics" "Unified metrics (Prisma only)"
    
    echo "5. Feature flag management:"
    echo "   To enable Prisma dashboard:"
    echo "   $ echo 'USE_PRISMA_DASHBOARD=true' >> .env.local"
    echo "   $ echo 'ENABLE_SQL_VALIDATION=true' >> .env.local"
    echo "   $ echo 'LOG_QUERY_PERFORMANCE=true' >> .env.local"
    echo "   $ make dev-restart"
    echo ""
    
    # Ask if user wants to enable Prisma
    read -p "Do you want to enable Prisma dashboard now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        update_env_file "USE_PRISMA_DASHBOARD" "true"
        update_env_file "ENABLE_SQL_VALIDATION" "true"
        update_env_file "LOG_QUERY_PERFORMANCE" "true"
        echo ""
        echo "Feature flags updated! Please restart the service:"
        echo "  $ make dev-restart"
    fi
}

# Run main function
main