#!/bin/bash
# Pre-Deploy Backup Script - Backup automático antes de cada deploy
# Autor: Sara - Emergency Responder
# Objetivo: Crear backup completo en menos de 30 segundos

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
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup-predeploy-${TIMESTAMP}"

# Timer
START_TIME=$(date +%s)

# Logging
log() {
    echo -e "${1}"
}

# Verificar espacio disponible
check_disk_space() {
    local required_space=$1  # En MB
    local available_space=$(df -m /volume1 | awk 'NR==2 {print $4}')
    
    if [[ $available_space -lt $required_space ]]; then
        log "${RED}ERROR: Espacio insuficiente. Disponible: ${available_space}MB, Requerido: ${required_space}MB${NC}"
        exit 1
    fi
}

# Backup local (desarrollo)
backup_local() {
    log "${BLUE}=== BACKUP LOCAL (DESARROLLO) ===${NC}"
    
    local backup_dir="$PROJECT_ROOT/backups"
    mkdir -p "$backup_dir"
    
    local backup_file="$backup_dir/${BACKUP_NAME}.tar.gz"
    
    # Estimar tamaño
    local size_estimate=$(du -sm "$PROJECT_ROOT" | cut -f1)
    check_disk_space $((size_estimate * 2))
    
    log "${YELLOW}⚡ Creando backup rápido...${NC}"
    
    # Crear backup excluyendo archivos innecesarios
    tar -czf "$backup_file" \
        -C "$PROJECT_ROOT" \
        --exclude='node_modules' \
        --exclude='*.log' \
        --exclude='backups' \
        --exclude='.git' \
        --exclude='*.tar.gz' \
        . &
    
    # Mostrar progreso
    local tar_pid=$!
    while kill -0 $tar_pid 2>/dev/null; do
        printf "."
        sleep 1
    done
    echo
    
    # Guardar metadata
    cat > "$backup_dir/${BACKUP_NAME}.meta" <<EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "type": "pre-deploy",
    "environment": "development",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
    "size": "$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo '0')",
    "files_count": "$(find "$PROJECT_ROOT" -type f | wc -l)",
    "docker_images": $(docker images --format '{{json .}}' | jq -s '.' 2>/dev/null || echo '[]')
}
EOF
    
    log "${GREEN}✓ Backup local creado: $backup_file${NC}"
    log "${GREEN}✓ Tamaño: $(du -h "$backup_file" | cut -f1)${NC}"
    
    # Limpiar backups antiguos (mantener últimos 5)
    ls -t "$backup_dir"/backup-predeploy-*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
}

# Backup remoto (producción)
backup_remote() {
    log "${BLUE}=== BACKUP REMOTO (PRODUCCIÓN) ===${NC}"
    
    # Verificar conexión SSH
    if ! command -v sshpass &> /dev/null; then
        log "${YELLOW}Instalando sshpass...${NC}"
        apt-get update && apt-get install -y sshpass
    fi
    
    # Cargar credenciales
    if [[ -f "$PROJECT_ROOT/.make.env" ]]; then
        source "$PROJECT_ROOT/.make.env"
    else
        log "${RED}ERROR: No se encontró .make.env con credenciales${NC}"
        exit 1
    fi
    
    local backup_dir="/volume1/docker/ai-service/backups"
    local backup_file="$backup_dir/${BACKUP_NAME}.tar.gz"
    
    log "${YELLOW}⚡ Creando backup remoto rápido...${NC}"
    
    # Ejecutar backup en el NAS
    sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no "$NAS_USER@$NAS_HOST" <<EOF
        set -e
        
        # Crear directorio de backups
        mkdir -p "$backup_dir"
        
        # Verificar espacio
        available=\$(df -m /volume1 | awk 'NR==2 {print \$4}')
        if [[ \$available -lt 1000 ]]; then
            echo "ERROR: Espacio insuficiente en NAS"
            exit 1
        fi
        
        # Crear backup
        cd /volume1/docker/ai-service
        tar -czf "$backup_file" \
            --exclude='backups' \
            --exclude='*.log' \
            --exclude='node_modules' \
            .
        
        # Guardar metadata
        cat > "$backup_dir/${BACKUP_NAME}.meta" <<META
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "type": "pre-deploy",
    "environment": "production",
    "docker_containers": \$(docker ps --format '{{json .}}' | jq -s '.'),
    "size": \$(stat -c%s "$backup_file")
}
META
        
        # Limpiar backups antiguos (mantener últimos 10)
        ls -t "$backup_dir"/backup-predeploy-*.tar.gz | tail -n +11 | xargs rm -f || true
        
        echo "✓ Backup remoto creado: $backup_file"
        echo "✓ Tamaño: \$(du -h "$backup_file" | cut -f1)"
EOF
    
    log "${GREEN}✓ Backup remoto completado${NC}"
}

# Verificar backup
verify_backup() {
    local backup_file="$1"
    
    log "${YELLOW}⚡ Verificando integridad del backup...${NC}"
    
    if tar -tzf "$backup_file" >/dev/null 2>&1; then
        log "${GREEN}✓ Backup verificado correctamente${NC}"
        return 0
    else
        log "${RED}✗ Backup corrupto o incompleto${NC}"
        return 1
    fi
}

# Backup rápido de emergencia
emergency_backup() {
    log "${RED}🚨 BACKUP DE EMERGENCIA ULTRA-RÁPIDO 🚨${NC}"
    
    local emergency_dir="/tmp/emergency-backups"
    mkdir -p "$emergency_dir"
    
    local backup_file="$emergency_dir/emergency-${TIMESTAMP}.tar.gz"
    
    # Solo archivos críticos
    tar -czf "$backup_file" \
        -C "$PROJECT_ROOT" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.log' \
        --exclude='backups' \
        src/ \
        docker-compose*.yml \
        Dockerfile* \
        package*.json \
        .env* \
        Makefile* \
        2>/dev/null || true
    
    log "${GREEN}✓ Backup de emergencia: $backup_file${NC}"
    log "${GREEN}✓ Tamaño: $(du -h "$backup_file" | cut -f1)${NC}"
}

# Main
main() {
    log "${BLUE}🔒 SISTEMA DE BACKUP PRE-DEPLOY${NC}"
    log "${YELLOW}Objetivo: Backup completo en < 30 segundos${NC}"
    
    local mode="${1:-auto}"
    
    case "$mode" in
        "local")
            backup_local
            ;;
        "remote")
            backup_remote
            ;;
        "emergency")
            emergency_backup
            ;;
        "auto")
            # Detectar ambiente automáticamente
            if [[ -d "/volume1/docker/ai-service" ]]; then
                backup_remote
            else
                backup_local
            fi
            ;;
        *)
            log "${RED}Modo inválido: $mode${NC}"
            log "Uso: $0 [local|remote|emergency|auto]"
            exit 1
            ;;
    esac
    
    # Calcular tiempo
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    log "${GREEN}✅ BACKUP COMPLETADO EN ${DURATION} SEGUNDOS${NC}"
    
    # Crear enlace simbólico al último backup
    if [[ "$mode" == "local" ]]; then
        ln -sf "$PROJECT_ROOT/backups/${BACKUP_NAME}.tar.gz" "$PROJECT_ROOT/backups/latest.tar.gz"
    fi
}

# Ejecutar
main "$@"