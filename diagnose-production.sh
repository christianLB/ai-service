#!/bin/bash

echo "🔍 Diagnóstico de AI Service en Producción"
echo "=========================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}📦 Estado de Contenedores${NC}"
echo "docker ps --filter name=ai-service"
docker ps --filter name=ai-service

echo ""
echo -e "${BLUE}🔍 Contenedores Parados${NC}"
echo "docker ps -a --filter name=ai-service"
docker ps -a --filter name=ai-service

echo ""
echo -e "${BLUE}📋 Logs del AI Service${NC}"
echo "docker logs ai-service-prod --tail 50"
docker logs ai-service-prod --tail 50

echo ""
echo -e "${BLUE}📋 Logs de PostgreSQL${NC}"
echo "docker logs ai-service-db --tail 20"
docker logs ai-service-db --tail 20

echo ""
echo -e "${BLUE}📋 Logs de Redis${NC}"
echo "docker logs ai-service-redis --tail 10"
docker logs ai-service-redis --tail 10

echo ""
echo -e "${BLUE}🌐 Verificar Red${NC}"
echo "docker network ls | grep ai-service"
docker network ls | grep ai-service

echo ""
echo -e "${BLUE}🔧 Variables de Entorno del AI Service${NC}"
echo "docker inspect ai-service-prod | grep -A 20 'Env'"
docker inspect ai-service-prod | grep -A 20 'Env'

echo ""
echo -e "${BLUE}🗄️ Estado de PostgreSQL${NC}"
echo "docker exec ai-service-db psql -U ai_user -d ai_service -c '\dt'"
docker exec ai-service-db psql -U ai_user -d ai_service -c '\dt'

echo ""
echo -e "${BLUE}🔴 Intentar Reiniciar AI Service${NC}"
echo "docker restart ai-service-prod"
docker restart ai-service-prod

echo ""
echo "Esperando 10 segundos para que inicie..."
sleep 10

echo ""
echo -e "${BLUE}📋 Logs después del reinicio${NC}"
docker logs ai-service-prod --tail 30

echo ""
echo -e "${BLUE}📊 Recursos del Sistema${NC}"
echo "docker stats --no-stream"
docker stats --no-stream

echo ""
echo "=========================================="
echo "🎯 Diagnóstico completado"
echo ""
echo "Para depuración adicional:"
echo "• Ver logs en tiempo real: docker logs -f ai-service-prod"
echo "• Conectar a la DB: docker exec -it ai-service-db psql -U ai_user -d ai_service"
echo "• Inspeccionar contenedor: docker inspect ai-service-prod"
echo "• Verificar salud: docker inspect ai-service-prod | grep Health"