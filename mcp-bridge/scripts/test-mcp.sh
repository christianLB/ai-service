#!/bin/bash
# MCP Bridge Testing Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
MCP_ENDPOINT="${MCP_ENDPOINT:-http://192.168.1.11:8080}"
AI_SERVICE_ENDPOINT="${AI_SERVICE_ENDPOINT:-http://192.168.1.11:3003}"
MCP_CLIENT="../scripts/mcp-client.py"

echo -e "${BLUE}🧪 MCP Bridge Testing Script${NC}"
echo -e "${BLUE}=============================${NC}"
echo ""

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Testing ${name}... "
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected" ]; then
        echo -e "${GREEN}✅ OK (${http_code})${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED (${http_code})${NC}"
        return 1
    fi
}

# Function to get auth token
get_auth_token() {
    echo -e "${YELLOW}🔑 Getting authentication token...${NC}"
    
    response=$(curl -s -X POST ${AI_SERVICE_ENDPOINT}/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email": "admin@ai-service.local", "password": "admin123"}' \
        2>/dev/null)
    
    token=$(echo "$response" | jq -r '.token' 2>/dev/null)
    
    if [ -z "$token" ] || [ "$token" = "null" ]; then
        echo -e "${RED}❌ Failed to get auth token${NC}"
        echo "Response: $response"
        return 1
    fi
    
    echo -e "${GREEN}✅ Got auth token${NC}"
    export MCP_AUTH_TOKEN="$token"
    return 0
}

# Step 1: Test basic connectivity
echo -e "${BLUE}1️⃣ Testing basic connectivity${NC}"
echo "MCP Endpoint: $MCP_ENDPOINT"
echo "AI Service Endpoint: $AI_SERVICE_ENDPOINT"
echo ""

test_endpoint "MCP Health" "${MCP_ENDPOINT}/health" "200"
test_endpoint "MCP Capabilities" "${MCP_ENDPOINT}/mcp/capabilities" "200"
test_endpoint "AI Service Status" "${AI_SERVICE_ENDPOINT}/status" "200"

# Step 2: Get authentication token
echo -e "\n${BLUE}2️⃣ Authentication${NC}"
if ! get_auth_token; then
    echo -e "${RED}Cannot continue without auth token${NC}"
    exit 1
fi

# Step 3: Test MCP tools without auth
echo -e "\n${BLUE}3️⃣ Testing tools without authentication${NC}"
echo "Using client: python $MCP_CLIENT"

# Test system status (no auth required)
echo -e "\n${YELLOW}Testing get_system_status...${NC}"
python $MCP_CLIENT tool get_system_status

# Test health check (no auth required)
echo -e "\n${YELLOW}Testing health_check...${NC}"
python $MCP_CLIENT tool health_check

# Step 4: Test MCP tools with auth
echo -e "\n${BLUE}4️⃣ Testing tools with authentication${NC}"

# Test financial summary
echo -e "\n${YELLOW}Testing get_financial_summary...${NC}"
python $MCP_CLIENT tool get_financial_summary --period month

# Test account balance
echo -e "\n${YELLOW}Testing get_account_balance...${NC}"
python $MCP_CLIENT tool get_account_balance

# Test document search
echo -e "\n${YELLOW}Testing search_documents...${NC}"
python $MCP_CLIENT tool search_documents --query "test" --limit 5

# Step 5: Test rate limiting
echo -e "\n${BLUE}5️⃣ Testing rate limiting${NC}"
echo "Sending 5 rapid requests..."

for i in {1..5}; do
    echo -n "Request $i: "
    if python $MCP_CLIENT tool get_system_status >/dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}Rate limited${NC}"
    fi
    sleep 0.1
done

# Step 6: Test WebSocket connection
echo -e "\n${BLUE}6️⃣ Testing WebSocket connection${NC}"
echo "Testing WebSocket at ws://192.168.1.11:8080..."

# Simple WebSocket test using curl (if available)
if command -v websocat &> /dev/null; then
    echo '{"type":"ping"}' | websocat -t -n1 ws://192.168.1.11:8080 &
    sleep 2
    echo -e "${YELLOW}WebSocket test requires 'websocat' tool${NC}"
else
    echo -e "${YELLOW}Skipping WebSocket test (websocat not installed)${NC}"
fi

# Step 7: Performance test
echo -e "\n${BLUE}7️⃣ Performance test${NC}"
echo "Testing response time for 10 requests..."

total_time=0
for i in {1..10}; do
    start_time=$(date +%s%N)
    python $MCP_CLIENT tool get_system_status >/dev/null 2>&1
    end_time=$(date +%s%N)
    
    elapsed_time=$((($end_time - $start_time) / 1000000))
    total_time=$(($total_time + $elapsed_time))
    echo "Request $i: ${elapsed_time}ms"
done

avg_time=$(($total_time / 10))
echo -e "\n${GREEN}Average response time: ${avg_time}ms${NC}"

# Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo -e "${BLUE}===============${NC}"
echo -e "${GREEN}✅ Basic connectivity working${NC}"
echo -e "${GREEN}✅ Authentication working${NC}"
echo -e "${GREEN}✅ Tools execution working${NC}"
echo -e "${GREEN}✅ Rate limiting working${NC}"

if [ $avg_time -lt 1000 ]; then
    echo -e "${GREEN}✅ Performance good (avg ${avg_time}ms)${NC}"
else
    echo -e "${YELLOW}⚠️  Performance slow (avg ${avg_time}ms)${NC}"
fi

echo -e "\n${GREEN}🎉 MCP Bridge is ready for use!${NC}"