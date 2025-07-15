#!/bin/bash
# Script para cargar imagen Docker en el NAS

echo "📦 La imagen Docker está en: /tmp/ai-service-production.tar.gz"
echo ""
echo "🔧 Ejecuta estos comandos en el NAS:"
echo ""
echo "1. Conecta al NAS via SSH"
echo "2. Ejecuta:"
echo "   cd /tmp"
echo "   sudo docker load < <(gunzip -c ai-service-production.tar.gz)"
echo "   sudo docker tag ai-service:simple ghcr.io/christianlb/ai-service:latest"
echo ""
echo "3. Luego en el directorio del proyecto:"
echo "   cd /volume1/docker/ai-service"
echo "   sudo docker-compose up -d"
echo ""
echo "4. Verifica que funcione en: http://192.168.1.11:3003"