#!/bin/bash

# Smoke Test Script for Financial Integration Restoration
# Tests the restored integration configs and GoCardless sync endpoints

set -e

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3005}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Starting Integration Restoration Smoke Tests"
echo "   Gateway: $GATEWAY_URL"
echo ""

# Counter for tests
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -n "Testing: $description... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$GATEWAY_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$GATEWAY_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X POST "$GATEWAY_URL$endpoint")
        fi
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$GATEWAY_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} (Status: $http_code)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} (Expected: $expected_status, Got: $http_code)"
        echo "  Response: $body"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "=== 1. Health Checks ==="
test_endpoint "GET" "/health/live" "" "200" "Health live endpoint"
test_endpoint "GET" "/health/ready" "" "200" "Health ready endpoint"
echo ""

echo "=== 2. Integration Types ==="
test_endpoint "GET" "/api/integrations/types" "" "200" "List integration types"
echo ""

echo "=== 3. Integration Configs CRUD ==="

# Clean up any existing test configs
echo "Cleaning up existing test configs..."
curl -s -X DELETE "$GATEWAY_URL/api/integrations/configs/gocardless/test_secret_id?isGlobal=true" > /dev/null 2>&1 || true
curl -s -X DELETE "$GATEWAY_URL/api/integrations/configs/gocardless/test_secret_key?isGlobal=true" > /dev/null 2>&1 || true

# Create test configs
test_endpoint "POST" "/api/integrations/configs" \
    '{"integrationType":"gocardless","configKey":"test_secret_id","configValue":"test_id_12345","isGlobal":true,"encrypt":true}' \
    "200" "Create GoCardless secret_id"

test_endpoint "POST" "/api/integrations/configs" \
    '{"integrationType":"gocardless","configKey":"test_secret_key","configValue":"test_key_67890","isGlobal":true,"encrypt":true}' \
    "200" "Create GoCardless secret_key"

# List configs
test_endpoint "GET" "/api/integrations/configs" "" "200" "List all configs"

# Verify masking
echo -n "Verifying encrypted values are masked... "
configs=$(curl -s "$GATEWAY_URL/api/integrations/configs")
if echo "$configs" | grep -q "***CONFIGURED***"; then
    echo -e "${GREEN}✓${NC} Values are masked"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Values not masked!"
    ((TESTS_FAILED++))
fi

# Get specific config
test_endpoint "GET" "/api/integrations/configs/gocardless/test_secret_id" "" "200" "Get specific config"

# Test validation
test_endpoint "POST" "/api/integrations/test/gocardless" \
    '{"configs":{"secret_id":"test","secret_key":"test"}}' \
    "200" "Test GoCardless config validation"

echo ""

echo "=== 4. GoCardless Sync Endpoints ==="
echo -e "${YELLOW}Note: These may fail with 4xx/5xx if using test credentials, but should not return 404${NC}"

# Test accounts sync (expect 400/500 with test creds, but NOT 404)
echo -n "Testing GoCardless accounts sync... "
response=$(curl -s -w "\n%{http_code}" -X POST "$GATEWAY_URL/api/financial/gocardless/sync/accounts")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "404" ]; then
    echo -e "${RED}✗${NC} Route not found! (404)"
    echo "  This indicates the proxy is not properly configured in the gateway"
    ((TESTS_FAILED++))
elif [ "$http_code" = "400" ] || [ "$http_code" = "401" ] || [ "$http_code" = "500" ] || [ "$http_code" = "502" ]; then
    echo -e "${GREEN}✓${NC} Route exists (Status: $http_code - Expected with test creds)"
    ((TESTS_PASSED++))
elif [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓${NC} Success! (Status: 200)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}?${NC} Unexpected status: $http_code"
    echo "  Response: $body"
fi

# Test transactions sync
echo -n "Testing GoCardless transactions sync... "
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"accountId":"test_account_123"}' \
    "$GATEWAY_URL/api/financial/gocardless/sync/transactions")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "404" ]; then
    echo -e "${RED}✗${NC} Route not found! (404)"
    echo "  This indicates the proxy is not properly configured in the gateway"
    ((TESTS_FAILED++))
elif [ "$http_code" = "400" ] || [ "$http_code" = "401" ] || [ "$http_code" = "500" ] || [ "$http_code" = "502" ]; then
    echo -e "${GREEN}✓${NC} Route exists (Status: $http_code - Expected with test creds)"
    ((TESTS_PASSED++))
elif [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓${NC} Success! (Status: 200)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}?${NC} Unexpected status: $http_code"
    echo "  Response: $body"
fi

echo ""

echo "=== 5. Financial Data Endpoints ==="
test_endpoint "GET" "/api/financial/accounts?page=1&limit=5" "" "200" "List accounts with pagination"
test_endpoint "GET" "/api/financial/transactions?page=1&limit=5" "" "200" "List transactions with pagination"
test_endpoint "GET" "/api/financial/clients?page=1&limit=5" "" "200" "List clients with pagination"
test_endpoint "GET" "/api/financial/invoices?page=1&limit=5" "" "200" "List invoices with pagination"

echo ""

# Clean up test configs
echo "=== 6. Cleanup ==="
test_endpoint "DELETE" "/api/integrations/configs/gocardless/test_secret_id" "" "200" "Delete test secret_id"
test_endpoint "DELETE" "/api/integrations/configs/gocardless/test_secret_key" "" "200" "Delete test secret_key"

echo ""
echo "======================================="
echo "Test Results:"
echo -e "  Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "  Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi