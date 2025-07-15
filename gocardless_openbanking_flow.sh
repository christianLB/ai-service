#!/bin/bash

# Script para simular el flujo de GoCardless Bank Account Data (Open Banking)
# Uso: ./gocardless_openbanking_flow.sh <secret_id> <secret_key> [institution_id]
# Ejemplo: $0 84cf753f-c6f7-4ad9-ad6d-c6d16d3d6bb5 500ecca01eaa2eb9b3fc0e9a6405a70c... SANDBOXFINANCE_SFIN0000

# Verificar el número de argumentos
if [ "$#" -lt 2 ]; then
    echo "Uso: $0 <secret_id> <secret_key> [institution_id]"
    echo "    secret_id: ID secreto para el sandbox de GoCardless"
    echo "    secret_key: Clave secreta para el sandbox de GoCardless"
    echo "    institution_id: ID de la institución financiera (por defecto: SANDBOXFINANCE_SFIN0000)"
    exit 1
fi

# Asignar variables desde argumentos
SECRET_ID=$1
SECRET_KEY=$2
INSTITUTION_ID=${3:-"SANDBOXFINANCE_SFIN0000"}  # Usar SANDBOXFINANCE_SFIN0000 si no se proporciona otro

# Configuraciones
API_BASE_URL="https://bankaccountdata.gocardless.com/api/v2"
REDIRECT_URL="http://localhost:8000/callback"  # URL de redirección (ajustar según sea necesario)
REFERENCE="sandbox_test_$(date +%s)"  # Referencia única usando timestamp
USER_LANGUAGE="ES"  # Idioma del usuario

# Colores para la salida
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m" # Sin Color

# Función para hacer peticiones curl
function make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local response

    echo -e "${BLUE}Ejecutando: curl -X $method $API_BASE_URL$endpoint${NC}"
    
    # Mostrar datos si se proporcionan
    if [ -n "$data" ]; then
        echo -e "${BLUE}Datos: $data${NC}"
    fi
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -X GET \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Accept: application/json" \
            "${API_BASE_URL}${endpoint}")
    else
        response=$(curl -s -X $method \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -d "$data" \
            "${API_BASE_URL}${endpoint}")
    fi

    echo "$response"
}

# Paso 1: Obteniendo token de acceso usando las credenciales proporcionadas
echo -e "${GREEN}Paso 1: Obteniendo token de acceso${NC}"
echo -e "SECRET_ID: ${SECRET_ID}"
echo -e "SECRET_KEY: ${SECRET_KEY:0:10}...\n"

# Preparar payload JSON para obtener el token
TOKEN_PAYLOAD="{\"secret_id\":\"$SECRET_ID\",\"secret_key\":\"$SECRET_KEY\"}"

# Solicitar token
echo -e "${BLUE}Solicitando token de acceso...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$TOKEN_PAYLOAD" \
    "${API_BASE_URL}/token/new/")

# Guardar respuesta para análisis
echo "$TOKEN_RESPONSE" > token_response.json
echo -e "${YELLOW}Respuesta guardada en token_response.json${NC}"

# Extraer el access_token con expresiones regulares
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access":\s*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}Error: No se pudo obtener el access token${NC}"
    echo -e "${RED}Respuesta:${NC} $TOKEN_RESPONSE"
    exit 1
else
    echo -e "${GREEN}✓ Access token obtenido correctamente${NC}"
    echo -e "${BLUE}Access token: ${ACCESS_TOKEN:0:10}...${NC}\n"
fi

# Paso 2: Listar instituciones disponibles
echo -e "\n${GREEN}Paso 2: Listando instituciones financieras${NC}"
echo -e "Usando INSTITUTION_ID: $INSTITUTION_ID"
institutions_response=$(make_request "GET" "/institutions/?country=es")

# Saltamos la verificación de la institución y continuamos directamente
echo -e "${YELLOW}Nota: Usando institución sandbox $INSTITUTION_ID${NC}"
echo -e "${BLUE}Nota: Para sandbox, es normal que SANDBOXFINANCE_SFIN0000 no aparezca en la lista regular.${NC}"

# Paso 3: Crear un acuerdo de usuario final (end user agreement)
echo -e "\n${GREEN}Paso 3: Creando acuerdo de usuario final (end user agreement)${NC}"
AGREEMENT_DATA="{\
    \"institution_id\": \"$INSTITUTION_ID\",\
    \"max_historical_days\": 90,\
    \"access_valid_for_days\": 90,\
    \"access_scope\": [\"balances\", \"details\", \"transactions\"],\
    \"accepted_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"\
}"
AGREEMENT_RESPONSE=$(make_request "POST" "/agreements/enduser/" "$AGREEMENT_DATA")

echo -e "${YELLOW}Respuesta del acuerdo:${NC}"
echo "$AGREEMENT_RESPONSE" > agreement_response.json
echo -e "${BLUE}Respuesta guardada en agreement_response.json${NC}"

# Extraer el ID del acuerdo
AGREEMENT_ID=$(echo "$AGREEMENT_RESPONSE" | grep -o '"id":\s*"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"')

if [ -z "$AGREEMENT_ID" ]; then
    echo -e "${RED}Error: No se pudo obtener el ID del acuerdo${NC}"
    echo -e "${YELLOW}⚠ Usando ID de acuerdo ficticio para continuar: sandbox_agreement_id${NC}"
    AGREEMENT_ID="sandbox_agreement_id"
else
    echo -e "${GREEN}✓ Acuerdo creado con ID: $AGREEMENT_ID${NC}"
fi

