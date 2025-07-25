# 🚀 PLAN DE MODERNIZACIÓN REFINADO - AI SERVICE
## Para Synology DSM 420+ (10GB RAM) con Builds Externalizados

## 📋 RESUMEN EJECUTIVO

Este documento adapta el plan de modernización considerando las limitaciones del hardware Synology DSM 420+ y aprovecha servicios externos para builds y CI/CD, manteniendo solo el runtime en el NAS.

### 🎯 Objetivos Adaptados

1. **Externalizar builds pesados** - GitHub Actions para CI/CD
2. **Runtime optimizado** - Solo contenedores ligeros en el NAS
3. **Gestión eficiente de recursos** - Máximo 8GB RAM para servicios
4. **Rollback local rápido** - Usando Docker tags locales
5. **Observabilidad ligera** - Métricas esenciales sin overhead

## 🏗️ ARQUITECTURA HÍBRIDA PROPUESTA

### ✅ División de Responsabilidades

```
EXTERNOS (GitHub/Cloud):
- Build de imágenes
- Ejecución de tests
- Security scanning
- Push a registry
- Análisis de código

NAS (Runtime Only):
- Pull de imágenes
- Ejecución de contenedores
- Base de datos PostgreSQL
- Logs locales
- Backups automáticos
```

### 📐 FLUJO DE DEPLOYMENT OPTIMIZADO

```
Developer → GitHub → GitHub Actions → Docker Hub → NAS Pull → Deploy
                          ↓
                    Tests + Build
                          ↓
                    Security Scan
```

## 🔧 CONFIGURACIÓN ESPECÍFICA PARA NAS

### 1. ESTRUCTURA SIMPLIFICADA

```
ai-service/
├── .github/
│   └── workflows/
│       ├── build-and-test.yml    # Build externo
│       └── notify-deploy.yml      # Notifica al NAS
├── deploy/
│   ├── nas/
│   │   ├── docker-compose.yml    # Runtime config
│   │   ├── .env.template         # Variables
│   │   └── update.sh             # Script pull & deploy
│   └── backup/
│       └── backup-strategy.sh    # Backup automático
├── monitoring/
│   └── lightweight/
│       ├── health-check.sh       # Checks básicos
│       └── metrics-exporter.sh   # Métricas mínimas
└── scripts/
    └── nas-deploy.sh             # Deploy desde CI/CD
```

### 2. DOCKER COMPOSE OPTIMIZADO PARA NAS

```yaml
# deploy/nas/docker-compose.yml
version: '3.8'

services:
  ai-service:
    image: ghcr.io/your-org/ai-service:${VERSION:-latest}
    container_name: ai-service
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NODE_OPTIONS=--max-old-space-size=1024
      - DATABASE_URL=postgres://user:pass@postgres:5432/ai_service
    volumes:
      - ./data:/app/data:ro
      - ./config:/app/config:ro
    mem_limit: 2g
    memswap_limit: 2g
    cpus: 2
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:15-alpine
    container_name: ai-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=ai_service
      - POSTGRES_USER=ai_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_INITDB_ARGS=--encoding=UTF8
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init:/docker-entrypoint-initdb.d:ro
    mem_limit: 3g
    memswap_limit: 3g
    cpus: 1.5
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ai_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Monitoring mínimo
  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    mem_limit: 128m
    cpus: 0.1

volumes:
  postgres_data:
    driver: local

networks:
  default:
    driver: bridge
```

### 3. GITHUB ACTIONS PARA BUILD EXTERNO

```yaml
# .github/workflows/build-and-test.yml
name: Build and Push

on:
  push:
    branches: [main, develop]
    tags: ['v*']

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Build and test
        run: |
          # Build test image
          docker build --target tester -t test-image .
          # Run tests
          docker run --rm test-image
          
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix={{branch}}-
            
      - name: Build and push production image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          target: production
          
      - name: Notify NAS for deployment
        if: github.ref == 'refs/heads/main'
        run: |
          curl -X POST https://your-nas-webhook/deploy \
            -H "Authorization: Bearer ${{ secrets.NAS_DEPLOY_TOKEN }}" \
            -d '{"image":"${{ steps.meta.outputs.tags }}","version":"${{ github.sha }}"}'
```

