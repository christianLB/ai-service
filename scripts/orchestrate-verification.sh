#!/usr/bin/env bash
# ============================================================================
# ARCHITECTURAL VERIFICATION ORCHESTRATION SCRIPT
# ============================================================================
# Comprehensive verification of F5 phase and architectural leveling claims
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Report file
REPORT="verification-report-$(date +%s).json"
LOG_FILE="verification-$(date +%Y%m%d-%H%M%S).log"

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# JSON report array
declare -a REPORT_DATA

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Section header
section() {
    log ""
    log "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    log "${BOLD}${BLUE}  $1${NC}"
    log "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    log ""
}

# Subsection header
subsection() {
    log ""
    log "${CYAN}──────────────────────────────────────────────────────────${NC}"
    log "${CYAN}  $1${NC}"
    log "${CYAN}──────────────────────────────────────────────────────────${NC}"
}

# Check function with JSON reporting
check() {
    local description=$1
    local command=$2
    local expected=$3
    
    ((TOTAL_CHECKS++))
    
    if eval "$command" > /dev/null 2>&1; then
        log "${GREEN}✅${NC} $description"
        ((PASSED_CHECKS++))
        REPORT_DATA+=("{\"check\":\"$description\",\"status\":\"PASS\"}")
        return 0
    else
        log "${RED}❌${NC} $description"
        ((FAILED_CHECKS++))
        REPORT_DATA+=("{\"check\":\"$description\",\"status\":\"FAIL\"}")
        return 1
    fi
}

# Warning check
warn_check() {
    local description=$1
    local command=$2
    
    ((TOTAL_CHECKS++))
    
    if eval "$command" > /dev/null 2>&1; then
        log "${GREEN}✅${NC} $description"
        ((PASSED_CHECKS++))
        return 0
    else
        log "${YELLOW}⚠️${NC} $description"
        ((WARNINGS++))
        return 1
    fi
}

# Start verification
clear
log "${BOLD}${CYAN}"
log "╔══════════════════════════════════════════════════════════════╗"
log "║        ARCHITECTURAL VERIFICATION ORCHESTRATION              ║"
log "║                                                              ║"
log "║  Verifying F5 Phase & Architectural Leveling Epic           ║"
log "║  Date: $(date +'%Y-%m-%d %H:%M:%S')                                      ║"
log "╚══════════════════════════════════════════════════════════════╝"
log "${NC}"

# ============================================================================
# PHASE 1: F5 IMPLEMENTATION VERIFICATION
# ============================================================================
section "PHASE 1: F5 Implementation Verification"

subsection "1.1 Running F5 Validation Script"
if [ -f "scripts/validate-f5.sh" ]; then
    log "Executing F5 validation script..."
    if bash scripts/validate-f5.sh > f5-validation.log 2>&1; then
        log "${GREEN}✅${NC} F5 validation script executed successfully"
        ((PASSED_CHECKS++))
    else
        log "${RED}❌${NC} F5 validation script failed"
        log "Output:"
        tail -20 f5-validation.log | while IFS= read -r line; do
            log "  $line"
        done
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
else
    log "${RED}❌${NC} F5 validation script not found"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
fi

subsection "1.2 Service Environment Configuration"
SERVICES=("api-gateway" "financial-svc" "trading-svc" "comm-svc" "ai-core" "worker-financial" "worker-trading")

for service in "${SERVICES[@]}"; do
    log "${BOLD}Checking $service:${NC}"
    
    # Check service directory exists
    check "  Service directory exists" "[ -d apps/$service ]"
    
    # Check entrypoint.sh
    check "  Entrypoint script exists" "[ -f apps/$service/entrypoint.sh ]"
    
    # Check package.json
    check "  Package.json exists" "[ -f apps/$service/package.json ]"
    
    # Check for @ai/config dependency
    if [ -f "apps/$service/package.json" ]; then
        warn_check "  Has @ai/config dependency" "grep -q '@ai/config' apps/$service/package.json"
    fi
done

subsection "1.3 Prisma Configuration"
check "Prisma schema exists" "[ -f prisma/schema.prisma ]"
check "Multi-schema support configured" "grep -q 'multiSchema' prisma/schema.prisma"
check "Financial schema defined" "grep -q 'financial' prisma/schema.prisma"
check "Public schema defined" "grep -q 'public' prisma/schema.prisma"
check "Trading schema defined" "grep -q 'trading' prisma/schema.prisma"

