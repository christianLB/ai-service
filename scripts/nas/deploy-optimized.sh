#!/bin/bash

# Script de deployment optimizado para Synology NAS
# Hardware: DS420+ con 10GB RAM
# Objetivo: Deployment eficiente con mínimo downtime

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
NAS_HOST="${NAS_HOST:-192.168.1.11}"
NAS_USER="${NAS_USER:-k2600x}"
NAS_PATH="${NAS_PATH:-/volume1/docker/ai-service}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-k2600x}"
IMAGE_NAME="ai-service"
IMAGE_TAG="${IMAGE_TAG:-production}"

# Archivo de log
LOG_FILE="deploy-$(date +%Y%m%d-%H%M%S).log"

# Función de logging
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

# Función para verificar requisitos
check_requirements() {
    log "INFO" "${BLUE}Verificando requisitos...${NC}"
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        log "ERROR" "${RED}Docker no está instalado${NC}"
        exit 1
    fi
    
    # Verificar SSH
    if ! command -v ssh &> /dev/null; then
        log "ERROR" "${RED}SSH no está instalado${NC}"
        exit 1
    fi
    
    # Verificar conexión al NAS
    if ! ssh -o ConnectTimeout=5 "${NAS_USER}@${NAS_HOST}" "echo 'OK'" &> /dev/null; then
        log "ERROR" "${RED}No se puede conectar al NAS${NC}"
        exit 1
    fi
    
    log "INFO" "${GREEN}Requisitos verificados${NC}"
}

