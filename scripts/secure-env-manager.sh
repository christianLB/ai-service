#!/bin/bash
# Secure Environment Manager - Gestión segura de secrets para Claude

set -euo pipefail

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Directorios seguros
SECURE_DIR="${HOME}/.ai-service-secrets"
ENV_TEMPLATES_DIR="./env-templates"

# Crear directorio seguro si no existe
mkdir -p "${SECURE_DIR}" "${ENV_TEMPLATES_DIR}"
chmod 700 "${SECURE_DIR}"

# Función para crear template sin secrets
create_env_template() {
    local env_file=$1
    local template_file=$2
    
    echo -e "${YELLOW}📝 Creando template seguro...${NC}"
    
    # Reemplazar valores sensibles con placeholders
    sed -E \
        -e 's/(PASSWORD|SECRET|KEY|TOKEN)=.+/\1=<REDACTED>/' \
        -e 's/(API_KEY)=.+/\1=<REDACTED>/' \
        -e 's/(PRIVATE|SEED|MNEMONIC)=.+/\1=<REDACTED>/' \
        "${env_file}" > "${template_file}"
    
    echo -e "${GREEN}✅ Template creado: ${template_file}${NC}"
}

# Función para validar environment
validate_env() {
    local env_type=$1
    local required_vars=(
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "OPENAI_API_KEY"
        "JWT_SECRET"
    )
    
    echo -e "${YELLOW}🔍 Validando variables requeridas para ${env_type}...${NC}"
    
    local missing=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing+=("$var")
        fi
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        echo -e "${RED}❌ Faltan variables: ${missing[*]}${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Todas las variables requeridas están presentes${NC}"
    return 0
}

# Función para cargar environment seguro
load_secure_env() {
    local env_type=$1
    local secure_env_file="${SECURE_DIR}/.env.${env_type}.secure"
    
    if [[ ! -f "${secure_env_file}" ]]; then
        echo -e "${RED}❌ No se encontró archivo seguro: ${secure_env_file}${NC}"
        echo -e "${YELLOW}💡 Ejecuta: $0 init ${env_type}${NC}"
        return 1
    fi
    
    # Cargar variables de entorno
    set -a
    source "${secure_env_file}"
    set +a
    
    echo -e "${GREEN}✅ Environment ${env_type} cargado de forma segura${NC}"
}

# Comando: Inicializar environment seguro
init_environment() {
    local env_type=${1:-development}
    local secure_env_file="${SECURE_DIR}/.env.${env_type}.secure"
    
    echo -e "${YELLOW}🔐 Inicializando environment seguro para: ${env_type}${NC}"
    
    if [[ -f "${secure_env_file}" ]]; then
        echo -e "${YELLOW}⚠️  El archivo ya existe. ¿Sobrescribir? (y/N)${NC}"
        read -r response
        [[ "$response" != "y" ]] && return 0
    fi
    
    # Crear archivo base
    cat > "${secure_env_file}" << 'EOF'
# === SECRETS SEGUROS - NO COMMITEAR ===
# Este archivo contiene los secrets reales
# Generado: $(date)

# Base de datos
POSTGRES_PASSWORD=
REDIS_PASSWORD=

# APIs de IA
OPENAI_API_KEY=
CLAUDE_API_KEY=
GEMINI_API_KEY=

# Comunicaciones
TELEGRAM_BOT_TOKEN=
SLACK_WEBHOOK_URL=
EMAIL_SMTP_PASSWORD=

# Financiero
BINANCE_API_KEY=
BINANCE_SECRET_KEY=

# Seguridad
JWT_SECRET=
EOF

    chmod 600 "${secure_env_file}"
    
    echo -e "${GREEN}✅ Archivo seguro creado: ${secure_env_file}${NC}"
    echo -e "${YELLOW}📝 Edita el archivo y agrega los valores reales${NC}"
    echo -e "${YELLOW}💡 Usa: $EDITOR ${secure_env_file}${NC}"
}

# Comando: Switch entre environments
switch_environment() {
    local env_type=$1
    
    echo -e "${YELLOW}🔄 Cambiando a environment: ${env_type}${NC}"
    
    # Cargar environment seguro
    load_secure_env "${env_type}" || return 1
    
    # Crear symlink a .env actual
    ln -sf "${SECURE_DIR}/.env.${env_type}.secure" .env.current
    
    # Validar
    validate_env "${env_type}" || return 1
    
    echo -e "${GREEN}✅ Environment activo: ${env_type}${NC}"
}

# Comando: Comparar environments
compare_environments() {
    local env1=$1
    local env2=$2
    
    echo -e "${YELLOW}📊 Comparando ${env1} vs ${env2}...${NC}"
    
    # Extraer solo las claves (no valores)
    comm -3 \
        <(grep -E '^[A-Z_]+=' "${SECURE_DIR}/.env.${env1}.secure" | cut -d= -f1 | sort) \
        <(grep -E '^[A-Z_]+=' "${SECURE_DIR}/.env.${env2}.secure" | cut -d= -f1 | sort)
}

# Comando: Generar reporte de secrets
audit_secrets() {
    echo -e "${YELLOW}🔍 Auditando secrets...${NC}"
    
    # Buscar posibles leaks en el código
    echo -e "\n${YELLOW}Buscando posibles secrets en el código...${NC}"
    
    # Patterns peligrosos
    local patterns=(
        "sk-[a-zA-Z0-9]{48}"  # OpenAI
        "AIza[0-9A-Za-z_-]{35}"  # Google
        "[0-9a-f]{64}"  # Generic hex key
        "password.*=.*['\"][^'\"]{8,}"  # Passwords hardcoded
    )
    
    for pattern in "${patterns[@]}"; do
        if grep -r -E "$pattern" --include="*.ts" --include="*.js" --include="*.json" . 2>/dev/null | grep -v node_modules; then
            echo -e "${RED}⚠️  Posible secret encontrado!${NC}"
        fi
    done
    
    echo -e "${GREEN}✅ Auditoría completada${NC}"
}

# Main
case "${1:-help}" in
    init)
        init_environment "${2:-development}"
        ;;
    switch)
        switch_environment "${2:-development}"
        ;;
    load)
        load_secure_env "${2:-development}"
        ;;
    template)
        create_env_template "${2:-.env}" "${3:-.env.template}"
        ;;
    compare)
        compare_environments "${2:-development}" "${3:-production}"
        ;;
    audit)
        audit_secrets
        ;;
    help|*)
        cat << EOF
${GREEN}🔐 Secure Environment Manager${NC}

Uso: $0 <comando> [opciones]

Comandos:
  init [env]       - Inicializar archivo de secrets seguro
  switch [env]     - Cambiar entre environments (dev/prod)
  load [env]       - Cargar environment en sesión actual
  template         - Crear template sin secrets
  compare e1 e2    - Comparar dos environments
  audit           - Buscar posibles leaks de secrets
  help            - Mostrar esta ayuda

Ejemplos:
  $0 init development
  $0 switch production
  $0 audit

Environments disponibles:
  - development
  - production
  - testing

Los archivos seguros se guardan en: ${SECURE_DIR}
EOF
        ;;
esac