#!/bin/bash
# Script para sincronizar docker-compose con producción

set -e

# Colores
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# Cargar variables
source .make.env

echo -e "${BLUE}📤 Sincronizando docker-compose con producción...${NC}"

# Copiar archivo al NAS
echo -e "${YELLOW}Copiando docker-compose.nas.yml -> docker-compose.yml en NAS...${NC}"
sshpass -e scp docker-compose.nas.yml ${NAS_USER}@${NAS_HOST}:${NAS_PATH}/docker-compose.yml

echo -e "${GREEN}✓ Archivo sincronizado${NC}"
echo -e "${YELLOW}Nota: Ejecuta 'make prod-recreate' para aplicar los cambios${NC}"