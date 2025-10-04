#!/bin/bash

# Test script for message classification and routing
# Demonstrates different message types and their routing

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REDIS_CMD="docker exec microservices-redis redis-cli -a microservices_redis_2025 --no-auth-warning"

echo -e "${BLUE}=== Message Classification & Routing Test ===${NC}"
echo ""

# Test 1: Trading Command
echo -e "${YELLOW}Test 1: Trading Command${NC}"
CORRELATION_ID="test-cmd-$(date +%s)"
$REDIS_CMD XADD comm.telegram.incoming '*' \
  correlationId "$CORRELATION_ID" \
  chatId "12345" \
  text "/cmd trading.execute pair=BTC/USDT size=0.1" \
  senderId "admin" \
  messageId "msg-1" \
  timestamp "$(date -Iseconds)" > /dev/null
echo "Sent: /cmd trading.execute pair=BTC/USDT size=0.1"
echo "Expected routing: trading-service (high priority)"
echo ""
sleep 2

# Test 2: Market Analysis Question
echo -e "${YELLOW}Test 2: Market Analysis${NC}"
CORRELATION_ID="test-analysis-$(date +%s)"
$REDIS_CMD XADD comm.telegram.incoming '*' \
  correlationId "$CORRELATION_ID" \
  chatId "12345" \
  text "Analyze BTC price trend for the last week" \
  senderId "admin" \
  messageId "msg-2" \
  timestamp "$(date -Iseconds)" > /dev/null
echo "Sent: Analyze BTC price trend for the last week"
echo "Expected routing: trading-service + ai-service"
echo ""
sleep 2

# Test 3: Content Sharing
echo -e "${YELLOW}Test 3: Content URL${NC}"
CORRELATION_ID="test-content-$(date +%s)"
$REDIS_CMD XADD comm.telegram.incoming '*' \
  correlationId "$CORRELATION_ID" \
  chatId "12345" \
  text "Check this article: https://example.com/defi-yields.pdf" \
  senderId "admin" \
  messageId "msg-3" \
  timestamp "$(date -Iseconds)" > /dev/null
echo "Sent: URL with PDF"
echo "Expected routing: content-service"
echo ""
sleep 2

# Test 4: Simple Question
echo -e "${YELLOW}Test 4: Simple Question${NC}"
CORRELATION_ID="test-question-$(date +%s)"
$REDIS_CMD XADD comm.telegram.incoming '*' \
  correlationId "$CORRELATION_ID" \
  chatId "12345" \
  text "What is the current gas price on Ethereum?" \
  senderId "admin" \
  messageId "msg-4" \
  timestamp "$(date -Iseconds)" > /dev/null
echo "Sent: What is the current gas price on Ethereum?"
echo "Expected routing: ai-service (with context)"
echo ""
sleep 2

# Test 5: Greeting
echo -e "${YELLOW}Test 5: Greeting${NC}"
CORRELATION_ID="test-greeting-$(date +%s)"
$REDIS_CMD XADD comm.telegram.incoming '*' \
  correlationId "$CORRELATION_ID" \
  chatId "12345" \
  text "Hello! Good morning" \
  senderId "admin" \
  messageId "msg-5" \
  timestamp "$(date -Iseconds)" > /dev/null
echo "Sent: Hello! Good morning"
echo "Expected routing: ai-service (low priority, no memory)"
echo ""
sleep 3

# Check results
echo -e "${BLUE}=== Checking Stream Queues ===${NC}"
echo ""

echo "Trading commands:"
$REDIS_CMD XLEN trading.command.request 2>/dev/null || echo "Stream not created yet"

echo "Trading analytics:"
$REDIS_CMD XLEN trading.analytics.request 2>/dev/null || echo "Stream not created yet"

echo "Content store:"
$REDIS_CMD XLEN content.store.request 2>/dev/null || echo "Stream not created yet"

echo "Memory store:"
$REDIS_CMD XLEN memory.store.request 2>/dev/null || echo "Stream not created yet"

echo "AI chat:"
$REDIS_CMD XLEN ai.chat.request 2>/dev/null || echo "Stream not created yet"

echo "AI responses:"
$REDIS_CMD XLEN ai.telegram.reply 2>/dev/null || echo "Stream exists with messages"

echo ""
echo -e "${GREEN}Test complete!${NC}"
echo ""
echo "To enable intelligent routing in AI service:"
echo "1. Set ENABLE_INTELLIGENT_ROUTING=true"
echo "2. Restart AI service"
echo "3. Messages will be classified and routed to appropriate services"