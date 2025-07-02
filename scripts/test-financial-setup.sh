#!/bin/bash

# Test Financial Setup - Complete testing script for GoCardless integration
# This script tests the entire financial system setup

set -e

BASE_URL="http://localhost:3000"
API_BASE="$BASE_URL/api/financial"

echo "🧪 Testing Financial System Setup..."

# Check if server is running
echo "🔍 Checking if server is running..."
if ! curl -s "$BASE_URL/status" > /dev/null; then
    echo "❌ Server is not running at $BASE_URL"
    echo "Please start the server first: npm run dev"
    exit 1
fi

echo "✅ Server is running"

# Test health endpoint
echo "🏥 Testing financial health endpoint..."
HEALTH_RESPONSE=$(curl -s "$API_BASE/health")
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo "✅ Financial services are healthy"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo "⚠️ Financial services health check:"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
fi

# Test database connection
echo "🗃️ Testing database connection..."
ACCOUNTS_RESPONSE=$(curl -s "$API_BASE/accounts")
if echo "$ACCOUNTS_RESPONSE" | grep -q '"success":true'; then
    ACCOUNT_COUNT=$(echo "$ACCOUNTS_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    echo "✅ Database connection successful. Found $ACCOUNT_COUNT accounts."
else
    echo "❌ Database connection failed:"
    echo "$ACCOUNTS_RESPONSE" | jq '.' 2>/dev/null || echo "$ACCOUNTS_RESPONSE"
fi

# Test sync status
echo "📊 Testing sync status..."
SYNC_STATUS=$(curl -s "$API_BASE/sync-status")
if echo "$SYNC_STATUS" | grep -q '"success":true'; then
    echo "✅ Sync status retrieved successfully"
    echo "$SYNC_STATUS" | jq '.data.scheduler' 2>/dev/null || echo "Scheduler info not available"
else
    echo "❌ Failed to get sync status:"
    echo "$SYNC_STATUS" | jq '.' 2>/dev/null || echo "$SYNC_STATUS"
fi

# Test account status
echo "📈 Testing account status..."
ACCOUNT_STATUS=$(curl -s "$API_BASE/account-status")
if echo "$ACCOUNT_STATUS" | grep -q '"success":true'; then
    echo "✅ Account status retrieved successfully"
    ACCOUNT_DATA=$(echo "$ACCOUNT_STATUS" | jq '.data' 2>/dev/null)
    if [ "$ACCOUNT_DATA" != "null" ] && [ -n "$ACCOUNT_DATA" ]; then
        echo "Account data preview:"
        echo "$ACCOUNT_DATA" | jq '.[0:2]' 2>/dev/null || echo "No account data available"
    else
        echo "No accounts configured yet"
    fi
else
    echo "❌ Failed to get account status:"
    echo "$ACCOUNT_STATUS" | jq '.' 2>/dev/null || echo "$ACCOUNT_STATUS"
fi

# Test financial summary
echo "💰 Testing financial summary..."
SUMMARY_RESPONSE=$(curl -s "$API_BASE/summary")
if echo "$SUMMARY_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Financial summary retrieved successfully"
    echo "$SUMMARY_RESPONSE" | jq '.data.accounts' 2>/dev/null || echo "Summary not available"
else
    echo "❌ Failed to get financial summary:"
    echo "$SUMMARY_RESPONSE" | jq '.' 2>/dev/null || echo "$SUMMARY_RESPONSE"
fi

echo ""
echo "🎯 Test Results Summary:"
echo ""

# Check if setup is needed
if [ "$ACCOUNT_COUNT" = "0" ]; then
    echo "🚀 Setup Required:"
    echo "1. Get GoCardless credentials from https://bankaccountdata.gocardless.com/"
    echo "2. Set environment variables:"
    echo "   export GO_SECRET_ID='your_secret_id'"
    echo "   export GO_SECRET_KEY='your_secret_key'"
    echo "3. Restart the server with the credentials"
    echo "4. Run the setup command:"
    echo "   curl -X POST $API_BASE/setup-bbva"
    echo ""
else
    echo "✅ System appears to be configured with $ACCOUNT_COUNT accounts"
    echo ""
fi

echo "📋 Available Commands:"
echo "• Setup BBVA account: curl -X POST $API_BASE/setup-bbva"
echo "• Complete setup: curl -X POST $API_BASE/complete-setup -d '{\"requisitionId\":\"req_id\"}' -H 'Content-Type: application/json'"
echo "• Manual sync: curl -X POST $API_BASE/sync"
echo "• View accounts: curl $API_BASE/accounts"
echo "• View transactions: curl $API_BASE/transactions"
echo "• Start scheduler: curl -X POST $API_BASE/scheduler/start"
echo "• Stop scheduler: curl -X POST $API_BASE/scheduler/stop"

echo ""
echo "🔧 Testing Environment:"
echo "• Server: $BASE_URL"
echo "• API Base: $API_BASE"
echo "• PostgreSQL: $(echo $HEALTH_RESPONSE | grep -o '"database":"[^"]*"' | cut -d'"' -f4)"
echo "• GoCardless: $(echo $HEALTH_RESPONSE | grep -o '"gocardless":"[^"]*"' | cut -d'"' -f4)"

if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo ""
    echo "🎉 Financial system is ready for use!"
    exit 0
else
    echo ""
    echo "⚠️ Financial system needs configuration. Check the health status above."
    exit 1
fi