#!/bin/bash
# Emergency Diagnostic Script - Diagnóstico rápido de problemas
# Autor: Sara - Emergency Responder
# Objetivo: Identificar problemas en menos de 10 segundos

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORT_FILE="/tmp/diagnostic_$(date +%Y%m%d_%H%M%S).txt"
CRITICAL_ISSUES=0

# Timer
START_TIME=$(date +%s)

# Logging
log() {
    echo -e "${1}" | tee -a "$REPORT_FILE"
}

# Check crítico con timeout
check_with_timeout() {
    local command="$1"
    local description="$2"
    local timeout="${3:-5}"
    
    if timeout "$timeout" bash -c "$command" >/dev/null 2>&1; then
        log "${GREEN}✓ $description${NC}"
        return 0
    else
        log "${RED}✗ $description${NC}"
        ((CRITICAL_ISSUES++))
        return 1
    fi
}

# Diagnóstico de Docker
diagnose_docker() {
    log "${BLUE}=== DIAGNÓSTICO DOCKER ===${NC}"
    
    # Docker daemon
    check_with_timeout "docker version" "Docker daemon activo" 2
    
    # Contenedores
    log "${YELLOW}Contenedores en ejecución:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | tee -a "$REPORT_FILE"
    
    # Contenedores muertos
    local dead_containers=$(docker ps -a --filter "status=exited" --format "{{.Names}}" | wc -l)
    if [[ $dead_containers -gt 0 ]]; then
        log "${RED}⚠️  $dead_containers contenedores detenidos${NC}"
        docker ps -a --filter "status=exited" --format "table {{.Names}}\t{{.Status}}\t{{.ExitCode}}" | tee -a "$REPORT_FILE"
    fi
    
    # Uso de recursos
    log "${YELLOW}Uso de recursos Docker:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | tee -a "$REPORT_FILE"
    
    # Logs de errores recientes
    log "${YELLOW}Errores recientes en logs:${NC}"
    for container in $(docker ps --format "{{.Names}}"); do
        local errors=$(docker logs --tail 20 "$container" 2>&1 | grep -iE "error|exception|failed|critical" | wc -l)
        if [[ $errors -gt 0 ]]; then
            log "${RED}⚠️  $container: $errors errores encontrados${NC}"
            docker logs --tail 10 "$container" 2>&1 | grep -iE "error|exception|failed|critical" | head -5 | tee -a "$REPORT_FILE"
        fi
    done
}

# Diagnóstico de Red
diagnose_network() {
    log "${BLUE}=== DIAGNÓSTICO DE RED ===${NC}"
    
    # Conectividad básica
    check_with_timeout "ping -c 1 8.8.8.8" "Conectividad a Internet" 2
    check_with_timeout "curl -s http://localhost:3000/health" "API local respondiendo" 3
    
    # Puertos abiertos
    log "${YELLOW}Puertos en escucha:${NC}"
    netstat -tlnp 2>/dev/null | grep -E ":3000|:5432|:6379" | tee -a "$REPORT_FILE" || \
        ss -tlnp | grep -E ":3000|:5432|:6379" | tee -a "$REPORT_FILE"
    
    # DNS
    check_with_timeout "nslookup google.com" "Resolución DNS" 2
}

# Diagnóstico de Base de Datos
diagnose_database() {
    log "${BLUE}=== DIAGNÓSTICO BASE DE DATOS ===${NC}"
    
    # PostgreSQL
    if docker ps | grep -q postgres; then
        # Conexión
        check_with_timeout "docker exec ai-service-postgres-1 pg_isready -U postgres" "PostgreSQL accesible" 2
        
        # Conexiones activas
        log "${YELLOW}Conexiones activas:${NC}"
        docker exec ai-service-postgres-1 psql -U postgres -c "SELECT count(*) as total FROM pg_stat_activity;" 2>/dev/null | tee -a "$REPORT_FILE" || log "${RED}No se pudo consultar conexiones${NC}"
        
        # Tamaño de base de datos
        log "${YELLOW}Tamaño de bases de datos:${NC}"
        docker exec ai-service-postgres-1 psql -U postgres -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size FROM pg_database ORDER BY pg_database_size(pg_database.datname) DESC;" 2>/dev/null | tee -a "$REPORT_FILE" || true
    else
        log "${RED}✗ PostgreSQL no está en ejecución${NC}"
        ((CRITICAL_ISSUES++))
    fi
}

# Diagnóstico de Sistema
diagnose_system() {
    log "${BLUE}=== DIAGNÓSTICO DEL SISTEMA ===${NC}"
    
    # CPU
    log "${YELLOW}Uso de CPU:${NC}"
    top -bn1 | grep "Cpu(s)" | tee -a "$REPORT_FILE"
    
    # Memoria
    log "${YELLOW}Uso de memoria:${NC}"
    free -h | tee -a "$REPORT_FILE"
    
    # Disco
    log "${YELLOW}Espacio en disco:${NC}"
    df -h | grep -E "/|/volume1" | tee -a "$REPORT_FILE"
    
    # Procesos problemáticos
    log "${YELLOW}Top 5 procesos por CPU:${NC}"
    ps aux --sort=-%cpu | head -6 | tee -a "$REPORT_FILE"
    
    # Archivos abiertos
    local open_files=$(lsof | wc -l)
    local file_limit=$(ulimit -n)
    log "${YELLOW}Archivos abiertos: $open_files / $file_limit${NC}"
    
    if [[ $open_files -gt $((file_limit * 80 / 100)) ]]; then
        log "${RED}⚠️  Advertencia: Cerca del límite de archivos abiertos${NC}"
    fi
}

