#!/bin/bash
# Deployment Validation Script for MCP Bridge
# Comprehensive validation without exposing sensitive data

# set -e  # Disabled for validation checks

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment if available
if [ -f "../../.make.env" ]; then
    set -a
    source ../../.make.env
    set +a
fi

# Configuration
NAS_HOST="${NAS_HOST:-192.168.1.11}"
NAS_USER="${NAS_USER:-k2600x}"
MCP_PATH="/volume1/docker/ai-service-mcp"
MCP_ENDPOINT="http://${NAS_HOST}:8080"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Validation status
VALIDATION_PASSED=true
CHECKS_TOTAL=0
CHECKS_PASSED=0
CHECKS_FAILED=0

# SSH execution function
ssh_exec() {
    if [ -n "$SSHPASS" ]; then
        sshpass -e ssh ${NAS_USER}@${NAS_HOST} "$@"
    else
        ssh ${NAS_USER}@${NAS_HOST} "$@"
    fi
}

# Function to perform a validation check
check() {
    local check_name=$1
    local check_command=$2
    local success_message=$3
    local failure_message=$4
    
    ((CHECKS_TOTAL++))
    
    echo -n "${check_name}... "
    
    if eval "$check_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ ${success_message}${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ ${failure_message}${NC}"
        ((CHECKS_FAILED++))
        VALIDATION_PASSED=false
        return 1
    fi
}

# Function to check remote file/directory
check_remote() {
    local path=$1
    local type=$2
    local description=$3
    
    local test_flag="-e"
    [ "$type" = "directory" ] && test_flag="-d"
    [ "$type" = "file" ] && test_flag="-f"
    
    check "$description" \
        "ssh_exec 'test $test_flag $path'" \
        "EXISTS" \
        "NOT FOUND"
}

