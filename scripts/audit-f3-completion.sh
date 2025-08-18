#!/usr/bin/env bash
set -euo pipefail

RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
NC="\033[0m"

echo "=========================================="
echo "F3 - OpenAPI → SDK (SSoT) Audit"
echo "=========================================="
echo ""

TOTAL_CHECKS=0
PASSED_CHECKS=0

check_item() {
  local description="$1"
  local check_command="$2"
  
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  
  if eval "$check_command" > /dev/null 2>&1; then
    echo -e "${GREEN}[✓]${NC} $description"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${RED}[✗]${NC} $description"
    return 1
  fi
}

echo "📋 Checking OpenAPI Specifications..."
check_item "gateway.yaml exists" "test -f openapi/gateway.yaml"
check_item "auth.yaml exists" "test -f openapi/auth.yaml"
check_item "financial.yaml exists" "test -f openapi/financial.yaml"
check_item "trading.yaml exists" "test -f openapi/trading.yaml"
check_item "ai-core.yaml exists" "test -f openapi/ai-core.yaml"
check_item "comm.yaml exists" "test -f openapi/comm.yaml"

echo ""
echo "📦 Checking Contracts Package..."
check_item "packages/contracts exists" "test -d packages/contracts"
check_item "packages/contracts/package.json exists" "test -f packages/contracts/package.json"
check_item "openapi-fetch dependency installed" "grep -q 'openapi-fetch' packages/contracts/package.json"
check_item "contracts package builds" "pnpm --filter @ai/contracts build > /dev/null 2>&1"

echo ""
echo "🔧 Checking Generated Types..."
check_item "generated/gateway.ts exists" "test -f packages/contracts/src/generated/gateway.ts"
check_item "generated/financial.ts exists" "test -f packages/contracts/src/generated/financial.ts"
check_item "generated/trading.ts exists" "test -f packages/contracts/src/generated/trading.ts"
check_item "generated types export paths" "grep -q 'export interface paths' packages/contracts/src/generated/gateway.ts"

echo ""
echo "🎯 Checking SDK Implementation..."
check_item "createGatewayClient function exists" "grep -q 'export function createGatewayClient' packages/contracts/src/index.ts"
check_item "createFinancialClient function exists" "grep -q 'export function createFinancialClient' packages/contracts/src/index.ts"
check_item "createTradingClient function exists" "grep -q 'export function createTradingClient' packages/contracts/src/index.ts"
check_item "Types are properly exported" "grep -q 'export type { GatewayPaths' packages/contracts/src/index.ts"

echo ""
echo "🖥️ Checking Frontend Integration..."
check_item "Frontend has @ai/contracts dependency" "grep -q '@ai/contracts' frontend/package.json"
check_item "api-client.ts exists" "test -f frontend/src/services/api-client.ts"
check_item "api-client imports from @ai/contracts" "grep -q 'from.*@ai/contracts' frontend/src/services/api-client.ts"
check_item "Typed hook example exists" "test -f frontend/src/hooks/use-client-typed.ts"

echo ""
echo "🔒 Checking Backend Validation..."
check_item "OpenAPI validator installed" "grep -q 'express-openapi-validator' package.json"
check_item "OpenAPI middleware exists" "test -f src/middleware/openapi-validator.ts"
check_item "Validator exports createOpenApiValidator" "grep -q 'export function createOpenApiValidator' src/middleware/openapi-validator.ts"

echo ""
echo "✅ Checking Contract Validation..."
check_item "Contract generation script exists" "test -f scripts/generate-contracts.ts"
check_item "Contract validation script exists" "test -f scripts/validate-contracts.ts"
check_item "pnpm contracts:generate command exists" "grep -q 'contracts:generate' package.json"
check_item "pnpm contracts:check command exists" "grep -q 'contracts:check' package.json"

echo ""
echo "🔄 Checking Contract Drift..."
if pnpm contracts:generate > /dev/null 2>&1; then
  if git diff --exit-code packages/contracts/src/generated > /dev/null 2>&1; then
    echo -e "${GREEN}[✓]${NC} No contract drift detected"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    echo -e "${YELLOW}[⚠]${NC} Contract drift detected - need to commit generated files"
  fi
else
  echo -e "${RED}[✗]${NC} Contract generation failed"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo ""
echo "=========================================="
echo "AUDIT RESULTS"
echo "=========================================="

PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

if [ $PERCENTAGE -ge 90 ]; then
  STATUS="${GREEN}🟢 COMPLETE${NC}"
elif [ $PERCENTAGE -ge 70 ]; then
  STATUS="${YELLOW}🟡 PARTIAL${NC}"
else
  STATUS="${RED}🔴 INCOMPLETE${NC}"
fi

echo -e "Passed: $PASSED_CHECKS / $TOTAL_CHECKS checks ($PERCENTAGE%)"
echo -e "Status: $STATUS"
echo ""

if [ $PERCENTAGE -lt 100 ]; then
  echo "📝 Next Steps:"
  echo "1. Review failed checks above"
  echo "2. Run: pnpm contracts:generate"
  echo "3. Commit generated files if there's drift"
  echo "4. Migrate remaining frontend hooks to use typed SDK"
  echo "5. Integrate OpenAPI validation middleware in main app"
fi

exit $([ $PERCENTAGE -ge 90 ] && echo 0 || echo 1)