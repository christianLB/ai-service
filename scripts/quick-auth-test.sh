#!/bin/bash

# Quick Authentication Test Script
# Tests: login → token structure → protected endpoint → logout
# Designed to quickly identify token issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3001/api}"
TEST_EMAIL="${TEST_EMAIL:-test@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-testPassword123}"

echo -e "${BLUE}🚀 Quick Authentication Test${NC}"
echo "================================"
echo -e "${CYAN}API URL:${NC} $API_URL"
echo -e "${CYAN}Test User:${NC} $TEST_EMAIL"
echo ""

# Function to extract JSON field
extract_json_field() {
    local json=$1
    local field=$2
    echo "$json" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('$field', ''))" 2>/dev/null || echo ""
}

# Function to decode JWT payload
decode_jwt_payload() {
    local token=$1
    # Extract the payload part (between first and second dot)
    local payload=$(echo "$token" | cut -d. -f2)
    # Add padding if needed
    local padded="${payload}=="
    # Decode base64
    echo "$padded" | base64 -d 2>/dev/null || echo "$padded" | base64 --decode 2>/dev/null || echo "{}"
}

# 1. Test API connectivity
echo -e "\n${YELLOW}1. Testing API connectivity...${NC}"
if curl -s -f "$API_URL/../health" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ API is reachable${NC}"
else
    echo -e "${RED}❌ API is not reachable at $API_URL${NC}"
    echo "Make sure the development environment is running: make dev-up"
    exit 1
fi

# 2. Test login
echo -e "\n${YELLOW}2. Testing login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

ACCESS_TOKEN=$(extract_json_field "$LOGIN_RESPONSE" "accessToken")
REFRESH_TOKEN=$(extract_json_field "$LOGIN_RESPONSE" "refreshToken")

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
    echo -e "${RED}❌ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    echo ""
    echo "Possible issues:"
    echo "- Wrong credentials (run: node scripts/create-test-user.js)"
    echo "- User doesn't exist"
    echo "- Database connection issue"
    exit 1
else
    echo -e "${GREEN}✅ Login successful${NC}"
fi

# 3. Analyze token structure
echo -e "\n${YELLOW}3. Analyzing token structure...${NC}"
TOKEN_PAYLOAD=$(decode_jwt_payload "$ACCESS_TOKEN")
echo "Access Token Payload:"
echo "$TOKEN_PAYLOAD" | python3 -m json.tool 2>/dev/null || echo "$TOKEN_PAYLOAD"

# Check for required fields
ISSUES=0
echo -e "\nChecking required fields:"

# Check userId
if echo "$TOKEN_PAYLOAD" | grep -q '"userId"'; then
    echo -e "${GREEN}✅ userId field present${NC}"
else
    echo -e "${RED}❌ userId field missing${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Check email
if echo "$TOKEN_PAYLOAD" | grep -q '"email"'; then
    echo -e "${GREEN}✅ email field present${NC}"
else
    echo -e "${RED}❌ email field missing${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Check role
if echo "$TOKEN_PAYLOAD" | grep -q '"role"'; then
    echo -e "${GREEN}✅ role field present${NC}"
else
    echo -e "${RED}❌ role field missing${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Check type field (critical for middleware)
if echo "$TOKEN_PAYLOAD" | grep -q '"type".*"access"'; then
    echo -e "${GREEN}✅ type field is 'access'${NC}"
else
    echo -e "${RED}❌ type field missing or not 'access'${NC}"
    echo -e "${YELLOW}⚠️  This is the most common cause of auth failures!${NC}"
    ISSUES=$((ISSUES + 1))
fi

# 4. Test protected endpoint
echo -e "\n${YELLOW}4. Testing protected endpoint...${NC}"
ME_RESPONSE=$(curl -s -w '\n%{http_code}' -X GET "$API_URL/auth/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
BODY=$(echo "$ME_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Protected endpoint accessible${NC}"
    echo "User info:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${RED}❌ Authentication failed (401)${NC}"
    echo "Response: $BODY"
    
    # Try to identify the specific error
    if echo "$BODY" | grep -q "Invalid token type"; then
        echo -e "\n${RED}🔥 CRITICAL: Token type mismatch!${NC}"
        echo "The auth middleware expects type='access' in the token"
        echo "Check AuthService.generateAccessToken() method"
    elif echo "$BODY" | grep -q "Token expired"; then
        echo -e "\n${YELLOW}⚠️  Token has expired${NC}"
        echo "This is normal if the token is old"
    fi
else
    echo -e "${RED}❌ Unexpected response code: $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi

# 5. Test token refresh
echo -e "\n${YELLOW}5. Testing token refresh...${NC}"
if [ ! -z "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ]; then
    REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
    
    NEW_ACCESS_TOKEN=$(extract_json_field "$REFRESH_RESPONSE" "accessToken")
    
    if [ ! -z "$NEW_ACCESS_TOKEN" ] && [ "$NEW_ACCESS_TOKEN" != "null" ]; then
        echo -e "${GREEN}✅ Token refresh successful${NC}"
    else
        echo -e "${RED}❌ Token refresh failed${NC}"
        echo "Response: $REFRESH_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠️  No refresh token available${NC}"
fi

# 6. Summary
echo -e "\n${BLUE}=== SUMMARY ===${NC}"
if [ $ISSUES -eq 0 ] && [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ All authentication tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Authentication has issues${NC}"
    echo ""
    echo "Common fixes:"
    echo "1. Ensure tokens include type='access' field"
    echo "2. Check AuthService token generation matches middleware expectations"
    echo "3. Verify JWT_SECRET is the same for generation and validation"
    echo "4. Run 'make auth-diagnose' for detailed diagnostics"
    exit 1
fi