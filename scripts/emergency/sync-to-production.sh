#!/bin/bash
# Script para sincronizar herramientas de emergencia con producción
# Autor: Sara - Emergency Responder

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Cargar credenciales
if [[ -f "$PROJECT_ROOT/.make.env" ]]; then
    source "$PROJECT_ROOT/.make.env"
else
    echo -e "${RED}ERROR: No se encontró .make.env con credenciales${NC}"
    exit 1
fi

# Variables
NAS_HOST="${NAS_HOST:-192.168.1.11}"
NAS_USER="${NAS_USER:-k2600x}"
NAS_PATH="${NAS_PATH:-/volume1/docker/ai-service}"

# Logging
log() {
    echo -e "${1}"
}

# Main
main() {
    log "${BLUE}🔄 SINCRONIZANDO SCRIPTS DE EMERGENCIA CON PRODUCCIÓN${NC}"
    
    # Crear directorio en el NAS
    log "${YELLOW}Creando directorio de scripts en el NAS...${NC}"
    sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no "$NAS_USER@$NAS_HOST" \
        "mkdir -p $NAS_PATH/scripts/emergency"
    
    # Copiar scripts de emergencia
    log "${YELLOW}Copiando scripts de emergencia...${NC}"
    for script in "$SCRIPT_DIR"/*.sh; do
        if [[ -f "$script" ]]; then
            script_name=$(basename "$script")
            log "  - $script_name"
            sshpass -p "$SSHPASS" scp -o StrictHostKeyChecking=no \
                "$script" "$NAS_USER@$NAS_HOST:$NAS_PATH/scripts/emergency/"
        fi
    done
    
    # Copiar runbook
    log "${YELLOW}Copiando runbook de emergencia...${NC}"
    if [[ -f "$PROJECT_ROOT/docs/EMERGENCY_RUNBOOK.md" ]]; then
        sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no "$NAS_USER@$NAS_HOST" \
            "mkdir -p $NAS_PATH/docs"
        sshpass -p "$SSHPASS" scp -o StrictHostKeyChecking=no \
            "$PROJECT_ROOT/docs/EMERGENCY_RUNBOOK.md" "$NAS_USER@$NAS_HOST:$NAS_PATH/docs/"
    fi
    
    # Hacer ejecutables los scripts
    log "${YELLOW}Estableciendo permisos de ejecución...${NC}"
    sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no "$NAS_USER@$NAS_HOST" \
        "chmod +x $NAS_PATH/scripts/emergency/*.sh"
    
    # Crear enlace simbólico para acceso rápido
    log "${YELLOW}Creando enlaces simbólicos para acceso rápido...${NC}"
    sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no "$NAS_USER@$NAS_HOST" <<EOF
        cd $NAS_PATH
        ln -sf scripts/emergency/diagnose.sh diagnose.sh 2>/dev/null || true
        ln -sf scripts/emergency/rollback.sh rollback.sh 2>/dev/null || true
        ln -sf scripts/emergency/pre-deploy-backup.sh backup.sh 2>/dev/null || true
EOF
    
    # Verificar sincronización
    log "${YELLOW}Verificando sincronización...${NC}"
    remote_files=$(sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no "$NAS_USER@$NAS_HOST" \
        "ls -la $NAS_PATH/scripts/emergency/ | wc -l")
    
    log "${GREEN}✅ SINCRONIZACIÓN COMPLETADA${NC}"
    log "${GREEN}Scripts sincronizados: $((remote_files - 3))${NC}"
    log ""
    log "${BLUE}Acceso rápido desde el NAS:${NC}"
    log "  ${GREEN}./diagnose.sh${NC}     - Diagnóstico rápido"
    log "  ${GREEN}./rollback.sh${NC}     - Rollback de emergencia"
    log "  ${GREEN}./backup.sh${NC}       - Backup rápido"
    log ""
    log "${YELLOW}Para ejecutar desde local:${NC}"
    log "  ${GREEN}make prod-emergency-stop${NC}    - Detener todo"
    log "  ${GREEN}make prod-emergency-restore${NC} - Restaurar backup"
    log "  ${GREEN}make emergency-diagnose${NC}     - Diagnóstico remoto"
}

# Ejecutar
main "$@"