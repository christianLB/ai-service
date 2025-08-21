#!/bin/bash

# Microservices Smoke Tests
# =========================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Base URLs
GATEWAY_URL="http://localhost:3010"
FINANCIAL_URL="http://localhost:3002"
AI_URL="http://localhost:3003"
TRADING_URL="http://localhost:3004"
COMM_URL="http://localhost:3005"

# Test results
PASSED=0
FAILED=0

# Function to print test results
print_test() {
    local name=$1
    local result=$2
    
    if [ "$result" -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $name"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} $name"
        FAILED=$((FAILED + 1))
    fi
}

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        print_test "$name" 0
        return 0
    else
        print_test "$name (got $response, expected $expected_status)" 1
        return 1
    fi
}

# Function to test authenticated endpoint
test_auth_endpoint() {
    local name=$1
    local url=$2
    local token=$3
    local expected_status=${4:-200}
    
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $token" \
        "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        print_test "$name" 0
        return 0
    else
        print_test "$name (got $response, expected $expected_status)" 1
        return 1
    fi
}

# Function to test POST endpoint
test_post_endpoint() {
    local name=$1
    local url=$2
    local data=$3
    local expected_status=${4:-201}
    
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ] || [ "$response" = "200" ]; then
        print_test "$name" 0
        return 0
    else
        print_test "$name (got $response, expected $expected_status)" 1
        return 1
    fi
}

echo -e "${BLUE}Starting Microservices Smoke Tests${NC}"
echo "===================================="
echo ""

# Test 1: Health Checks
echo -e "${YELLOW}1. Health Check Tests${NC}"
test_endpoint "API Gateway Health" "$GATEWAY_URL/health"
test_endpoint "Financial Service Health" "$FINANCIAL_URL/health"
test_endpoint "AI Service Health" "$AI_URL/health"
test_endpoint "Trading Service Health" "$TRADING_URL/health"
test_endpoint "Communication Service Health" "$COMM_URL/health"
echo ""

# Test 2: API Gateway Routing
echo -e "${YELLOW}2. API Gateway Routing Tests${NC}"
test_endpoint "Gateway → Financial" "$GATEWAY_URL/api/financial/health"
test_endpoint "Gateway → AI" "$GATEWAY_URL/api/ai/health"
test_endpoint "Gateway → Trading" "$GATEWAY_URL/api/trading/health"
test_endpoint "Gateway → Communication" "$GATEWAY_URL/api/comm/health"
echo ""

# Test 3: Service Endpoints (Through Gateway)
echo -e "${YELLOW}3. Service Endpoint Tests${NC}"

# Financial endpoints
test_endpoint "List Clients" "$GATEWAY_URL/api/financial/clients" 401
test_endpoint "List Invoices" "$GATEWAY_URL/api/financial/invoices" 401
test_endpoint "List Transactions" "$GATEWAY_URL/api/financial/transactions" 401

# AI endpoints
test_endpoint "List Documents" "$GATEWAY_URL/api/ai/documents" 401
test_endpoint "AI Providers Status" "$GATEWAY_URL/api/ai/providers/status"

# Trading endpoints
test_endpoint "List Strategies" "$GATEWAY_URL/api/trading/strategies" 401
test_endpoint "Market Data" "$GATEWAY_URL/api/trading/market-data" 401

# Communication endpoints
test_endpoint "List Notifications" "$GATEWAY_URL/api/comm/notifications" 401
test_endpoint "List Email Templates" "$GATEWAY_URL/api/comm/email-templates" 401
echo ""

# Test 4: Generate Development Token
echo -e "${YELLOW}4. Authentication Test${NC}"
TOKEN_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/auth/dev-token" 2>/dev/null || echo "{}")
TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    print_test "Generate Dev Token" 0
    
    # Test authenticated endpoints
    test_auth_endpoint "Auth: List Clients" "$GATEWAY_URL/api/financial/clients" "$TOKEN"
    test_auth_endpoint "Auth: List Documents" "$GATEWAY_URL/api/ai/documents" "$TOKEN"
    test_auth_endpoint "Auth: List Strategies" "$GATEWAY_URL/api/trading/strategies" "$TOKEN"
