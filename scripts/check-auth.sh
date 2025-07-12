#!/bin/bash

# Authentication System Health Check Script
# Tests all authentication endpoints and protected routes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3001}"
DEFAULT_EMAIL="${AUTH_EMAIL:-admin@ai-service.local}"
DEFAULT_PASSWORD="${AUTH_PASSWORD:-admin123}"

# Results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print colored output
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_test() {
    echo -e "\n${CYAN}▶ Testing: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

print_fail() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    local expected_status=$5
    local description=$6
    
    print_test "$description"
    
    # Build curl command
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method '$API_BASE_URL$endpoint'"
    
    if [ ! -z "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    if [ ! -z "$token" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $token'"
    fi
    
    # Execute curl and capture response
    local response=$(eval $curl_cmd)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    # Check if response is JSON
    if echo "$body" | python3 -m json.tool >/dev/null 2>&1; then
        body=$(echo "$body" | python3 -m json.tool)
    fi
    
    # Evaluate result
    if [ "$http_code" = "$expected_status" ]; then
        print_success "Status: $http_code (Expected: $expected_status)"
        if [ ! -z "$body" ] && [ "$body" != "{}" ]; then
            echo -e "${GREEN}Response:${NC}"
            echo "$body" | head -20
        fi
        return 0
    else
        print_fail "Status: $http_code (Expected: $expected_status)"
        if [ ! -z "$body" ]; then
            echo -e "${RED}Error Response:${NC}"
            echo "$body" | head -20
        fi
        return 1
    fi
}

# Function to extract token from login response
extract_token() {
    local response=$1
    echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('accessToken', ''))" 2>/dev/null
}

# Start health check
clear
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║               AI SERVICE AUTHENTICATION SYSTEM HEALTH CHECK                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo
print_info "API Base URL: $API_BASE_URL"
print_info "Test Account: $DEFAULT_EMAIL"
print_info "Timestamp: $(date)"
echo

# Check if API is reachable
print_header "1. API CONNECTIVITY CHECK"
if ! curl -s -f "$API_BASE_URL/health" >/dev/null 2>&1; then
    print_fail "API is not reachable at $API_BASE_URL"
    print_info "Make sure the development environment is running: make dev-up"
    exit 1
fi
print_success "API is reachable"

# Test public endpoints
print_header "2. PUBLIC ENDPOINTS (No Auth Required)"

test_endpoint "GET" "/health" "" "" "200" "Health Check Endpoint"
test_endpoint "GET" "/status" "" "" "200" "Status Endpoint"
test_endpoint "GET" "/api/info" "" "" "200" "API Info Endpoint"

# Test authentication endpoints
print_header "3. AUTHENTICATION ENDPOINTS"

# Test login with wrong credentials
print_test "Login with Invalid Credentials"
WRONG_LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@email.com","password":"wrongpass"}')

if echo "$WRONG_LOGIN_RESPONSE" | grep -q "Invalid credentials"; then
    print_success "Correctly rejected invalid credentials"
else
    print_fail "Did not properly reject invalid credentials"
fi

# Test login with correct credentials
print_test "Login with Valid Credentials"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$DEFAULT_EMAIL\",\"password\":\"$DEFAULT_PASSWORD\"}")

ACCESS_TOKEN=$(extract_token "$LOGIN_RESPONSE")

if [ ! -z "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    print_success "Login successful - Token received"
    
    # Decode token to show expiration
    TOKEN_PAYLOAD=$(echo "$ACCESS_TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null || echo "$ACCESS_TOKEN" | cut -d. -f2 | base64 --decode 2>/dev/null)
    if [ ! -z "$TOKEN_PAYLOAD" ]; then
        EXP_TIMESTAMP=$(echo "$TOKEN_PAYLOAD" | python3 -c "import sys, json; print(json.loads(sys.stdin.read()).get('exp', ''))" 2>/dev/null)
        if [ ! -z "$EXP_TIMESTAMP" ]; then
            EXP_DATE=$(date -d "@$EXP_TIMESTAMP" 2>/dev/null || date -r "$EXP_TIMESTAMP" 2>/dev/null)
            print_info "Token expires at: $EXP_DATE"
        fi
    fi
else
    print_fail "Login failed - No token received"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

# Test current user endpoint
test_endpoint "GET" "/api/auth/me" "" "$ACCESS_TOKEN" "200" "Get Current User"

# Test protected endpoints
print_header "4. PROTECTED ENDPOINTS (Auth Required)"

# Test without token first
print_test "Access Protected Endpoint Without Token"
NO_AUTH_RESPONSE=$(curl -s -w '\n%{http_code}' "$API_BASE_URL/api/version")
NO_AUTH_CODE=$(echo "$NO_AUTH_RESPONSE" | tail -n1)

if [ "$NO_AUTH_CODE" = "401" ]; then
    print_success "Correctly denied access without token"
else
    print_fail "Expected 401, got $NO_AUTH_CODE"
fi

# Test all protected endpoints with token
test_endpoint "GET" "/api/version" "" "$ACCESS_TOKEN" "200" "Version Endpoint"

print_header "5. FINANCIAL ENDPOINTS"

test_endpoint "GET" "/api/financial/health" "" "$ACCESS_TOKEN" "200" "Financial Health"
test_endpoint "GET" "/api/financial/sync-status" "" "$ACCESS_TOKEN" "200" "Sync Status"
test_endpoint "GET" "/api/financial/accounts" "" "$ACCESS_TOKEN" "200" "List Accounts"
test_endpoint "GET" "/api/financial/dashboard/client-metrics" "" "$ACCESS_TOKEN" "200" "Client Metrics"
test_endpoint "GET" "/api/financial/dashboard/cash-flow" "" "$ACCESS_TOKEN" "200" "Cash Flow"

# Test token refresh
print_header "6. TOKEN REFRESH"

if echo "$LOGIN_RESPONSE" | grep -q "refreshToken"; then
    REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('refreshToken', ''))" 2>/dev/null)
    
    if [ ! -z "$REFRESH_TOKEN" ]; then
        print_test "Refresh Access Token"
        REFRESH_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/refresh" \
            -H "Content-Type: application/json" \
            -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
        
        NEW_TOKEN=$(extract_token "$REFRESH_RESPONSE")
        if [ ! -z "$NEW_TOKEN" ] && [ "$NEW_TOKEN" != "null" ]; then
            print_success "Token refresh successful"
        else
            print_fail "Token refresh failed"
        fi
    fi
else
    print_info "No refresh token in login response"
fi

# Test logout
print_header "7. LOGOUT"

test_endpoint "POST" "/api/auth/logout" "{\"refreshToken\":\"$REFRESH_TOKEN\"}" "$ACCESS_TOKEN" "200" "Logout"

# Summary
print_header "SUMMARY"

echo -e "${CYAN}Total Tests:${NC} $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
echo -e "${RED}Failed:${NC} $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✅ All authentication tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please check the output above.${NC}"
    exit 1
fi