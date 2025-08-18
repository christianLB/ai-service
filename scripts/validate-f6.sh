#!/bin/bash
# F6 Validation Script: Verify CI Pipeline + Environment Parity
# Purpose: Validate that F6 requirements are fully met

set -e

echo "================================"
echo "F6 Validation: CI Pipeline + Environment Parity"
echo "================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to check requirement
check_requirement() {
    local name=$1
    local command=$2
    local expected=$3
    
    echo -n "Checking: $name... "
    
    result=$(eval "$command" 2>/dev/null || echo "0")
    
    if [ "$result" = "$expected" ] || [ "$result" -ge "$expected" ] 2>/dev/null; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (expected: $expected, got: $result)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to check file exists
check_file_exists() {
    local name=$1
    local file=$2
    
    echo -n "Checking: $name... "
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ EXISTS${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ MISSING${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to compare services
compare_services() {
    local dev_file="infra/compose/docker-compose.dev.yml"
    local prod_file="docker-compose.nas.yml"
    
    echo ""
    echo -e "${BLUE}Comparing services between environments...${NC}"
    
    # Extract service names
    dev_services=$(grep -E "^  [a-z-]+:" "$dev_file" | sed 's/://g' | sed 's/  //g' | sort)
    prod_services=$(grep -E "^  [a-z-]+:" "$prod_file" | sed 's/://g' | sed 's/  //g' | sort)
    
    # Find differences
    only_in_dev=$(comm -23 <(echo "$dev_services") <(echo "$prod_services"))
    only_in_prod=$(comm -13 <(echo "$dev_services") <(echo "$prod_services"))
    
    if [ -z "$only_in_dev" ] && [ -z "$only_in_prod" ]; then
        echo -e "${GREEN}✅ All services match between environments${NC}"
        PASSED=$((PASSED + 1))
    else
        if [ -n "$only_in_dev" ]; then
            echo -e "${YELLOW}⚠️  Services only in DEV:${NC}"
            echo "$only_in_dev" | while read -r svc; do
                echo "    - $svc"
                # Special case for bull-board (expected to be added to prod)
                if [ "$svc" = "bull-board" ]; then
                    echo -e "      ${YELLOW}(Should be added to production)${NC}"
                    WARNINGS=$((WARNINGS + 1))
                fi
            done
        fi
        if [ -n "$only_in_prod" ]; then
            echo -e "${YELLOW}⚠️  Services only in PROD:${NC}"
            echo "$only_in_prod" | while read -r svc; do
                echo "    - $svc"
            done
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
}

echo ""
echo "1. CI Workflow Validation"
echo "-------------------------"

CI_FILE=".github/workflows/ci.yml"

if [ -f "$CI_FILE" ]; then
    check_requirement "Lint step in CI" \
        "grep -c 'npm run lint' $CI_FILE" \
        "1"
    
    check_requirement "Typecheck step in CI" \
        "grep -c 'npm run typecheck' $CI_FILE" \
        "1"
    
    check_requirement "Test step in CI" \
        "grep -c 'npm run test' $CI_FILE" \
        "1"
    
    check_requirement "Contracts generate in CI" \
        "grep -c 'contracts:generate' $CI_FILE" \
        "1"
    
    check_requirement "Contracts check (drift detection)" \
        "grep -c 'contracts:check' $CI_FILE" \
        "1"
    
    check_requirement "Build step in CI" \
        "grep -c 'npm run build' $CI_FILE" \
        "1"
    
    # Check for proper drift detection failure
    echo -n "Checking: Contract drift fails CI... "
    if grep -q "exit 1" $CI_FILE && grep -q "contracts:check" $CI_FILE; then
        echo -e "${GREEN}✅ CONFIGURED${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ NOT CONFIGURED${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${RED}❌ CI workflow file not found!${NC}"
    FAILED=$((FAILED + 7))
fi

echo ""
echo "2. Docker Compose Files"
echo "-----------------------"

check_file_exists "Development compose" "infra/compose/docker-compose.dev.yml"
check_file_exists "Production compose (NAS)" "docker-compose.nas.yml"

# Check for duplicate production file
echo -n "Checking: No duplicate production file... "
if [ ! -f "docker-compose.production.yml" ]; then
    echo -e "${GREEN}✅ CLEAN${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  DUPLICATE EXISTS${NC} (should be removed)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "3. Service Parity Check"
echo "-----------------------"

compare_services

echo ""
echo "4. Healthcheck Configuration"
echo "----------------------------"

# Check all services have healthchecks
for file in "infra/compose/docker-compose.dev.yml" "docker-compose.nas.yml"; do
    if [ -f "$file" ]; then
        echo -e "${BLUE}Checking healthchecks in $(basename $file)...${NC}"
        
        services=$(grep -E "^  [a-z-]+:" "$file" | sed 's/://g' | sed 's/  //g' | grep -v "db\|postgres\|redis")
        
        for service in $services; do
            echo -n "  $service: "
            # Extract the service block and check for healthcheck
            service_block=$(awk "/^  $service:/,/^  [a-z-]+:|^[a-z]|^$/" "$file")
            
            if echo "$service_block" | grep -q "healthcheck:"; then
                # Check for proper Node.js healthcheck
                if echo "$service_block" | grep -q "fetch.*health"; then
                    echo -e "${GREEN}✅ Node.js healthcheck${NC}"
                    PASSED=$((PASSED + 1))
                elif echo "$service_block" | grep -q "wget.*health\|curl.*health"; then
                    echo -e "${GREEN}✅ HTTP healthcheck${NC}"
                    PASSED=$((PASSED + 1))
                else
                    echo -e "${YELLOW}⚠️  Non-standard healthcheck${NC}"
                    WARNINGS=$((WARNINGS + 1))
                fi
            else
                echo -e "${RED}❌ No healthcheck${NC}"
                FAILED=$((FAILED + 1))
            fi
        done
    fi
done

echo ""
echo "5. Required Services Check"
echo "--------------------------"

REQUIRED_SERVICES=(
    "postgres|db"
    "redis"
    "financial-svc"
    "trading-svc"
    "ai-core"
    "comm-svc"
    "api-gateway"
    "worker-financial"
    "worker-trading"
    "frontend"
)

for pattern in "${REQUIRED_SERVICES[@]}"; do
    service_name=$(echo $pattern | cut -d'|' -f1)
    echo -n "Checking service: $service_name... "
    
    dev_exists=$(grep -E "^  ($pattern):" infra/compose/docker-compose.dev.yml 2>/dev/null | wc -l)
    prod_exists=$(grep -E "^  ($pattern):" docker-compose.nas.yml 2>/dev/null | wc -l)
    
    if [ "$dev_exists" -gt 0 ] && [ "$prod_exists" -gt 0 ]; then
        echo -e "${GREEN}✅ Both environments${NC}"
        PASSED=$((PASSED + 1))
    elif [ "$dev_exists" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Only in DEV${NC}"
        WARNINGS=$((WARNINGS + 1))
    elif [ "$prod_exists" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Only in PROD${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${RED}❌ Missing in both${NC}"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "6. Contract System Check"
echo "------------------------"

# Check for contract packages
check_file_exists "Contracts package" "packages/contracts/package.json"
check_file_exists "OpenAPI specs directory" "packages/contracts/specs"

# Check for contract scripts in root package.json
echo -n "Checking: Contract scripts in package.json... "
if [ -f "package.json" ]; then
    has_generate=$(grep -c '"contracts:generate"' package.json || echo 0)
    has_check=$(grep -c '"contracts:check"' package.json || echo 0)
    has_build=$(grep -c '"contracts:build"' package.json || echo 0)
    
    if [ "$has_generate" -gt 0 ] && [ "$has_check" -gt 0 ] && [ "$has_build" -gt 0 ]; then
        echo -e "${GREEN}✅ All scripts present${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ Missing scripts${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${RED}❌ package.json not found${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "================================"
echo "F6 Validation Results"
echo "================================"
echo ""

# Calculate percentage
TOTAL=$((PASSED + FAILED + WARNINGS))
if [ $TOTAL -gt 0 ]; then
    PERCENT=$((PASSED * 100 / TOTAL))
else
    PERCENT=0
fi

# Display results
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "Total checks: $TOTAL"
echo ""

# Overall status
if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ F6 COMPLETE: All requirements met!${NC}"
    echo "Score: 100%"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠️  F6 PARTIAL: Requirements met with warnings${NC}"
    echo "Score: ${PERCENT}%"
    echo ""
    echo "Recommended actions:"
    echo "1. Add bull-board service to production"
    echo "2. Review and align any service differences"
    echo "3. Standardize all healthcheck configurations"
    exit 0
else
    echo -e "${RED}❌ F6 INCOMPLETE: Critical requirements missing${NC}"
    echo "Score: ${PERCENT}%"
    echo ""
    echo "Required actions:"
    echo "1. Fix all failed checks above"
    echo "2. Run this validation again"
    echo "3. Ensure contract drift detection is working"
    exit 1
fi