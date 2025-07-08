#!/bin/bash

# Script de diagnóstico para Container Manager en Synology

echo "=== Diagnóstico de Container Manager ==="
echo ""

# 1. Verificar directorios necesarios
echo "1. Verificando directorios necesarios..."
DIRS=(
    "/volume1/docker/ai-service"
    "/volume1/docker/ai-service/postgres-data"
    "/volume1/docker/ai-service/redis-data"
    "/volume1/docker/ai-service/uploads"
    "/volume1/docker/ai-service/logs"
    "/volume1/docker/ai-service/config"
)

for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir existe"
    else
        echo "❌ $dir NO existe - creando..."
        sudo mkdir -p "$dir"
    fi
done

# 2. Verificar archivos necesarios
echo ""
echo "2. Verificando archivos necesarios..."
if [ -f "/volume1/docker/ai-service/.env.production" ]; then
    echo "✅ .env.production existe"
else
    echo "❌ .env.production NO existe"
    echo "   Creando archivo de ejemplo..."
    cat > /volume1/docker/ai-service/.env.production.example << EOF
# Variables de entorno para producción
NODE_ENV=production

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=ai_user
DB_NAME=ai_service_db
DB_PASSWORD=your_secure_password_here
POSTGRES_PASSWORD=your_secure_password_here

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# API Keys
OPENAI_API_KEY=sk-your-openai-key-here
JWT_SECRET=your-jwt-secret-here

# GitHub (para Watchtower)
GITHUB_USER=your-github-username
GITHUB_TOKEN=your-github-token
EOF
    echo "   Archivo de ejemplo creado en: /volume1/docker/ai-service/.env.production.example"
fi

# 3. Verificar permisos
echo ""
echo "3. Verificando permisos..."
ls -la /volume1/docker/ai-service/

# 4. Verificar Docker
echo ""
echo "4. Verificando Docker..."
docker version

# 5. Verificar contenedores existentes
echo ""
echo "5. Contenedores existentes:"
docker ps -a | grep -E "(ai-service|ai-postgres|ai-redis)" || echo "No hay contenedores AI"

# 6. Verificar redes
echo ""
echo "6. Redes Docker:"
docker network ls | grep ai-network || echo "Red ai-network no existe"

# 7. Verificar volúmenes
echo ""
echo "7. Volúmenes Docker:"
docker volume ls | grep ai || echo "No hay volúmenes AI"

# 8. Verificar puertos en uso
echo ""
echo "8. Puertos en uso:"
netstat -tlnp 2>/dev/null | grep -E "(3000|5432|6379)" || echo "No se pudo verificar puertos (requiere sudo)"

echo ""
echo "=== Fin del diagnóstico ==="
echo ""
echo "PRÓXIMOS PASOS:"
echo "1. Si falta .env.production, copia el ejemplo y configura las variables"
echo "2. Asegúrate de que todos los directorios existen"
echo "3. Prueba con docker-compose.minimal.yml primero"
echo "4. Revisa los logs del Container Manager en DSM"