#!/bin/bash

echo "=== AI Service Health Diagnostics ==="
echo ""

# Check service status
echo "1. Checking service health endpoint..."
curl -s http://localhost:3000/status | jq . || echo "Failed to connect to service"
echo ""

# Check database connection
echo "2. Testing database connection..."
docker exec ai-service-postgres-1 psql -U ai_user -d ai_service -c "SELECT 1;" 2>/dev/null || echo "Database connection failed"
echo ""

# Check environment variables
echo "3. Checking Telegram configuration..."
docker exec ai-service-app-1 sh -c 'echo "TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN:0:10}..."'
docker exec ai-service-app-1 sh -c 'echo "TELEGRAM_CHAT_ID: $TELEGRAM_CHAT_ID"'
docker exec ai-service-app-1 sh -c 'echo "TELEGRAM_WEBHOOK_URL: $TELEGRAM_WEBHOOK_URL"'
echo ""

# Check logs for errors
echo "4. Recent error logs..."
docker logs ai-service-app-1 2>&1 | grep -i error | tail -10
echo ""

# Check pool statistics
echo "5. Database pool statistics (from /status endpoint)..."
curl -s http://localhost:3000/status | jq '.database.pool' 2>/dev/null || echo "Could not get pool statistics"
echo ""

echo "=== Diagnostics Complete ==="