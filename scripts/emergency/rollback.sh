#!/bin/bash
# Emergency Rollback Script - Rollback en menos de 30 segundos
# Autor: Sara - Emergency Responder
# Objetivo: Restaurar el sistema a un estado conocido estable

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="/volume1/docker/ai-service/backups"
LOG_FILE="/tmp/emergency_rollback_$(date +%Y%m%d_%H%M%S).log"

# Timer
START_TIME=$(date +%s)

# Logging
log() {
    echo -e "${1}" | tee -a "$LOG_FILE"
}

# Verificar si estamos en el NAS
check_environment() {
    if [[ ! -d "/volume1/docker/ai-service" ]]; then
        log "${RED}ERROR: Este script debe ejecutarse en el NAS de producción${NC}"
        exit 1
    fi
}

# Mostrar backups disponibles
list_backups() {
    log "${BLUE}=== BACKUPS DISPONIBLES ===${NC}"
    if [[ -d "$BACKUP_DIR" ]]; then
        ls -lt "$BACKUP_DIR" | grep -E "backup-.*\.tar\.gz" | head -10 | nl
    else
        log "${RED}No se encontraron backups${NC}"
        exit 1
    fi
}

# Detener servicios inmediatamente
emergency_stop() {
    log "${YELLOW}⚡ DETENIENDO TODOS LOS SERVICIOS...${NC}"
    cd /volume1/docker/ai-service
    docker-compose -f docker-compose.production.yml down --timeout 5 || true
    docker stop $(docker ps -q --filter "name=ai-service") 2>/dev/null || true
}

# Rollback rápido
quick_rollback() {
    local backup_file="$1"
    
    log "${YELLOW}⚡ INICIANDO ROLLBACK RÁPIDO...${NC}"
    
    # Backup actual antes de rollback
    if [[ -d "/volume1/docker/ai-service" ]]; then
        local current_backup="/tmp/pre-rollback-$(date +%Y%m%d_%H%M%S).tar.gz"
        tar -czf "$current_backup" -C /volume1/docker/ai-service . 2>/dev/null || true
        log "${GREEN}✓ Backup del estado actual guardado en: $current_backup${NC}"
    fi
    
    # Extraer backup
    log "${YELLOW}⚡ Restaurando desde: $backup_file${NC}"
    cd /volume1/docker
    tar -xzf "$backup_file" --overwrite
    
    # Restaurar permisos
    chown -R k2600x:users /volume1/docker/ai-service
    chmod -R 755 /volume1/docker/ai-service
    
    # Levantar servicios
    cd /volume1/docker/ai-service
    docker-compose -f docker-compose.production.yml up -d
    
    # Verificar servicios
    sleep 5
    docker ps --filter "name=ai-service"
}

# Verificación rápida de salud
health_check() {
    log "${YELLOW}⚡ VERIFICANDO SALUD DEL SISTEMA...${NC}"
    
    # Check Docker containers
    if docker ps | grep -q "ai-service"; then
        log "${GREEN}✓ Contenedores en ejecución${NC}"
    else
        log "${RED}✗ Contenedores NO están en ejecución${NC}"
        return 1
    fi
    
    # Check API endpoint
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health | grep -q "200"; then
        log "${GREEN}✓ API respondiendo${NC}"
    else
        log "${RED}✗ API NO está respondiendo${NC}"
        return 1
    fi
    
    # Check database
    if docker exec ai-service-postgres-1 pg_isready -U postgres >/dev/null 2>&1; then
        log "${GREEN}✓ Base de datos operativa${NC}"
    else
        log "${RED}✗ Base de datos NO responde${NC}"
        return 1
    fi
    
    return 0
}

# Menú principal
main() {
    log "${RED}🚨 SISTEMA DE ROLLBACK DE EMERGENCIA 🚨${NC}"
    log "${YELLOW}Objetivo: Recuperación en < 30 segundos${NC}"
    
    check_environment
    
    # Modo automático si se pasa un archivo como parámetro
    if [[ -n "$1" ]]; then
        if [[ -f "$1" ]]; then
            emergency_stop
            quick_rollback "$1"
        else
            log "${RED}ERROR: Archivo de backup no encontrado: $1${NC}"
            exit 1
        fi
    else
        # Modo interactivo
        list_backups
        
        echo
        read -p "Seleccione número de backup (o 'latest' para el más reciente): " selection
        
        if [[ "$selection" == "latest" ]]; then
            backup_file=$(ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | head -1)
        else
            backup_file=$(ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | sed -n "${selection}p")
        fi
        
        if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
            log "${RED}ERROR: Backup inválido${NC}"
            exit 1
        fi
        
        log "${YELLOW}⚠️  ADVERTENCIA: Se realizará rollback a: $(basename $backup_file)${NC}"
        read -p "¿Continuar? (yes/no): " confirm
        
        if [[ "$confirm" != "yes" ]]; then
            log "${YELLOW}Rollback cancelado${NC}"
            exit 0
        fi
        
        emergency_stop
        quick_rollback "$backup_file"
    fi
    
    # Verificar resultado
    if health_check; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        log "${GREEN}✅ ROLLBACK COMPLETADO EN ${DURATION} SEGUNDOS${NC}"
        log "${GREEN}Sistema restaurado y operativo${NC}"
    else
        log "${RED}❌ ROLLBACK COMPLETADO PERO HAY PROBLEMAS${NC}"
        log "${YELLOW}Ejecute: $SCRIPT_DIR/diagnose.sh para más detalles${NC}"
        exit 1
    fi
}

# Ejecutar
main "$@"