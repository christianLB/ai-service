#\!/bin/bash
source .make.env
export SSHPASS

echo "=== Checking docker-compose status ==="
sshpass -e ssh k2600x@192.168.1.11 "cd /volume1/docker/ai-service && echo '$SUDO_PASS'  < /dev/null |  sudo -S /usr/local/bin/docker-compose ps"