# Paso 4: Crear un enlace (Build a Link / requisition)
echo -e "\n${GREEN}Paso 4: Creando enlace (requisition)${NC}"
REQUISITION_DATA="{\
    \"redirect\": \"$REDIRECT_URL\",\
    \"institution_id\": \"$INSTITUTION_ID\",\
    \"agreement\": \"$AGREEMENT_ID\",\
    \"reference\": \"$REFERENCE\",\
    \"user_language\": \"$USER_LANGUAGE\"\
}"

REQUISITION_RESPONSE=$(make_request "POST" "/requisitions/" "$REQUISITION_DATA")

# Guardar respuesta para análisis
echo "$REQUISITION_RESPONSE" > requisition_response.json
echo -e "${YELLOW}Respuesta guardada en requisition_response.json${NC}"

# Extraémos el ID y link de la requisición
REQUISITION_ID=$(echo "$REQUISITION_RESPONSE" | grep -o '"id":\s*"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"')
LINK=$(echo "$REQUISITION_RESPONSE" | grep -o '"link":\s*"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"')

if [ -z "$REQUISITION_ID" ] || [ -z "$LINK" ]; then
    echo -e "${RED}Error: No se pudo obtener el ID de requisición o el enlace${NC}"
    echo -e "${RED}Respuesta:${NC} $REQUISITION_RESPONSE"
    # Para fines de prueba, podemos intentar continuar con valores ficticios
    REQUISITION_ID="sandbox_requisition_id"
    echo -e "${YELLOW}⚠ Usando ID de requisición ficticio para continuar: $REQUISITION_ID${NC}"
else
    echo -e "${GREEN}✓ Enlace creado con ID: $REQUISITION_ID${NC}"
    echo -e "${BLUE}Link de autenticación: $LINK${NC}"
fi

# Esperar a que el usuario complete la autenticación
echo -e "\n${BLUE}Por favor, siga el enlace para completar la autenticación.${NC}"
echo -e "${YELLOW}IMPORTANTE: En el sandbox, cualquier entrada es válida para los campos de usuario y generador de código.${NC}"
echo -e "${YELLOW}Presione Enter después de completar el proceso o para simular la finalización (en sandbox)...${NC}"
read -r

# Paso 5: Obtener los detalles de la requisition para ver las cuentas
echo -e "\n${GREEN}Paso 5: Obteniendo detalles de la requisition${NC}"
REQUISITION_DETAILS=$(make_request "GET" "/requisitions/$REQUISITION_ID/" "")

# Guardar respuesta para análisis
echo "$REQUISITION_DETAILS" > requisition_details.json
echo -e "${YELLOW}Respuesta guardada en requisition_details.json${NC}"

# Extraer las cuentas
ACCOUNTS=$(echo "$REQUISITION_DETAILS" | grep -o '"accounts":\s*\[.*\]' | grep -o '"[^,\[\]"]*"' | tr -d '"' | tr '\n' ' ')

if [ -z "$ACCOUNTS" ]; then
    echo -e "${RED}✗ No se encontraron cuentas disponibles${NC}"
    # Para fines de prueba, podemos continuar con una cuenta ficticia
    FIRST_ACCOUNT="sandbox_account_id"
    echo -e "${YELLOW}⚠ Usando ID de cuenta ficticio para continuar: $FIRST_ACCOUNT${NC}"
else
    echo -e "${GREEN}✓ Cuentas disponibles: $ACCOUNTS${NC}"
    # Seleccionamos la primera cuenta
    FIRST_ACCOUNT=$(echo $ACCOUNTS | awk '{print $1}')
    echo -e "${BLUE}Seleccionando la primera cuenta: $FIRST_ACCOUNT${NC}"
fi

# Paso 6: Acceder a los detalles de la cuenta, saldos y transacciones
echo -e "\n${GREEN}Paso 6: Accediendo a detalles de cuenta, saldos y transacciones${NC}"

# Iterar a través de cada cuenta disponible
if [ -z "$ACCOUNTS" ] || [ "$ACCOUNTS" = "sandbox_account_id" ]; then
    # Si no tenemos cuentas reales, usamos la cuenta ficticia para pruebas
    account_list="$FIRST_ACCOUNT"
else
    # Si tenemos cuentas reales, las procesamos todas
    account_list=$ACCOUNTS
fi

for account_id in $account_list; do
    echo -e "\n${BLUE}===== Información para la cuenta: $account_id =====${NC}"
    
    # Obtener detalles de la cuenta
    echo -e "${YELLOW}Detalles de la cuenta:${NC}"
    ACCOUNT_DETAILS=$(make_request "GET" "/accounts/$account_id/details/" "")
    echo "$ACCOUNT_DETAILS" > account_${account_id}_details.json
    echo -e "${BLUE}Detalles guardados en account_${account_id}_details.json${NC}"
    
    # Obtener saldos de la cuenta
    echo -e "\n${YELLOW}Saldos de la cuenta:${NC}"
    ACCOUNT_BALANCES=$(make_request "GET" "/accounts/$account_id/balances/" "")
    echo "$ACCOUNT_BALANCES" > account_${account_id}_balances.json
    echo -e "${BLUE}Saldos guardados en account_${account_id}_balances.json${NC}"
    
    # Obtener transacciones de la cuenta
    echo -e "\n${YELLOW}Transacciones de la cuenta:${NC}"
    ACCOUNT_TRANSACTIONS=$(make_request "GET" "/accounts/$account_id/transactions/" "")
    echo "$ACCOUNT_TRANSACTIONS" > account_${account_id}_transactions.json
    echo -e "${BLUE}Transacciones guardadas en account_${account_id}_transactions.json${NC}"
done

echo -e "\n${GREEN}Flujo de simulación de GoCardless Bank Account Data completado con éxito.${NC}"
echo -e "${BLUE}Se han guardado todos los resultados en archivos JSON para análisis detallado.${NC}"
