#!/bin/bash

# Monitor de recursos del sistema para Synology NAS
# Muestra uso de CPU, RAM y espacio en disco de forma optimizada

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Función para obtener uso de CPU
get_cpu_usage() {
    # Promedio de 1 minuto
    local cpu_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',')
    echo "$cpu_avg"
}

# Función para obtener uso de memoria
get_memory_usage() {
    local mem_info=$(free -m | grep '^Mem:')
    local total=$(echo $mem_info | awk '{print $2}')
    local used=$(echo $mem_info | awk '{print $3}')
    local free=$(echo $mem_info | awk '{print $4}')
    local percent=$((used * 100 / total))
    
    echo "Total: ${total}MB | Used: ${used}MB | Free: ${free}MB | Usage: ${percent}%"
}

# Función para obtener uso de disco
get_disk_usage() {
    df -h /volume1 | grep -v Filesystem | awk '{print "Total: "$2" | Used: "$3" | Free: "$4" | Usage: "$5}'
}

# Función para obtener estado de contenedores
get_container_stats() {
    echo -e "\n${BLUE}Container Resources:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | \
        grep -E "(CONTAINER|ai-service)" | \
        awk 'NR==1{print} NR>1{if($4+0 > 80) printf "\033[0;31m%s\033[0m\n", $0; else if($4+0 > 60) printf "\033[1;33m%s\033[0m\n", $0; else printf "\033[0;32m%s\033[0m\n", $0}'
}

# Función para verificar servicios
check_services() {
    echo -e "\n${BLUE}Service Status:${NC}"
    
    local services=("postgres:5432" "redis:6379" "ai-service:3001" "nginx:80")
    
    for service in "${services[@]}"; do
        local name="${service%%:*}"
        local port="${service##*:}"
        
        if nc -z localhost "$port" 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} ${name} (port ${port})"
        else
            echo -e "  ${RED}✗${NC} ${name} (port ${port})"
        fi
    done
}

# Función para mostrar top procesos
show_top_processes() {
    echo -e "\n${BLUE}Top 5 CPU Processes:${NC}"
    ps aux --sort=-%cpu | head -6 | tail -5 | awk '{printf "  %-10s %5s%% %s\n", $1, $3, $11}'
    
    echo -e "\n${BLUE}Top 5 Memory Processes:${NC}"
    ps aux --sort=-%mem | head -6 | tail -5 | awk '{printf "  %-10s %5s%% %s\n", $1, $4, $11}'
}

# Función para verificar logs de errores
check_error_logs() {
    echo -e "\n${BLUE}Recent Errors (last 10):${NC}"
    
    local log_dir="/volume1/docker/ai-service/logs"
    if [ -d "$log_dir" ]; then
        find "$log_dir" -name "*.log" -type f -mtime -1 -exec grep -l "ERROR\|CRITICAL" {} \; | \
        while read -r log_file; do
            echo -e "  ${YELLOW}$(basename "$log_file"):${NC}"
            tail -5 "$log_file" | grep -E "ERROR|CRITICAL" | tail -2 | sed 's/^/    /'
        done
    else
        echo "  No log directory found"
    fi
}

# Función principal
main() {
    clear
    echo -e "${BLUE}=== Synology NAS System Monitor ===${NC}"
    echo -e "Time: $(date '+%Y-%m-%d %H:%M:%S')\n"
    
    # Información del sistema
    echo -e "${BLUE}System Information:${NC}"
    echo -e "  Hostname: $(hostname)"
    echo -e "  Uptime: $(uptime -p)"
    echo -e "  Load Average: $(get_cpu_usage)"
    
    # Uso de memoria
    echo -e "\n${BLUE}Memory Usage:${NC}"
    echo -e "  $(get_memory_usage)"
    
    # Uso de disco
    echo -e "\n${BLUE}Disk Usage (/volume1):${NC}"
    echo -e "  $(get_disk_usage)"
    
    # Estado de contenedores
    get_container_stats
    
    # Verificar servicios
    check_services
    
    # Top procesos (opcional con flag -v)
    if [[ "${1:-}" == "-v" ]]; then
        show_top_processes
        check_error_logs
    fi
    
    # Resumen y alertas
    echo -e "\n${BLUE}Summary:${NC}"
    
    # Verificar alertas
    local mem_percent=$(free -m | grep '^Mem:' | awk '{print int($3*100/$2)}')
    if [ "$mem_percent" -gt 90 ]; then
        echo -e "  ${RED}⚠ CRITICAL: Memory usage is above 90%${NC}"
    elif [ "$mem_percent" -gt 80 ]; then
        echo -e "  ${YELLOW}⚠ WARNING: Memory usage is above 80%${NC}"
    else
        echo -e "  ${GREEN}✓ Memory usage is normal${NC}"
    fi
    
    local load_avg=$(get_cpu_usage | cut -d. -f1)
    if [ "$load_avg" -gt 8 ]; then
        echo -e "  ${RED}⚠ CRITICAL: High CPU load${NC}"
    elif [ "$load_avg" -gt 4 ]; then
        echo -e "  ${YELLOW}⚠ WARNING: Moderate CPU load${NC}"
    else
        echo -e "  ${GREEN}✓ CPU load is normal${NC}"
    fi
    
    echo -e "\nPress Ctrl+C to exit or wait for refresh..."
}

# Loop continuo si se especifica flag -w (watch)
if [[ "${1:-}" == "-w" ]]; then
    while true; do
        main
        sleep 5
    done
else
    main "$@"
fi