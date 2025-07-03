#!/bin/bash

# Test Categorization System - Comprehensive testing of the new AI categorization features
# This script validates all the new categorization and reporting endpoints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Financial Categorization System${NC}"
echo "=================================================="

# Configuration
BASE_URL=${AI_SERVICE_URL:-http://localhost:3000}
TIMEOUT=10

# Helper function to make API calls
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=${4:-200}
    
    echo -e "\n${YELLOW}→ $method $endpoint${NC}"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            --max-time $TIMEOUT \
            "$BASE_URL$endpoint" || echo "000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            --max-time $TIMEOUT \
            "$BASE_URL$endpoint" || echo "000")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ SUCCESS ($status_code)${NC}"
        if [ "$method" = "GET" ] && [ ${#response_body} -gt 100 ]; then
            echo "Response: $(echo "$response_body" | head -c 100)..."
        else
            echo "Response: $response_body"
        fi
        return 0
    else
        echo -e "${RED}❌ FAILED (Expected $expected_status, got $status_code)${NC}"
        echo "Response: $response_body"
        return 1
    fi
}

# Test results tracking
total_tests=0
passed_tests=0

run_test() {
    local test_name=$1
    shift
    total_tests=$((total_tests + 1))
    
    echo -e "\n${BLUE}🧪 Test: $test_name${NC}"
    if "$@"; then
        passed_tests=$((passed_tests + 1))
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
    fi
}

# Start testing
echo -e "\n${BLUE}Starting categorization system tests...${NC}"

# 1. Health Check
run_test "Financial Service Health Check" \
    call_api "GET" "/api/financial/health"

# 2. Test Categories API
run_test "Get All Categories" \
    call_api "GET" "/api/financial/categories"

run_test "Get Income Categories" \
    call_api "GET" "/api/financial/categories?type=income"

run_test "Get Expense Categories" \
    call_api "GET" "/api/financial/categories?type=expense"

# 3. Test Subcategories (assuming we have a Housing category)
run_test "Get Subcategories" \
    call_api "GET" "/api/financial/categories/$(uuidgen)/subcategories" "" 404

# 4. Test Auto-Categorization
run_test "Auto-Categorize Transactions (empty)" \
    call_api "POST" "/api/financial/categorize/auto" '{"transactionIds": []}'

# 5. Test Categorized Transactions
run_test "Get Categorized Transactions" \
    call_api "GET" "/api/financial/transactions/categorized?limit=10"

run_test "Get Categorized Transactions with Date Filter" \
    call_api "GET" "/api/financial/transactions/categorized?startDate=2025-07-01&endDate=2025-07-31&limit=5"

# 6. Test Reporting APIs
run_test "Generate Comprehensive Report" \
    call_api "GET" "/api/financial/reports/comprehensive?currency=EUR"

run_test "Get Realtime Metrics" \
    call_api "GET" "/api/financial/metrics/realtime?currency=EUR"

run_test "Get Monthly Summary" \
    call_api "GET" "/api/financial/analytics/monthly-summary?startDate=2025-07-01&endDate=2025-07-31&currency=EUR"

run_test "Get Account Insights" \
    call_api "GET" "/api/financial/insights/accounts"

# 7. Test Dashboard APIs
run_test "Dashboard Overview" \
    call_api "GET" "/api/financial/dashboard/overview?currency=EUR"

run_test "Dashboard Quick Stats" \
    call_api "GET" "/api/financial/dashboard/quick-stats?currency=EUR&period=month"

# 8. Test Static Dashboard
run_test "Dashboard HTML Access" \
    call_api "GET" "/public/financial-dashboard.html"

run_test "Dashboard Redirect" \
    call_api "GET" "/dashboard" "" 302

# 9. Test Error Handling
run_test "Invalid Category ID" \
    call_api "GET" "/api/financial/categories/invalid-uuid/subcategories" "" 500

run_test "Invalid Report Parameters" \
    call_api "GET" "/api/financial/analytics/monthly-summary" "" 400

# 10. Test Manual Categorization (if we have transactions)
echo -e "\n${YELLOW}Checking for existing transactions to test manual categorization...${NC}"
transactions_response=$(curl -s --max-time $TIMEOUT "$BASE_URL/api/financial/transactions?limit=1" || echo '{"success":false}')

if echo "$transactions_response" | grep -q '"success":true'; then
    # Extract first transaction ID if available
    transaction_id=$(echo "$transactions_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$transaction_id" ]; then
        echo "Found transaction: $transaction_id"
        
        # Get a category ID for testing
        categories_response=$(curl -s --max-time $TIMEOUT "$BASE_URL/api/financial/categories?limit=1" || echo '{"success":false}')
        category_id=$(echo "$categories_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        
        if [ -n "$category_id" ]; then
            run_test "Manual Transaction Categorization" \
                call_api "POST" "/api/financial/transactions/$transaction_id/categorize" \
                "{\"categoryId\": \"$category_id\", \"notes\": \"Test categorization\"}"
        else
            echo -e "${YELLOW}⚠️ No categories found, skipping manual categorization test${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ No transaction ID found, skipping manual categorization test${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ No transactions available, skipping manual categorization test${NC}"
fi

# 11. Performance Tests
echo -e "\n${BLUE}🚀 Performance Tests${NC}"

run_test "Dashboard Response Time" bash -c "
    start_time=\$(date +%s%N)
    curl -s --max-time 5 '$BASE_URL/api/financial/dashboard/overview' > /dev/null
    end_time=\$(date +%s%N)
    duration=\$(( (end_time - start_time) / 1000000 ))
    echo \"Response time: \${duration}ms\"
    [ \$duration -lt 1000 ]  # Should be under 1 second
"

run_test "Categories API Response Time" bash -c "
    start_time=\$(date +%s%N)
    curl -s --max-time 5 '$BASE_URL/api/financial/categories' > /dev/null
    end_time=\$(date +%s%N)
    duration=\$(( (end_time - start_time) / 1000000 ))
    echo \"Response time: \${duration}ms\"
    [ \$duration -lt 500 ]  # Should be under 500ms
"

# 12. Database Schema Validation
echo -e "\n${BLUE}🗄️ Database Schema Validation${NC}"

if command -v psql &> /dev/null && [ -n "$POSTGRES_PASSWORD" ]; then
    export PGPASSWORD=$POSTGRES_PASSWORD
    DB_HOST=${POSTGRES_HOST:-localhost}
    DB_NAME=${POSTGRES_DB:-ai_service}
    DB_USER=${POSTGRES_USER:-postgres}
    
    run_test "Categories Table Exists" bash -c "
        psql -h $DB_HOST -d $DB_NAME -U $DB_USER -t -c \"
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'financial' AND table_name = 'categories';
        \" | grep -q '1'
    "
    
    run_test "AI Tags Table Exists" bash -c "
        psql -h $DB_HOST -d $DB_NAME -U $DB_USER -t -c \"
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'financial' AND table_name = 'ai_tags';
        \" | grep -q '1'
    "
    
    run_test "Categorization View Exists" bash -c "
        psql -h $DB_HOST -d $DB_NAME -U $DB_USER -t -c \"
            SELECT COUNT(*) FROM information_schema.views 
            WHERE table_schema = 'financial' AND table_name = 'categorized_transactions';
        \" | grep -q '1'
    "
    
    run_test "Default Categories Loaded" bash -c "
        count=\$(psql -h $DB_HOST -d $DB_NAME -U $DB_USER -t -c \"
            SELECT COUNT(*) FROM financial.categories WHERE is_active = true;
        \" | tr -d ' ')
        echo \"Found \$count categories\"
        [ \$count -gt 10 ]
    "
    
    run_test "Default AI Tags Loaded" bash -c "
        count=\$(psql -h $DB_HOST -d $DB_NAME -U $DB_USER -t -c \"
            SELECT COUNT(*) FROM financial.ai_tags WHERE is_active = true;
        \" | tr -d ' ')
        echo \"Found \$count AI tags\"
        [ \$count -gt 0 ]
    "
else
    echo -e "${YELLOW}⚠️ PostgreSQL not available or not configured, skipping database tests${NC}"
fi

# 13. Integration Test
echo -e "\n${BLUE}🔗 Integration Test${NC}"

run_test "Complete Flow: Categories → Reports → Dashboard" bash -c "
    # Get categories
    categories=\$(curl -s --max-time 5 '$BASE_URL/api/financial/categories' || echo '{\"success\":false}')
    echo 'Categories response:' \$(echo \$categories | head -c 50)...
    
    # Get reports  
    reports=\$(curl -s --max-time 5 '$BASE_URL/api/financial/reports/comprehensive' || echo '{\"success\":false}')
    echo 'Reports response:' \$(echo \$reports | head -c 50)...
    
    # Get dashboard
    dashboard=\$(curl -s --max-time 5 '$BASE_URL/api/financial/dashboard/overview' || echo '{\"success\":false}')
    echo 'Dashboard response:' \$(echo \$dashboard | head -c 50)...
    
    # Check all succeeded
    echo \$categories | grep -q '\"success\":true' &&
    echo \$reports | grep -q '\"success\":true' &&
    echo \$dashboard | grep -q '\"success\":true'
"

# Summary
echo -e "\n${BLUE}📊 Test Results Summary${NC}"
echo "=================================================="
echo -e "Total tests: ${BLUE}$total_tests${NC}"
echo -e "Passed: ${GREEN}$passed_tests${NC}"
echo -e "Failed: ${RED}$((total_tests - passed_tests))${NC}"

if [ $passed_tests -eq $total_tests ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! Categorization system is working perfectly!${NC}"
    echo -e "\n${BLUE}🚀 Your financial categorization system is ready for production!${NC}"
    echo -e "\n📋 Quick Access:"
    echo -e "   Dashboard: ${BLUE}$BASE_URL/dashboard${NC}"
    echo -e "   Categories: ${BLUE}$BASE_URL/api/financial/categories${NC}"
    echo -e "   Reports: ${BLUE}$BASE_URL/api/financial/reports/comprehensive${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️ Some tests failed. Please check the logs above.${NC}"
    echo -e "\n🔧 Troubleshooting:"
    echo -e "   1. Ensure the AI Service is running: npm run dev"
    echo -e "   2. Check database is accessible and schema is updated"
    echo -e "   3. Verify environment variables are set correctly"
    exit 1
fi