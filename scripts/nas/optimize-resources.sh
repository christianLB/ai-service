#!/bin/bash

# Script de optimización de recursos para AI Service en Synology NAS
# Ajusta automáticamente recursos según la carga

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
COMPOSE_FILE="/volume1/docker/ai-service/docker-compose.optimized.yml"
LOG_FILE="/volume1/docker/ai-service/logs/optimization.log"

# Función de logging
log() {
    local level=$1
    shift
    local message="$@"
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] ${message}" | tee -a "$LOG_FILE"
}

# Función para obtener métricas
get_container_metrics() {
    local container=$1
    docker stats --no-stream --format "{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}}" "$container" | \
        sed 's/%//g' | sed 's/[[:space:]]//g'
}

# Función para ajustar límites de PostgreSQL
optimize_postgres() {
    log "INFO" "${BLUE}Optimizando PostgreSQL...${NC}"
    
    # Obtener métricas actuales
    local metrics=$(get_container_metrics "ai-service-postgres")
    local mem_percent=$(echo "$metrics" | cut -d',' -f3)
    
    # Ajustar configuración según uso
    if (( $(echo "$mem_percent > 80" | bc -l) )); then
        log "WARN" "${YELLOW}PostgreSQL usando mucha memoria (${mem_percent}%)${NC}"
        
        # Reducir shared_buffers
        docker exec ai-service-postgres psql -U ai_user -c "ALTER SYSTEM SET shared_buffers = '192MB';"
        docker exec ai-service-postgres psql -U ai_user -c "ALTER SYSTEM SET work_mem = '2MB';"
        docker exec ai-service-postgres psql -U ai_user -c "SELECT pg_reload_conf();"
        
        log "INFO" "Configuración de PostgreSQL reducida"
    elif (( $(echo "$mem_percent < 50" | bc -l) )); then
        # Aumentar ligeramente si hay espacio
        docker exec ai-service-postgres psql -U ai_user -c "ALTER SYSTEM SET shared_buffers = '256MB';"
        docker exec ai-service-postgres psql -U ai_user -c "ALTER SYSTEM SET work_mem = '4MB';"
        docker exec ai-service-postgres psql -U ai_user -c "SELECT pg_reload_conf();"
        
        log "INFO" "Configuración de PostgreSQL optimizada"
    fi
    
    # Vacuum automático
    docker exec ai-service-postgres vacuumdb -U ai_user -d ai_service -z
    log "INFO" "${GREEN}PostgreSQL optimizado${NC}"
}

