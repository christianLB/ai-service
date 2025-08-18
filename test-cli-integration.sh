#!/bin/bash

# AI Service CLI Integration Test Suite
# Tests all major functionality of the new CLI

echo "========================================="
echo "AI Service CLI Integration Tests"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_exit_code="${3:-0}"
    
    echo -n "Testing: $test_name ... "
    
    if eval "$command" > /dev/null 2>&1; then
        if [ "$expected_exit_code" -eq 0 ]; then
            echo -e "${GREEN}✓ PASSED${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}✗ FAILED (expected failure but succeeded)${NC}"
            ((TESTS_FAILED++))
        fi
    else
        if [ "$expected_exit_code" -ne 0 ]; then
            echo -e "${GREEN}✓ PASSED (expected failure)${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}✗ FAILED${NC}"
            ((TESTS_FAILED++))
        fi
    fi
}

# Change to project directory
cd /home/k2600x/dev/ai-service || exit 1

echo ""
echo "1. CLI Availability Tests"
echo "-----------------------------------------"
run_test "CLI script exists" "test -f ai-cli.js"
run_test "CLI is executable" "test -x ai-cli.js"
run_test "Token script exists" "test -f scripts/token.ts"
run_test "MCP server exists" "test -f ai-cli-mcp.js"

echo ""
echo "2. Basic Command Tests"
echo "-----------------------------------------"
run_test "CLI version" "./ai-cli.js --version"
run_test "CLI help" "./ai-cli.js --help"

echo ""
echo "3. Token Generation Tests"
echo "-----------------------------------------"
run_test "Token generation via npx" "npx ts-node scripts/token.ts 2>/dev/null | tail -1 | grep -E '^ey'"
run_test "Token generation via CLI" "./ai-cli.js token | grep -E '^ey'"
run_test "Token wrapper script" "bin/ai-token | grep -E '^ey'"

echo ""
echo "4. Token Usage Test"
echo "-----------------------------------------"
TOKEN=$(npx ts-node scripts/token.ts 2>/dev/null | tail -1)
if [ -n "$TOKEN" ]; then
    run_test "API health check with token" "curl -s -H 'Authorization: Bearer $TOKEN' http://localhost:3001/api/health | grep -q 'ok'"
else
    echo -e "${RED}✗ FAILED to generate token for API test${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "5. Development Command Tests (Non-Destructive)"
echo "-----------------------------------------"
run_test "Dev status command" "./ai-cli.js dev status"
# Note: Not running start/stop to avoid disrupting environment

echo ""
echo "6. Database Command Tests (Read-Only)"
echo "-----------------------------------------"
run_test "Database status" "./ai-cli.js db status"
# Note: Not running migrate/backup to avoid changes

echo ""
echo "7. Wrapper Script Tests"
echo "-----------------------------------------"
run_test "Dev wrapper exists" "test -x bin/ai-dev"
run_test "DB wrapper exists" "test -x bin/ai-db"
run_test "Token wrapper exists" "test -x bin/ai-token"

echo ""
echo "8. MCP Configuration Tests"
echo "-----------------------------------------"
run_test "MCP config exists" "test -f ~/.claude/mcp_config.json"
run_test "MCP server executable" "test -x ai-cli-mcp.js"

echo ""
echo "9. Documentation Tests"
echo "-----------------------------------------"
run_test "CLAUDE.md updated" "grep -q 'ai-cli.js' CLAUDE.md"
run_test "Agent docs exist" "test -f ~/.claude/agent-configs/cli-usage.md"
run_test "Transition Makefile exists" "test -f Makefile.cli-transition"

echo ""
echo "========================================="
echo "Test Results"
echo "========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo "The AI Service CLI is fully operational!"
    exit 0
else
    echo -e "\n${RED}❌ SOME TESTS FAILED${NC}"
    echo "Please review the failures above."
    exit 1
fi