# ============================================================================
# PHASE 2: SERVICE ARCHITECTURE VERIFICATION
# ============================================================================
section "PHASE 2: Service Architecture Verification"

subsection "2.1 Docker Compose Configuration"
check "Docker compose file exists" "[ -f docker-compose.yml ]"
check "NAS compose file exists" "[ -f docker-compose.nas.yml ]"
check "Base compose file exists" "[ -f docker-compose.base.yml ]"

subsection "2.2 Service Separation Check"
log "Analyzing service boundaries..."

# Check for apps directory structure
for service in "${SERVICES[@]}"; do
    if [ -d "apps/$service" ]; then
        # Count files in service
        file_count=$(find "apps/$service" -name "*.ts" -o -name "*.js" 2>/dev/null | wc -l)
        if [ "$file_count" -gt 0 ]; then
            log "${GREEN}✅${NC} $service has $file_count source files"
        else
            log "${YELLOW}⚠️${NC} $service has no source files"
        fi
    else
        log "${RED}❌${NC} $service directory not found"
    fi
done

subsection "2.3 Database Schema Isolation"
log "Checking database schema isolation..."

# Check if services have their own schemas
if [ -f "prisma/schema.prisma" ]; then
    schemas=$(grep -o '@@schema("[^"]*")' prisma/schema.prisma | cut -d'"' -f2 | sort -u)
    schema_count=$(echo "$schemas" | wc -l)
    
    if [ "$schema_count" -gt 1 ]; then
        log "${GREEN}✅${NC} Found $schema_count distinct schemas:"
        echo "$schemas" | while read schema; do
            log "    - $schema"
        done
    else
        log "${RED}❌${NC} Only one schema found - services not properly isolated"
    fi
fi

# ============================================================================
# PHASE 3: API CONTRACT AUDIT
# ============================================================================
section "PHASE 3: API Contract Audit"

subsection "3.1 OpenAPI Specifications"
openapi_count=$(find openapi -name "*.yaml" -o -name "*.yml" 2>/dev/null | wc -l)
log "Found $openapi_count OpenAPI specification files"

