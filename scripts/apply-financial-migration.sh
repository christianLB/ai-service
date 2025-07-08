#!/bin/bash
# Script para aplicar migración financiera sin requerir sudo interactivo

set -e

# Configuración
NAS_HOST="${NAS_HOST:-192.168.1.11}"
NAS_USER="${NAS_USER:-admin}"
NAS_PATH="${NAS_PATH:-/volume1/docker/ai-service}"
DB_NAME="${DB_NAME:-ai_service}"
DB_USER="${DB_USER:-ai_user}"
CONTAINER_NAME="${CONTAINER_NAME:-ai-postgres}"

echo "🚀 Aplicando migración de tablas financieras..."

# Verificar que el archivo SQL existe
if [ ! -f "config/init-financial-tables.sql" ]; then
    echo "❌ Error: No se encuentra config/init-financial-tables.sql"
    exit 1
fi

echo "📋 Copiando archivo SQL al NAS..."
scp config/init-financial-tables.sql ${NAS_USER}@${NAS_HOST}:${NAS_PATH}/config/

echo "💾 Ejecutando migración..."
# Usar echo para pasar la contraseña a sudo si está disponible
if [ -n "$SUDO_PASS" ]; then
    ssh ${NAS_USER}@${NAS_HOST} "echo '$SUDO_PASS' | sudo -S docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} < ${NAS_PATH}/config/init-financial-tables.sql"
else
    ssh ${NAS_USER}@${NAS_HOST} "sudo docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} < ${NAS_PATH}/config/init-financial-tables.sql"
fi

echo "✅ Migración aplicada"

# Verificar que funcionó
echo "🔍 Verificando migración..."
RESULT=$(ssh ${NAS_USER}@${NAS_HOST} "sudo docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -t -c \"SELECT COUNT(*) FROM financial.account_insights;\"" 2>/dev/null || echo "ERROR")

if [[ "$RESULT" != "ERROR" ]]; then
    echo "✅ Tabla financial.account_insights creada correctamente"
    
    # Verificar estado del servicio
    echo "🔍 Verificando estado del servicio..."
    STATUS=$(curl -s http://${NAS_HOST}:3003/status | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$STATUS" = "healthy" ]; then
        echo "✅ Servicio en estado: healthy"
    else
        echo "⚠️  Servicio en estado: $STATUS"
    fi
    
    # Verificar dashboard
    echo "🔍 Verificando dashboard financiero..."
    DASHBOARD=$(curl -s http://${NAS_HOST}:3003/api/financial/dashboard/overview | grep -o '"success":[^,]*' | cut -d':' -f2)
    
    if [ "$DASHBOARD" = "true" ]; then
        echo "✅ Dashboard financiero funcionando correctamente"
    else
        echo "⚠️  Dashboard financiero todavía con errores"
    fi
else
    echo "❌ Error al verificar la tabla"
    exit 1
fi

echo "🎉 Migración completada exitosamente!"