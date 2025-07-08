#!/bin/bash
# Reset inmediato de la BD

source .make.env
export SSHPASS SUDO_PASS

echo "🚀 Iniciando reset de base de datos..."

echo "1️⃣ Deteniendo contenedores..."
sshpass -e ssh k2600x@192.168.1.11 "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker stop ai-service ai-postgres ai-redis watchtower"

echo "2️⃣ Limpiando datos..."
sshpass -e ssh k2600x@192.168.1.11 "echo '$SUDO_PASS' | sudo -S rm -rf /volume1/docker/ai-service/postgres-data/*"

echo "3️⃣ Verificando que el schema está en su lugar..."
sshpass -e ssh k2600x@192.168.1.11 "ls -la /volume1/docker/ai-service/config/*.sql | tail -5"

echo "4️⃣ Iniciando contenedores..."
sshpass -e ssh k2600x@192.168.1.11 "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker start ai-postgres ai-redis ai-service watchtower"

echo "⏳ Esperando 30 segundos para que los servicios inicien..."
sleep 30

echo "5️⃣ Verificando estado..."
curl -s http://192.168.1.11:3003/status | python3 -c "import sys, json; d = json.load(sys.stdin); print(f\"Estado: {d['status']}\")"

echo "✅ Reset completado!"