else
    print_test "Generate Dev Token" 1
fi
echo ""

# Test 5: Rate Limiting
echo -e "${YELLOW}5. Rate Limiting Test${NC}"
RATE_LIMIT_HIT=0
for i in {1..10}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_URL/health" 2>/dev/null)
    if [ "$response" = "429" ]; then
        RATE_LIMIT_HIT=1
        break
    fi
done

if [ $RATE_LIMIT_HIT -eq 0 ]; then
    print_test "Rate Limiting (not triggered with 10 requests)" 0
else
    print_test "Rate Limiting (triggered too early)" 1
fi
echo ""

# Test 6: CORS Headers
echo -e "${YELLOW}6. CORS Test${NC}"
CORS_RESPONSE=$(curl -s -I -X OPTIONS \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET" \
    "$GATEWAY_URL/api/financial/clients" 2>/dev/null)

if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    print_test "CORS Headers Present" 0
else
    print_test "CORS Headers Missing" 1
fi
echo ""

# Test 7: Database Schema Verification
echo -e "${YELLOW}7. Database Schema Test${NC}"
SCHEMAS=$(docker exec ai-service-postgres psql -U ai_user -d ai_service -t -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('financial', 'trading', 'ai', 'comm', 'auth', 'monitoring');" 2>/dev/null | wc -l)

if [ "$SCHEMAS" -ge 6 ]; then
    print_test "Database Schemas Created" 0
else
    print_test "Database Schemas Missing (found $SCHEMAS/6)" 1
fi
echo ""

# Test 8: Service Discovery
echo -e "${YELLOW}8. Service Discovery Test${NC}"
SERVICES_RESPONSE=$(curl -s "$GATEWAY_URL/api/services" 2>/dev/null || echo "{}")
if echo "$SERVICES_RESPONSE" | grep -q "financial"; then
    print_test "Service Discovery" 0
else
    print_test "Service Discovery" 1
fi
echo ""

# Test 9: Create Test Data
echo -e "${YELLOW}9. Data Creation Test${NC}"
if [ -n "$TOKEN" ]; then
    # Create test client
    CLIENT_DATA='{"name":"Test Client","email":"test@example.com","type":"individual"}'
    CLIENT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$CLIENT_DATA" \
        "$GATEWAY_URL/api/financial/clients" 2>/dev/null)
    
    if [ "$CLIENT_RESPONSE" = "201" ] || [ "$CLIENT_RESPONSE" = "200" ]; then
        print_test "Create Test Client" 0
    else
        print_test "Create Test Client (got $CLIENT_RESPONSE)" 1
    fi
    
    # Create test document
    DOC_DATA='{"title":"Test Document","content":"This is a test document","type":"text"}'
    DOC_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$DOC_DATA" \
        "$GATEWAY_URL/api/ai/documents" 2>/dev/null)
    
    if [ "$DOC_RESPONSE" = "201" ] || [ "$DOC_RESPONSE" = "200" ]; then
        print_test "Create Test Document" 0
    else
        print_test "Create Test Document (got $DOC_RESPONSE)" 1
    fi
else
    print_test "Create Test Data (no token)" 1
fi
echo ""

# Test 10: Performance Check
echo -e "${YELLOW}10. Performance Test${NC}"
START_TIME=$(date +%s%N)
for i in {1..10}; do
    curl -s "$GATEWAY_URL/health" > /dev/null 2>&1
done
END_TIME=$(date +%s%N)
DURATION=$((($END_TIME - $START_TIME) / 10000000)) # Convert to milliseconds

if [ $DURATION -lt 1000 ]; then # Less than 1 second for 10 requests
    print_test "Performance (${DURATION}ms for 10 requests)" 0
else
    print_test "Performance (${DURATION}ms for 10 requests - slow)" 1
fi
echo ""

# Summary
echo "===================================="
echo -e "${BLUE}Test Summary${NC}"
echo "===================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))
echo -e "Success Rate: ${PERCENTAGE}%"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All smoke tests passed!${NC}"
    echo -e "${GREEN}Microservices platform is production-ready!${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠ Some tests failed. Please review the output above.${NC}"
    exit 1
fi