#!/bin/bash
# Quick diagnostic script for ai-service consumer

REDIS_HOST="192.168.1.11"
REDIS_PASS="microservices_redis_2025"

echo "🔍 AI Service Consumer Diagnostics"
echo "===================================="
echo ""

echo "1️⃣ Container Status:"
ssh k2600x@${REDIS_HOST} "sudo /usr/local/bin/docker ps | grep ai-service"
echo ""

echo "2️⃣ Recent Logs (last 20 lines):"
ssh k2600x@${REDIS_HOST} "sudo /usr/local/bin/docker logs ai-service --tail 20 2>&1"
echo ""

echo "3️⃣ Consumer Group Status:"
ssh k2600x@${REDIS_HOST} "redis-cli -a ${REDIS_PASS} XINFO GROUPS comm.telegram.incoming 2>&1 | grep -v Warning"
echo ""

echo "4️⃣ Pending Messages:"
ssh k2600x@${REDIS_HOST} "redis-cli -a ${REDIS_PASS} XPENDING comm.telegram.incoming ai-service 2>&1 | grep -v Warning"
echo ""

echo "5️⃣ Last 5 messages in stream:"
ssh k2600x@${REDIS_HOST} "redis-cli -a ${REDIS_PASS} XREVRANGE comm.telegram.incoming + - COUNT 5 2>&1 | grep -v Warning | head -30"
echo ""

echo "6️⃣ Environment Variables:"
ssh k2600x@${REDIS_HOST} "sudo /usr/local/bin/docker exec ai-service /nodejs/bin/node -e \"console.log('REDIS_URL:', process.env.REDIS_URL); console.log('ENABLE_HYBRID_INTENT_CLASSIFIER:', process.env.ENABLE_HYBRID_INTENT_CLASSIFIER);\""
echo ""

echo "7️⃣ Check if consumer loop is running (look for XREADGROUP):"
ssh k2600x@${REDIS_HOST} "sudo /usr/local/bin/docker exec ai-service ps aux | grep node"
echo ""

echo "✅ Diagnostics complete"