### 4. SCRIPT DE DEPLOYMENT PARA NAS

```bash
#!/bin/bash
# scripts/nas-deploy.sh

set -euo pipefail

# Configuración
COMPOSE_FILE="/volume1/docker/ai-service/docker-compose.yml"
ENV_FILE="/volume1/docker/ai-service/.env"
BACKUP_DIR="/volume1/docker/ai-service/backups"
MAX_BACKUPS=5

# Funciones
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

backup_current() {
    log "Creating backup..."
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    docker commit ai-service "${backup_name}"
    docker tag "${backup_name}" "ai-service:backup-latest"
    
    # Limpiar backups antiguos
    docker images --format "{{.Repository}}:{{.Tag}}" | \
        grep "^backup-" | \
        sort -r | \
        tail -n +$((MAX_BACKUPS + 1)) | \
        xargs -r docker rmi
}

health_check() {
    log "Running health check..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log "Health check passed"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    log "Health check failed"
    return 1
}

deploy() {
    local new_version="${1:-latest}"
    
    log "Starting deployment of version: $new_version"
    
    # Backup actual
    backup_current
    
    # Actualizar versión
    sed -i "s/VERSION=.*/VERSION=$new_version/" "$ENV_FILE"
    
    # Pull nueva imagen
    log "Pulling new image..."
    docker-compose -f "$COMPOSE_FILE" pull ai-service
    
    # Deploy con zero-downtime
    log "Starting new container..."
    docker-compose -f "$COMPOSE_FILE" up -d --no-deps --scale ai-service=2 ai-service
    
    # Esperar health check
    if health_check; then
        log "Deployment successful, cleaning up old container..."
        docker-compose -f "$COMPOSE_FILE" up -d --no-deps --remove-orphans ai-service
    else
        log "Deployment failed, rolling back..."
        docker-compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate \
            --scale ai-service=1 ai-service
        docker tag "ai-service:backup-latest" "ai-service:current"
        exit 1
    fi
    
    log "Deployment completed successfully"
}

# Main
case "${1:-deploy}" in
    deploy)
        deploy "${2:-latest}"
        ;;
    rollback)
        log "Rolling back to previous version..."
        docker tag "ai-service:backup-latest" "ai-service:current"
        docker-compose -f "$COMPOSE_FILE" up -d --force-recreate ai-service
        ;;
    status)
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status} [version]"
        exit 1
        ;;
esac
```

### 5. MAKEFILES ADAPTADOS PARA NAS

```makefile
# Makefile.nas - Comandos específicos para NAS

# Configuración
include .make.env
NAS_DEPLOY_SCRIPT := scripts/nas-deploy.sh

.PHONY: nas-deploy
nas-deploy: ## Deploy to NAS
	@echo "🚀 Deploying to NAS..."
	@sshpass -p "$(SSHPASS)" ssh $(NAS_USER)@$(NAS_HOST) \
		"cd $(NAS_PATH) && ./deploy/nas/update.sh deploy $(VERSION)"

.PHONY: nas-rollback
nas-rollback: ## Rollback on NAS
	@echo "⏮️ Rolling back on NAS..."
	@sshpass -p "$(SSHPASS)" ssh $(NAS_USER)@$(NAS_HOST) \
		"cd $(NAS_PATH) && ./deploy/nas/update.sh rollback"

.PHONY: nas-status
nas-status: ## Check NAS deployment status
	@echo "📊 NAS Status:"
	@sshpass -p "$(SSHPASS)" ssh $(NAS_USER)@$(NAS_HOST) \
		"cd $(NAS_PATH) && docker-compose ps"

.PHONY: nas-logs
nas-logs: ## View NAS logs
	@sshpass -p "$(SSHPASS)" ssh $(NAS_USER)@$(NAS_HOST) \
		"cd $(NAS_PATH) && docker-compose logs -f --tail=100"

.PHONY: nas-resources
nas-resources: ## Check NAS resource usage
	@echo "💾 NAS Resources:"
	@sshpass -p "$(SSHPASS)" ssh $(NAS_USER)@$(NAS_HOST) \
		"docker stats --no-stream"

.PHONY: nas-backup
nas-backup: ## Create NAS backup
	@echo "💼 Creating backup..."
	@sshpass -p "$(SSHPASS)" ssh $(NAS_USER)@$(NAS_HOST) \
		"cd $(NAS_PATH) && ./deploy/backup/backup-strategy.sh"
```