# Función para optimizar Redis
optimize_redis() {
    log "INFO" "${BLUE}Optimizando Redis...${NC}"
    
    # Obtener info de memoria
    local used_memory=$(docker exec ai-service-redis redis-cli INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    
    log "INFO" "Redis usando: $used_memory"
    
    # Forzar liberación de memoria si es necesario
    docker exec ai-service-redis redis-cli MEMORY PURGE
    
    # Optimizar configuración
    docker exec ai-service-redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
    docker exec ai-service-redis redis-cli CONFIG SET lazyfree-lazy-eviction yes
    docker exec ai-service-redis redis-cli CONFIG SET lazyfree-lazy-expire yes
    
    log "INFO" "${GREEN}Redis optimizado${NC}"
}

# Función para optimizar aplicación Node.js
optimize_nodejs() {
    log "INFO" "${BLUE}Optimizando aplicación Node.js...${NC}"
    
    # Obtener métricas
    local metrics=$(get_container_metrics "ai-service-app")
    local cpu_percent=$(echo "$metrics" | cut -d',' -f1)
    local mem_percent=$(echo "$metrics" | cut -d',' -f3)
    
    log "INFO" "App usando CPU: ${cpu_percent}%, Memoria: ${mem_percent}%"
    
    # Si hay alto uso de CPU, ajustar workers
    if (( $(echo "$cpu_percent > 80" | bc -l) )); then
        log "WARN" "${YELLOW}Alto uso de CPU, ajustando workers...${NC}"
        
        # Reducir workers si es necesario
        docker exec ai-service-app sh -c 'kill -USR2 1'  # Graceful restart con menos workers
    fi
    
    # Forzar garbage collection si memoria alta
    if (( $(echo "$mem_percent > 80" | bc -l) )); then
        log "WARN" "${YELLOW}Alto uso de memoria, forzando GC...${NC}"
        
        # Enviar señal para forzar GC
        docker exec ai-service-app sh -c 'kill -USR1 1'
    fi
    
    log "INFO" "${GREEN}Aplicación optimizada${NC}"
}

# Función para limpiar logs antiguos
cleanup_logs() {
    log "INFO" "${BLUE}Limpiando logs antiguos...${NC}"
    
    # Rotar logs de Docker
    find /var/lib/docker/containers -name "*.log" -size +100M -exec truncate -s 0 {} \;
    
    # Limpiar logs de aplicación antiguos
    find /volume1/docker/ai-service/logs -name "*.log" -mtime +7 -delete
    
    # Comprimir logs recientes
    find /volume1/docker/ai-service/logs -name "*.log" -mtime +1 -not -name "*.gz" -exec gzip {} \;
    
    log "INFO" "${GREEN}Logs limpiados${NC}"
}

# Función para optimizar imágenes Docker
cleanup_docker() {
    log "INFO" "${BLUE}Limpiando recursos Docker...${NC}"
    
    # Limpiar contenedores detenidos
    docker container prune -f
    
    # Limpiar imágenes no usadas
    docker image prune -a -f --filter "until=24h"
    
    # Limpiar volúmenes no usados
    docker volume prune -f
    
    # Limpiar redes no usadas
    docker network prune -f
    
    # Mostrar espacio liberado
    local df_after=$(df -h /volume1 | grep -v Filesystem | awk '{print $4}')
    log "INFO" "${GREEN}Espacio libre después de limpieza: $df_after${NC}"
}

# Función para ajustar swappiness
optimize_system() {
    log "INFO" "${BLUE}Optimizando sistema...${NC}"
    
    # Ajustar swappiness para menos uso de swap
    echo 10 > /proc/sys/vm/swappiness
    
    # Limpiar cache de página
    sync && echo 1 > /proc/sys/vm/drop_caches
    
    # Ajustar límites de archivo
    ulimit -n 65536
    
    log "INFO" "${GREEN}Sistema optimizado${NC}"
}

# Función para generar reporte
generate_report() {
    log "INFO" "${BLUE}Generando reporte de optimización...${NC}"
    
    cat > /volume1/docker/ai-service/logs/optimization-report.txt << EOF
=== Reporte de Optimización ===
Fecha: $(date)

Uso de Recursos:
$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}")

Espacio en Disco:
$(df -h /volume1)

Servicios Activos:
$(docker-compose -f "$COMPOSE_FILE" ps)

Últimas Optimizaciones:
$(tail -20 "$LOG_FILE" | grep -E "INFO|WARN|ERROR")
EOF
    
    log "INFO" "${GREEN}Reporte generado${NC}"
}

# Función principal
main() {
    log "INFO" "${BLUE}=== Iniciando optimización de recursos ===${NC}"
    
    # Verificar que estamos en el NAS
    if [ ! -f "$COMPOSE_FILE" ]; then
        log "ERROR" "${RED}No se encuentra archivo de compose${NC}"
        exit 1
    fi
    
    # Ejecutar optimizaciones
    optimize_postgres
    optimize_redis
    optimize_nodejs
    cleanup_logs
    cleanup_docker
    optimize_system
    generate_report
    
    log "INFO" "${GREEN}=== Optimización completada ===${NC}"
    
    # Mostrar resumen
    echo -e "\n${BLUE}Resumen de Optimización:${NC}"
    docker stats --no-stream
}

# Modo de ejecución
MODE="${1:-once}"

case "$MODE" in
    "once")
        main
        ;;
    "schedule")
        # Programar ejecución cada 6 horas
        echo "0 */6 * * * /volume1/docker/ai-service/scripts/optimize-resources.sh once" | crontab -
        log "INFO" "Optimización programada cada 6 horas"
        ;;
    "monitor")
        # Modo monitoreo continuo
        while true; do
            main
            sleep 3600  # Cada hora
        done
        ;;
    *)
        echo "Uso: $0 [once|schedule|monitor]"
        exit 1
        ;;
esac