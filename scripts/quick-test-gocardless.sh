#!/bin/bash

# Quick GoCardless Connection Test Script
# This script tests the GoCardless connection without consuming rate limits

set -e

BASE_URL="http://localhost:3000"
API_BASE="$BASE_URL/api"

echo "🔍 Quick GoCardless Connection Test"
echo "==================================="
echo ""

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$data" ]; then
        curl -s -X $method "$API_BASE/$endpoint" -H "Content-Type: application/json"
    else
        curl -s -X $method "$API_BASE/$endpoint" -H "Content-Type: application/json" -d "$data"
    fi
}

# 1. Check if service is running
echo "1️⃣ Checking service status..."
if curl -s "$BASE_URL/status" > /dev/null 2>&1; then
    echo "✅ Service is running"
else
    echo "❌ Service is not running. Please start it with: make dev-up"
    exit 1
fi

# 2. Check financial health
echo ""
echo "2️⃣ Checking financial service health..."
HEALTH=$(api_call GET "financial/health")
if echo "$HEALTH" | grep -q '"status":"healthy"'; then
    echo "✅ Financial service is healthy"
else
    echo "❌ Financial service is not healthy"
    echo "$HEALTH" | jq . 2>/dev/null || echo "$HEALTH"
fi

# 3. Check GoCardless configuration
echo ""
echo "3️⃣ Checking GoCardless configuration..."
CONFIGS=$(api_call GET "integrations/configs?integrationType=gocardless")
if echo "$CONFIGS" | grep -q '"success":true'; then
    CONFIG_COUNT=$(echo "$CONFIGS" | jq '.data | length' 2>/dev/null || echo "0")
    echo "✅ Found $CONFIG_COUNT GoCardless configurations"
    
    # Check for required configs
    HAS_SECRET_ID=$(echo "$CONFIGS" | grep -q '"config_key":"secret_id"' && echo "yes" || echo "no")
    HAS_SECRET_KEY=$(echo "$CONFIGS" | grep -q '"config_key":"secret_key"' && echo "yes" || echo "no")
    
    echo "   - secret_id: $([ "$HAS_SECRET_ID" = "yes" ] && echo "✅ Configured" || echo "❌ Missing")"
    echo "   - secret_key: $([ "$HAS_SECRET_KEY" = "yes" ] && echo "✅ Configured" || echo "❌ Missing")"
else
    echo "❌ Failed to retrieve configurations"
fi

# 4. Test GoCardless authentication (without creating requisition)
echo ""
echo "4️⃣ Testing GoCardless authentication..."
TEST_RESULT=$(api_call POST "financial/test-gocardless" "{}")
if echo "$TEST_RESULT" | grep -q '"success":true'; then
    echo "✅ GoCardless authentication successful!"
else
    echo "❌ GoCardless authentication failed"
    echo "$TEST_RESULT" | jq . 2>/dev/null || echo "$TEST_RESULT"
    
    # Try diagnostic endpoint
    echo ""
    echo "Running diagnostic..."
    DIAG_RESULT=$(api_call POST "financial/diagnose-gocardless" "{}")
    if echo "$DIAG_RESULT" | grep -q '"success":true'; then
        echo "$DIAG_RESULT" | jq '.diagnosis.checks[] | "\(.name): \(if .passed then "✅" else "❌" end)"' 2>/dev/null
    else
        echo "Diagnostic also failed"
    fi
fi

# 5. Summary
echo ""
echo "📊 Summary"
echo "=========="
if echo "$TEST_RESULT" | grep -q '"success":true'; then
    echo "✅ GoCardless is properly configured and authenticated!"
    echo ""
    echo "You can now create a requisition with:"
    echo "  curl -X POST $API_BASE/financial/setup-bbva"
    echo ""
    echo "Or use the full test script:"
    echo "  npx ts-node scripts/test-bbva-setup.ts"
else
    echo "❌ GoCardless authentication is failing"
    echo ""
    echo "Please check:"
    echo "1. Credentials are configured in the database"
    echo "2. Credentials are valid and not expired"
    echo "3. Credentials match the environment (production vs sandbox)"
    echo ""
    echo "To update credentials:"
    echo '  curl -X POST '$API_BASE'/integrations/configs \'
    echo '    -H "Content-Type: application/json" \'
    echo '    -d '\''{"integrationType":"gocardless","configKey":"secret_id","configValue":"YOUR_SECRET_ID","isGlobal":true,"encrypt":true}'\'''
fi