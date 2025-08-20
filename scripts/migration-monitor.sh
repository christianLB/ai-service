#!/bin/bash

# OpenAPI Migration Progress Monitor
# Real-time dashboard for tracking migration progress

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Base directories
BASE_DIR="/home/k2600x/dev/ai-service"
OPENAPI_DIR="$BASE_DIR/openapi"
HOOKS_DIR="$BASE_DIR/frontend/src/hooks"
GENERATED_DIR="$BASE_DIR/frontend/src/generated"

# Modules to track
MODULES=("trades" "positions" "alerts" "notifications" "entity-tags" "universal-tags" "reports")

# Clear screen and show header
clear_and_header() {
    clear
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}${BOLD}                    OpenAPI Migration Progress Monitor                      ${NC}"
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Check if OpenAPI spec exists for module
check_openapi_spec() {
    local module=$1
    local spec_files=("trading.yaml" "comm.yaml" "financial.yaml")
    
    for spec in "${spec_files[@]}"; do
        if [ -f "$OPENAPI_DIR/$spec" ]; then
            if grep -q "$module" "$OPENAPI_DIR/$spec" 2>/dev/null; then
                return 0
            fi
        fi
    done
    return 1
}

# Check if OpenAPI hook exists
check_openapi_hook() {
    local module=$1
    local hook_file="$HOOKS_DIR/use-${module}-openapi.ts"
    
    if [ -f "$hook_file" ]; then
        return 0
    fi
    return 1
}

# Check if wrapper hook exists
check_wrapper_hook() {
    local module=$1
    local wrapper_file="$HOOKS_DIR/use-${module}-wrapper.ts"
    
    if [ -f "$wrapper_file" ]; then
        return 0
    fi
    return 1
}

# Check TypeScript compilation
check_typescript() {
    cd "$BASE_DIR"
    if npm run typecheck 2>&1 | grep -q "error TS"; then
        return 1
    fi
    return 0
}

# Check build status
check_build() {
    cd "$BASE_DIR"
    if npm run build > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Display progress bar
progress_bar() {
    local current=$1
    local total=$2
    local width=30
    local percentage=$((current * 100 / total))
    local filled=$((current * width / total))
    
    printf "["
    for ((i=0; i<filled; i++)); do
        printf "█"
    done
    for ((i=filled; i<width; i++)); do
        printf " "
    done
    printf "] %3d%%" "$percentage"
}

# Main monitoring loop
monitor_progress() {
    while true; do
        clear_and_header
        
        # Overall statistics
        local total_tasks=$((${#MODULES[@]} * 3))  # 3 tasks per module
        local completed_tasks=0
        
        echo -e "${BOLD}Module Status:${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # Check each module
        for module in "${MODULES[@]}"; do
            local spec_status="${RED}✗${NC}"
            local hook_status="${RED}✗${NC}"
            local wrapper_status="${RED}✗${NC}"
            local module_complete=0
            
            if check_openapi_spec "$module"; then
                spec_status="${GREEN}✓${NC}"
                ((completed_tasks++))
                ((module_complete++))
            fi
            
            if check_openapi_hook "$module"; then
                hook_status="${GREEN}✓${NC}"
                ((completed_tasks++))
                ((module_complete++))
            fi
            
            if check_wrapper_hook "$module"; then
                wrapper_status="${GREEN}✓${NC}"
                ((completed_tasks++))
                ((module_complete++))
            fi
            
            # Module status color
            local module_color="${RED}"
            if [ $module_complete -eq 3 ]; then
                module_color="${GREEN}"
            elif [ $module_complete -gt 0 ]; then
                module_color="${YELLOW}"
            fi
            
            printf "%-15s  Spec: %s  Hook: %s  Wrapper: %s\n" \
                   "${module_color}${module}${NC}" "$spec_status" "$hook_status" "$wrapper_status"
        done
        
        echo ""
        echo -e "${BOLD}Quality Checks:${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # TypeScript check
        echo -n "TypeScript Compilation: "
        if check_typescript; then
            echo -e "${GREEN}✓ No errors${NC}"
        else
            echo -e "${RED}✗ Errors found${NC}"
        fi
        
        # Build check
        echo -n "Build Status: "
        if check_build; then
            echo -e "${GREEN}✓ Success${NC}"
        else
            echo -e "${RED}✗ Failed${NC}"
        fi
        
        echo ""
        echo -e "${BOLD}Overall Progress:${NC}"
        echo -n "Tasks: "
        progress_bar $completed_tasks $total_tasks
        echo " ($completed_tasks/$total_tasks)"
        
        # Timestamp
        echo ""
        echo -e "${CYAN}Last updated: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
        echo -e "${CYAN}Press Ctrl+C to exit${NC}"
        
        # Refresh every 5 seconds
        sleep 5
    done
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Monitor stopped${NC}"; exit 0' INT

# Start monitoring
echo -e "${GREEN}Starting OpenAPI Migration Monitor...${NC}"
monitor_progress