#!/bin/bash

# Verificar el número de argumentos
if [ "$#" -lt 1 ]; then
    echo "Uso: $0 <sandbox_access_token>"
    exit 1
fi

# Token de acceso proporcionado
TOKEN=$1

# Colores para la salida
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sin Color

echo -e "${BLUE}Probando token de sandbox: ${TOKEN}${NC}"

# Base URL para la API de GoCardless
API_URL="https://bankaccountdata.gocardless.com/api/v2"

# Probar endpoint de instituciones (el más simple)
echo -e "\n${GREEN}Probando endpoint /institutions/${NC}"
INSTITUTIONS_RESPONSE=$(curl -s \
    -H "Authorization: Bearer ${TOKEN}" \
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
fi

# Probar con parámetro country
echo -e "\n${GREEN}Probando endpoint /institutions/ con parámetro country=ES${NC}"
INSTITUTIONS_COUNTRY_RESPONSE=$(curl -s \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json" \
    "${API_URL}/institutions/?country=ES")

# Guardar respuesta para análisis
echo "$INSTITUTIONS_COUNTRY_RESPONSE" > institutions_country_response.json
echo -e "${YELLOW}Respuesta guardada en institutions_country_response.json${NC}"

# Verificar si la respuesta contiene instituciones
if echo "$INSTITUTIONS_COUNTRY_RESPONSE" | grep -q "id\|name"; then
    echo -e "${GREEN}Parece que la respuesta contiene información de instituciones${NC}"
else
    echo -e "${YELLOW}No se detectaron instituciones en la respuesta${NC}"
fi

# Probar endpoint de instituciones específicamente para sandbox
echo -e "\n${GREEN}Probando endpoint /institutions/SANDBOXFINANCE_SFIN0000${NC}"
SANDBOX_INSTITUTION_RESPONSE=$(curl -s \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json" \
    "${API_URL}/institutions/SANDBOXFINANCE_SFIN0000")

# Guardar respuesta para análisis
echo "$SANDBOX_INSTITUTION_RESPONSE" > sandbox_institution_response.json
echo -e "${YELLOW}Respuesta guardada en sandbox_institution_response.json${NC}"

# Imprimir versión corta de las respuestas
echo -e "\n${BLUE}Resumen de respuestas:${NC}"
echo -e "${YELLOW}Instituciones (general):${NC} $(echo "$INSTITUTIONS_RESPONSE" | head -n 5)"
echo -e "${YELLOW}Instituciones (ES):${NC} $(echo "$INSTITUTIONS_COUNTRY_RESPONSE" | head -n 5)"
echo -e "${YELLOW}Institución sandbox:${NC} $(echo "$SANDBOX_INSTITUTION_RESPONSE" | head -n 5)"
