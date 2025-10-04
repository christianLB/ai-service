#!/bin/bash
# Autonomous Telegram Flow Testing Script
# Simulates messages directly in Redis Streams for testing

set -e

REDIS_HOST="${REDIS_HOST:-192.168.1.11}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASS="${REDIS_PASS:-microservices_redis_2025}"
STREAM_KEY="comm.telegram.incoming"
REPLY_STREAM="ai.telegram.reply"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Autonomous Telegram Flow Tester${NC}"
echo -e "${BLUE}====================================${NC}\n"

# Function to publish message to Redis Stream
publish_message() {
    local text="$1"
    local correlation_id=$(uuidgen 2>/dev/null || echo "test-$(date +%s)")
    local chat_id="5015255679"
    local message_id="test-$(date +%s)"

    echo -e "${YELLOW}📤 Publishing message to Redis...${NC}"
    echo -e "   Text: ${GREEN}\"${text}\"${NC}"
    echo -e "   Stream: ${STREAM_KEY}"
    echo -e "   CorrelationID: ${correlation_id}\n"

    # Publish to Redis Stream using docker exec on comm-redis
    ssh k2600x@${REDIS_HOST} "sudo /usr/local/bin/docker exec comm-redis redis-cli XADD ${STREAM_KEY} '*' \
        correlationId '${correlation_id}' \
        messageId '${message_id}' \
        chatId '${chat_id}' \
        senderId '${chat_id}' \
        text '${text}' \
        timestamp '$(date -Iseconds)'" 2>&1

    echo -e "${GREEN}✅ Message published${NC}\n"
    echo "$correlation_id"
}

# Function to check for AI response
wait_for_response() {
    local correlation_id="$1"
    local max_wait=10
    local waited=0

    echo -e "${YELLOW}⏳ Waiting for AI response (max ${max_wait}s)...${NC}"

    while [ $waited -lt $max_wait ]; do
        # Check if response exists in reply stream
        response=$(ssh k2600x@${REDIS_HOST} "sudo /usr/local/bin/docker exec comm-redis redis-cli XREAD COUNT 100 STREAMS ${REPLY_STREAM} 0" 2>&1 | \
            grep -A 20 "${correlation_id}" | grep -A 5 "replyText" | tail -1 || echo "")

        if [ ! -z "$response" ]; then
            echo -e "${GREEN}✅ Response received!${NC}"
            echo -e "   ${response}\n"
            return 0
        fi

        sleep 1
        waited=$((waited + 1))
        echo -ne "   Waited ${waited}s...\r"
    done

    echo -e "\n${RED}❌ No response after ${max_wait}s${NC}\n"
    return 1
}

# Function to check ai-service logs
check_ai_service_logs() {
    local correlation_id="$1"

    echo -e "${YELLOW}🔍 Checking ai-service logs for correlation: ${correlation_id}${NC}\n"

    ssh k2600x@${REDIS_HOST} "sudo /usr/local/bin/docker logs ai-service --since 30s 2>&1" | \
        grep -i "${correlation_id}\|processing\|intent\|hybrid\|route" | \
        tail -20 || echo "No relevant logs found"

    echo ""
}

# Function to check stream consumer status
check_consumer_status() {
    echo -e "${YELLOW}📊 Checking Redis Stream Consumer Status${NC}\n"

    # Check consumer group info
    ssh k2600x@${REDIS_HOST} "sudo /usr/local/bin/docker exec comm-redis redis-cli XINFO GROUPS ${STREAM_KEY}" 2>&1 || echo "No consumer groups found"

    echo ""

    # Check pending messages
    echo -e "${YELLOW}📋 Pending Messages:${NC}"
    ssh k2600x@${REDIS_HOST} "sudo /usr/local/bin/docker exec comm-redis redis-cli XPENDING ${STREAM_KEY} ai-service" 2>&1

    echo ""
}

# Test Cases
echo -e "${BLUE}Test 1: Simple Chat Message${NC}"
echo -e "${BLUE}=============================${NC}\n"
corr_id=$(publish_message "Hola, ¿cómo estás?")
wait_for_response "$corr_id"
check_ai_service_logs "$corr_id"

echo -e "\n${BLUE}Test 2: Query Message${NC}"
echo -e "${BLUE}=====================${NC}\n"
corr_id=$(publish_message "Busca documentos sobre Bitcoin")
wait_for_response "$corr_id"
check_ai_service_logs "$corr_id"

echo -e "\n${BLUE}Test 3: Task Message${NC}"
echo -e "${BLUE}=====================${NC}\n"
corr_id=$(publish_message "Genera un reporte de gastos del mes")
wait_for_response "$corr_id"
check_ai_service_logs "$corr_id"

echo -e "\n${BLUE}Test 4: Command Message${NC}"
echo -e "${BLUE}========================${NC}\n"
corr_id=$(publish_message "/help")
wait_for_response "$corr_id"
check_ai_service_logs "$corr_id"

# Final status check
echo -e "\n${BLUE}Final Consumer Status Check${NC}"
echo -e "${BLUE}============================${NC}\n"
check_consumer_status

echo -e "${GREEN}✅ All tests completed!${NC}\n"
