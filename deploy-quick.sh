#\!/bin/bash
# Deploy rápido a producción

# Configuración
NAS_HOST="192.168.1.11"
NAS_USER="k2600x"
NAS_PATH="/volume1/docker/ai-service"
SSHPASS='\!Nas3,14159265@'
SUDO_PASS='\!Nas3,14159265@'

echo "🚀 Iniciando deploy rápido a producción..."

# 1. Crear tarball con el código actualizado
echo "📦 Empaquetando código..."
tar -czf ai-service-update.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='dist' \
    --exclude='coverage' \
    --exclude='.env*' \
    src/ frontend/dist/ package*.json tsconfig.json

# 2. Copiar al NAS
echo "📤 Copiando al NAS..."
sshpass -p "$SSHPASS" scp ai-service-update.tar.gz $NAS_USER@$NAS_HOST:/tmp/

# 3. Actualizar en el NAS
echo "🔄 Actualizando código en producción..."
sshpass -p "$SSHPASS" ssh $NAS_USER@$NAS_HOST << REMOTE_COMMANDS
echo '$SUDO_PASS'  < /dev/null |  sudo -S tar -xzf /tmp/ai-service-update.tar.gz -C $NAS_PATH/
echo '$SUDO_PASS' | sudo -S chown -R $NAS_USER:users $NAS_PATH/
echo '$SUDO_PASS' | sudo -S rm /tmp/ai-service-update.tar.gz
echo '$SUDO_PASS' | sudo -S docker restart ai-service
REMOTE_COMMANDS

# 4. Verificar
sleep 5
echo "✅ Verificando estado..."
curl -s http://$NAS_HOST:3003/status | jq '.status'

echo "🎉 Deploy completado\!"
