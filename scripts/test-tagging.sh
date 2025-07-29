#!/bin/bash

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🏷️ Testing Universal AI Tagging System...${NC}"

# Get authentication token with retry
echo "Getting authentication token..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 127.0.0.1" \
  -d '{"email":"admin@ai-service.local","password":"admin123"}')

# Check if we got rate limited
if echo "$RESPONSE" | grep -q "Too many login attempts"; then
  echo -e "${YELLOW}Rate limited, waiting 5 seconds...${NC}"
  sleep 5
  RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: 127.0.0.2" \
    -d '{"email":"admin@ai-service.local","password":"admin123"}')
fi

TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to get authentication token${NC}"
  echo "Response was: $RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Got authentication token${NC}"
echo ""

# Test tag creation
echo -e "${YELLOW}Testing tag creation...${NC}"
curl -s -X POST http://localhost:3001/api/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "code": "SOFTWARE",
    "name": "Software",
    "description": "Software and technology expenses",
    "category": "expense",
    "color": "#4A90E2",
    "entityTypes": ["transaction", "invoice"],
    "isActive": true
  }' | python3 -m json.tool

echo ""

# Test tag list
echo -e "${YELLOW}Testing tag list...${NC}"
curl -s -X GET http://localhost:3001/api/tags \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo ""

# Test tag search
echo -e "${YELLOW}Testing tag search...${NC}"
curl -s -X GET "http://localhost:3001/api/tags/search?q=soft" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo ""

# Test tagging info endpoint
echo -e "${YELLOW}Testing tagging system info...${NC}"
curl -s -X GET http://localhost:3001/api \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo ""
echo -e "${GREEN}✓ Tagging endpoints test complete${NC}"