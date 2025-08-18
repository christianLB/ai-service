#!/bin/bash

# CI Monitoring Script
# Checks the status of all CI workflows and provides detailed feedback

set -e

echo "🔍 CI Health Check"
echo "=================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gh CLI is installed
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        echo -e "${YELLOW}⚠️  GitHub CLI not installed${NC}"
        echo "Install with: brew install gh (macOS) or sudo apt install gh (Linux)"
        echo "Using curl API fallback..."
        return 1
    fi
    return 0
}

# Check GitHub Actions status via API
check_github_actions() {
    echo -e "\n📊 GitHub Actions Status"
    echo "------------------------"
    
    if check_gh_cli; then
        # Use gh CLI
        gh run list --limit 5 --json status,name,conclusion,createdAt --jq '.[] | "\(.name): \(.status) - \(.conclusion // "running")"'
    else
        # Fallback to curl
        curl -s "https://api.github.com/repos/christianLB/ai-service/actions/runs?per_page=5" | \
            jq -r '.workflow_runs[] | "\(.name): \(.status) - \(.conclusion // "running")"' 2>/dev/null || \
            echo "Failed to fetch GitHub Actions status"
    fi
}

# Local validation checks
run_local_checks() {
    echo -e "\n🏠 Local Validation"
    echo "-------------------"
    
    # TypeScript check
    echo -n "TypeScript: "
    if npm run typecheck > /dev/null 2>&1; then
        echo -e "${GREEN}✅ No errors${NC}"
    else
        ERROR_COUNT=$(npm run typecheck 2>&1 | grep -o '[0-9]* error' | grep -o '[0-9]*' | head -1)
        echo -e "${RED}❌ ${ERROR_COUNT} errors${NC}"
    fi
    
    # Lint check
    echo -n "ESLint: "
    if npm run lint > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Passed${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
    fi
    
    # Build check
    echo -n "Build: "
    if npm run build > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Success${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
    fi
    
    # Test check
    echo -n "Tests: "
    if npm run test:ci > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Passed${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
    fi
}

# Check for common issues
check_common_issues() {
    echo -e "\n🔎 Common Issues Check"
    echo "----------------------"
    
    # Check for timer in singleton
    if grep -q "setInterval" src/services/integrations/integration-config.service.ts 2>/dev/null; then
        if grep -q "NODE_ENV.*test" src/services/integrations/integration-config.service.ts 2>/dev/null; then
            echo -e "Timer in singleton: ${GREEN}✅ Protected${NC}"
        else
            echo -e "Timer in singleton: ${YELLOW}⚠️  Check NODE_ENV guard${NC}"
        fi
    fi
    
    # Check package manager
    if [ -f "pnpm-lock.yaml" ]; then
        echo -e "Package manager: ${GREEN}✅ PNPM${NC}"
    else
        echo -e "Package manager: ${RED}❌ Not PNPM${NC}"
    fi
    
    # Check Docker uses PNPM
    if grep -q "pnpm install" Dockerfile.api 2>/dev/null; then
        echo -e "Docker package manager: ${GREEN}✅ PNPM${NC}"
    else
        echo -e "Docker package manager: ${RED}❌ Not PNPM${NC}"
    fi
    
    # Check if apps folder exists but is empty
    if [ -d "apps" ]; then
        if [ -z "$(ls -A apps 2>/dev/null)" ]; then
            echo -e "Apps folder: ${YELLOW}⚠️  Empty (CI should skip)${NC}"
        else
            echo -e "Apps folder: ${GREEN}✅ Has content${NC}"
        fi
    else
        echo -e "Apps folder: ${GREEN}✅ Not present${NC}"
    fi
}

# Main execution
main() {
    check_github_actions
    run_local_checks
    check_common_issues
    
    echo -e "\n✅ CI Health Check Complete"
    echo "============================"
    echo "Run 'make dev-status' for container health"
    echo "Run 'make dev-logs' to check application logs"
}

main "$@"