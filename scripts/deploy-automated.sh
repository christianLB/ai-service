#!/bin/bash
# Script de deployment completamente automatizado

set -e

# Configuración
source .make.env
NAS_HOST="${NAS_HOST:-192.168.1.11}"
NAS_USER="${NAS_USER:-k2600x}"
NAS_PATH="${NAS_PATH:-/volume1/docker/ai-service}"
DB_NAME="${DB_NAME:-ai_service}"
DB_USER="${DB_USER:-ai_user}"
CONTAINER_NAME="${CONTAINER_NAME:-ai-postgres}"

echo "🚀 Deployment automatizado iniciando..."

# Función para ejecutar comandos en el NAS
remote_exec() {
    sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no ${NAS_USER}@${NAS_HOST} "$@"
}

# Función para ejecutar comandos con sudo en el NAS
remote_sudo() {
    sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no ${NAS_USER}@${NAS_HOST} "echo '$SUDO_PASS' | sudo -S $@"
}

# 1. Copiar archivos necesarios via SCP (evita problemas de permisos SMB)
echo "📋 Copiando archivos al NAS..."
sshpass -p "$SSHPASS" scp -o StrictHostKeyChecking=no \
    scripts/complete-production-schema.sql \
    config/init-db-production-clean.sql \
    ${NAS_USER}@${NAS_HOST}:${NAS_PATH}/config/

# 2. Detener servicios
echo "🛑 Deteniendo servicios..."
remote_sudo "cd ${NAS_PATH} && docker-compose -f docker-compose.production.yml down"

# 3. Backup de datos actuales (por si acaso)
echo "💾 Creando backup..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
remote_sudo "mkdir -p ${NAS_PATH}/backups"
remote_sudo "cd ${NAS_PATH} && tar -czf backups/postgres-backup-${TIMESTAMP}.tar.gz postgres-data/ || true"

# 4. Limpiar datos de PostgreSQL
echo "🧹 Limpiando datos de PostgreSQL..."
remote_sudo "rm -rf ${NAS_PATH}/postgres-data/*"

# 5. Actualizar docker-compose para incluir scripts de inicialización
echo "📝 Actualizando docker-compose..."
remote_exec "cd ${NAS_PATH} && cp docker-compose.production.yml docker-compose.production.yml.bak"

# Crear un docker-compose temporal con los volúmenes de init
remote_exec "cat > /tmp/docker-compose-init.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: ${CONTAINER_NAME}
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
    ports:
      - \"5432:5432\"
    volumes:
      - ${NAS_PATH}/postgres-data:/var/lib/postgresql/data
      - ${NAS_PATH}/config/init-db-production-clean.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
      - ${NAS_PATH}/config/complete-production-schema.sql:/docker-entrypoint-initdb.d/02-schema.sql:ro
    networks:
      - ai-network

networks:
  ai-network:
    driver: bridge
EOF"

# 6. Iniciar solo PostgreSQL para aplicar migraciones
echo "🐘 Iniciando PostgreSQL con migraciones..."
remote_sudo "cd ${NAS_PATH} && docker run -d \
    --name ${CONTAINER_NAME}-init \
    --network ai-network \
    -e POSTGRES_USER=${DB_USER} \
    -e POSTGRES_DB=${DB_NAME} \
    -e POSTGRES_PASSWORD=\$(grep POSTGRES_PASSWORD .env.production | cut -d= -f2) \
    -v ${NAS_PATH}/postgres-data:/var/lib/postgresql/data \
    -v ${NAS_PATH}/config/init-db-production-clean.sql:/docker-entrypoint-initdb.d/01-init.sql:ro \
    -v ${NAS_PATH}/config/complete-production-schema.sql:/docker-entrypoint-initdb.d/02-schema.sql:ro \
    postgres:15-alpine"

# 7. Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a que PostgreSQL esté listo..."
for i in {1..30}; do
    if remote_sudo "docker exec ${CONTAINER_NAME}-init pg_isready -U ${DB_USER} -d ${DB_NAME}" 2>/dev/null; then
        echo "✅ PostgreSQL listo"
        break
    fi
    echo -n "."
    sleep 2
done

# 8. Detener contenedor temporal
echo "🛑 Deteniendo PostgreSQL temporal..."
remote_sudo "docker stop ${CONTAINER_NAME}-init && docker rm ${CONTAINER_NAME}-init"

# 9. Iniciar todos los servicios
echo "🚀 Iniciando todos los servicios..."
remote_sudo "cd ${NAS_PATH} && docker-compose -f docker-compose.production.yml up -d"

# 10. Verificar estado
echo "🔍 Verificando estado..."
sleep 10
STATUS=$(curl -s http://${NAS_HOST}:3003/status | python3 -c "import sys, json; print(json.load(sys.stdin).get('status', 'unknown'))" 2>/dev/null || echo "error")

if [ "$STATUS" = "healthy" ]; then
    echo "✅ Deployment completado exitosamente - Estado: $STATUS"
else
    echo "⚠️  Deployment completado pero estado: $STATUS"
    echo "   Revisa los logs con: make logs"
fi

echo ""
echo "📊 Dashboard: http://${NAS_HOST}:3003/dashboard"
echo "📈 Status: http://${NAS_HOST}:3003/status"