# Main validation function
main() {
    echo -e "${BLUE}🔍 MCP Bridge Deployment Validation${NC}"
    echo -e "${BLUE}===================================${NC}"
    echo ""
    echo "Host: ${NAS_HOST}"
    echo "Path: ${MCP_PATH}"
    echo ""
    
    # 1. Infrastructure checks
    echo -e "${BLUE}1️⃣ Infrastructure Validation${NC}"
    
    check "SSH Connectivity" \
        "ssh_exec 'echo OK'" \
        "CONNECTED" \
        "CONNECTION FAILED"
    
    check "Docker Service" \
        "ssh_exec 'sudo /usr/local/bin/docker --version'" \
        "AVAILABLE" \
        "NOT AVAILABLE"
    
    check_remote "$MCP_PATH" "directory" "MCP Directory"
    check_remote "${MCP_PATH}/config" "directory" "Config Directory"
    check_remote "${MCP_PATH}/logs" "directory" "Logs Directory"
    check_remote "${MCP_PATH}/config/.env" "file" "Environment File"
    
    # Check file permissions
    check "Config Permissions" \
        "ssh_exec 'stat -c %a ${MCP_PATH}/config/.env' | grep -q '600'" \
        "SECURE (600)" \
        "INSECURE"
    
    echo ""
    echo -e "${BLUE}2️⃣ Container Validation${NC}"
    
    # Container checks
    check "Container Status" \
        "ssh_exec 'sudo /usr/local/bin/docker ps | grep -q mcp-bridge'" \
        "RUNNING" \
        "NOT RUNNING"
    
    # Get container health
    local container_health=$(ssh_exec "sudo /usr/local/bin/docker inspect mcp-bridge --format='{{.State.Health.Status}}'" 2>/dev/null || echo "unknown")
    if [ "$container_health" = "healthy" ]; then
        echo -e "Container Health... ${GREEN}✅ HEALTHY${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "Container Health... ${YELLOW}⚠️  ${container_health^^}${NC}"
    fi
    ((CHECKS_TOTAL++))
    
    # Check resource usage
    echo -n "Resource Usage... "
    local mem_usage=$(ssh_exec "sudo /usr/local/bin/docker stats mcp-bridge --no-stream --format '{{.MemUsage}}' | cut -d'/' -f1" 2>/dev/null || echo "unknown")
    if [ "$mem_usage" != "unknown" ]; then
        echo -e "${GREEN}✅ Memory: ${mem_usage}${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${YELLOW}⚠️  Unable to check${NC}"
    fi
    ((CHECKS_TOTAL++))
    
    echo ""
    echo -e "${BLUE}3️⃣ Service Validation${NC}"
    
    # Service endpoints
    check "Health Endpoint" \
        "curl -s -f ${MCP_ENDPOINT}/health" \
        "RESPONSIVE" \
        "NOT RESPONSIVE"
    
    check "Capabilities Endpoint" \
        "curl -s -f ${MCP_ENDPOINT}/mcp/capabilities | grep -q 'tools'" \
        "AVAILABLE" \
        "NOT AVAILABLE"
    
    # Check number of tools
    echo -n "Tool Registry... "
    local tool_count=$(curl -s ${MCP_ENDPOINT}/mcp/capabilities 2>/dev/null | grep -o '"name"' | wc -l || echo "0")
    if [ "$tool_count" -ge 24 ]; then
        echo -e "${GREEN}✅ ${tool_count} TOOLS LOADED${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}❌ Only ${tool_count} tools (expected 24)${NC}"
        ((CHECKS_FAILED++))
        VALIDATION_PASSED=false
    fi
    ((CHECKS_TOTAL++))
    
    echo ""
    echo -e "${BLUE}4️⃣ Integration Validation${NC}"
    
    # Check AI Service connectivity from container
    check "AI Service Connection" \
        "ssh_exec 'sudo /usr/local/bin/docker exec mcp-bridge wget -q -O- http://ai-service:3000/status'" \
        "ESTABLISHED" \
        "FAILED"
    
    # Check Redis connectivity
    check "Redis Connection" \
        "ssh_exec 'sudo /usr/local/bin/docker exec mcp-bridge nc -zv ai-redis 6379'" \
        "CONNECTED" \
        "FAILED"
    
    echo ""
    echo -e "${BLUE}5️⃣ Security Validation${NC}"
    
    # Security checks
    check "Authentication Required" \
        "curl -s -X POST ${MCP_ENDPOINT}/mcp/tools/get_financial_summary/execute -o /dev/null -w '%{http_code}' | grep -q '401'" \
        "PROPERLY CONFIGURED" \
        "SECURITY ISSUE"
    
    # Check for exposed secrets in logs
    echo -n "Log Security... "
    if ssh_exec "sudo /usr/local/bin/docker logs mcp-bridge --tail 100 2>&1 | grep -i -E 'secret|password|key|token'" >/dev/null 2>&1; then
        echo -e "${RED}❌ POTENTIAL SECRETS IN LOGS${NC}"
        ((CHECKS_FAILED++))
        VALIDATION_PASSED=false
    else
        echo -e "${GREEN}✅ NO SECRETS EXPOSED${NC}"
        ((CHECKS_PASSED++))
    fi
    ((CHECKS_TOTAL++))
    
    echo ""
    echo -e "${BLUE}6️⃣ Operational Validation${NC}"
    
    # Check logs for errors
    echo -n "Error Check... "
    local error_count=$(ssh_exec "sudo /usr/local/bin/docker logs mcp-bridge --tail 100 2>&1 | grep -i error | wc -l" 2>/dev/null || echo "0")
    if [ "$error_count" -eq 0 ]; then
        echo -e "${GREEN}✅ NO ERRORS IN LOGS${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${YELLOW}⚠️  ${error_count} errors found${NC}"
    fi
    ((CHECKS_TOTAL++))
    
    # Check disk space
    echo -n "Disk Space... "
    local disk_usage=$(ssh_exec "df -h /volume1 | tail -1 | awk '{print \$5}' | sed 's/%//'" 2>/dev/null || echo "0")
    if [ "$disk_usage" -lt 90 ]; then
        echo -e "${GREEN}✅ ${disk_usage}% USED${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${YELLOW}⚠️  ${disk_usage}% USED (getting full)${NC}"
    fi
    ((CHECKS_TOTAL++))
    
    # Summary
    echo ""
    echo -e "${BLUE}📊 Validation Summary${NC}"
    echo -e "${BLUE}====================${NC}"
    
    local pass_rate=$((CHECKS_PASSED * 100 / CHECKS_TOTAL))
    
    echo "Total checks: ${CHECKS_TOTAL}"
    echo -e "Passed: ${GREEN}${CHECKS_PASSED}${NC}"
    echo -e "Failed: ${RED}${CHECKS_FAILED}${NC}"
    echo "Pass rate: ${pass_rate}%"
    
    echo ""
    
    if [ "$VALIDATION_PASSED" = true ]; then
        echo -e "${GREEN}✅ Container Status: RUNNING${NC}"
        echo -e "${GREEN}✅ Health Endpoint: RESPONSIVE${NC}"
        echo -e "${GREEN}✅ Authentication: WORKING${NC}"
        echo -e "${GREEN}✅ AI Service Connection: ESTABLISHED${NC}"
        echo -e "${GREEN}✅ Tool Registry: 24 TOOLS LOADED${NC}"
        echo -e "${GREEN}✅ Security: PROPERLY CONFIGURED${NC}"
        echo ""
        echo -e "${GREEN}Deployment Status: SUCCESS${NC}"
        exit 0
    else
        echo -e "${RED}❌ Deployment validation failed${NC}"
        echo ""
        echo "Troubleshooting:"
        echo "1. Check container logs: docker logs mcp-bridge"
        echo "2. Verify configuration: ./validate-config.sh --production"
        echo "3. Test endpoints: ./test-production.sh"
        exit 1
    fi
}

# Run main function
main "$@"