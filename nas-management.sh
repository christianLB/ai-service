#!/bin/bash

# NAS AI Service Management Script
NAS_HOST="192.168.1.11"
NAS_USER="k2600x"
NAS_DIR="/volume1/homes/k2600x/services/ai-service"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

function show_menu() {
    echo -e "${BLUE}=== NAS AI Service Management ===${NC}"
    echo "1) Status - Show service status"
    echo "2) Logs - View service logs"
    echo "3) Restart - Restart all services"
    echo "4) Stop - Stop all services"
    echo "5) Start - Start all services"
    echo "6) Update - Pull latest code and redeploy"
    echo "7) Shell - SSH into NAS"
    echo "8) Edit Config - Edit production environment"
    echo "9) Test API - Test service endpoints"
    echo "10) Monitor - Live monitoring"
    echo "0) Exit"
    echo ""
}

function service_status() {
    echo -e "${YELLOW}Service Status:${NC}"
    ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_DIR} && sudo docker-compose -f docker-compose.prod.yml ps"
}

function view_logs() {
    echo -e "${YELLOW}Service Logs (Ctrl+C to exit):${NC}"
    ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_DIR} && sudo docker-compose -f docker-compose.prod.yml logs -f --tail=100 ai-service"
}

function restart_services() {
    echo -e "${YELLOW}Restarting services...${NC}"
    ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_DIR} && sudo docker-compose -f docker-compose.prod.yml restart"
    sleep 5
    service_status
}

function stop_services() {
    echo -e "${YELLOW}Stopping services...${NC}"
    ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_DIR} && sudo docker-compose -f docker-compose.prod.yml down"
}

function start_services() {
    echo -e "${YELLOW}Starting services...${NC}"
    ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_DIR} && sudo docker-compose -f docker-compose.prod.yml up -d"
    sleep 10
    service_status
}

function update_deployment() {
    echo -e "${YELLOW}Updating deployment...${NC}"
    ./deploy-to-nas.sh
}

function ssh_shell() {
    echo -e "${YELLOW}Connecting to NAS...${NC}"
    ssh ${NAS_USER}@${NAS_HOST} -t "cd ${NAS_DIR} && bash"
}

function edit_config() {
    echo -e "${YELLOW}Editing production configuration...${NC}"
    ssh ${NAS_USER}@${NAS_HOST} -t "nano ${NAS_DIR}/services/ai-service/.env.production"
    echo ""
    echo -e "${GREEN}Configuration updated. Restart services? (y/n)${NC}"
    read -r restart_choice
    if [[ $restart_choice == "y" ]]; then
        restart_services
    fi
}

function test_api() {
    echo -e "${YELLOW}Testing API endpoints...${NC}"
    echo ""
    
    echo "1. Health Check:"
    curl -s http://${NAS_HOST}:4030/health | jq '.' || echo "Failed"
    echo ""
    
    echo "2. Ready Check:"
    curl -s http://${NAS_HOST}:4030/ready | jq '.' || echo "Failed"
    echo ""
    
    echo "3. Test Summarization:"
    curl -s -X POST http://${NAS_HOST}:4030/v1/summarize \
        -H "Content-Type: application/json" \
        -H "X-API-Key: test" \
        -d '{
            "input": "The quick brown fox jumps over the lazy dog. This is a test sentence for summarization.",
            "size": "short"
        }' | jq '.' || echo "Failed"
}

function monitor_services() {
    echo -e "${YELLOW}Live Monitoring (Ctrl+C to exit):${NC}"
    ssh ${NAS_USER}@${NAS_HOST} << 'ENDSSH'
    while true; do
        clear
        echo "=== AI Service Monitor ==="
        echo "Time: $(date)"
        echo ""
        echo "Container Status:"
        sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAME|ai-"
        echo ""
        echo "Resource Usage:"
        sudo docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep -E "NAME|ai-"
        echo ""
        echo "Recent Logs:"
        sudo docker logs ai-service --tail=5 2>&1 | tail -5
        sleep 5
    done
ENDSSH
}

# Main loop
while true; do
    show_menu
    read -p "Select option: " choice
    echo ""
    
    case $choice in
        1) service_status ;;
        2) view_logs ;;
        3) restart_services ;;
        4) stop_services ;;
        5) start_services ;;
        6) update_deployment ;;
        7) ssh_shell ;;
        8) edit_config ;;
        9) test_api ;;
        10) monitor_services ;;
        0) echo -e "${GREEN}Goodbye!${NC}"; exit 0 ;;
        *) echo -e "${RED}Invalid option${NC}" ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    clear
done