#!/usr/bin/env bash
# ============================================================================
# F5 Validation Script - Environment & Entrypoints with Prisma
# ============================================================================
# Validates that all services have:
# 1. Environment validation with @ai/config
# 2. Comprehensive .env.template
# 3. Service-specific entrypoint scripts with Prisma migrations
# 4. Proper health check dependencies
# ============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "============================================"
echo "F5 Phase Validation - Env + Entrypoints Prisma"
echo "============================================"
echo ""

# Counter for issues
ISSUES=0
WARNINGS=0

# Function to check if file exists
check_file() {
    local file=$1
    local description=$2
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $description exists"
        return 0
    else
        echo -e "${RED}❌${NC} $description missing: $file"
        ((ISSUES++))
        return 1
    fi
}

# Function to check file content
check_content() {
    local file=$1
    local pattern=$2
    local description=$3
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $description"
        return 0
    else
        echo -e "${YELLOW}⚠️${NC} $description not found in $file"
        ((WARNINGS++))
        return 1
    fi
}

echo "1. Checking Environment Configuration"
echo "--------------------------------------"

# Check .env.template
check_file ".env.template" ".env.template file"
if [ -f ".env.template" ]; then
    check_content ".env.template" "NODE_ENV" "NODE_ENV configuration"
    check_content ".env.template" "DATABASE_URL" "DATABASE_URL configuration"
    check_content ".env.template" "REDIS_URL" "REDIS_URL configuration"
    check_content ".env.template" "JWT_SECRET" "JWT_SECRET configuration"
    check_content ".env.template" "SERVICE-SPECIFIC REQUIREMENTS" "Service-specific documentation"
fi

# Check packages/config/src/env.ts
check_file "packages/config/src/env.ts" "Enhanced env.ts with Zod validation"
if [ -f "packages/config/src/env.ts" ]; then
    check_content "packages/config/src/env.ts" "z.object" "Zod schema definition"
    check_content "packages/config/src/env.ts" "getEnv" "getEnv function"
    check_content "packages/config/src/env.ts" "ServiceSchemas" "Service-specific schemas"
fi

echo ""
echo "2. Checking Service Entrypoints"
echo "--------------------------------"

# List of services to check
SERVICES=(
    "api-gateway:3000"
    "financial-svc:3001"
    "trading-svc:3002"
    "comm-svc:3003"
    "ai-core:3004"
    "worker-financial:3101"
    "worker-trading:3102"
)

for service_port in "${SERVICES[@]}"; do
    IFS=':' read -r service port <<< "$service_port"
    echo ""
    echo "Checking $service (port $port):"
    
    entrypoint="apps/$service/entrypoint.sh"
    
    if check_file "$entrypoint" "$service entrypoint script"; then
        # Check for F5 enhancements
        check_content "$entrypoint" "Environment Validation" "Environment validation section"
        check_content "$entrypoint" "@ai/config" "Using @ai/config for validation"
        check_content "$entrypoint" "Wait for Database" "Database dependency check"
        check_content "$entrypoint" "Wait for Redis" "Redis dependency check"
        check_content "$entrypoint" "prisma generate" "Prisma client generation"
        check_content "$entrypoint" "prisma migrate deploy" "Prisma migration deployment"
        check_content "$entrypoint" "SERVICE_NAME=" "Service name export"
        
        # Check if executable
        if [ -x "$entrypoint" ]; then
            echo -e "${GREEN}✅${NC} Entrypoint is executable"
        else
            echo -e "${YELLOW}⚠️${NC} Entrypoint is not executable (run: chmod +x $entrypoint)"
            ((WARNINGS++))
        fi
    fi
done

echo ""
echo "3. Checking Docker Integration"
echo "-------------------------------"

# Check if Dockerfiles reference entrypoints
for service_port in "${SERVICES[@]}"; do
    IFS=':' read -r service port <<< "$service_port"
    dockerfile="apps/$service/Dockerfile"
    
    if [ -f "$dockerfile" ]; then
        if grep -q "entrypoint.sh" "$dockerfile" 2>/dev/null; then
            echo -e "${GREEN}✅${NC} $service Dockerfile references entrypoint.sh"
        else
            echo -e "${YELLOW}⚠️${NC} $service Dockerfile doesn't reference entrypoint.sh"
            ((WARNINGS++))
        fi
    fi
done

echo ""
echo "4. Checking Prisma Schema"
echo "--------------------------"

if check_file "prisma/schema.prisma" "Prisma schema file"; then
    check_content "prisma/schema.prisma" "previewFeatures.*multiSchema" "Multi-schema support"
    check_content "prisma/schema.prisma" "schemas.*\[" "Schema array configuration"
fi

echo ""
echo "5. Checking Package Dependencies"
echo "---------------------------------"

# Check if services have @ai/config dependency
for service_port in "${SERVICES[@]}"; do
    IFS=':' read -r service port <<< "$service_port"
    package_json="apps/$service/package.json"
    
    if [ -f "$package_json" ]; then
        if grep -q "@ai/config" "$package_json" 2>/dev/null; then
            echo -e "${GREEN}✅${NC} $service has @ai/config dependency"
        else
            echo -e "${YELLOW}⚠️${NC} $service missing @ai/config dependency"
            ((WARNINGS++))
        fi
    fi
done

echo ""
echo "============================================"
echo "F5 VALIDATION SUMMARY"
echo "============================================"

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ F5 PHASE COMPLETE - All checks passed!${NC}"
    echo ""
    echo "F5 Status: 🟢 GREEN"
    echo ""
    echo "All services have:"
    echo "- Environment validation with @ai/config"
    echo "- Comprehensive .env.template"
    echo "- Service-specific entrypoints with Prisma migrations"
    echo "- Proper dependency checks"
    exit 0
elif [ $ISSUES -eq 0 ]; then
    echo -e "${YELLOW}⚠️ F5 PHASE MOSTLY COMPLETE - $WARNINGS warnings${NC}"
    echo ""
    echo "F5 Status: 🟡 YELLOW"
    echo ""
    echo "Minor issues to address:"
    echo "- Review warnings above"
    echo "- Ensure all services have @ai/config dependency"
    echo "- Make entrypoint scripts executable"
    exit 0
else
    echo -e "${RED}❌ F5 PHASE INCOMPLETE - $ISSUES critical issues, $WARNINGS warnings${NC}"
    echo ""
    echo "F5 Status: 🔴 RED"
    echo ""
    echo "Critical issues must be resolved:"
    echo "- Fix missing files and configurations"
    echo "- Ensure all entrypoints have required sections"
    echo "- Add missing dependencies"
    exit 1
fi