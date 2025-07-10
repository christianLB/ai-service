#!/bin/bash
# Script para primer despliegue con autenticación GHCR

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment
source .make.env

echo -e "${BLUE}=== Primer despliegue de producción ===${NC}"

# Login to GHCR
echo -e "${YELLOW}1. Autenticando con GitHub Container Registry...${NC}"
echo "${GHCR_TOKEN}" | docker login ghcr.io -u ${GITHUB_USERNAME} --password-stdin

# Pull images locally first
echo -e "${YELLOW}2. Descargando imágenes...${NC}"
docker pull ghcr.io/christianlb/ai-service-api:latest
docker pull ghcr.io/christianlb/ai-service-frontend:latest

# Deploy to NAS
echo -e "${YELLOW}3. Desplegando en NAS...${NC}"
cd /volume1/docker/ai-service
docker-compose -f docker-compose.production.yml up -d

echo -e "${GREEN}✅ Despliegue completado${NC}"
docker-compose -f docker-compose.production.yml ps