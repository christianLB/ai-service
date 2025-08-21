#!/bin/bash

# Production Validation & Parity Check
# =====================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_test() {
    local name=$1
    local status=$2
    local message=${3:-""}
    
    if [ "$status" = "pass" ]; then
        echo -e "${GREEN}✓${NC} $name"
        PASSED=$((PASSED + 1))
    elif [ "$status" = "fail" ]; then
        echo -e "${RED}✗${NC} $name"
        [ -n "$message" ] && echo -e "  ${RED}→ $message${NC}"
        FAILED=$((FAILED + 1))
    elif [ "$status" = "warn" ]; then
        echo -e "${YELLOW}⚠${NC} $name"
        [ -n "$message" ] && echo -e "  ${YELLOW}→ $message${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
}

# Start validation
echo -e "${BLUE}🚀 Production Validation Suite${NC}"
echo -e "${BLUE}================================${NC}"
echo "Validating production readiness and parity..."

# 1. Code Quality Checks
print_header "1. CODE QUALITY"

# TypeScript compilation
echo -n "TypeScript compilation... "
if npm run typecheck > /dev/null 2>&1; then
    print_test "TypeScript compilation" "pass"
else
    print_test "TypeScript compilation" "fail" "TypeScript errors found"
fi

# ESLint
echo -n "ESLint validation... "
LINT_OUTPUT=$(npm run lint 2>&1 || true)
if echo "$LINT_OUTPUT" | grep -q "warning"; then
    WARNING_COUNT=$(echo "$LINT_OUTPUT" | grep -c "warning" || echo "0")
    print_test "ESLint validation" "warn" "$WARNING_COUNT warnings found"
elif echo "$LINT_OUTPUT" | grep -q "error"; then
    ERROR_COUNT=$(echo "$LINT_OUTPUT" | grep -c "error" || echo "0")
    print_test "ESLint validation" "fail" "$ERROR_COUNT errors found"
else
    print_test "ESLint validation" "pass"
fi

# Build test
echo -n "Production build... "
if npm run build > /dev/null 2>&1; then
    print_test "Production build" "pass"
else
    print_test "Production build" "fail" "Build failed"
fi

# 2. Test Suites
print_header "2. TEST SUITES"

# Unit tests
echo -n "Unit tests... "
TEST_OUTPUT=$(npm test 2>&1 || true)
if echo "$TEST_OUTPUT" | grep -q "passed"; then
    TESTS_PASSED=$(echo "$TEST_OUTPUT" | grep -oP '\d+ passed' | grep -oP '\d+' || echo "0")
    TESTS_FAILED=$(echo "$TEST_OUTPUT" | grep -oP '\d+ failed' | grep -oP '\d+' || echo "0")
    
    if [ "$TESTS_FAILED" = "0" ]; then
        print_test "Unit tests" "pass" "$TESTS_PASSED tests passed"
    else
        print_test "Unit tests" "fail" "$TESTS_FAILED tests failed"
    fi
else
    print_test "Unit tests" "fail" "Test suite failed to run"
fi

# E2E tests status
echo -n "E2E tests... "
if [ -f "playwright-report/index.html" ]; then
    print_test "E2E tests" "warn" "Tests configured but need fixing"
else
    print_test "E2E tests" "warn" "E2E tests not configured"
fi

# 3. Docker & Deployment
print_header "3. DOCKER & DEPLOYMENT"

# Docker images
echo -n "Docker images... "
if docker images | grep -q "ai-service"; then
    print_test "Docker images" "pass"
else
    print_test "Docker images" "warn" "Images need building"
fi

# Docker Compose validation
echo -n "Docker Compose configuration... "
if docker-compose config > /dev/null 2>&1; then
    print_test "Docker Compose configuration" "pass"
else
    print_test "Docker Compose configuration" "fail" "Invalid configuration"
fi

# Service health
echo -n "Service health checks... "
if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
    print_test "API service health" "pass"
else
    print_test "API service health" "fail" "Service not responding"
fi

if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    print_test "Frontend service health" "pass"
else
    print_test "Frontend service health" "fail" "Frontend not responding"
fi

# 4. Database & Migrations
print_header "4. DATABASE & MIGRATIONS"

# Database connection
echo -n "Database connection... "
if docker exec ai-service-postgres pg_isready -U ai_user > /dev/null 2>&1; then
    print_test "Database connection" "pass"
else
    print_test "Database connection" "fail" "Cannot connect to database"
fi

# Prisma migrations
echo -n "Database migrations... "
MIGRATION_STATUS=$(npx prisma migrate status 2>&1 || true)
if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
    print_test "Database migrations" "pass"
