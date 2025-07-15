#!/bin/bash

# Secure Secrets Manager for AI Service CI/CD
# Este script gestiona los secretos de forma segura para el sistema CI/CD

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_PATH="/home/k2600x/dev/ai-service"
CONFIG_DIR="${BASE_PATH}/config"
WATCHTOWER_CONFIG="${CONFIG_DIR}/watchtower/config.json"
ENV_TEMPLATE="${BASE_PATH}/.env.template"
ENV_PRODUCTION="${BASE_PATH}/.env.production"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to create GitHub Container Registry credentials
setup_ghcr_credentials() {
    print_info "Configurando credenciales de GitHub Container Registry..."
    
    read -p "GitHub Username (christianlb): " github_user
    github_user=${github_user:-christianlb}
    
    read -s -p "GitHub Personal Access Token (con permisos read:packages, write:packages): " github_token
    echo
    
    if [ -z "$github_token" ]; then
        print_error "Token no puede estar vacío"
        return 1
    fi
    
    # Encode credentials in base64
    local auth_string="${github_user}:${github_token}"
    local encoded_auth=$(echo -n "$auth_string" | base64 | tr -d '\n')
    
    # Create Watchtower config with encoded credentials
    cat > "${WATCHTOWER_CONFIG}" <<EOF
{
  "auths": {
    "ghcr.io": {
      "auth": "${encoded_auth}",
      "email": "ci@${github_user}.com"
    }
  },
  "credsStore": "",
  "credHelpers": {}
}
EOF
    
    chmod 600 "${WATCHTOWER_CONFIG}"
    print_success "Credenciales de GHCR configuradas correctamente"
}