## 📊 RECURSOS Y LIMITACIONES

### Distribución de Memoria (10GB Total)

```
Sistema Synology DSM: ~1.5GB
PostgreSQL:          3GB (con buffer pool)
AI Service:          2GB (Node.js optimizado)
Monitoring:          256MB (node-exporter + logs)
Docker overhead:     512MB
Buffer/Cache:        2.7GB
```

### Límites de CPU

```
PostgreSQL:    1.5 cores
AI Service:    2 cores
Monitoring:    0.1 cores
Reserva:       0.4 cores
```

## 🚨 MONITOREO LIGERO

### Script de Monitoreo Básico

```bash
#!/bin/bash
# monitoring/lightweight/monitor.sh

# Métricas básicas cada minuto
while true; do
    {
        echo "# HELP system_memory_usage Memory usage in MB"
        echo "# TYPE system_memory_usage gauge"
        free -m | awk 'NR==2{printf "system_memory_usage %s\n", $3}'
        
        echo "# HELP container_health Container health status"
        echo "# TYPE container_health gauge"
        docker ps --format "table {{.Names}}\t{{.Status}}" | \
            tail -n +2 | \
            while read name status; do
                if [[ $status == *"healthy"* ]]; then
                    echo "container_health{name=\"$name\"} 1"
                else
                    echo "container_health{name=\"$name\"} 0"
                fi
            done
    } > /tmp/metrics.prom
    
    sleep 60
done
```

## 👥 PERSONAS Y ROLES PARA CLAUDE.md

### Definición de Agentes Especializados

```markdown
## 🤖 AGENTES ESPECIALIZADOS

### 1. 🏗️ DevOps Architect (Anna)
**Personalidad**: Meticulosa, orientada a la estabilidad
**Expertise**: 
- Infraestructura en NAS limitados
- Optimización de recursos
- Docker y containerización

**Responsabilidades**:
- Diseñar arquitectura dentro de límites de hardware
- Optimizar consumo de recursos
- Definir estrategias de deployment

**Frases típicas**:
- "¿Esto cabe en 10GB de RAM?"
- "Necesitamos externalizar este proceso"
- "El NAS no es un servidor de builds"

### 2. 🔧 CI/CD Engineer (Carlos)
**Personalidad**: Pragmático, automatizador compulsivo
**Expertise**:
- GitHub Actions
- Build optimization
- Pipeline automation

**Responsabilidades**:
- Configurar pipelines externos
- Optimizar tiempos de build
- Integrar con el NAS

**Frases típicas**:
- "Si es manual, lo automatizo"
- "Los builds van en GitHub, no en el NAS"
- "¿Por qué tardó más de 5 minutos?"

### 3. 🛡️ Security Guardian (Elena)
**Personalidad**: Paranoica profesional, zero-trust
**Expertise**:
- Container security
- Secrets management
- Network isolation

**Responsabilidades**:
- Escaneo de vulnerabilidades
- Gestión de secretos
- Políticas de seguridad

**Frases típicas**:
- "¿Está este secreto en texto plano?"
- "Necesitamos escanear esa imagen"
- "El principio de menor privilegio"

### 4. 📊 Performance Monitor (Miguel)
**Personalidad**: Obsesivo con las métricas
**Expertise**:
- Resource optimization
- Performance tuning
- Monitoring minimal

**Responsabilidades**:
- Monitorear uso de recursos
- Optimizar performance
- Alertas tempranas

**Frases típicas**:
- "Estamos al 80% de RAM"
- "Este query consume demasiado"
- "Necesitamos métricas, no logs"

### 5. 🚑 Emergency Responder (Sara)
**Personalidad**: Calmada bajo presión
**Expertise**:
- Incident response
- Quick rollbacks
- Root cause analysis

**Responsabilidades**:
- Respuesta a incidentes
- Rollbacks rápidos
- Post-mortems

**Frases típicas**:
- "Primero estabilizar, luego investigar"
- "Tengo un backup de hace 5 minutos"
- "¿Cuál fue el último cambio?"

## USO DE AGENTES EN CONVERSACIONES

Cuando trabajas en diferentes aspectos del proyecto, adopta la personalidad del agente correspondiente:

**Ejemplo de uso**:
```
Usuario: "Necesito configurar el CI/CD"
Claude (como Carlos): "¡Perfecto! Como Carlos, el CI/CD Engineer, te voy a configurar un pipeline que build en GitHub Actions y solo despliega al NAS. Recuerda: el NAS es para runtime, no para builds..."
```
```

