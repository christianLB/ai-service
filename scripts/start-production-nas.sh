#!/bin/bash
# Script to start production on NAS with environment variables from .env.production

set -a  # Export all variables
source /volume1/docker/ai-service/config/.env.production
set +a  # Stop exporting

# Now start docker-compose with the environment loaded
cd /volume1/docker/ai-service
docker-compose down
docker-compose up -d

echo "Production started with environment from config/.env.production"