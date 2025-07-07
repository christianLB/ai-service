#!/bin/bash
# Claude Deploy Manager - Gestión segura de deployments para Claude

set -euo pipefail

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_LOG="${PROJECT_ROOT}/logs/deployments.log"
ROLLBACK_DIR="${PROJECT_ROOT}/.rollback"

# Crear directorios necesarios
mkdir -p "$(dirname "$DEPLOY_LOG")" "$ROLLBACK_DIR"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$DEPLOY_LOG"
}

# Función para verificar pre-requisitos
check_prerequisites() {
    local env_type=$1
    
    echo -e "${YELLOW}🔍 Verificando pre-requisitos para ${env_type}...${NC}"
    
    # 1. Verificar que no estamos usando secrets directamente
    if grep -r "OPENAI_API_KEY\s*=\s*['\"]sk-" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v node_modules; then
        echo -e "${RED}❌ ERROR: Secrets hardcodeados detectados!${NC}"
        return 1
    fi
    
    # 2. Verificar tests
    echo -e "${YELLOW}Running tests...${NC}"
    if ! npm test -- --passWithNoTests; then
        echo -e "${RED}❌ Tests fallaron${NC}"
        return 1
    fi
    
    # 3. Verificar tipos
    echo -e "${YELLOW}Checking types...${NC}"
    if ! npm run typecheck; then
        echo -e "${RED}❌ Type check falló${NC}"
        return 1
    fi
    
    # 4. Verificar build
    echo -e "${YELLOW}Building...${NC}"
    if ! npm run build; then
        echo -e "${RED}❌ Build falló${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Todos los pre-requisitos pasaron${NC}"
    return 0
}

# Función para crear snapshot antes de deploy
create_rollback_snapshot() {
    local snapshot_id="deploy-$(date +%Y%m%d-%H%M%S)"
    local snapshot_dir="${ROLLBACK_DIR}/${snapshot_id}"
    
    echo -e "${YELLOW}📸 Creando snapshot: ${snapshot_id}${NC}"
    
    mkdir -p "${snapshot_dir}"
    
    # Guardar información del estado actual
    cat > "${snapshot_dir}/info.json" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "git_commit": "$(git rev-parse HEAD)",
    "git_branch": "$(git branch --show-current)",
    "docker_images": $(docker-compose ps --format json 2>/dev/null || echo '[]')
}
EOF
    
    # Backup de configuración actual
    cp docker-compose.yml "${snapshot_dir}/"
    cp -r .env* "${snapshot_dir}/" 2>/dev/null || true
    
    # Guardar lista de contenedores actuales
    docker-compose ps > "${snapshot_dir}/containers.txt"
    
    echo -e "${GREEN}✅ Snapshot creado: ${snapshot_id}${NC}"
    echo "$snapshot_id"
}

# Deploy a development
deploy_development() {
    log "=== INICIANDO DEPLOY A DEVELOPMENT ==="
    
    # Verificar pre-requisitos
    check_prerequisites "development" || return 1
    
    # Crear snapshot
    local snapshot_id=$(create_rollback_snapshot)
    
    echo -e "${YELLOW}🚀 Desplegando a Development...${NC}"
    
    # Usar docker-compose con perfil de desarrollo
    docker-compose --profile dev down
    docker-compose --profile dev build
    docker-compose --profile dev up -d
    
    # Esperar a que los servicios estén listos
    echo -e "${YELLOW}⏳ Esperando servicios...${NC}"
    sleep 10
    
    # Verificar salud
    if curl -f http://localhost:3010/status > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Deploy a Development exitoso!${NC}"
        log "Deploy development exitoso - snapshot: ${snapshot_id}"
        return 0
    else
        echo -e "${RED}❌ Deploy falló - iniciando rollback${NC}"
        rollback_deployment "$snapshot_id"
        return 1
    fi
}

# Deploy a production (con más validaciones)
deploy_production() {
    log "=== INICIANDO DEPLOY A PRODUCTION ==="
    
    echo -e "${RED}⚠️  ADVERTENCIA: Estás por deployar a PRODUCCIÓN${NC}"
    echo -e "${YELLOW}¿Estás seguro? (escribe 'DEPLOY' para confirmar)${NC}"
    read -r confirmation
    
    if [[ "$confirmation" != "DEPLOY" ]]; then
        echo -e "${YELLOW}Deploy cancelado${NC}"
        return 0
    fi
    
    # Verificar pre-requisitos con validaciones extra
    check_prerequisites "production" || return 1
    
    # Validaciones adicionales para producción
    echo -e "${YELLOW}🔒 Validaciones adicionales de producción...${NC}"
    
    # Verificar que estamos en main/master
    local current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "main" && "$current_branch" != "master" ]]; then
        echo -e "${RED}❌ ERROR: Solo se puede deployar desde main/master${NC}"
        return 1
    fi
    
    # Verificar que no hay cambios sin commitear
    if [[ -n $(git status --porcelain) ]]; then
        echo -e "${RED}❌ ERROR: Hay cambios sin commitear${NC}"
        return 1
    fi
    
    # Crear snapshot
    local snapshot_id=$(create_rollback_snapshot)
    
    echo -e "${YELLOW}🚀 Desplegando a Producción...${NC}"
    
    # Build de producción
    docker-compose -f docker-compose.yml build --no-cache ai-service
    
    # Deploy con zero-downtime (si es posible)
    echo -e "${YELLOW}Iniciando nuevo contenedor...${NC}"
    docker-compose up -d --no-deps --scale ai-service=2 ai-service
    
    # Esperar a que el nuevo contenedor esté listo
    sleep 15
    
    # Verificar salud del nuevo contenedor
    if curl -f http://localhost:3000/status > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Nuevo contenedor saludable${NC}"
        
        # Detener contenedor antiguo
        docker-compose up -d --no-deps --scale ai-service=1 ai-service
        
        echo -e "${GREEN}✅ Deploy a Producción exitoso!${NC}"
        log "Deploy production exitoso - snapshot: ${snapshot_id}"
        
        # Notificar (si hay webhook configurado)
        notify_deployment "production" "success" "$snapshot_id"
        
        return 0
    else
        echo -e "${RED}❌ Deploy falló - iniciando rollback${NC}"
        rollback_deployment "$snapshot_id"
        notify_deployment "production" "failed" "$snapshot_id"
        return 1
    fi
}

