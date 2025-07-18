#!/bin/bash
# Production Testing Script for MCP Bridge
# Tests functionality without exposing sensitive data

# set -e  # Disabled to continue testing even with failures

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
MCP_ENDPOINT="${MCP_ENDPOINT:-http://192.168.1.11:8080}"
AI_SERVICE_ENDPOINT="${AI_SERVICE_ENDPOINT:-http://192.168.1.11:3003}"
MCP_CLIENT="${SCRIPT_DIR}/../scripts/mcp-client.py"

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to read API key from env file without exposing it
get_api_key() {
    local env_file="${ENV_PROD_FILE}"
    if [ ! -f "$env_file" ]; then
        env_file="${ENV_FILE}"
    fi
    
    if [ -f "$env_file" ]; then
        # Extract first API key from the file
        local api_keys=$(grep "^API_KEYS=" "$env_file" | cut -d'=' -f2)
        echo "$api_keys" | cut -d',' -f1 | cut -d':' -f2
    else
        echo ""
    fi
}

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2
    local expected_result=${3:-0}
    
    ((TESTS_TOTAL++))
    
    echo -n "Testing ${test_name}... "
    
    if eval "$test_command" >/dev/null 2>&1; then
        if [ $expected_result -eq 0 ]; then
            echo -e "${GREEN}✅ PASSED${NC}"
            ((TESTS_PASSED++))
            return 0
        else
            echo -e "${RED}❌ FAILED (expected failure)${NC}"
            ((TESTS_FAILED++))
            return 1
        fi
    else
        if [ $expected_result -ne 0 ]; then
            echo -e "${GREEN}✅ PASSED (correctly failed)${NC}"
            ((TESTS_PASSED++))
            return 0
        else
            echo -e "${RED}❌ FAILED${NC}"
            ((TESTS_FAILED++))
            return 1
        fi
    fi
}

# Function to test endpoint with timing
test_endpoint_timed() {
    local name=$1
    local url=$2
    local expected=$3
    
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")
    local end_time=$(date +%s%N)
    
    local http_code=$(echo "$response" | tail -n1)
    local elapsed_time=$((($end_time - $start_time) / 1000000))
    
    ((TESTS_TOTAL++))
    
    echo -n "Testing ${name}... "
    
    if [ "$http_code" = "$expected" ]; then
        echo -e "${GREEN}✅ PASSED (${elapsed_time}ms)${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED (HTTP ${http_code})${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to test tool execution
test_tool() {
    local tool_name=$1
    local requires_auth=$2
    local params=$3
    
    local api_key=$(get_api_key)
    
    if [ "$requires_auth" = "true" ] && [ -z "$api_key" ]; then
        echo -e "${YELLOW}⚠️  Skipping ${tool_name} (no API key)${NC}"
        return
    fi
    
    local cmd="MCP_ENDPOINT='${MCP_ENDPOINT}' "
    if [ "$requires_auth" = "true" ]; then
        cmd+="MCP_API_KEY='${api_key}' "
    fi
    cmd+="python3 '${MCP_CLIENT}' tool '${tool_name}' ${params}"
    
    run_test "$tool_name" "$cmd"
}

# Main test execution
main() {
    echo -e "${BLUE}🧪 MCP Bridge Production Testing${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
    echo "Endpoint: ${MCP_ENDPOINT}"
    echo ""
    
    # Check if API key is available
    local api_key=$(get_api_key)
    if [ -z "$api_key" ]; then
        echo -e "${YELLOW}⚠️  No API key found. Auth tests will be skipped.${NC}"
        echo "Run: ./secure-setup.sh --production"
        echo ""
    fi
    
    # Basic connectivity tests
    echo -e "${BLUE}1️⃣ Basic Connectivity${NC}"
    test_endpoint_timed "Health endpoint" "${MCP_ENDPOINT}/health" "200"
    test_endpoint_timed "Capabilities endpoint" "${MCP_ENDPOINT}/mcp/capabilities" "200"
    test_endpoint_timed "Info endpoint" "${MCP_ENDPOINT}/mcp/info" "200"
    
    echo ""
    echo -e "${BLUE}2️⃣ Authentication Tests${NC}"
    
    # Test unauthenticated access to protected endpoint
    run_test "Unauthorized access" "curl -s '${MCP_ENDPOINT}/mcp/tools/get_financial_summary/execute' -X POST" 1
    
    # Test with invalid API key
    if [ -n "$api_key" ]; then
        run_test "Invalid API key" "curl -s '${MCP_ENDPOINT}/mcp/tools/get_financial_summary/execute' -X POST -H 'x-api-key: invalid-key'" 1
    fi
    
    echo ""
    echo -e "${BLUE}3️⃣ Tool Execution Tests${NC}"
    
    # Test tools that don't require auth
    test_tool "health_check" "false"
    test_tool "get_system_status" "false"
    test_tool "get_neural_status" "false"
    
    # Test tools that require auth
    if [ -n "$api_key" ]; then
        test_tool "get_financial_summary" "true" "--period month"
        test_tool "get_account_balance" "true"
        test_tool "get_system_metrics" "true"
    fi
    
    echo ""
    echo -e "${BLUE}4️⃣ Rate Limiting Tests${NC}"
    
    # Test rate limiting
    if [ -n "$api_key" ]; then
        echo -n "Testing rate limiting... "
        local rate_limit_hit=false
        
        for i in {1..10}; do
            if ! MCP_ENDPOINT="${MCP_ENDPOINT}" MCP_API_KEY="${api_key}" \
                python3 "${MCP_CLIENT}" tool health_check >/dev/null 2>&1; then
                rate_limit_hit=true
                break
            fi
        done
        
        if [ "$rate_limit_hit" = true ]; then
            echo -e "${GREEN}✅ PASSED (rate limit enforced)${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${YELLOW}⚠️  Rate limit not hit (may be disabled)${NC}"
        fi
        ((TESTS_TOTAL++))
    fi
    
    echo ""
    echo -e "${BLUE}5️⃣ Performance Tests${NC}"
    
    # Performance test
    echo -n "Average response time... "
    local total_time=0
    local test_count=5
    
    for i in $(seq 1 $test_count); do
        local start_time=$(date +%s%N)
        curl -s "${MCP_ENDPOINT}/health" >/dev/null 2>&1
        local end_time=$(date +%s%N)
        local elapsed=$((($end_time - $start_time) / 1000000))
        total_time=$((total_time + elapsed))
    done
    
    local avg_time=$((total_time / test_count))
    
    if [ $avg_time -lt 1000 ]; then
        echo -e "${GREEN}✅ PASSED (${avg_time}ms average)${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠️  SLOW (${avg_time}ms average)${NC}"
        ((TESTS_FAILED++))
    fi
    ((TESTS_TOTAL++))
    
    # Summary
    echo ""
    echo -e "${BLUE}📊 Test Summary${NC}"
    echo -e "${BLUE}===============${NC}"
    
    local pass_rate=$((TESTS_PASSED * 100 / TESTS_TOTAL))
    
    echo "Total tests: ${TESTS_TOTAL}"
    echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"
    echo "Pass rate: ${pass_rate}%"
    
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passed!${NC}"
        echo -e "${GREEN}✅ MCP Bridge is ready for production use${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        echo "Please check the logs and configuration"
        exit 1
    fi
}

# Run main function
main "$@"