#!/bin/bash
# Deployment usando Docker para evitar problemas de permisos

set -e
source .make.env

echo "🚀 Deployment automatizado via Docker..."

# Crear contenedor temporal con acceso al montaje SMB
docker run --rm -it \
    -v ~/ai-service-prod:/nas \
    -v $(pwd):/workspace \
    -w /workspace \
    --user root \
    alpine:latest sh -c "
        echo '📋 Copiando archivos...'
        cp -v scripts/complete-production-schema.sql /nas/config/
        cp -v config/init-db-production-clean.sql /nas/config/
        cp -v docker-compose.production.yml /nas/
        chmod 644 /nas/config/*.sql
        echo '✅ Archivos copiados con permisos correctos'
        ls -la /nas/config/*.sql
    "

echo "✅ Archivos copiados exitosamente"
echo ""
echo "🔧 Ahora ejecuta el deployment remoto:"
echo "   ./scripts/deploy-automated.sh"