#\!/bin/bash
source .make.env
export SSHPASS

echo "=== Applying init-financial.sql manually ==="
sshpass -e ssh k2600x@192.168.1.11 "cat /volume1/docker/ai-service/config/init-financial.sql  < /dev/null |  echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker exec -i ai-postgres psql -U ai_user -d ai_service"

echo -e "\n=== Verifying application ==="
sshpass -e ssh k2600x@192.168.1.11 "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c \"SELECT column_name FROM information_schema.columns WHERE table_schema = 'financial' AND table_name = 'transactions' AND column_name = 'gocardless_data';\""
