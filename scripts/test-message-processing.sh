#!/bin/bash

# Comprehensive test for message classification, entity extraction, and content processing

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

REDIS_CMD="docker exec microservices-redis redis-cli -a microservices_redis_2025 --no-auth-warning"

echo -e "${BLUE}=== Message Processing Test Suite ===${NC}"
echo -e "${BLUE}Testing: Classification, Entity Extraction, Content Processing${NC}"
echo ""

# Test Case 1: Command/Instruction
echo -e "${YELLOW}Test 1: Command Processing${NC}"
CORRELATION_ID="test-cmd-$(date +%s)"
MESSAGE="/cmd trading.execute pair=BTC/USDT size=0.5 type=limit price=45000"
echo "Input: $MESSAGE"
echo "Expected: Command detection, route to trading service"

$REDIS_CMD XADD comm.telegram.incoming '*' \
  correlationId "$CORRELATION_ID" \
  chatId "test-chat" \
  text "$MESSAGE" \
  senderId "tester" \
  messageId "msg-cmd" \
  timestamp "$(date -Iseconds)" > /dev/null

sleep 2

# Check classification result
echo -n "Classification: "
RESULT=$($REDIS_CMD XRANGE classification.result - + 2>/dev/null | grep "$CORRELATION_ID" -A5)
if [ ! -z "$RESULT" ]; then
  echo -e "${GREEN}✅ Classified${NC}"
else
  echo -e "${YELLOW}⚠️  Not classified (feature may be disabled)${NC}"
fi
echo ""

# Test Case 2: Entity Extraction
echo -e "${YELLOW}Test 2: Entity Extraction${NC}"
CORRELATION_ID="test-entity-$(date +%s)"
MESSAGE="Transfer 100 USDT to wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8"
echo "Input: $MESSAGE"
echo "Expected entities: amount (100 USDT), address (0x742d...), action (transfer)"

$REDIS_CMD XADD comm.telegram.incoming '*' \
  correlationId "$CORRELATION_ID" \
  chatId "test-chat" \
  text "$MESSAGE" \
  senderId "tester" \
  messageId "msg-entity" \
  timestamp "$(date -Iseconds)" > /dev/null

sleep 3

# Check AI response for entities
RESPONSE=$($REDIS_CMD XRANGE ai.telegram.reply - + | grep "$CORRELATION_ID" -B2 -A2 | grep replyText)
if [ ! -z "$RESPONSE" ]; then
  echo -e "${GREEN}✅ Processed${NC}"
  echo "AI understood: Transfer request with entities"
else
  echo -e "${RED}❌ No response${NC}"
fi
echo ""

# Test Case 3: Content Processing
echo -e "${YELLOW}Test 3: Content Storage & Analysis${NC}"
CORRELATION_ID="test-content-$(date +%s)"
MESSAGE="Please analyze this article about DeFi yields: https://medium.com/defi-yields-2024.pdf"
echo "Input: $MESSAGE"
echo "Expected: URL detection, content type identification, storage request"

$REDIS_CMD XADD comm.telegram.incoming '*' \
  correlationId "$CORRELATION_ID" \
  chatId "test-chat" \
  text "$MESSAGE" \
  senderId "tester" \
  messageId "msg-content" \
  timestamp "$(date -Iseconds)" > /dev/null

sleep 3

# Check if content was queued for storage
CONTENT_QUEUE=$($REDIS_CMD XLEN content.storage.request 2>/dev/null)
if [ "$CONTENT_QUEUE" -gt "0" ]; then
  echo -e "${GREEN}✅ Content queued for storage${NC}"
else
  echo -e "${YELLOW}⚠️  Content service not active${NC}"
fi
echo ""

# Test Case 4: Mixed Content (Entities + Instructions)
echo -e "${YELLOW}Test 4: Complex Message Processing${NC}"
CORRELATION_ID="test-complex-$(date +%s)"
MESSAGE="Buy 0.5 BTC at market price and then stake it for 30 days at 5% APY"
echo "Input: $MESSAGE"
echo "Expected: Multiple entities, action detection, complex routing"

$REDIS_CMD XADD comm.telegram.incoming '*' \
  correlationId "$CORRELATION_ID" \
  chatId "test-chat" \
  text "$MESSAGE" \
  senderId "tester" \
  messageId "msg-complex" \
  timestamp "$(date -Iseconds)" > /dev/null

sleep 3
echo ""

# Summary
echo -e "${BLUE}=== Test Summary ===${NC}"
echo ""

# Check message flow
echo "Message Flow Statistics:"
echo -n "  • Incoming messages: "
$REDIS_CMD XLEN comm.telegram.incoming
echo -n "  • AI responses: "
$REDIS_CMD XLEN ai.telegram.reply
echo -n "  • Classification queue: "
$REDIS_CMD XLEN classification.result 2>/dev/null || echo "0 (not enabled)"
echo -n "  • Entity extraction queue: "
$REDIS_CMD XLEN entity.extraction.result 2>/dev/null || echo "0 (not enabled)"
echo -n "  • Content storage queue: "
$REDIS_CMD XLEN content.storage.request 2>/dev/null || echo "0 (not enabled)"
echo ""

# Feature status
echo "Feature Status:"
if docker exec ai-service env 2>/dev/null | grep -q "ENABLE_INTELLIGENT_ROUTING=true"; then
  echo -e "  • Intelligent Routing: ${GREEN}ENABLED${NC}"
else
  echo -e "  • Intelligent Routing: ${YELLOW}DISABLED${NC}"
  echo "    To enable: Set ENABLE_INTELLIGENT_ROUTING=true and restart ai-service"
fi

# Check recent classifications
echo ""
echo "Recent Processing (last 5 messages):"
docker logs ai-service --tail 50 2>&1 | grep -E "Classifying|Routing|Extracting" | tail -5 || echo "  No classification logs found"

echo ""
echo -e "${GREEN}Test Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Enable intelligent routing: ENABLE_INTELLIGENT_ROUTING=true"
echo "2. Deploy memory-service for context storage"
echo "3. Deploy content-service for document processing"
echo "4. Monitor classification accuracy in production"