if [ -d "openapi" ]; then
    for spec in openapi/*.{yaml,yml} 2>/dev/null; do
        if [ -f "$spec" ]; then
            log "${GREEN}✅${NC} $(basename $spec)"
        fi
    done
else
    log "${RED}❌${NC} No openapi directory found"
fi

subsection "3.2 TypeScript Contracts"
log "Searching for ts-rest contracts..."
contract_files=$(find . -path ./node_modules -prune -o -name "*contract*.ts" -print 2>/dev/null | wc -l)
log "Found $contract_files contract files"

check "Contracts package exists" "[ -d packages/contracts ]"
check "HTTP utils package exists" "[ -d packages/http-utils ]"

subsection "3.3 Contract Generation"
warn_check "Contract generation script exists" "[ -f scripts/generate-contracts.sh ]"
warn_check "Can run contract generation" "npm run contracts:generate --dry-run 2>/dev/null"

# ============================================================================
# PHASE 4: INTEGRATION TESTING
# ============================================================================
section "PHASE 4: Integration Testing"

subsection "4.1 Service Health Checks"
log "Checking if services are running..."

# Check if docker compose is running
if docker compose ps 2>/dev/null | grep -q "Up"; then
    log "${GREEN}✅${NC} Docker compose services are running"
    
    # Test health endpoints
    PORTS=(3000 3001 3002 3003 3004 3101 3102)
    for port in "${PORTS[@]}"; do
        if curl -f -s "http://localhost:$port/health/live" > /dev/null 2>&1; then
            log "${GREEN}✅${NC} Service on port $port is healthy"
        else
            log "${YELLOW}⚠️${NC} Service on port $port is not responding"
        fi
    done
else
    log "${YELLOW}⚠️${NC} Docker compose services not running - skipping health checks"
fi

subsection "4.2 Redis/Bull Queue System"
check "Redis configuration exists" "grep -q 'redis' docker-compose*.yml"
check "Bull queue imports found" "grep -r 'bull' src/ --include='*.ts' 2>/dev/null | head -1"

subsection "4.3 FSM State Transitions"
check "FSM packages exist" "[ -d packages/trading ] || grep -r 'xstate' . --include='*.json' 2>/dev/null | head -1"

# ============================================================================
# PHASE 5: CODE QUALITY CHECKS
# ============================================================================
section "PHASE 5: Code Quality Verification"

subsection "5.1 TypeScript Compilation"
log "Running TypeScript check..."
if npm run typecheck 2>&1 | tee typecheck.log | grep -q "error TS"; then
    error_count=$(grep -c "error TS" typecheck.log)
    log "${RED}❌${NC} TypeScript compilation has $error_count errors"
    ((FAILED_CHECKS++))
else
    log "${GREEN}✅${NC} TypeScript compilation successful"
    ((PASSED_CHECKS++))
fi
((TOTAL_CHECKS++))

subsection "5.2 Build Process"
log "Testing build process..."
if npm run build 2>&1 | tee build.log | grep -q "error"; then
    log "${RED}❌${NC} Build process failed"
    ((FAILED_CHECKS++))
else
    log "${GREEN}✅${NC} Build process successful"
    ((PASSED_CHECKS++))
fi
((TOTAL_CHECKS++))

subsection "5.3 Linting"
log "Running linter..."
if npm run lint 2>&1 | tee lint.log | grep -q "error"; then
    error_count=$(grep -c "error" lint.log)
    log "${YELLOW}⚠️${NC} Linting has $error_count errors"
    ((WARNINGS++))
else
    log "${GREEN}✅${NC} Linting passed"
    ((PASSED_CHECKS++))
fi
((TOTAL_CHECKS++))

# ============================================================================
# PHASE 6: ARCHITECTURAL ANALYSIS
# ============================================================================
section "PHASE 6: Architectural Analysis"

subsection "6.1 Service Coupling Analysis"
log "Analyzing service dependencies..."

# Check for direct database access between services
for service in "${SERVICES[@]}"; do
    if [ -d "apps/$service" ]; then
        # Check if service imports from other services
        cross_imports=$(grep -r "from.*apps/" "apps/$service" --include="*.ts" 2>/dev/null | grep -v "$service" | wc -l)
        if [ "$cross_imports" -gt 0 ]; then
            log "${RED}❌${NC} $service has $cross_imports cross-service imports (coupling detected)"
        else
            log "${GREEN}✅${NC} $service has no cross-service imports"
        fi
    fi
done

subsection "6.2 Monolith vs Microservices Analysis"
log "Analyzing architecture style..."

# Check if src/services still exists (monolith)
if [ -d "src/services" ]; then
    service_count=$(ls -d src/services/*/ 2>/dev/null | wc -l)
    log "${YELLOW}⚠️${NC} Monolithic structure detected: $service_count services in src/services/"
else
    log "${GREEN}✅${NC} No monolithic service structure found"
fi