## 📅 CRONOGRAMA ADAPTADO

### Semana 1: Preparación
- [ ] Configurar GitHub Actions
- [ ] Crear registry en GitHub Packages
- [ ] Preparar estructura en NAS
- [ ] Backup completo actual

### Semana 2: Migración
- [ ] Migrar builds a GitHub
- [ ] Configurar webhook NAS
- [ ] Implementar deploy script
- [ ] Tests de integración

### Semana 3: Optimización
- [ ] Afinar límites de recursos
- [ ] Implementar monitoreo ligero
- [ ] Documentar procedimientos
- [ ] Training del equipo

### Semana 4: Producción
- [ ] Deploy final
- [ ] Monitoreo intensivo
- [ ] Ajustes finales
- [ ] Documentación completa

## 🎯 MÉTRICAS DE ÉXITO AJUSTADAS

1. **Build Time**: < 5 min (en GitHub, no en NAS)
2. **Deploy Time**: < 2 min (solo pull y restart)
3. **Memory Usage**: < 8GB total
4. **CPU Usage**: < 80% sostenido
5. **Uptime**: 99.5% (considerando límites hardware)

## ⚠️ CONSIDERACIONES ESPECIALES NAS

### Lo que NO hacer en el NAS:
- ❌ Builds de código
- ❌ Tests pesados
- ❌ Análisis de seguridad
- ❌ Compilación de assets
- ❌ Procesamiento intensivo

### Lo que SÍ hacer en el NAS:
- ✅ Ejecutar contenedores
- ✅ Servir la aplicación
- ✅ Base de datos
- ✅ Backups locales
- ✅ Logs esenciales

## 🔄 ESTRATEGIA DE BACKUP

```bash
#!/bin/bash
# deploy/backup/backup-strategy.sh

# Backup diario automático
BACKUP_PATH="/volume1/backup/ai-service"
RETENTION_DAYS=7

# Database backup
docker exec ai-postgres pg_dump -U ai_user ai_service | \
    gzip > "$BACKUP_PATH/db-$(date +%Y%m%d-%H%M%S).sql.gz"

# Application data
tar -czf "$BACKUP_PATH/app-data-$(date +%Y%m%d-%H%M%S).tar.gz" \
    /volume1/docker/ai-service/data

# Cleanup old backups
find "$BACKUP_PATH" -name "*.gz" -mtime +$RETENTION_DAYS -delete

# Sync to external (opcional)
# rsync -av "$BACKUP_PATH/" "backup-server:/backups/ai-service/"
```

## 📝 CONCLUSIÓN

Este plan refinado reconoce las limitaciones del Synology DSM 420+ y las convierte en ventajas:
- Builds externalizados = NAS más estable
- Recursos limitados = Optimización forzada
- Arquitectura simple = Menos puntos de fallo

El éxito depende de respetar los límites del hardware y usar servicios externos para tareas pesadas.

---

**Última actualización**: 2025-07-09
**Hardware target**: Synology DSM 420+ (10GB RAM)
**Filosofía**: "El NAS es para servir, no para construir"