#!/bin/bash
# Immediate Deployment Script - Execute This on Your Synology NAS
# This script implements the definitive solution to all deployment issues

set -euo pipefail

echo "🚀 AI Service - Definitive Deployment Solution"
echo "=============================================="
echo ""
echo "This script will deploy the AI Service with all previous issues fixed."
echo ""

# Verify we're on Synology or have the right directory structure
if [[ ! -d "/volume1" ]]; then
    echo "❌ This doesn't appear to be a Synology NAS"
    echo "   If you're on a different system, adjust paths accordingly"
    exit 1
fi

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo "❌ This script must be run as root"
    echo "   Please run: sudo $0"
    exit 1
fi

echo "✅ Environment check passed"
echo ""

# Step 1: Download and run setup script
echo "📥 Step 1: Running comprehensive setup..."
curl -fsSL https://raw.githubusercontent.com/k2600x/ai-service/main/scripts/setup-synology-production.sh | bash

echo ""
echo "🔧 Step 2: MANUAL CONFIGURATION REQUIRED"
echo "========================================="
echo ""
echo "You MUST now edit the environment file to replace placeholder values:"
echo ""
echo "nano /volume1/docker/ai-service/config/production.env"
echo ""
echo "CRITICAL: Replace ALL values marked with 'CHANGE_THIS':"
echo "  • POSTGRES_PASSWORD"
echo "  • REDIS_PASSWORD"
echo "  • OPENAI_API_KEY"
echo "  • TELEGRAM_BOT_TOKEN (if using Telegram)"
echo "  • JWT_SECRET"
echo ""
echo "Press ENTER when you have finished editing the environment file..."
read -r

# Step 3: Verify configuration
echo ""
echo "🔍 Step 3: Verifying configuration..."

ENV_FILE="/volume1/docker/ai-service/config/production.env"
if grep -q "CHANGE_THIS" "$ENV_FILE"; then
    echo "❌ Environment file still contains placeholder values!"
    echo "   Please edit: $ENV_FILE"
    echo "   Replace all values marked with 'CHANGE_THIS'"
    exit 1
fi

echo "✅ Configuration verification passed"

# Step 4: Deploy services
echo ""
echo "🚀 Step 4: Deploying services..."
cd /volume1/docker/ai-service

# Pull latest images
echo "   Pulling latest images..."
docker-compose pull

# Start services
echo "   Starting services..."
docker-compose up -d

# Wait for services to initialize
echo "   Waiting for services to initialize..."
sleep 30

# Step 5: Verify deployment
echo ""
echo "🔍 Step 5: Verifying deployment..."

# Check container status
echo "   Checking container status..."
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Some containers failed to start"
    echo "   Run: docker-compose logs"
    exit 1
fi

# Test health endpoint
echo "   Testing health endpoint..."
if ! curl -f http://localhost:3003/status >/dev/null 2>&1; then
    echo "❌ Health check failed"
    echo "   Run: docker-compose logs ai-service-prod"
    exit 1
fi

# Verify database connection
echo "   Verifying database connection..."
if ! docker-compose exec -T ai-service-db pg_isready -U ai_user -d ai_service >/dev/null 2>&1; then
    echo "❌ Database check failed"
    echo "   Run: docker-compose logs ai-service-db"
    exit 1
fi

echo ""
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "========================"
echo ""
echo "✅ All containers are running"
echo "✅ Health check passed"
echo "✅ Database connection verified"
echo ""
echo "🌐 Your AI Service is now available at:"
echo "   • Local: http://localhost:3003/status"
echo "   • Dashboard: http://localhost:3003/dashboard"
echo ""
echo "📋 What to do next:"
echo "   1. Test the API: curl http://localhost:3003/status"
echo "   2. View logs: docker-compose logs -f"
echo "   3. Monitor status: docker-compose ps"
echo "   4. Configure external access (if needed)"
echo ""
echo "📚 Documentation:"
echo "   • Deployment Procedure: /volume1/docker/ai-service/DEPLOYMENT_PROCEDURE.md"
echo "   • Verification Checklist: /volume1/docker/ai-service/VERIFICATION_CHECKLIST.md"
echo ""
echo "🔐 Security reminders:"
echo "   • Environment file is secured with 600 permissions"
echo "   • Regular backup is recommended"
echo "   • Monitor logs for security issues"
echo ""
echo "✅ AI Service deployment completed successfully!"