#!/bin/bash

# Verificar el número de argumentos
if [ "$#" -lt 2 ]; then
    echo "Uso: $0 <secret_id> <secret_key>"
    exit 1
fi

# Credenciales proporcionadas
SECRET_ID=$1
SECRET_KEY=$2

# Colores para la salida
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sin Color

echo -e "${BLUE}Probando autenticación con GoCardless API${NC}"
echo -e "${YELLOW}Secret ID: ${SECRET_ID}${NC}"
echo -e "${YELLOW}Secret Key: primeras 4 letras: ${SECRET_KEY:0:4}...${NC}"

# Base URL para la API de GoCardless
API_URL="https://bankaccountdata.gocardless.com/api/v2"

# Paso 1: Obtener access token (este es el paso correcto según la documentación)
echo -e "\n${GREEN}Paso 1: Obteniendo access token${NC}"

# Preparar payload JSON
PAYLOAD="{\"secret_id\":\"$SECRET_ID\",\"secret_key\":\"$SECRET_KEY\"}"

# Solicitar token
TOKEN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$PAYLOAD" \
    "${API_URL}/token/new/")

# Guardar respuesta para análisis
echo "$TOKEN_RESPONSE" > token_response.json
echo -e "${YELLOW}Respuesta guardada en token_response.json${NC}"

# Extraer el access_token con expresiones regulares (sin jq)
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access":\s*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}Error: No se pudo obtener el access token${NC}"
    echo -e "${RED}Respuesta:${NC} $TOKEN_RESPONSE"
    exit 1
else
    echo -e "${GREEN}Access token obtenido correctamente${NC}"
    echo -e "${BLUE}Access token: ${ACCESS_TOKEN:0:10}...${NC}"
fi

# Paso 2: Probar el access token con el endpoint de instituciones
echo -e "\n${GREEN}Paso 2: Probando access token con el endpoint /institutions/${NC}"
INSTITUTIONS_RESPONSE=$(curl -s \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Accept: application/json" \
    "${API_URL}/institutions/")

# Guardar respuesta para análisis
echo "$INSTITUTIONS_RESPONSE" > institutions_response.json
echo -e "${YELLOW}Respuesta guardada en institutions_response.json${NC}"

# Verificar si hay errores básicos
if echo "$INSTITUTIONS_RESPONSE" | grep -q "error\|invalid\|expired"; then
    echo -e "${RED}Error detectado en la respuesta:${NC}"
    echo "$INSTITUTIONS_RESPONSE" | grep -i "error\|invalid\|expired" | sed 's/^/  /'
else
    echo -e "${GREEN}Respuesta recibida sin errores evidentes${NC}"
    INSTITUTIONS_COUNT=$(echo "$INSTITUTIONS_RESPONSE" | grep -o '"id":' | wc -l)
    echo -e "${BLUE}Número de instituciones encontradas: $INSTITUTIONS_COUNT${NC}"
fi

# Paso 3: Probar endpoint específico para la institución sandbox
echo -e "\n${GREEN}Paso 3: Probando endpoint /institutions/SANDBOXFINANCE_SFIN0000${NC}"
SANDBOX_INSTITUTION_RESPONSE=$(curl -s \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Accept: application/json" \
    "${API_URL}/institutions/SANDBOXFINANCE_SFIN0000")

# Guardar respuesta para análisis
echo "$SANDBOX_INSTITUTION_RESPONSE" > sandbox_institution_response.json
echo -e "${YELLOW}Respuesta guardada en sandbox_institution_response.json${NC}"

# Verificar si se obtuvo la información de la institución sandbox
if echo "$SANDBOX_INSTITUTION_RESPONSE" | grep -q '"id":\s*"SANDBOXFINANCE_SFIN0000"'; then
    echo -e "${GREEN}✓ Institución sandbox encontrada correctamente${NC}"
else
    echo -e "${RED}✗ No se pudo encontrar la institución sandbox${NC}"
    echo -e "${YELLOW}Respuesta:${NC} $SANDBOX_INSTITUTION_RESPONSE"
fi

echo -e "\n${BLUE}Prueba de autenticación completa. Revisa los archivos .json para más detalles.${NC}"
