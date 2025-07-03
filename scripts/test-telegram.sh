#!/bin/bash

echo "=== Testing Telegram Bot Configuration ==="
echo ""

# Function to test bot token
test_bot_token() {
    local TOKEN=$1
    if [ -z "$TOKEN" ] || [ "$TOKEN" == "your-telegram-bot-token" ]; then
        echo "❌ Invalid token: $TOKEN"
        return 1
    fi
    
    echo "Testing bot token..."
    RESPONSE=$(curl -s "https://api.telegram.org/bot${TOKEN}/getMe")
    
    if echo "$RESPONSE" | grep -q '"ok":true'; then
        echo "✅ Bot token is valid"
        echo "$RESPONSE" | grep -o '"username":"[^"]*"' | sed 's/"username":"/Bot username: /' | sed 's/"$//'
        return 0
    else
        echo "❌ Bot token is invalid or bot is not accessible"
        echo "Response: $RESPONSE"
        return 1
    fi
}

# Function to get webhook info
get_webhook_info() {
    local TOKEN=$1
    echo ""
    echo "Checking webhook configuration..."
    WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${TOKEN}/getWebhookInfo")
    
    if echo "$WEBHOOK_INFO" | grep -q '"url":""'; then
        echo "ℹ️  No webhook configured (bot using polling)"
    else
        echo "Webhook info:"
        echo "$WEBHOOK_INFO" | grep -o '"url":"[^"]*"' | sed 's/"url":"/  URL: /' | sed 's/"$//'
        echo "$WEBHOOK_INFO" | grep -o '"pending_update_count":[0-9]*' | sed 's/"pending_update_count":/  Pending updates: /'
    fi
}

# Test local environment
echo "1. Testing local environment variables..."
if [ -f ".env.local" ]; then
    source .env.local
    if [ ! -z "$TELEGRAM_BOT_TOKEN" ]; then
        test_bot_token "$TELEGRAM_BOT_TOKEN"
        get_webhook_info "$TELEGRAM_BOT_TOKEN"
    else
        echo "❌ TELEGRAM_BOT_TOKEN not found in .env.local"
    fi
else
    echo "⚠️  No .env.local file found"
fi

echo ""
echo "2. Testing production container..."
CONTAINER=$(docker ps --format "table {{.Names}}" | grep -E "(ai-service-prod|ai-service-app)" | head -1)

if [ ! -z "$CONTAINER" ]; then
    echo "Using container: $CONTAINER"
    
    # Get token from container
    TOKEN=$(docker exec $CONTAINER sh -c 'echo $TELEGRAM_BOT_TOKEN')
    CHAT_ID=$(docker exec $CONTAINER sh -c 'echo $TELEGRAM_CHAT_ID')
    WEBHOOK_URL=$(docker exec $CONTAINER sh -c 'echo $TELEGRAM_WEBHOOK_URL')
    
    echo "Container configuration:"
    echo "  TELEGRAM_BOT_TOKEN: ${TOKEN:0:10}..."
    echo "  TELEGRAM_CHAT_ID: $CHAT_ID"
    echo "  TELEGRAM_WEBHOOK_URL: $WEBHOOK_URL"
    
    if [ "$TOKEN" != "" ] && [ "$TOKEN" != "your-telegram-bot-token" ]; then
        test_bot_token "$TOKEN"
        get_webhook_info "$TOKEN"
    else
        echo "❌ Invalid or missing TELEGRAM_BOT_TOKEN in container"
    fi
else
    echo "⚠️  No production container found"
fi

echo ""
echo "3. Testing Telegram service endpoints..."
if [ ! -z "$CONTAINER" ]; then
    # Test status endpoint
    echo "Testing /api/telegram/status..."
    curl -s http://localhost:3001/api/telegram/status | grep -q "ok" && echo "✅ Telegram status endpoint OK" || echo "❌ Telegram status endpoint failed"
fi

echo ""
echo "=== Telegram Test Complete ==="