# Diagnóstico de Configuración
diagnose_config() {
    log "${BLUE}=== DIAGNÓSTICO DE CONFIGURACIÓN ===${NC}"
    
    # Archivos de configuración
    local config_files=(".env" ".env.production" "docker-compose.production.yml")
    for file in "${config_files[@]}"; do
        if [[ -f "$PROJECT_ROOT/$file" ]]; then
            log "${GREEN}✓ $file existe${NC}"
        else
            log "${RED}✗ $file no encontrado${NC}"
            ((CRITICAL_ISSUES++))
        fi
    done
    
    # Permisos
    log "${YELLOW}Verificando permisos:${NC}"
    local permission_issues=$(find "$PROJECT_ROOT" -type f -name "*.sh" ! -perm -u+x | wc -l)
    if [[ $permission_issues -gt 0 ]]; then
        log "${RED}⚠️  $permission_issues scripts sin permisos de ejecución${NC}"
    else
        log "${GREEN}✓ Permisos correctos${NC}"
    fi
}

# Análisis rápido de logs
analyze_logs() {
    log "${BLUE}=== ANÁLISIS RÁPIDO DE LOGS ===${NC}"
    
    # Buscar patrones de error en los últimos logs
    local log_patterns=("ERROR" "CRITICAL" "FATAL" "Exception" "Failed" "Timeout" "Connection refused")
    
    for pattern in "${log_patterns[@]}"; do
        local count=0
        for container in $(docker ps --format "{{.Names}}"); do
            count=$((count + $(docker logs --tail 100 "$container" 2>&1 | grep -c "$pattern" || true)))
        done
        if [[ $count -gt 0 ]]; then
            log "${RED}⚠️  '$pattern' encontrado $count veces en logs recientes${NC}"
        fi
    done
}

# Soluciones rápidas sugeridas
suggest_fixes() {
    log "${BLUE}=== SOLUCIONES RÁPIDAS SUGERIDAS ===${NC}"
    
    if [[ $CRITICAL_ISSUES -gt 0 ]]; then
        log "${YELLOW}Basado en los problemas encontrados:${NC}"
        
        # Docker issues
        if ! docker ps >/dev/null 2>&1; then
            log "1. Reiniciar Docker: ${MAGENTA}sudo systemctl restart docker${NC}"
        fi
        
        # Container issues
        if docker ps -a --filter "status=exited" | grep -q ai-service; then
            log "2. Reiniciar contenedores: ${MAGENTA}make prod-restart${NC}"
        fi
        
        # Database issues
        if ! docker exec ai-service-postgres-1 pg_isready >/dev/null 2>&1; then
            log "3. Reiniciar base de datos: ${MAGENTA}docker-compose -f docker-compose.production.yml restart postgres${NC}"
        fi
        
        # Disk space
        local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
        if [[ $disk_usage -gt 90 ]]; then
            log "4. Liberar espacio: ${MAGENTA}docker system prune -a${NC}"
        fi
        
        log "${RED}5. Si nada funciona: ${MAGENTA}$SCRIPT_DIR/rollback.sh latest${NC}"
    else
        log "${GREEN}✅ No se detectaron problemas críticos${NC}"
    fi
}

# Generar reporte de salud
generate_health_score() {
    local max_score=100
    local score=$((max_score - (CRITICAL_ISSUES * 10)))
    score=$((score < 0 ? 0 : score))
    
    log "${BLUE}=== PUNTUACIÓN DE SALUD ===${NC}"
    
    if [[ $score -ge 90 ]]; then
        log "${GREEN}🟢 Salud del sistema: $score/100 - EXCELENTE${NC}"
    elif [[ $score -ge 70 ]]; then
        log "${YELLOW}🟡 Salud del sistema: $score/100 - ADVERTENCIA${NC}"
    elif [[ $score -ge 50 ]]; then
        log "${YELLOW}🟠 Salud del sistema: $score/100 - PROBLEMAS${NC}"
    else
        log "${RED}🔴 Salud del sistema: $score/100 - CRÍTICO${NC}"
    fi
}

# Main
main() {
    log "${RED}🚨 DIAGNÓSTICO DE EMERGENCIA 🚨${NC}"
    log "${YELLOW}Fecha: $(date)${NC}"
    log "${YELLOW}Sistema: $(uname -a)${NC}"
    log ""
    
    # Ejecutar diagnósticos
    diagnose_docker
    echo
    diagnose_network
    echo
    diagnose_database
    echo
    diagnose_system
    echo
    diagnose_config
    echo
    analyze_logs
    echo
    suggest_fixes
    echo
    generate_health_score
    
    # Tiempo total
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    log ""
    log "${GREEN}✅ DIAGNÓSTICO COMPLETADO EN ${DURATION} SEGUNDOS${NC}"
    log "${YELLOW}📄 Reporte guardado en: $REPORT_FILE${NC}"
    
    # Retornar código de error si hay problemas críticos
    if [[ $CRITICAL_ISSUES -gt 0 ]]; then
        exit 1
    fi
}

# Ejecutar
main "$@"