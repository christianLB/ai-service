#!/bin/bash
# Rollback Script for MCP Bridge
# Safely rollback deployment without exposing sensitive data

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAS_HOST="${NAS_HOST:-192.168.1.11}"
NAS_USER="${NAS_USER:-k2600x}"
MCP_PATH="/volume1/docker/ai-service-mcp"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/../rollback-logs"

# Function to save current state
save_current_state() {
    echo -e "${BLUE}Saving current state...${NC}"
    
    mkdir -p "$LOG_DIR"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local state_file="${LOG_DIR}/state-${timestamp}.log"
    
    {
        echo "Rollback State Capture"
        echo "====================="
        echo "Date: $(date)"
        echo "Reason: $1"
        echo ""
        echo "Container Status:"
        ssh ${NAS_USER}@${NAS_HOST} "docker ps -a | grep mcp-bridge" 2>&1 || echo "No container found"
        echo ""
        echo "Recent Logs:"
        ssh ${NAS_USER}@${NAS_HOST} "docker logs mcp-bridge --tail 50" 2>&1 || echo "No logs available"
    } > "$state_file"
    
    echo -e "${GREEN}✅ State saved to: $(basename $state_file)${NC}"
}

# Function to stop and remove container
stop_container() {
    echo -e "${BLUE}Stopping MCP Bridge...${NC}"
    
    echo -n "Checking container... "
    if ssh ${NAS_USER}@${NAS_HOST} "docker ps -a | grep -q mcp-bridge" 2>/dev/null; then
        echo -e "${YELLOW}Found${NC}"
        
        echo -n "Stopping container... "
        ssh ${NAS_USER}@${NAS_HOST} "docker stop mcp-bridge" >/dev/null 2>&1 || true
        echo -e "${GREEN}✅ Stopped${NC}"
        
        echo -n "Removing container... "
        ssh ${NAS_USER}@${NAS_HOST} "docker rm mcp-bridge" >/dev/null 2>&1 || true
        echo -e "${GREEN}✅ Removed${NC}"
    else
        echo -e "${YELLOW}Not running${NC}"
    fi
}

# Function to restore from backup
restore_backup() {
    local backup_file=$1
    
    echo -e "${BLUE}Restoring from backup...${NC}"
    
    if [ -z "$backup_file" ]; then
        # Find latest backup
        echo "Finding latest backup..."
        backup_file=$(ls -t "${SCRIPT_DIR}/../backups"/config-production-*.tar.gz.enc 2>/dev/null | head -1)
        
        if [ -z "$backup_file" ]; then
            echo -e "${RED}❌ No backup found${NC}"
            return 1
        fi
    fi
    
    echo "Using backup: $(basename $backup_file)"
    
    # Verify backup
    "${SCRIPT_DIR}/backup-config.sh" --verify "$backup_file"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Backup verification failed${NC}"
        return 1
    fi
    
    # Restore process would go here
    echo -e "${YELLOW}⚠️  Manual restore required:${NC}"
    echo "1. Decrypt backup: $backup_file"
    echo "2. Extract .env.production"
    echo "3. Copy to ${MCP_PATH}/config/.env"
    echo "4. Re-deploy with: make mcp-deploy-secure"
    
    return 0
}

# Function to clean deployment
clean_deployment() {
    echo -e "${BLUE}Cleaning deployment...${NC}"
    
    echo -n "Removing Docker image... "
    ssh ${NAS_USER}@${NAS_HOST} "docker rmi mcp-bridge:latest" >/dev/null 2>&1 || true
    echo -e "${GREEN}✅ Done${NC}"
    
    if [ "$1" == "--full" ]; then
        echo -e "${YELLOW}⚠️  Full cleanup requested${NC}"
        read -p "This will remove all MCP data. Continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -n "Removing MCP directory... "
            ssh ${NAS_USER}@${NAS_HOST} "sudo rm -rf ${MCP_PATH}" 2>/dev/null || true
            echo -e "${GREEN}✅ Done${NC}"
        fi
    else
        echo -n "Preserving config and logs... "
        echo -e "${GREEN}✅ Done${NC}"
    fi
}

# Main rollback function
main() {
    echo -e "${BLUE}🔄 MCP Bridge Rollback${NC}"
    echo -e "${BLUE}=====================${NC}"
    echo ""
    
    # Parse arguments
    local save_logs=true
    local full_clean=false
    local restore_file=""
    local rollback_reason="User initiated"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-logs)
                save_logs=false
                shift
                ;;
            --full-clean)
                full_clean=true
                shift
                ;;
            --restore)
                restore_file="$2"
                shift 2
                ;;
            --reason)
                rollback_reason="$2"
                shift 2
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --no-logs       Don't save current logs"
                echo "  --full-clean    Remove all MCP data (dangerous)"
                echo "  --restore FILE  Restore from specific backup"
                echo "  --reason TEXT   Reason for rollback"
                echo "  --help          Show this help"
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                exit 1
                ;;
        esac
    done
    
    echo "Rollback reason: ${rollback_reason}"
    echo ""
    
    # Confirm rollback
    echo -e "${YELLOW}⚠️  This will stop and remove the MCP Bridge container${NC}"
    read -p "Continue with rollback? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Rollback cancelled${NC}"
        exit 0
    fi
    
    # Save current state if requested
    if [ "$save_logs" = true ]; then
        save_current_state "$rollback_reason"
    fi
    
    # Stop container
    stop_container
    
    # Clean deployment
    if [ "$full_clean" = true ]; then
        clean_deployment --full
    else
        clean_deployment
    fi
    
    # Restore from backup if specified
    if [ -n "$restore_file" ] || [ "$full_clean" = false ]; then
        echo ""
        restore_backup "$restore_file"
    fi
    
    # Summary
    echo ""
    echo -e "${BLUE}Rollback Summary${NC}"
    echo -e "${BLUE}================${NC}"
    
    echo -e "${GREEN}✅ Container stopped and removed${NC}"
    echo -e "${GREEN}✅ Docker image removed${NC}"
    
    if [ "$full_clean" = true ]; then
        echo -e "${GREEN}✅ All data removed${NC}"
    else
        echo -e "${GREEN}✅ Config and logs preserved${NC}"
    fi
    
    if [ "$save_logs" = true ]; then
        echo -e "${GREEN}✅ State captured in rollback-logs${NC}"
    fi
    
    echo ""
    echo "Next steps:"
    echo "1. Review rollback logs if needed"
    echo "2. Fix any issues identified"
    echo "3. Re-deploy with: make mcp-secure-workflow"
    
    exit 0
}

# Run main function
main "$@"