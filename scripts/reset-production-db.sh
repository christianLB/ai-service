#!/bin/bash
# Script para resetear la base de datos de producción

set -e

echo "🚨 ADVERTENCIA: Esto eliminará TODOS los datos de producción"
echo "¿Estás seguro? (escribe 'SI' para continuar)"
read -r CONFIRM

if [ "$CONFIRM" != "SI" ]; then
    echo "Operación cancelada"
    exit 0
fi

echo "🔄 Iniciando reset de base de datos..."

# Configuración
NAS_HOST="${NAS_HOST:-192.168.1.11}"
NAS_USER="${NAS_USER:-k2600x}"
DB_NAME="${DB_NAME:-ai_service}"
DB_USER="${DB_USER:-ai_user}"
CONTAINER_NAME="${CONTAINER_NAME:-ai-postgres}"

echo "1️⃣ Deteniendo servicio AI..."
ssh ${NAS_USER}@${NAS_HOST} "sudo docker stop ai-service || true"

echo "2️⃣ Eliminando base de datos existente..."
ssh ${NAS_USER}@${NAS_HOST} "sudo docker exec ${CONTAINER_NAME} psql -U postgres -c 'DROP DATABASE IF EXISTS ${DB_NAME};'"

echo "3️⃣ Creando base de datos nueva..."
ssh ${NAS_USER}@${NAS_HOST} "sudo docker exec ${CONTAINER_NAME} psql -U postgres -c 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};'"

echo "4️⃣ Copiando schema de desarrollo..."
# Copiar el init-db.sql original (sin el \gexec problemático)
scp scripts/init-db.sql ${NAS_USER}@${NAS_HOST}:/volume1/docker/ai-service/config/init-db-clean.sql

# Copiar el schema completo de producción
scp scripts/complete-production-schema.sql ${NAS_USER}@${NAS_HOST}:/volume1/docker/ai-service/config/

echo "5️⃣ Aplicando schema..."
ssh ${NAS_USER}@${NAS_HOST} "sudo docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} < /volume1/docker/ai-service/config/complete-production-schema.sql"

echo "6️⃣ Reiniciando servicio AI..."
ssh ${NAS_USER}@${NAS_HOST} "sudo docker start ai-service"

echo "✅ Base de datos reseteada exitosamente"
echo ""
echo "Verificando estado..."
sleep 5
curl -s http://${NAS_HOST}:3003/status | python3 -c "import sys, json; d = json.load(sys.stdin); print(f\"Status: {d['status']}\")"

echo ""
echo "🎉 Listo! La base de datos está limpia y con el schema de desarrollo"