# Check if apps directory has actual services
if [ -d "apps" ]; then
    app_count=$(ls -d apps/*/ 2>/dev/null | wc -l)
    log "${GREEN}✅${NC} Microservices structure: $app_count services in apps/"
else
    log "${RED}❌${NC} No microservices structure found"
fi

# ============================================================================
# FINAL REPORT
# ============================================================================
section "VERIFICATION SUMMARY REPORT"

# Calculate percentages
if [ $TOTAL_CHECKS -gt 0 ]; then
    PASS_PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    FAIL_PERCENTAGE=$((FAILED_CHECKS * 100 / TOTAL_CHECKS))
    WARN_PERCENTAGE=$((WARNINGS * 100 / TOTAL_CHECKS))
else
    PASS_PERCENTAGE=0
    FAIL_PERCENTAGE=0
    WARN_PERCENTAGE=0
fi

log ""
log "${BOLD}📊 METRICS:${NC}"
log "  Total Checks:    $TOTAL_CHECKS"
log "  Passed:          ${GREEN}$PASSED_CHECKS ($PASS_PERCENTAGE%)${NC}"
log "  Failed:          ${RED}$FAILED_CHECKS ($FAIL_PERCENTAGE%)${NC}"
log "  Warnings:        ${YELLOW}$WARNINGS ($WARN_PERCENTAGE%)${NC}"

log ""
log "${BOLD}🎯 CRITICAL FINDINGS:${NC}"

# Determine overall status
if [ $FAILED_CHECKS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    STATUS="GREEN"
    STATUS_COLOR=$GREEN
    STATUS_ICON="🟢"
    VERDICT="F5 PHASE COMPLETE - All systems operational"
elif [ $FAILED_CHECKS -eq 0 ]; then
    STATUS="YELLOW"
    STATUS_COLOR=$YELLOW
    STATUS_ICON="🟡"
    VERDICT="F5 PHASE MOSTLY COMPLETE - Minor issues present"
elif [ $FAILED_CHECKS -lt 10 ]; then
    STATUS="ORANGE"
    STATUS_COLOR=$YELLOW
    STATUS_ICON="🟠"
    VERDICT="F5 PHASE PARTIALLY COMPLETE - Significant gaps"
else
    STATUS="RED"
    STATUS_COLOR=$RED
    STATUS_ICON="🔴"
    VERDICT="F5 PHASE INCOMPLETE - Critical issues detected"
fi

log ""
log "${BOLD}📋 ARCHITECTURAL ASSESSMENT:${NC}"

# Check key architectural claims
KEY_CLAIMS=(
    "Multi-schema database isolation"
    "Service boundaries properly defined"
    "API contracts enforced"
    "Environment validation implemented"
    "Health checks operational"
    "Queue system configured"
    "TypeScript compilation clean"
)

for claim in "${KEY_CLAIMS[@]}"; do
    # Simple heuristic check for each claim
    case "$claim" in
        "Multi-schema database isolation")
            if grep -q "multiSchema" prisma/schema.prisma 2>/dev/null; then
                log "  ${GREEN}✅${NC} $claim"
            else
                log "  ${RED}❌${NC} $claim"
            fi
            ;;
        "Service boundaries properly defined")
            if [ -d "apps" ] && [ $(ls -d apps/*/ 2>/dev/null | wc -l) -gt 3 ]; then
                log "  ${GREEN}✅${NC} $claim"
            else
                log "  ${RED}❌${NC} $claim"
            fi
            ;;
        "API contracts enforced")
            if [ -d "packages/contracts" ] || [ -d "openapi" ]; then
                log "  ${YELLOW}⚠️${NC} $claim (partially implemented)"
            else
                log "  ${RED}❌${NC} $claim"
            fi
            ;;
        "Environment validation implemented")
            if [ -f "packages/config/src/env.ts" ]; then
                log "  ${GREEN}✅${NC} $claim"
            else
                log "  ${RED}❌${NC} $claim"
            fi
            ;;
        "Health checks operational")
            if docker compose ps 2>/dev/null | grep -q "healthy"; then
                log "  ${GREEN}✅${NC} $claim"
            else
                log "  ${YELLOW}⚠️${NC} $claim (services not running)"
            fi
            ;;
        "Queue system configured")
            if grep -q "redis\|bull" docker-compose*.yml 2>/dev/null; then
                log "  ${GREEN}✅${NC} $claim"
            else
                log "  ${RED}❌${NC} $claim"
            fi
            ;;
        "TypeScript compilation clean")
            if [ -f "typecheck.log" ] && ! grep -q "error TS" typecheck.log; then
                log "  ${GREEN}✅${NC} $claim"
            else
                log "  ${RED}❌${NC} $claim"
            fi
            ;;
    esac
done

log ""
log "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
log "${BOLD}  FINAL VERDICT${NC}"
log "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
log ""
log "  Status: ${STATUS_COLOR}${STATUS_ICON} ${STATUS}${NC}"
log "  ${BOLD}${VERDICT}${NC}"
log ""

# Save JSON report
echo "{" > "$REPORT"
echo "  \"timestamp\": \"$(date -Iseconds)\"," >> "$REPORT"
echo "  \"status\": \"$STATUS\"," >> "$REPORT"
echo "  \"verdict\": \"$VERDICT\"," >> "$REPORT"
echo "  \"metrics\": {" >> "$REPORT"
echo "    \"total_checks\": $TOTAL_CHECKS," >> "$REPORT"
echo "    \"passed\": $PASSED_CHECKS," >> "$REPORT"
echo "    \"failed\": $FAILED_CHECKS," >> "$REPORT"
echo "    \"warnings\": $WARNINGS," >> "$REPORT"
echo "    \"pass_percentage\": $PASS_PERCENTAGE," >> "$REPORT"
echo "    \"fail_percentage\": $FAIL_PERCENTAGE" >> "$REPORT"
echo "  }" >> "$REPORT"
echo "}" >> "$REPORT"

log "📄 Full report saved to: $REPORT"
log "📝 Detailed log saved to: $LOG_FILE"
log ""

# Exit with appropriate code
if [ $FAILED_CHECKS -eq 0 ]; then
    exit 0
else
    exit 1
fi