# Function to validate environment variables
validate_env_file() {
    local env_file=$1
    
    print_info "Validando archivo de entorno: $env_file"
    
    if [ ! -f "$env_file" ]; then
        print_error "Archivo no encontrado: $env_file"
        return 1
    fi
    
    # Check for required variables
    local required_vars=(
        "DATABASE_URL"
        "TELEGRAM_BOT_TOKEN"
        "OPENAI_API_KEY"
        "JWT_SECRET"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_warning "Variables faltantes en $env_file:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi
    
    print_success "Todas las variables requeridas están presentes"
    return 0
}

# Function to encrypt secrets
encrypt_secret() {
    local secret=$1
    local key=$2
    
    echo -n "$secret" | openssl enc -aes-256-cbc -a -salt -pass pass:"$key" 2>/dev/null
}

# Function to decrypt secrets
decrypt_secret() {
    local encrypted=$1
    local key=$2
    
    echo -n "$encrypted" | openssl enc -aes-256-cbc -d -a -pass pass:"$key" 2>/dev/null
}

# Function to setup production environment
setup_production_env() {
    print_info "Configurando entorno de producción..."
    
    if [ ! -f "$ENV_TEMPLATE" ]; then
        print_error "Template no encontrado: $ENV_TEMPLATE"
        return 1
    fi
    
    cp "$ENV_TEMPLATE" "$ENV_PRODUCTION"
    
    print_info "Por favor, complete las siguientes variables en $ENV_PRODUCTION:"
    
    # Read template and prompt for values
    while IFS= read -r line; do
        if [[ $line =~ ^([A-Z_]+)=(.*)$ ]]; then
            var_name="${BASH_REMATCH[1]}"
            default_value="${BASH_REMATCH[2]}"
            
            # Skip comments and empty values
            if [[ ! $line =~ ^# ]] && [[ -z "$default_value" || "$default_value" == "your_"* ]]; then
                read -s -p "Ingrese valor para $var_name: " value
                echo
                
                if [ -n "$value" ]; then
                    sed -i "s|^${var_name}=.*|${var_name}=${value}|" "$ENV_PRODUCTION"
                fi
            fi
        fi
    done < "$ENV_TEMPLATE"
    
    chmod 600 "$ENV_PRODUCTION"
    print_success "Entorno de producción configurado"
}

# Function to backup secrets
backup_secrets() {
    local backup_dir="${BASE_PATH}/backups/secrets"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    mkdir -p "$backup_dir"
    
    print_info "Creando backup de secretos..."
    
    # Backup all sensitive files
    tar -czf "${backup_dir}/secrets_backup_${timestamp}.tar.gz" \
        -C "$BASE_PATH" \
        --exclude='*.log' \
        --exclude='node_modules' \
        .env* \
        config/watchtower/config.json \
        2>/dev/null || true
    
    chmod 600 "${backup_dir}/secrets_backup_${timestamp}.tar.gz"
    
    print_success "Backup creado: ${backup_dir}/secrets_backup_${timestamp}.tar.gz"
}

# Function to rotate secrets
rotate_secrets() {
    print_info "Rotando secretos..."
    
    # Generate new JWT secret
    local new_jwt_secret=$(openssl rand -hex 32)
    
    if [ -f "$ENV_PRODUCTION" ]; then
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${new_jwt_secret}|" "$ENV_PRODUCTION"
        print_success "JWT_SECRET rotado exitosamente"
    fi
    
    print_warning "Recuerde actualizar los secretos en GitHub Actions"
}

# Function to sync secrets with GitHub
sync_github_secrets() {
    print_info "Instrucciones para sincronizar secretos con GitHub:"
    echo
    echo "1. Vaya a: https://github.com/christianlb/ai-service/settings/secrets/actions"
    echo "2. Configure los siguientes secretos:"
    echo
    
    if [ -f "$ENV_PRODUCTION" ]; then
        echo "Secrets requeridos en GitHub:"
        echo "- DOCKERHUB_TOKEN (para Docker Hub si se usa)"
        echo "- NAS_SSH_PASSWORD (contraseña SSH del NAS)"
        echo "- NAS_SUDO_PASSWORD (contraseña sudo del NAS)"
        echo
        echo "Variables de entorno del archivo .env.production:"
        grep -E '^[A-Z_]+=' "$ENV_PRODUCTION" | cut -d'=' -f1 | while read -r var; do
            echo "- $var"
        done
    fi
}

# Function to verify security
verify_security() {
    print_info "Verificando seguridad de secretos..."
    
    local issues=0
    
    # Check file permissions
    if [ -f "$ENV_PRODUCTION" ]; then
        local perms=$(stat -c %a "$ENV_PRODUCTION" 2>/dev/null || stat -f %p "$ENV_PRODUCTION" | cut -c4-6)
        if [ "$perms" != "600" ]; then
            print_warning "Permisos incorrectos en .env.production (actual: $perms, esperado: 600)"
            ((issues++))
        fi
    fi
    
    if [ -f "$WATCHTOWER_CONFIG" ]; then
        local perms=$(stat -c %a "$WATCHTOWER_CONFIG" 2>/dev/null || stat -f %p "$WATCHTOWER_CONFIG" | cut -c4-6)
        if [ "$perms" != "600" ]; then
            print_warning "Permisos incorrectos en config.json (actual: $perms, esperado: 600)"
            ((issues++))
        fi
    fi
    
    # Check for secrets in git
    if git grep -q -E "(password|token|secret|key).*=.*[a-zA-Z0-9]" -- '*.js' '*.ts' '*.json' 2>/dev/null; then
        print_warning "Posibles secretos encontrados en el código"
        ((issues++))
    fi
    
    if [ $issues -eq 0 ]; then
        print_success "No se encontraron problemas de seguridad"
    else
        print_error "Se encontraron $issues problemas de seguridad"
    fi
}

# Main menu
show_menu() {
    echo
    echo "=== Gestor Seguro de Secretos - AI Service ==="
    echo
    echo "1. Configurar credenciales de GitHub Container Registry"
    echo "2. Configurar entorno de producción"
    echo "3. Validar archivo de entorno"
    echo "4. Crear backup de secretos"
    echo "5. Rotar secretos"
    echo "6. Sincronizar con GitHub Actions"
    echo "7. Verificar seguridad"
    echo "8. Configuración completa (recomendado)"
    echo "0. Salir"
    echo
}

# Complete setup
complete_setup() {
    print_info "Iniciando configuración completa..."
    
    # Create necessary directories
    mkdir -p "${CONFIG_DIR}/watchtower"
    mkdir -p "${BASE_PATH}/backups/secrets"
    
    # Setup GHCR credentials
    setup_ghcr_credentials
    
    # Setup production environment
    setup_production_env
    
    # Validate environment
    validate_env_file "$ENV_PRODUCTION"
    
    # Create backup
    backup_secrets
    
    # Verify security
    verify_security
    
    # Show sync instructions
    sync_github_secrets
    
    print_success "Configuración completa finalizada"
}

# Main execution
main() {
    if [ "$#" -eq 0 ]; then
        while true; do
            show_menu
            read -p "Seleccione una opción: " choice
            
            case $choice in
                1) setup_ghcr_credentials ;;
                2) setup_production_env ;;
                3) 
                    read -p "Archivo a validar (.env.production): " env_file
                    env_file=${env_file:-$ENV_PRODUCTION}
                    validate_env_file "$env_file"
                    ;;
                4) backup_secrets ;;
                5) rotate_secrets ;;
                6) sync_github_secrets ;;
                7) verify_security ;;
                8) complete_setup ;;
                0) 
                    print_info "Saliendo..."
                    exit 0
                    ;;
                *) print_error "Opción inválida" ;;
            esac
            
            echo
            read -p "Presione Enter para continuar..."
        done
    else
        # Execute specific command if provided
        case $1 in
            ghcr) setup_ghcr_credentials ;;
            env) setup_production_env ;;
            validate) validate_env_file "${2:-$ENV_PRODUCTION}" ;;
            backup) backup_secrets ;;
            rotate) rotate_secrets ;;
            sync) sync_github_secrets ;;
            verify) verify_security ;;
            setup) complete_setup ;;
            *) 
                print_error "Comando no reconocido: $1"
                echo "Comandos disponibles: ghcr, env, validate, backup, rotate, sync, verify, setup"
                exit 1
                ;;
        esac
    fi
}

# Run main function
main "$@"