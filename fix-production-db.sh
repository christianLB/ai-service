#!/bin/bash
# Fix production database schema

source .make.env
export SSHPASS

echo "🔧 Arreglando schema de producción..."

# Crear todas las tablas financieras necesarias
echo "📊 Creando tablas financieras..."

# Primero verificar si necesitamos crear las tablas
sshpass -e ssh k2600x@192.168.1.11 "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '\''financial'\'';'"

# Aplicar el schema completo desde el archivo local
echo "📝 Aplicando schema completo..."
cat scripts/complete-production-schema.sql | sshpass -e ssh k2600x@192.168.1.11 "cat > /tmp/schema.sql"

sshpass -e ssh k2600x@192.168.1.11 "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker exec -i ai-postgres psql -U ai_user -d ai_service < /tmp/schema.sql"

# Verificar resultado
echo "✅ Verificando tablas..."
sshpass -e ssh k2600x@192.168.1.11 "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c 'SELECT table_name FROM information_schema.tables WHERE table_schema = '\''financial'\'' ORDER BY table_name;'"

# Reiniciar servicio
echo "🔄 Reiniciando servicio..."
sshpass -e ssh k2600x@192.168.1.11 "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker restart ai-service"

echo "⏳ Esperando 10 segundos..."
sleep 10

# Verificar estado
echo "📊 Estado final:"
curl -s http://192.168.1.11:3003/api/financial/dashboard/overview | python3 -m json.tool || echo "Dashboard aún con errores"