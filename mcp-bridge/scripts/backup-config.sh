#!/bin/bash
# Secure Backup Script for MCP Bridge Configuration
# Creates encrypted backups without exposing sensitive data

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
ENV_PROD_FILE="${SCRIPT_DIR}/../.env.production"
BACKUP_DIR="${SCRIPT_DIR}/../backups"
MAX_BACKUPS=10

# Function to create encrypted backup
create_backup() {
    local source_file=$1
    local backup_type=$2
    
    if [ ! -f "$source_file" ]; then
        echo -e "${RED}❌ Source file not found: $source_file${NC}"
        return 1
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"
    
    # Generate backup filename
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="config-${backup_type}-${timestamp}"
    local backup_file="${BACKUP_DIR}/${backup_name}.tar.gz.enc"
    
    # Create temporary directory
    local temp_dir=$(mktemp -d)
    
    # Copy config file to temp directory
    cp "$source_file" "${temp_dir}/$(basename $source_file)"
    
    # Add metadata file
    cat > "${temp_dir}/backup-info.txt" << EOF
Backup Information
==================
Type: ${backup_type}
Date: $(date)
Source: $(basename $source_file)
Host: $(hostname)
User: $(whoami)
EOF
    
    # Create tarball
    tar -czf "${temp_dir}/${backup_name}.tar.gz" -C "$temp_dir" \
        "$(basename $source_file)" "backup-info.txt" 2>/dev/null
    
    # Encrypt the backup using OpenSSL with a generated key
    # Generate a random encryption key
    local encrypt_key=$(openssl rand -hex 32)
    
    # Encrypt the backup
    openssl enc -aes-256-cbc -salt -pbkdf2 \
        -in "${temp_dir}/${backup_name}.tar.gz" \
        -out "$backup_file" \
        -pass "pass:${encrypt_key}"
    
    # Save the encryption key in a separate file (also protected)
    echo "$encrypt_key" | openssl enc -aes-256-cbc -salt -pbkdf2 \
        -out "${backup_file}.key" \
        -pass "pass:$(hostname)-mcp-backup"
    
    # Set secure permissions
    chmod 600 "$backup_file" "${backup_file}.key"
    
    # Clean up temp directory
    rm -rf "$temp_dir"
    
    echo -e "${GREEN}✅ Backup created: $(basename $backup_file)${NC}"
    
    # Clean old backups
    clean_old_backups "$backup_type"
    
    return 0
}

# Function to clean old backups
clean_old_backups() {
    local backup_type=$1
    
    echo -e "${BLUE}Cleaning old backups...${NC}"
    
    # Count existing backups of this type
    local backup_count=$(ls -1 "${BACKUP_DIR}"/config-${backup_type}-*.tar.gz.enc 2>/dev/null | wc -l)
    
    if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
        # Remove oldest backups
        local remove_count=$((backup_count - MAX_BACKUPS))
        ls -1t "${BACKUP_DIR}"/config-${backup_type}-*.tar.gz.enc | tail -n "$remove_count" | while read -r old_backup; do
            rm -f "$old_backup" "${old_backup}.key"
            echo -e "${YELLOW}Removed old backup: $(basename $old_backup)${NC}"
        done
    fi
}

# Function to list backups
list_backups() {
    echo -e "${BLUE}Available backups:${NC}"
    echo -e "${BLUE}==================${NC}"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        echo -e "${YELLOW}No backups found${NC}"
        return
    fi
    
    ls -1t "${BACKUP_DIR}"/*.tar.gz.enc 2>/dev/null | while read -r backup; do
        local size=$(ls -lh "$backup" | awk '{print $5}')
        local date=$(stat -c %y "$backup" 2>/dev/null || stat -f %m "$backup" | xargs -I {} date -r {})
        echo "$(basename $backup) - ${size} - ${date}"
    done
}

# Function to verify backup
verify_backup() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}❌ Backup file not found${NC}"
        return 1
    fi
    
    if [ ! -f "${backup_file}.key" ]; then
        echo -e "${RED}❌ Backup key file not found${NC}"
        return 1
    fi
    
    # Try to decrypt to test integrity
    local temp_test=$(mktemp)
    
    # Get the encryption key
    local encrypt_key=$(openssl enc -aes-256-cbc -salt -pbkdf2 -d \
        -in "${backup_file}.key" \
        -pass "pass:$(hostname)-mcp-backup" 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to decrypt backup key${NC}"
        rm -f "$temp_test"
        return 1
    fi
    
    # Test decryption
    openssl enc -aes-256-cbc -salt -pbkdf2 -d \
        -in "$backup_file" \
        -out "$temp_test" \
        -pass "pass:${encrypt_key}" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup verified successfully${NC}"
        rm -f "$temp_test"
        return 0
    else
        echo -e "${RED}❌ Backup verification failed${NC}"
        rm -f "$temp_test"
        return 1
    fi
}

# Main function
main() {
    echo -e "${BLUE}💾 MCP Bridge Configuration Backup${NC}"
    echo -e "${BLUE}=================================${NC}"
    echo ""
    
    case "$1" in
        --production|-p)
            create_backup "$ENV_PROD_FILE" "production"
            ;;
        --list|-l)
            list_backups
            ;;
        --verify|-v)
            if [ -z "$2" ]; then
                echo -e "${RED}❌ Please specify backup file to verify${NC}"
                exit 1
            fi
            verify_backup "$2"
            ;;
        --all|-a)
            # Backup both development and production if they exist
            if [ -f "$ENV_FILE" ]; then
                create_backup "$ENV_FILE" "development"
            fi
            if [ -f "$ENV_PROD_FILE" ]; then
                create_backup "$ENV_PROD_FILE" "production"
            fi
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --production, -p    Backup production configuration"
            echo "  --all, -a          Backup all configurations"
            echo "  --list, -l         List available backups"
            echo "  --verify, -v FILE  Verify a backup file"
            echo "  --help, -h         Show this help message"
            echo ""
            echo "Default: Backup development configuration"
            ;;
        *)
            # Default: backup development
            create_backup "$ENV_FILE" "development"
            ;;
    esac
    
    echo ""
    echo -e "${YELLOW}Note: Backups are encrypted and require the hostname-based key to restore${NC}"
}

# Run main function
main "$@"