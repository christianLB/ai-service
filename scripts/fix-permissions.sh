#!/bin/bash

# Fix permissions for AI Service on Synology NAS
# This script ensures all directories have correct ownership for the nodejs user (UID 1001)

echo "=== AI Service Permission Fix ==="
echo ""

# Variables
BASE_DIR="/volume1/docker/ai-service"
NODEJS_UID=1001
NODEJS_GID=1001

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run this script with sudo"
    echo "   sudo ./fix-permissions.sh"
    exit 1
fi

echo "📁 Setting correct permissions for AI Service directories..."
echo ""

# Create directories if they don't exist
echo "1. Creating missing directories..."
mkdir -p $BASE_DIR/documents/storage
mkdir -p $BASE_DIR/documents/temp
mkdir -p $BASE_DIR/documents/thumbnails
mkdir -p $BASE_DIR/knowledge
mkdir -p $BASE_DIR/workflows/storage
mkdir -p $BASE_DIR/logs

echo "✅ Directories created"
echo ""

# Change ownership to nodejs user (UID 1001)
echo "2. Setting ownership to nodejs user (UID $NODEJS_UID)..."
chown -R $NODEJS_UID:$NODEJS_GID $BASE_DIR/documents
chown -R $NODEJS_UID:$NODEJS_GID $BASE_DIR/knowledge
chown -R $NODEJS_UID:$NODEJS_GID $BASE_DIR/workflows
chown -R $NODEJS_UID:$NODEJS_GID $BASE_DIR/logs

echo "✅ Ownership set"
echo ""

# Set permissions
echo "3. Setting permissions (755 for directories, 644 for files)..."
find $BASE_DIR/documents -type d -exec chmod 755 {} \;
find $BASE_DIR/documents -type f -exec chmod 644 {} \;
find $BASE_DIR/knowledge -type d -exec chmod 755 {} \;
find $BASE_DIR/knowledge -type f -exec chmod 644 {} \;
find $BASE_DIR/workflows -type d -exec chmod 755 {} \;
find $BASE_DIR/workflows -type f -exec chmod 644 {} \;
find $BASE_DIR/logs -type d -exec chmod 755 {} \;
find $BASE_DIR/logs -type f -exec chmod 644 {} \;

echo "✅ Permissions set"
echo ""

# Verify
echo "4. Verifying permissions..."
echo ""
echo "Documents directory:"
ls -la $BASE_DIR/documents/
echo ""
echo "Documents/storage directory:"
ls -la $BASE_DIR/documents/storage/
echo ""

echo "✅ Permission fix complete!"
echo ""
echo "You can now restart the AI Service container:"
echo "  docker-compose -f docker-compose.production.yml restart ai-service"
echo ""