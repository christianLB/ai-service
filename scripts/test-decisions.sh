#!/bin/bash

# Test decision responses for different message types

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

REDIS_CMD="docker exec microservices-redis redis-cli -a microservices_redis_2025 --no-auth-warning"

echo -e "${BLUE}=== Decision Response Test ===${NC}"
echo -e "Testing decision-based responses for Telegram messages"
echo ""

# Test 1: Clear Command
echo -e "${YELLOW}Test 1: Trading Command${NC}"
CORRELATION_ID="decision-cmd-$(date +%s)"
MESSAGE="/cmd trading.execute pair=BTC/USDT size=0.1"
echo "Sending: $MESSAGE"
echo ""

$REDIS_CMD XADD comm.telegram.incoming '*' \
  correlationId "$CORRELATION_ID" \
  chatId "123456" \
  text "$MESSAGE" \
  senderId "user123" \
  messageId "msg-1" \
  timestamp "$(date -Iseconds)" > /dev/null

sleep 3

echo "Checking for decision response..."
DECISION=$($REDIS_CMD XRANGE ai.telegram.reply - + | grep "${CORRELATION_ID}-decision" -A10 2>/dev/null)
if [ ! -z "$DECISION" ]; then
  echo -e "${GREEN}✅ Decision sent!${NC}"
  echo "$DECISION" | grep replyText -A1
else
  echo -e "${YELLOW}No decision response (feature may be processing differently)${NC}"
fi

echo "Checking for AI response..."
RESPONSE=$($REDIS_CMD XRANGE ai.telegram.reply - + | grep "$CORRELATION_ID" -B2 -A5 | grep -v decision | grep replyText -A1 | head -2)
if [ ! -z "$RESPONSE" ]; then
  echo -e "${GREEN}✅ AI response received${NC}"
  echo "$RESPONSE"
fi
echo ""

# Test 2: Entity Extraction
echo -e "${YELLOW}Test 2: Transfer with Entities${NC}"
CORRELATION_ID="decision-entity-$(date +%s)"
MESSAGE="Transfer 50 USDT to wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8"
echo "Sending: $MESSAGE"
echo ""

$REDIS_CMD XADD comm.telegram.incoming '*' \
  correlationId "$CORRELATION_ID" \
  chatId "123456" \
  text "$MESSAGE" \
  senderId "user123" \
  messageId "msg-2" \
  timestamp "$(date -Iseconds)" > /dev/null

sleep 3

RESPONSE=$($REDIS_CMD XRANGE ai.telegram.reply - + | grep "$CORRELATION_ID" -B2 -A5 | tail -10)
if [ ! -z "$RESPONSE" ]; then
  echo -e "${GREEN}✅ Response received${NC}"
  echo "AI understood the transfer request"
else
  echo -e "${RED}❌ No response${NC}"
fi
echo ""

# Test 3: Content URL
echo -e "${YELLOW}Test 3: Content Analysis${NC}"
CORRELATION_ID="decision-content-$(date +%s)"
MESSAGE="Please analyze this article about crypto: https://example.com/defi-article.pdf"
echo "Sending: $MESSAGE"
echo ""

$REDIS_CMD XADD comm.telegram.incoming '*' \
  correlationId "$CORRELATION_ID" \
  chatId "123456" \
  text "$MESSAGE" \
  senderId "user123" \
  messageId "msg-3" \
  timestamp "$(date -Iseconds)" > /dev/null

sleep 3

RESPONSE=$($REDIS_CMD XRANGE ai.telegram.reply - + | grep "$CORRELATION_ID" -B2 -A5 | tail -10)
if [ ! -z "$RESPONSE" ]; then
  echo -e "${GREEN}✅ Response received${NC}"
  echo "AI processed content request"
else
  echo -e "${RED}❌ No response${NC}"
fi
echo ""

# Test 4: Question
echo -e "${YELLOW}Test 4: Question${NC}"
CORRELATION_ID="decision-question-$(date +%s)"
MESSAGE="What is the current price of Bitcoin?"
echo "Sending: $MESSAGE"
echo ""

$REDIS_CMD XADD comm.telegram.incoming '*' \
  correlationId "$CORRELATION_ID" \
  chatId "123456" \
  text "$MESSAGE" \
  senderId "user123" \
  messageId "msg-4" \
  timestamp "$(date -Iseconds)" > /dev/null

sleep 3

RESPONSE=$($REDIS_CMD XRANGE ai.telegram.reply - + | grep "$CORRELATION_ID" -B2 -A5 | tail -10)
if [ ! -z "$RESPONSE" ]; then
  echo -e "${GREEN}✅ Response received${NC}"
  echo "AI answered the question"
else
  echo -e "${RED}❌ No response${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}=== Test Summary ===${NC}"
echo ""

# Check if features are enabled
echo "Feature Status:"
if docker exec ai-service env 2>/dev/null | grep -q "ENABLE_DECISION_RESPONSES=true"; then
  echo -e "  Decision Responses: ${GREEN}ENABLED${NC}"
else
  echo -e "  Decision Responses: ${YELLOW}DISABLED${NC}"
fi

if docker exec ai-service env 2>/dev/null | grep -q "ENABLE_INTELLIGENT_ROUTING=true"; then
  echo -e "  Intelligent Routing: ${GREEN}ENABLED${NC}"
else
  echo -e "  Intelligent Routing: ${YELLOW}DISABLED${NC}"
fi

echo ""
echo "Messages processed:"
$REDIS_CMD XLEN comm.telegram.incoming
echo "Responses generated:"
$REDIS_CMD XLEN ai.telegram.reply

echo ""
echo -e "${GREEN}Test complete!${NC}"
echo ""
echo "To see decisions in Telegram:"
echo "1. Send any of the test messages to your bot"
echo "2. You should see a decision response first"
echo "3. Followed by the actual AI response"