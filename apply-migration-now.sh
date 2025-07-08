#!/bin/bash
# Script para aplicar la migración financiera AHORA

set -e

# Configuración
NAS_HOST="${NAS_HOST:-192.168.1.11}"
NAS_USER="${NAS_USER:-admin}"
NAS_PATH="${NAS_PATH:-/volume1/docker/ai-service}"
DB_NAME="${DB_NAME:-ai_service}"
DB_USER="${DB_USER:-ai_user}"
CONTAINER_NAME="${CONTAINER_NAME:-ai-postgres}"

echo "🚀 Aplicando migración de tablas financieras..."

# Verificar archivo
if [ ! -f "config/init-financial-tables.sql" ]; then
    echo "❌ Error: No se encuentra config/init-financial-tables.sql"
    exit 1
fi

# Copiar archivo
echo "📋 Copiando archivo SQL al NAS..."
scp config/init-financial-tables.sql ${NAS_USER}@${NAS_HOST}:${NAS_PATH}/config/

echo ""
echo "✅ Archivo copiado exitosamente"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 AHORA EJECUTA ESTOS COMANDOS EN EL NAS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Conectar al NAS:"
echo "   ssh ${NAS_USER}@${NAS_HOST}"
echo ""
echo "2. Aplicar la migración:"
echo "   sudo docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} < ${NAS_PATH}/config/init-financial-tables.sql"
echo ""
echo "3. Verificar que funcionó:"
echo "   sudo docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -c 'SELECT COUNT(*) FROM financial.account_insights;'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar estado actual
echo "Estado actual del servicio:"
curl -s http://${NAS_HOST}:3003/status | grep -o '"status":"[^"]*"' || echo "No se pudo verificar"

echo ""
echo "Para verificar después de aplicar la migración:"
echo "   curl http://${NAS_HOST}:3003/status"
echo "   curl http://${NAS_HOST}:3003/api/financial/dashboard/overview"