# Función de rollback
rollback_deployment() {
    local snapshot_id=$1
    local snapshot_dir="${ROLLBACK_DIR}/${snapshot_id}"
    
    echo -e "${YELLOW}🔄 Iniciando rollback a: ${snapshot_id}${NC}"
    log "Iniciando rollback a snapshot: ${snapshot_id}"
    
    if [[ ! -d "$snapshot_dir" ]]; then
        echo -e "${RED}❌ Snapshot no encontrado: ${snapshot_id}${NC}"
        return 1
    fi
    
    # Restaurar configuración
    cp "${snapshot_dir}/docker-compose.yml" .
    
    # Reiniciar servicios con configuración anterior
    docker-compose down
    docker-compose up -d
    
    echo -e "${GREEN}✅ Rollback completado${NC}"
    log "Rollback completado a: ${snapshot_id}"
}

# Conectar a base de datos de forma segura
connect_database() {
    local env_type=$1
    local db_type=${2:-postgres}  # postgres o redis
    
    echo -e "${YELLOW}🔗 Conectando a ${db_type} en ${env_type}...${NC}"
    
    # Cargar environment seguro
    source "${PROJECT_ROOT}/scripts/secure-env-manager.sh"
    load_secure_env "$env_type" || return 1
    
    case "$db_type" in
        postgres)
            if [[ "$env_type" == "production" ]]; then
                echo -e "${YELLOW}⚠️  Conectando a BD de PRODUCCIÓN (solo lectura recomendado)${NC}"
            fi
            docker-compose exec postgres psql -U ai_user -d ai_service
            ;;
        redis)
            docker-compose exec redis redis-cli -a "$REDIS_PASSWORD"
            ;;
        *)
            echo -e "${RED}Tipo de BD no soportado: ${db_type}${NC}"
            return 1
            ;;
    esac
}

# Función para notificar deployments
notify_deployment() {
    local env_type=$1
    local status=$2
    local snapshot_id=$3
    
    # Si hay webhook configurado, enviar notificación
    if [[ -n "${DEPLOY_WEBHOOK_URL:-}" ]]; then
        curl -X POST "${DEPLOY_WEBHOOK_URL}" \
            -H "Content-Type: application/json" \
            -d "{
                \"environment\": \"${env_type}\",
                \"status\": \"${status}\",
                \"snapshot\": \"${snapshot_id}\",
                \"timestamp\": \"$(date -Iseconds)\",
                \"deployer\": \"Claude Deploy Manager\"
            }" 2>/dev/null || true
    fi
}

# Ver historial de deployments
deployment_history() {
    echo -e "${BLUE}📜 Historial de Deployments:${NC}"
    echo ""
    
    if [[ -f "$DEPLOY_LOG" ]]; then
        tail -n 20 "$DEPLOY_LOG" | grep -E "(DEPLOY|rollback)" | while read -r line; do
            if [[ "$line" == *"exitoso"* ]]; then
                echo -e "${GREEN}✅ $line${NC}"
            elif [[ "$line" == *"falló"* || "$line" == *"rollback"* ]]; then
                echo -e "${RED}❌ $line${NC}"
            else
                echo "$line"
            fi
        done
    else
        echo "No hay historial de deployments"
    fi
}

# Main
case "${1:-help}" in
    dev|development)
        deploy_development
        ;;
    prod|production)
        deploy_production
        ;;
    rollback)
        rollback_deployment "${2}"
        ;;
    db|database)
        connect_database "${2:-development}" "${3:-postgres}"
        ;;
    history)
        deployment_history
        ;;
    test)
        check_prerequisites "${2:-development}"
        ;;
    help|*)
        cat << EOF
${BLUE}🚀 Claude Deploy Manager${NC}

Uso: $0 <comando> [opciones]

Comandos:
  dev              - Deploy a development
  prod             - Deploy a production (requiere confirmación)
  rollback <id>    - Rollback a un snapshot anterior
  db <env> [tipo]  - Conectar a base de datos (postgres/redis)
  history          - Ver historial de deployments
  test [env]       - Solo ejecutar validaciones pre-deploy
  help             - Mostrar esta ayuda

Ejemplos:
  $0 dev                    # Deploy a development
  $0 prod                   # Deploy a production
  $0 db production postgres # Conectar a BD de producción
  $0 rollback deploy-20250106-143022

Seguridad:
  - Los secrets NUNCA se incluyen en logs
  - Producción requiere confirmación explícita
  - Todos los deploys crean snapshots para rollback
  - Las conexiones a BD usan environments seguros

Logs: ${DEPLOY_LOG}
Snapshots: ${ROLLBACK_DIR}
EOF
        ;;
esac