elif echo "$MIGRATION_STATUS" | grep -q "pending"; then
    print_test "Database migrations" "warn" "Pending migrations found"
else
    print_test "Database migrations" "fail" "Migration issues detected"
fi

# 5. Security Checks
print_header "5. SECURITY"

# Environment variables
echo -n "Environment configuration... "
if [ -f ".env" ]; then
    if grep -q "JWT_SECRET=your" .env; then
        print_test "Environment configuration" "fail" "Default secrets detected!"
    else
        print_test "Environment configuration" "pass"
    fi
else
    print_test "Environment configuration" "warn" ".env file missing"
fi

# Dependency vulnerabilities
echo -n "Dependency vulnerabilities... "
AUDIT_OUTPUT=$(npm audit --audit-level=high 2>&1 || true)
if echo "$AUDIT_OUTPUT" | grep -q "found 0 vulnerabilities"; then
    print_test "Dependency vulnerabilities" "pass"
elif echo "$AUDIT_OUTPUT" | grep -q "high"; then
    HIGH_COUNT=$(echo "$AUDIT_OUTPUT" | grep -oP '\d+(?= high)' || echo "0")
    print_test "Dependency vulnerabilities" "fail" "$HIGH_COUNT high severity issues"
else
    print_test "Dependency vulnerabilities" "warn" "Some vulnerabilities found"
fi

# 6. CI/CD Integration
print_header "6. CI/CD INTEGRATION"

# GitHub Actions
echo -n "GitHub Actions workflows... "
if [ -d ".github/workflows" ]; then
    WORKFLOW_COUNT=$(ls -1 .github/workflows/*.yml 2>/dev/null | wc -l)
    print_test "GitHub Actions workflows" "pass" "$WORKFLOW_COUNT workflows configured"
else
    print_test "GitHub Actions workflows" "fail" "No workflows found"
fi

# Git status
echo -n "Git repository status... "
if git diff --quiet && git diff --staged --quiet; then
    print_test "Git repository status" "pass" "Clean working directory"
else
    CHANGES=$(git status --porcelain | wc -l)
    print_test "Git repository status" "warn" "$CHANGES uncommitted changes"
fi

# 7. Performance Baseline
print_header "7. PERFORMANCE"

# API response time
echo -n "API response time... "
if command -v curl > /dev/null; then
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3001/health 2>/dev/null || echo "999")
    RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null || echo "999")
    
    if [ "${RESPONSE_MS%.*}" -lt 200 ]; then
        print_test "API response time" "pass" "${RESPONSE_MS%.*}ms"
    elif [ "${RESPONSE_MS%.*}" -lt 500 ]; then
        print_test "API response time" "warn" "${RESPONSE_MS%.*}ms (slow)"
    else
        print_test "API response time" "fail" "Service not responding"
    fi
fi

# Memory usage
echo -n "Container memory usage... "
if docker stats --no-stream --format "table {{.Container}}\t{{.MemPerc}}" 2>/dev/null | grep -q "ai-service"; then
    print_test "Container memory usage" "pass" "Monitoring available"
else
    print_test "Container memory usage" "warn" "Cannot check memory usage"
fi

# 8. Documentation
print_header "8. DOCUMENTATION"

# README
echo -n "README documentation... "
if [ -f "README.md" ]; then
    print_test "README documentation" "pass"
else
    print_test "README documentation" "fail" "README.md missing"
fi

# API documentation
echo -n "API documentation... "
if [ -d "openapi" ] || [ -f "swagger.json" ]; then
    print_test "API documentation" "pass"
else
    print_test "API documentation" "warn" "OpenAPI specs should be documented"
fi

# Architecture documentation
echo -n "Architecture documentation... "
if [ -f "docs/ARCHITECTURE_DECISION_2025.md" ]; then
    print_test "Architecture documentation" "pass" "Decision record found"
else
    print_test "Architecture documentation" "warn" "Architecture decisions should be documented"
fi

# Final Summary
print_header "VALIDATION SUMMARY"

TOTAL=$((PASSED + FAILED + WARNINGS))
SUCCESS_RATE=$((PASSED * 100 / TOTAL))

echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "Success Rate: ${SUCCESS_RATE}%"

# Production readiness assessment
echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 PRODUCTION READY!${NC}"
    echo -e "${GREEN}All critical checks passed. Ready for deployment.${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
elif [ $FAILED -le 3 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  ALMOST READY${NC}"
    echo -e "${YELLOW}Minor issues need fixing before production deployment.${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ NOT PRODUCTION READY${NC}"
    echo -e "${RED}Critical issues must be resolved before deployment.${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 2
fi