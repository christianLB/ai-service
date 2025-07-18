#!/bin/bash
# MCP Bridge Maintenance Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
MCP_PATH="/volume1/docker/ai-service-mcp"
BACKUP_PATH="/volume1/docker/backups/mcp"
LOG_RETENTION_DAYS=7
BACKUP_RETENTION_COUNT=5

# Function to print header
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  MCP Bridge Maintenance Script${NC}"
    echo -e "${BLUE}  $(date)${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to rotate logs
rotate_logs() {
    echo -e "${YELLOW}📋 Rotating logs...${NC}"
    
    # Find and compress old logs
    find ${MCP_PATH}/logs -name "*.log" -mtime +1 -exec gzip {} \;
    
    # Delete very old logs
    find ${MCP_PATH}/logs -name "*.log.gz" -mtime +${LOG_RETENTION_DAYS} -delete
    
    # Show current log status
    echo "Current logs:"
    ls -lh ${MCP_PATH}/logs/
    
    echo -e "${GREEN}✅ Log rotation complete${NC}"
}

# Function to backup configuration
backup_config() {
    echo -e "${YELLOW}💾 Backing up configuration...${NC}"
    
    # Create backup directory
    mkdir -p ${BACKUP_PATH}
    
    # Create timestamped backup
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_PATH}/mcp-config-${TIMESTAMP}.tar.gz"
    
    # Create backup
    tar -czf ${BACKUP_FILE} \
        ${MCP_PATH}/config \
        ${MCP_PATH}/docker-compose.mcp.yml \
        2>/dev/null || true
    
    echo "Backup created: ${BACKUP_FILE}"
    
    # Clean old backups
    echo "Cleaning old backups..."
    ls -t ${BACKUP_PATH}/mcp-config-*.tar.gz | tail -n +$((BACKUP_RETENTION_COUNT + 1)) | xargs rm -f 2>/dev/null || true
    
    echo -e "${GREEN}✅ Backup complete${NC}"
}

# Function to check container health
check_health() {
    echo -e "${YELLOW}🏥 Checking container health...${NC}"
    
    # Check if container is running
    if docker ps | grep -q mcp-bridge; then
        echo -e "${GREEN}✅ Container is running${NC}"
        
        # Check health endpoint
        HEALTH_RESPONSE=$(curl -s http://localhost:8080/health || echo "Failed")
        if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
            echo -e "${GREEN}✅ Health check passed${NC}"
            echo "$HEALTH_RESPONSE" | jq . 2>/dev/null || echo "$HEALTH_RESPONSE"
        else
            echo -e "${RED}❌ Health check failed${NC}"
        fi
        
        # Show resource usage
        echo -e "\n${BLUE}Resource Usage:${NC}"
        docker stats mcp-bridge --no-stream
    else
        echo -e "${RED}❌ Container is not running${NC}"
    fi
}

# Function to clean up
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    
    # Clean Docker system
    docker system prune -f --volumes 2>/dev/null || true
    
    # Clean old Docker images
    docker images | grep "mcp-bridge" | grep -v "latest" | awk '{print $3}' | xargs docker rmi -f 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Function to show disk usage
show_disk_usage() {
    echo -e "${YELLOW}💾 Disk usage:${NC}"
    
    echo "MCP directories:"
    du -sh ${MCP_PATH}/* | sort -h
    
    echo -e "\nTotal MCP usage:"
    du -sh ${MCP_PATH}
}

# Function to restart container
restart_container() {
    echo -e "${YELLOW}🔄 Restarting MCP Bridge...${NC}"
    
    cd ${MCP_PATH}
    docker-compose -f docker-compose.mcp.yml restart
    
    sleep 5
    check_health
}

# Main menu
main_menu() {
    PS3='Please select an option: '
    options=(
        "Full maintenance (all tasks)"
        "Rotate logs"
        "Backup configuration"
        "Check health"
        "Show disk usage"
        "Restart container"
        "Cleanup"
        "Exit"
    )
    
    select opt in "${options[@]}"
    do
        case $opt in
            "Full maintenance (all tasks)")
                rotate_logs
                backup_config
                check_health
                show_disk_usage
                cleanup
                ;;
            "Rotate logs")
                rotate_logs
                ;;
            "Backup configuration")
                backup_config
                ;;
            "Check health")
                check_health
                ;;
            "Show disk usage")
                show_disk_usage
                ;;
            "Restart container")
                restart_container
                ;;
            "Cleanup")
                cleanup
                ;;
            "Exit")
                break
                ;;
            *) echo "Invalid option $REPLY";;
        esac
        echo -e "\n${BLUE}Press Enter to continue...${NC}"
        read
    done
}

# Main execution
print_header

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  This script should be run with sudo for full functionality${NC}"
fi

# Check if running with argument
if [ "$1" == "auto" ]; then
    echo -e "${BLUE}Running automatic maintenance...${NC}"
    rotate_logs
    backup_config
    check_health
    cleanup
else
    main_menu
fi

echo -e "${GREEN}✅ Maintenance complete!${NC}"