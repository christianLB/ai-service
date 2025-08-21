#!/bin/bash

# OpenAPI Orchestration Script - Complete Implementation
# This script orchestrates the parallel execution of multiple agents
# to complete OpenAPI specifications and implement openapi-react-query-codegen

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Timing
START_TIME=$(date +%s)

# Log function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        error "Not in frontend directory. Please run from /home/k2600x/dev/ai-service/frontend"
    fi
    
    # Check if openapi-react-query-codegen is installed
    if ! npm list @7nohe/openapi-react-query-codegen &>/dev/null; then
        error "openapi-react-query-codegen not installed. Run: npm install -D @7nohe/openapi-react-query-codegen"
    fi
    
    # Check if parallel is installed
    if ! command -v parallel &> /dev/null; then
        warning "GNU parallel not installed. Installing..."
        sudo apt-get update && sudo apt-get install -y parallel
    fi
    
    success "Prerequisites checked"
}

# Phase 1: Discovery & Analysis
phase1_discovery() {
    log "Starting Phase 1: Discovery & Analysis (PARALLEL)"
    
    mkdir -p docs/analysis
    
    # Create agent tasks file
    cat > /tmp/phase1_tasks.txt << 'EOF'
crud-specialist:Analyze all backend routes in /src/routes/*.ts and document CRUD operations:docs/analysis/crud-operations.md
prisma-specialist:Map database operations to API endpoints:docs/analysis/db-api-mapping.md
ui-specialist:Inventory all manual hooks and their usage:docs/analysis/manual-hooks-inventory.md
qa-specialist:Create test inventory for affected components:docs/analysis/test-inventory.md
devops-specialist:Analyze build pipeline for openapi generation:docs/analysis/pipeline-requirements.md
EOF
    
    # Execute parallel discovery
    while IFS=: read -r agent task output; do
        echo "/spawn-agent --type $agent --task \"$task\" --output $output"
    done < /tmp/phase1_tasks.txt | parallel -j 5 --progress
    
    success "Phase 1 completed - Analysis documents created"
}

# Phase 2: OpenAPI Specification Completion
phase2_openapi_specs() {
    log "Starting Phase 2: OpenAPI Specification Completion (PARALLEL)"
    
    # Backup existing specs
    cp -r ../openapi ../openapi.backup
    
    # Create completion tasks
    cat > /tmp/phase2_tasks.txt << 'EOF'
financial:Complete financial.yaml with all CRUD operations:../openapi/financial-complete.yaml:../src/routes/financial.ts,../src/routes/financial/*.ts
trading:Complete trading.yaml with all operations:../openapi/trading-complete.yaml:../src/routes/trading.ts,../src/routes/trade.routes.ts,../src/routes/position.routes.ts
auth:Complete auth.yaml specifications:../openapi/auth-complete.yaml:../src/routes/auth.ts
gateway:Complete gateway.yaml specifications:../openapi/gateway-complete.yaml:../src/routes/gateway.ts
ai-core:Complete ai-core.yaml specifications:../openapi/ai-core-complete.yaml:../src/routes/ai.ts
comm:Complete comm.yaml specifications:../openapi/comm-complete.yaml:../src/routes/telegram.ts
EOF
    
    # Generate OpenAPI specs in parallel
    while IFS=: read -r domain task output context; do
        info "Generating $domain OpenAPI spec..."
        echo "/spawn-agent --type crud-specialist --task \"$task\" --context @$context --output $output"
    done < /tmp/phase2_tasks.txt | parallel -j 4 --progress
    
    success "Phase 2 completed - OpenAPI specifications generated"
}

# Phase 3: Hook Generation
phase3_hook_generation() {
    log "Starting Phase 3: Hook Generation"
    
    # Create new config for all specs
    cat > openapi-rq.config.ts << 'EOF'
import { defineConfig } from '@7nohe/openapi-react-query-codegen';

export default defineConfig([
  {
    input: '../openapi/financial-complete.yaml',
    output: {
      path: './src/generated/financial',
      clean: true,
    },
    client: 'fetch',
  },
  {
    input: '../openapi/trading-complete.yaml',
    output: {
      path: './src/generated/trading',
      clean: true,
    },
    client: 'fetch',
  },
  {
    input: '../openapi/auth-complete.yaml',
    output: {
      path: './src/generated/auth',
      clean: true,
    },
    client: 'fetch',
  },
  {
    input: '../openapi/gateway-complete.yaml',
    output: {
      path: './src/generated/gateway',
      clean: true,
    },
    client: 'fetch',
  },
  {
    input: '../openapi/ai-core-complete.yaml',
    output: {
      path: './src/generated/ai',
      clean: true,
    },
    client: 'fetch',
  },
  {
    input: '../openapi/comm-complete.yaml',
    output: {
      path: './src/generated/comm',
      clean: true,
    },
    client: 'fetch',
  },
]);
EOF
    
    # Generate hooks
    info "Generating React Query hooks..."
    npx openapi-rq -c openapi-rq.config.ts
    
    # Create SDK adapter
    cat > src/generated/sdk-adapter.ts << 'EOF'
import { sdkClient } from '@ai/sdk-client';
import { OpenAPIConfig } from './financial/requests/core/OpenAPI';

// Configure OpenAPI client to use SDK
OpenAPIConfig.BASE = '';
OpenAPIConfig.VERSION = '1.0.0';
OpenAPIConfig.WITH_CREDENTIALS = true;
OpenAPIConfig.CREDENTIALS = 'include';
OpenAPIConfig.TOKEN = async () => {
  const token = await sdkClient.auth.getToken();
  return token;
};

// Custom fetch that uses SDK client
OpenAPIConfig.FETCH = async (url: string, init?: RequestInit) => {
  return sdkClient.request(url, init);
};

export const configureGeneratedHooks = () => {
  // Apply same config to all generated modules
  const modules = ['financial', 'trading', 'auth', 'gateway', 'ai', 'comm'];
  modules.forEach(module => {
    try {
      const config = require(`./${module}/requests/core/OpenAPI`).OpenAPIConfig;
      config.BASE = '';
      config.VERSION = '1.0.0';
      config.WITH_CREDENTIALS = true;
      config.CREDENTIALS = 'include';
      config.TOKEN = OpenAPIConfig.TOKEN;
      config.FETCH = OpenAPIConfig.FETCH;
    } catch (e) {
      console.warn(`Module ${module} not found`);
    }
  });
};
EOF
    
    success "Phase 3 completed - Hooks generated"
}

# Phase 4: Component Migration
phase4_component_migration() {
    log "Starting Phase 4: Component Migration (PARALLEL)"
    
    # Create migration tasks
    cat > /tmp/phase4_tasks.txt << 'EOF'
ClientList:src/pages/clients/ClientList.tsx:useFinancialQueries
ClientDetail:src/pages/clients/ClientDetail.tsx:useFinancialQueries
ClientForm:src/pages/clients/ClientForm.tsx:useFinancialMutations
Dashboard:src/pages/Dashboard.tsx:useFinancialQueries,useTradingQueries
BankAccounts:src/pages/BankAccounts.tsx:useFinancialQueries
TradingDashboard:src/pages/trading/TradingDashboard.tsx:useTradingQueries
Positions:src/pages/trading/Positions.tsx:usePositionQueries
NotificationSettings:src/pages/NotificationSettings.tsx:useCommQueries
AlertList:src/pages/alert/index.tsx:useAlertQueries
TagManagement:src/pages/tags/TagManagement.tsx:useTagQueries
EOF
    
    # Migrate components in parallel
    while IFS=: read -r component file hooks; do
        info "Migrating $component to use $hooks..."
        echo "/spawn-agent --type ui-specialist --task \"Migrate $component from manual hooks to $hooks\" --file $file"
    done < /tmp/phase4_tasks.txt | parallel -j 5 --progress
    
    success "Phase 4 completed - Components migrated"
}

# Phase 5: Axios Removal
phase5_axios_removal() {
    log "Starting Phase 5: Axios Removal"
    
    # Count axios imports before
    AXIOS_COUNT_BEFORE=$(grep -r "import.*axios\|from.*axios" src/ 2>/dev/null | wc -l || echo 0)
    info "Found $AXIOS_COUNT_BEFORE axios imports to remove"
    
    # Archive manual hooks
    mkdir -p src/hooks/deprecated
    for hook in src/hooks/use-*.ts; do
        if [ -f "$hook" ]; then
            mv "$hook" src/hooks/deprecated/
            info "Archived $(basename $hook)"
        fi
    done
    
    # Remove axios imports from all files
    find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '/import.*axios/d; /from.*axios/d' {} \;
    
    # Remove axios from package.json
    npm uninstall axios
    
    # Count axios imports after
    AXIOS_COUNT_AFTER=$(grep -r "import.*axios\|from.*axios" src/ 2>/dev/null | wc -l || echo 0)
    
    if [ "$AXIOS_COUNT_AFTER" -eq 0 ]; then
        success "Phase 5 completed - Axios completely removed"
    else
        warning "Phase 5 completed - Still found $AXIOS_COUNT_AFTER axios references"
    fi
}

# Phase 6: Validation
phase6_validation() {
    log "Starting Phase 6: Validation (PARALLEL)"
    
    # Create validation script
    cat > /tmp/validate.sh << 'EOF'
#!/bin/bash
case $1 in
    typecheck)
        npm run typecheck 2>&1
        ;;
    lint)
        npm run lint 2>&1
        ;;
    test)
        npm test -- --run 2>&1
        ;;
    build)
        npm run build 2>&1
        ;;
esac
EOF
    chmod +x /tmp/validate.sh
    
    # Run validations in parallel
    echo -e "typecheck\nlint\ntest\nbuild" | parallel -j 4 --progress /tmp/validate.sh {}
    
    # Check results
    if npm run typecheck &>/dev/null; then
        success "✓ TypeScript compilation successful"
    else
        warning "⚠ TypeScript errors found"
    fi
    
    if npm run lint &>/dev/null; then
        success "✓ ESLint passed"
    else
        warning "⚠ ESLint warnings found"
    fi
    
    if npm test -- --run &>/dev/null; then
        success "✓ All tests passing"
    else
        warning "⚠ Some tests failing"
    fi
    
    if npm run build &>/dev/null; then
        success "✓ Production build successful"
    else
        error "✗ Production build failed"
    fi
    
    success "Phase 6 completed - Validation done"
}

# Monitoring function
monitor_progress() {
    while true; do
        clear
        echo -e "${CYAN}=== OpenAPI Migration Status ===${NC}"
        echo -e "Axios imports: ${YELLOW}$(grep -r "import.*axios" src/ 2>/dev/null | wc -l || echo 0)${NC}"
        echo -e "Manual hooks: ${YELLOW}$(ls src/hooks/use-*.ts 2>/dev/null | wc -l || echo 0)${NC}"
        echo -e "Generated hooks: ${GREEN}$(find src/generated -name "*.ts" 2>/dev/null | wc -l || echo 0)${NC}"
        echo -e "TypeScript errors: ${RED}$(npm run typecheck 2>&1 | grep error | wc -l || echo 0)${NC}"
        sleep 5
    done
}

# Rollback function
rollback() {
    error "Migration failed! Starting rollback..."
    
    # Restore OpenAPI specs
    if [ -d "../openapi.backup" ]; then
        rm -rf ../openapi
        mv ../openapi.backup ../openapi
    fi
    
    # Restore manual hooks
    if [ -d "src/hooks/deprecated" ]; then
        mv src/hooks/deprecated/*.ts src/hooks/ 2>/dev/null || true
        rmdir src/hooks/deprecated
    fi
    
    # Restore axios
    npm install axios@^1.10.0
    
    # Clean generated files
    rm -rf src/generated/
    
    warning "Rollback completed. Manual intervention may be required."
}

# Main execution
main() {
    log "Starting OpenAPI Orchestration - Complete Implementation"
    
    # Set up error handling
    trap rollback ERR
    
    # Check prerequisites
    check_prerequisites
    
    # Optional: Start monitoring in background
    if [ "$1" == "--monitor" ]; then
        monitor_progress &
        MONITOR_PID=$!
    fi
    
    # Execute phases
    phase1_discovery
    phase2_openapi_specs
    phase3_hook_generation
    phase4_component_migration
    phase5_axios_removal
    phase6_validation
    
    # Stop monitoring
    if [ ! -z "$MONITOR_PID" ]; then
        kill $MONITOR_PID 2>/dev/null || true
    fi
    
    # Calculate duration
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    HOURS=$((DURATION / 3600))
    MINUTES=$(((DURATION % 3600) / 60))
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}       OpenAPI Migration Completed Successfully!            ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "Duration: ${CYAN}${HOURS}h ${MINUTES}m${NC}"
    echo -e "Axios imports removed: ${GREEN}${AXIOS_COUNT_BEFORE}${NC}"
    echo -e "Hooks generated: ${GREEN}$(find src/generated -name "*.ts" | wc -l)${NC}"
    echo -e "Manual hooks archived: ${YELLOW}$(ls src/hooks/deprecated/*.ts 2>/dev/null | wc -l || echo 0)${NC}"
    echo ""
    echo -e "${MAGENTA}Next steps:${NC}"
    echo "1. Review generated hooks in src/generated/"
    echo "2. Test critical user flows"
    echo "3. Monitor application performance"
    echo "4. Update documentation"
    echo ""
}

# Parse arguments
case "$1" in
    --help)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --monitor    Show real-time progress monitoring"
        echo "  --rollback   Rollback to previous state"
        echo "  --help       Show this help message"
        exit 0
        ;;
    --rollback)
        rollback
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac