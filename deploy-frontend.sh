#!/bin/bash
# Script para copiar frontend a producción

echo "📦 Copiando frontend a producción..."

# Crear directorio si no existe
echo "!Nas3,14159265@" | sshpass -e ssh k2600x@192.168.1.11 'sudo mkdir -p /volume1/docker/ai-service/frontend/dist'

# Copiar archivos
echo "!Nas3,14159265@" | sshpass -e scp -r frontend/dist/* k2600x@192.168.1.11:/tmp/

# Mover archivos a su destino final
echo "!Nas3,14159265@" | sshpass -e ssh k2600x@192.168.1.11 'sudo cp -r /tmp/assets /tmp/index.html /tmp/vite.svg /volume1/docker/ai-service/frontend/dist/'

echo "✅ Frontend copiado exitosamente"