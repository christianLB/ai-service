#!/bin/bash

echo "🔍 Testing GoCardless Connection"
echo "================================"
echo ""

# Test 1: Service status
echo "1. Checking service status..."
if curl -s http://localhost:3000/status > /dev/null 2>&1; then
    echo "✅ Service is running"
else
    echo "❌ Service not running. Start with: make dev-up"
    exit 1
fi

# Test 2: Check financial health
echo ""
echo "2. Checking financial health..."
HEALTH=$(curl -s http://localhost:3000/api/financial/health)
echo "$HEALTH" | grep -q '"status":"healthy"' && echo "✅ Financial service healthy" || echo "❌ Financial service unhealthy"

# Test 3: Test GoCardless authentication
echo ""
echo "3. Testing GoCardless authentication..."
AUTH_TEST=$(curl -s -X POST http://localhost:3000/api/financial/test-gocardless)
if echo "$AUTH_TEST" | grep -q '"success":true'; then
    echo "✅ GoCardless authentication SUCCESSFUL!"
    echo ""
    echo "🎉 You can now create a requisition!"
    echo "Run: curl -X POST http://localhost:3000/api/financial/setup-bbva"
else
    echo "❌ GoCardless authentication FAILED"
    echo ""
    echo "Response:"
    echo "$AUTH_TEST" | python3 -m json.tool 2>/dev/null || echo "$AUTH_TEST"
    
    # Run diagnostic
    echo ""
    echo "Running diagnostic..."
    DIAG=$(curl -s -X POST http://localhost:3000/api/financial/diagnose-gocardless)
    echo "$DIAG" | python3 -m json.tool 2>/dev/null || echo "$DIAG"
fi