# Función para construir imagen optimizada
build_optimized_image() {
    log "INFO" "${BLUE}Construyendo imagen optimizada...${NC}"
    
    # Crear Dockerfile temporal optimizado
    cat > Dockerfile.optimized << 'EOF'
# Build stage - Imagen más pequeña posible
FROM node:20-alpine AS builder

# Instalar dependencias de build
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar código fuente
COPY . .

# Build TypeScript
RUN npm run build && \
    rm -rf src/ tests/ *.ts tsconfig.json

# Runtime stage - Imagen ultra-ligera
FROM node:20-alpine

# Instalar solo lo esencial
RUN apk add --no-cache \
    tini \
    curl \
    && rm -rf /var/cache/apk/*

# Usuario no root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copiar desde builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist
COPY --from=builder --chown=nodejs:nodejs /app/config ./config
COPY --from=builder --chown=nodejs:nodejs /app/scripts ./scripts

# Crear directorios necesarios
RUN mkdir -p logs data/documents && \
    chown -R nodejs:nodejs logs data

# Configurar para producción
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"

USER nodejs

EXPOSE 3001 9090

# Healthcheck optimizado
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Usar tini para manejo correcto de señales
ENTRYPOINT ["/sbin/tini", "--"]

# Comando optimizado
CMD ["node", "--enable-source-maps", "dist/index.js"]
EOF

    # Build con cache y optimizaciones
    docker build \
        --cache-from "${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        -t "${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" \
        -f Dockerfile.optimized \
        . || {
        log "ERROR" "${RED}Error construyendo imagen${NC}"
        exit 1
    }
    
    # Limpiar Dockerfile temporal
    rm -f Dockerfile.optimized
    
    # Mostrar tamaño de imagen
    local size=$(docker images "${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" --format "{{.Size}}")
    log "INFO" "${GREEN}Imagen construida: ${size}${NC}"
}

# Función para push a registry
push_to_registry() {
    log "INFO" "${BLUE}Subiendo imagen al registry...${NC}"
    
    docker push "${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" || {
        log "ERROR" "${RED}Error subiendo imagen${NC}"
        exit 1
    }
    
    log "INFO" "${GREEN}Imagen subida exitosamente${NC}"
}

# Función para preparar NAS
prepare_nas() {
    log "INFO" "${BLUE}Preparando NAS...${NC}"
    
    # Crear estructura de directorios
    ssh "${NAS_USER}@${NAS_HOST}" << EOF
        set -e
        
        # Crear directorios
        mkdir -p ${NAS_PATH}/{data/{postgres,redis,documents,monitor},logs,backups,config}
        
        # Establecer permisos
        chmod -R 755 ${NAS_PATH}
        
        echo "Directorios creados"
EOF
    
    # Copiar archivos de configuración
    scp -r deploy/nas/* "${NAS_USER}@${NAS_HOST}:${NAS_PATH}/"
    scp -r config/* "${NAS_USER}@${NAS_HOST}:${NAS_PATH}/config/"
    scp -r scripts/nas/* "${NAS_USER}@${NAS_HOST}:${NAS_PATH}/scripts/"
    
    log "INFO" "${GREEN}NAS preparado${NC}"
}

# Función para crear backup
create_backup() {
    log "INFO" "${BLUE}Creando backup...${NC}"
    
    ssh "${NAS_USER}@${NAS_HOST}" << EOF
        set -e
        cd ${NAS_PATH}
        
        # Verificar si hay servicios corriendo
        if docker-compose -f docker-compose.optimized.yml ps | grep -q "Up"; then
            # Crear backup de base de datos
            docker-compose -f docker-compose.optimized.yml exec -T postgres \
                pg_dump -U \${DB_USER:-ai_user} ai_service | \
                gzip > backups/backup-$(date +%Y%m%d-%H%M%S).sql.gz
            
            echo "Backup creado"
        else
            echo "No hay servicios activos, saltando backup"
        fi
EOF
    
    log "INFO" "${GREEN}Backup completado${NC}"
}

# Función para deployment con zero downtime
deploy_zero_downtime() {
    log "INFO" "${BLUE}Iniciando deployment zero-downtime...${NC}"
    
    ssh "${NAS_USER}@${NAS_HOST}" << EOF
        set -e
        cd ${NAS_PATH}
        
        # Pull nueva imagen
        docker pull ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
        
        # Verificar estado actual
        CURRENT_STATUS=\$(docker-compose -f docker-compose.optimized.yml ps -q ai-service)
        
        if [ -n "\$CURRENT_STATUS" ]; then
            # Deployment con rolling update
            log "INFO" "Realizando rolling update..."
            
            # Escalar a 2 instancias
            docker-compose -f docker-compose.optimized.yml up -d --scale ai-service=2 --no-recreate
            
            # Esperar a que la nueva instancia esté healthy
            sleep 30
            
            # Detener instancia vieja
            docker-compose -f docker-compose.optimized.yml up -d --scale ai-service=1
            
            # Remover contenedores viejos
            docker-compose -f docker-compose.optimized.yml up -d --remove-orphans
        else
            # Primera vez, solo levantar servicios
            docker-compose -f docker-compose.optimized.yml up -d
        fi
        
        # Verificar salud
        sleep 10
        docker-compose -f docker-compose.optimized.yml ps
EOF
    
    log "INFO" "${GREEN}Deployment completado${NC}"
}

# Función para verificar deployment
verify_deployment() {
    log "INFO" "${BLUE}Verificando deployment...${NC}"
    
    # Esperar a que servicios estén listos
    sleep 30
    
    # Verificar servicios
    local services=("postgres:5432" "redis:6379" "ai-service:3001" "nginx:80")
    
    for service in "${services[@]}"; do
        local name="${service%%:*}"
        local port="${service##*:}"
        
        if curl -s -o /dev/null "http://${NAS_HOST}:${port}"; then
            log "INFO" "${GREEN}✓ ${name} respondiendo en puerto ${port}${NC}"
        else
            log "WARN" "${YELLOW}✗ ${name} no responde en puerto ${port}${NC}"
        fi
    done
    
    # Verificar health endpoint
    local health_response=$(curl -s "http://${NAS_HOST}:3001/health")
    if [[ "$health_response" == *"ok"* ]]; then
        log "INFO" "${GREEN}✓ Health check OK${NC}"
    else
        log "ERROR" "${RED}✗ Health check falló${NC}"
        exit 1
    fi
    
    # Verificar métricas
    if curl -s "http://${NAS_HOST}:9090/metrics" | grep -q "nodejs_version_info"; then
        log "INFO" "${GREEN}✓ Métricas disponibles${NC}"
    else
        log "WARN" "${YELLOW}✗ Métricas no disponibles${NC}"
    fi
    
    log "INFO" "${GREEN}Verificación completada${NC}"
}

# Función para limpiar recursos
cleanup_resources() {
    log "INFO" "${BLUE}Limpiando recursos...${NC}"
    
    # Limpiar imágenes locales no usadas
    docker image prune -f
    
    # Limpiar en el NAS
    ssh "${NAS_USER}@${NAS_HOST}" << EOF
        set -e
        
        # Limpiar imágenes viejas
        docker image prune -f
        
        # Limpiar volúmenes no usados
        docker volume prune -f
        
        # Limpiar logs antiguos (más de 7 días)
        find ${NAS_PATH}/logs -name "*.log" -mtime +7 -delete
        
        echo "Limpieza completada"
EOF
    
    log "INFO" "${GREEN}Recursos limpiados${NC}"
}

# Función principal
main() {
    log "INFO" "${BLUE}=== Iniciando deployment optimizado para NAS ===${NC}"
    
    # Verificar modo
    MODE="${1:-full}"
    
    case "$MODE" in
        "full")
            check_requirements
            build_optimized_image
            push_to_registry
            prepare_nas
            create_backup
            deploy_zero_downtime
            verify_deployment
            cleanup_resources
            ;;
        "quick")
            check_requirements
            deploy_zero_downtime
            verify_deployment
            ;;
        "build")
            check_requirements
            build_optimized_image
            push_to_registry
            ;;
        "verify")
            verify_deployment
            ;;
        *)
            echo "Uso: $0 [full|quick|build|verify]"
            echo "  full   - Deployment completo (default)"
            echo "  quick  - Solo actualizar servicios"
            echo "  build  - Solo construir y subir imagen"
            echo "  verify - Solo verificar estado"
            exit 1
            ;;
    esac
    
    log "INFO" "${GREEN}=== Deployment completado exitosamente ===${NC}"
    
    # Mostrar resumen
    echo -e "\n${BLUE}Resumen del deployment:${NC}"
    echo -e "  ${GREEN}✓${NC} Imagen: ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    echo -e "  ${GREEN}✓${NC} NAS: ${NAS_HOST}"
    echo -e "  ${GREEN}✓${NC} URL: http://${NAS_HOST}"
    echo -e "  ${GREEN}✓${NC} Logs: ${LOG_FILE}"
}

# Manejo de errores
trap 'log "ERROR" "${RED}Error en línea $LINENO${NC}"' ERR

# Ejecutar
main "$@"