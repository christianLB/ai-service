#!/bin/bash
# Aplicar schema via SSH

source .make.env
export SSHPASS

echo "📋 Aplicando schema completo..."

# Copiar el archivo temporalmente a un lugar accesible
sshpass -e ssh k2600x@192.168.1.11 "cp /volume1/docker/ai-service/config/complete-production-schema.sql /tmp/"

# Aplicar el schema
sshpass -e ssh k2600x@192.168.1.11 "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker exec -i ai-postgres psql -U ai_user -d ai_service < /tmp/complete-production-schema.sql"

echo "✅ Schema aplicado"