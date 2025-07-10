#!/bin/bash
source .make.env
export SSHPASS

echo "=== Tablas en esquema financial - PRODUCCIÓN ==="
sshpass -e ssh k2600x@192.168.1.11 "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'financial' ORDER BY table_name;\""