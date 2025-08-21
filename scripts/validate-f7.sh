#!/bin/bash

# F7 Validation Script - Cleanup & Guardrails
# Validates that all F7 requirements have been implemented

set -e

echo "========================================="
echo "F7 Validation - Cleanup & Guardrails"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to check requirement
check_requirement() {
    local test_name="$1"
    local test_command="$2"
    local is_critical="${3:-true}"
    
    echo -n "Checking $test_name... "
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        if [ "$is_critical" = "true" ]; then
            echo -e "${RED}✗${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠${NC}"
            ((WARNINGS++))
        fi
        return 1
    fi
}

echo "1. Artifact Cleanup:"
echo "-------------------"
check_requirement ".server-3001.pid removed" "! test -f .server-3001.pid"
check_requirement ".gitignore updated with *.pid" "grep -q '\\*.pid' .gitignore"
check_requirement ".gitignore has common artifacts" "grep -q '.DS_Store' .gitignore"

echo ""
echo "2. Security Headers (nginx):"
echo "---------------------------"
check_requirement "HSTS header configured" "grep -q 'Strict-Transport-Security' nginx/default.conf"
check_requirement "CSP header configured" "grep -q 'Content-Security-Policy' nginx/default.conf"
check_requirement "X-Frame-Options configured" "grep -q 'X-Frame-Options' nginx/default.conf"
check_requirement "X-Content-Type-Options configured" "grep -q 'X-Content-Type-Options' nginx/default.conf"
check_requirement "X-XSS-Protection configured" "grep -q 'X-XSS-Protection' nginx/default.conf"

echo ""
echo "3. Event Logging & Tracing:"
echo "--------------------------"
check_requirement "EventLog model in Prisma schema" "grep -q 'model EventLog' prisma/schema.prisma"
check_requirement "traceId field in EventLog" "grep -q 'traceId.*String' prisma/schema.prisma"
check_requirement "Event logger middleware created" "test -f packages/observability/src/event-logger.ts"
check_requirement "Event logger exported from observability" "grep -q 'export.*EventLogger' packages/observability/src/index.ts"

echo ""
echo "4. Build Artifacts Ignored:"
echo "--------------------------"
check_requirement "dist/ in .gitignore" "grep -q '^dist/' .gitignore"
check_requirement "*.tsbuildinfo in .gitignore" "grep -q '\\*.tsbuildinfo' .gitignore"
check_requirement "Temp files ignored" "grep -q '\\*.swp' .gitignore"

echo ""
echo "5. Packages & Services:"
echo "----------------------"
check_requirement "Observability package builds" "cd packages/observability && npm run build > /dev/null 2>&1"
check_requirement "Trading service builds" "cd apps/trading-svc && npm run build > /dev/null 2>&1" "false"
check_requirement "Bull Board builds" "cd apps/bull-board && npm run build > /dev/null 2>&1" "false"

echo ""
echo "========================================="
echo "F7 Validation Results:"
echo "========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All F7 requirements validated successfully!${NC}"
    echo "F7 Status: 🟢 GREEN"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  F7 validated with $WARNINGS warning(s)${NC}"
    echo "F7 Status: 🟡 YELLOW"
    exit 0
else
    echo -e "${RED}❌ F7 validation failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo "F7 Status: 🔴 RED"
    exit 1
fi