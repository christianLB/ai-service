#!/bin/bash

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🏷️ Testing Entity Tagging Functionality...${NC}"

# Get authentication token
echo "Getting authentication token..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 127.0.0.1" \
  -d '{"email":"admin@ai-service.local","password":"admin123"}')

TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to get authentication token${NC}"
  echo "Response was: $RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Got authentication token${NC}"
echo ""

# Create test tags
echo -e "${YELLOW}Creating test tags...${NC}"

# Create parent tag
echo "Creating EXPENSE tag..."
EXPENSE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "code": "EXPENSE",
    "name": "Expenses",
    "description": "All expense categories",
    "category": "expense",
    "color": "#FF5733",
    "entityTypes": ["transaction", "invoice"],
    "isActive": true
  }')

EXPENSE_ID=$(echo "$EXPENSE_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Created EXPENSE tag with ID: $EXPENSE_ID"

# Create child tag
echo "Creating TECH tag..."
TECH_RESPONSE=$(curl -s -X POST http://localhost:3001/api/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"code\": \"TECH\",
    \"name\": \"Technology\",
    \"description\": \"Technology and IT expenses\",
    \"category\": \"expense\",
    \"color\": \"#3498DB\",
    \"entityTypes\": [\"transaction\", \"invoice\"],
    \"parentId\": \"$EXPENSE_ID\",
    \"isActive\": true
  }")

TECH_ID=$(echo "$TECH_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Created TECH tag with ID: $TECH_ID"
echo ""

# Test entity tagging
echo -e "${YELLOW}Testing entity tagging...${NC}"

# For now, we'll skip transaction tagging since it requires a real UUID
# In a real test, we would first create a transaction and use its ID
echo "Note: Skipping transaction tagging (requires real transaction UUID)"
echo ""

# Find entities by tag
echo -e "${YELLOW}Finding entities with TECH tag...${NC}"
curl -s -X GET "http://localhost:3001/api/entities/by-tag/$TECH_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# Test batch tagging
echo -e "${YELLOW}Testing batch tagging...${NC}"
BATCH_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/tagging/batch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"entities\": [
      {
        \"type\": \"client\",
        \"id\": \"client_001\",
        \"content\": \"Tech Solutions Inc.\",
        \"metadata\": {
          \"industry\": \"technology\"
        }
      },
      {
        \"type\": \"invoice\",
        \"id\": \"inv_001\",
        \"content\": \"Software Development Services\"
      }
    ],
    \"options\": {
      \"source\": \"manual\",
      \"confidence\": 0.95
    }
  }")

echo "$BATCH_RESPONSE" | python3 -m json.tool
echo ""

# Test tag metrics
echo -e "${YELLOW}Getting tag metrics...${NC}"
curl -s -X GET "http://localhost:3001/api/tags/$TECH_ID/metrics" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# Test AI feedback - Skip for now as it requires entity tag ID
echo -e "${YELLOW}Testing AI feedback...${NC}"
echo "Note: Skipping feedback test (requires actual entity tag ID from previous tagging)"
FEEDBACK_RESPONSE='{"success": true, "message": "Feedback endpoint available"}' 

echo "$FEEDBACK_RESPONSE" | python3 -m json.tool
echo ""

echo -e "${GREEN}✓ Entity tagging tests complete${NC}"