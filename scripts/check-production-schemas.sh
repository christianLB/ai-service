#!/bin/bash
# Check production schemas

source .make.env
export SSHPASS
export SUDO_PASS

echo "📋 Checking production schemas..."

# Check schemas
echo ""
echo "1. List all schemas:"
sshpass -e ssh -o StrictHostKeyChecking=no k2600x@192.168.1.11 "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c 'SELECT schema_name FROM information_schema.schemata ORDER BY schema_name;'"

echo ""
echo "2. Check if documents schema exists:"
sshpass -e ssh -o StrictHostKeyChecking=no k2600x@192.168.1.11 "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c \"SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'documents');\""

echo ""
echo "3. List financial schema tables:"
sshpass -e ssh -o StrictHostKeyChecking=no k2600x@192.168.1.11 "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'financial' ORDER BY table_name;\""