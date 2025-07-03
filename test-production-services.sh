#!/bin/bash

echo "🔍 Verificando servicios en producción..."

# Configuración
AI_SERVICE_URL="https://ai-service.anaxi.net"
GRAFANA_URL="https://ai-service.anaxi.net:3001"
PROMETHEUS_URL="https://ai-service.anaxi.net:9090"
N8N_URL="https://ai-service.anaxi.net:5678"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Verificando $service_name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --connect-timeout 10)
    
    if [ "$response" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL (Status: $response)${NC}"
        return 1
    fi
}

check_service_with_auth() {
    local service_name=$1
    local url=$2
    local auth=$3
    
    echo -n "Verificando $service_name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --connect-timeout 10 -u "$auth")
    
    if [ "$response" -eq 200 ]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL (Status: $response)${NC}"
        return 1
    fi
}

echo "📡 Verificando servicios básicos..."
check_service "AI Service Status" "$AI_SERVICE_URL/status"
check_service "AI Service Dashboard" "$AI_SERVICE_URL/dashboard"
check_service "Prometheus" "$PROMETHEUS_URL/-/healthy"
check_service "Grafana" "$GRAFANA_URL/api/health"

echo ""
echo "🏦 Verificando servicios financieros..."
check_service "Financial Overview" "$AI_SERVICE_URL/api/financial/dashboard/overview"
check_service "Financial Accounts" "$AI_SERVICE_URL/api/financial/accounts"
check_service "Financial Transactions" "$AI_SERVICE_URL/api/financial/transactions"

echo ""
echo "🤖 Verificando servicios de AI..."
check_service "Flow Generation" "$AI_SERVICE_URL/api/flows" 
check_service "Metrics" "$AI_SERVICE_URL/api/metrics/json"

echo ""
echo "🔧 Verificando N8N..."
check_service_with_auth "N8N Interface" "$N8N_URL/rest/login" "admin:n8n_admin_2025"

echo ""
echo "📊 Verificando Telegram Bot..."
echo -n "Enviando mensaje de prueba... "

# Test del bot de Telegram
curl -s -X POST "$AI_SERVICE_URL/api/telegram/test" \
  -H "Content-Type: application/json" \
  -d '{"message": "🔍 Test de servicios en producción"}' > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
fi

echo ""
echo "📋 Resumen:"
echo "• AI Service: $AI_SERVICE_URL"
echo "• Dashboard: $AI_SERVICE_URL/dashboard"
echo "• Grafana: $GRAFANA_URL (admin/grafana_admin_password_2025)"
echo "• Prometheus: $PROMETHEUS_URL"
echo "• N8N: $N8N_URL (admin/n8n_admin_2025)"

echo ""
echo "🔗 Comandos útiles:"
echo "• Ver logs: docker logs ai-service-prod"
echo "• Reiniciar servicio: docker restart ai-service-prod"
echo "• Verificar estado: docker ps"
echo "• Sincronizar finanzas: curl -X POST $AI_SERVICE_URL/api/financial/sync"

echo ""
echo -e "${YELLOW}💡 Tip: Si algún servicio falla, verifica que todos los contenedores estén ejecutándose con 'docker ps'${NC}"