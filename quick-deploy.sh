#!/bin/bash
# Quick deployment script for BBVA sync

echo "🚀 Quick deployment to production..."

# Copy essential files
echo "📦 Copying files to NAS..."
source .make.env

# Copy docker-compose
sshpass -p "${SSHPASS}" scp docker-compose.production.yml ${NAS_USER}@${NAS_HOST}:/volume1/docker/ai-service/docker-compose.yml

# Copy frontend dist
tar -czf frontend-dist.tar.gz -C frontend/dist .
sshpass -p "${SSHPASS}" scp frontend-dist.tar.gz ${NAS_USER}@${NAS_HOST}:/tmp/
rm frontend-dist.tar.gz

# Extract on NAS
sshpass -p "${SSHPASS}" ssh ${NAS_USER}@${NAS_HOST} "cd /volume1/docker/ai-service && tar -xzf /tmp/frontend-dist.tar.gz -C frontend/dist/ && rm /tmp/frontend-dist.tar.gz"

echo "✅ Files deployed. Now restart the service manually in Docker Container Manager"