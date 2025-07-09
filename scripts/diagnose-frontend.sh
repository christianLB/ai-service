#!/bin/bash

# Script de diagnóstico para problemas de frontend
# Uso: ./scripts/diagnose-frontend.sh

# Cargar configuración
source .make.env 2>/dev/null || true

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== DIAGNÓSTICO DE FRONTEND ===${NC}"
echo ""

# 1. Verificar archivos locales
echo -e "${YELLOW}1. Archivos locales compilados:${NC}"
if [ -d "frontend/dist" ]; then
    echo "   Archivos HTML:"
    ls -la frontend/dist/*.html 2>/dev/null || echo "   No hay archivos HTML"
    echo "   Archivos JS:"
    ls -la frontend/dist/assets/*.js 2>/dev/null | tail -3 || echo "   No hay archivos JS"
    echo "   Hash del index.html local:"
    md5sum frontend/dist/index.html 2>/dev/null || echo "   No existe index.html"
else
    echo -e "   ${RED}ERROR: No existe frontend/dist${NC}"
fi

echo ""
echo -e "${YELLOW}2. Archivos en producción:${NC}"

# Configurar SSH
if [ -n "$SSHPASS" ]; then
    SSH_CMD="sshpass -e ssh"
else
    SSH_CMD="ssh"
fi

# Verificar archivos en el NAS
NAS_HOST="${NAS_HOST:-192.168.1.11}"
NAS_USER="${NAS_USER:-admin}"
NAS_PATH="${NAS_PATH:-/volume1/docker/ai-service}"

echo "   Archivos en $NAS_PATH/frontend/dist:"
$SSH_CMD $NAS_USER@$NAS_HOST "ls -la $NAS_PATH/frontend/dist/*.html 2>/dev/null || echo 'No hay HTML'" 2>/dev/null
echo "   Hash del index.html en producción:"
$SSH_CMD $NAS_USER@$NAS_HOST "md5sum $NAS_PATH/frontend/dist/index.html 2>/dev/null || echo 'No existe'" 2>/dev/null

echo ""
echo -e "${YELLOW}3. Referencias en el HTML de producción:${NC}"
$SSH_CMD $NAS_USER@$NAS_HOST "grep -o 'src=\"[^\"]*\.js\"' $NAS_PATH/frontend/dist/index.html 2>/dev/null | head -5" 2>/dev/null || echo "No se pudo leer"

echo ""
echo -e "${YELLOW}4. Archivos JS reales en producción:${NC}"
$SSH_CMD $NAS_USER@$NAS_HOST "ls $NAS_PATH/frontend/dist/assets/*.js 2>/dev/null | xargs -I {} basename {} | head -5" 2>/dev/null || echo "No hay archivos JS"

echo ""
echo -e "${YELLOW}5. Verificación del volumen Docker:${NC}"
$SSH_CMD $NAS_USER@$NAS_HOST "echo '$SUDO_PASS' | sudo -S docker exec ai-service ls -la /app/public/ 2>/dev/null | head -10" 2>/dev/null || echo "No se pudo verificar"

echo ""
echo -e "${YELLOW}6. Headers HTTP del servidor:${NC}"
curl -I -s http://$NAS_HOST:3003/ | grep -i cache || echo "No se pudieron obtener headers"

echo ""
echo -e "${YELLOW}7. Verificación de la ruta de servicio:${NC}"
$SSH_CMD $NAS_USER@$NAS_HOST "echo '$SUDO_PASS' | sudo -S docker exec ai-service cat /app/dist/index.js | grep -A 2 -B 2 'frontendPath'" 2>/dev/null || echo "No se pudo verificar"

echo ""
echo -e "${BLUE}=== RESUMEN DE PROBLEMAS ===${NC}"

# Comparar hashes si es posible
LOCAL_HASH=$(md5sum frontend/dist/index.html 2>/dev/null | cut -d' ' -f1)
PROD_HASH=$($SSH_CMD $NAS_USER@$NAS_HOST "md5sum $NAS_PATH/frontend/dist/index.html 2>/dev/null | cut -d' ' -f1" 2>/dev/null)

if [ -n "$LOCAL_HASH" ] && [ -n "$PROD_HASH" ]; then
    if [ "$LOCAL_HASH" = "$PROD_HASH" ]; then
        echo -e "${GREEN}✓ Los archivos HTML son idénticos${NC}"
    else
        echo -e "${RED}✗ Los archivos HTML son diferentes${NC}"
        echo "  Local:      $LOCAL_HASH"
        echo "  Producción: $PROD_HASH"
    fi
fi

echo ""
echo -e "${YELLOW}RECOMENDACIONES:${NC}"
echo "1. Si los HTML son diferentes: make deploy-frontend-clean"
echo "2. Si los HTML son iguales pero sigue fallando: problema de caché del navegador"
echo "3. Para forzar actualización completa: make force-frontend-update"
echo ""