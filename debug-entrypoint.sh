#!/bin/sh

echo "🔍 DEBUG: Starting comprehensive environment diagnostics..."
echo "=================================================="

# 1. Show initial environment
echo "1️⃣ INITIAL DOCKER ENVIRONMENT:"
echo "POSTGRES_HOST=${POSTGRES_HOST}"
echo "NODE_ENV=${NODE_ENV}"
echo "PORT=${PORT}"
echo ""

# 2. Check file exists and show content
echo "2️⃣ CHECKING ENV FILE:"
if [ -f "/config/.env.production" ]; then
    echo "✅ File exists: /config/.env.production"
    echo "📄 File content (first 5 lines with POSTGRES):"
    grep "POSTGRES" /config/.env.production | head -5
    echo ""
    echo "📄 Raw hexdump of POSTGRES_HOST line:"
    grep "^POSTGRES_HOST" /config/.env.production | hexdump -C
else
    echo "❌ File NOT found: /config/.env.production"
fi
echo ""

# 3. Test different loading methods
echo "3️⃣ TESTING LOADING METHODS:"

# Method A: Direct export
echo "Method A - Direct export test:"
export POSTGRES_HOST=postgres
echo "After export: POSTGRES_HOST=${POSTGRES_HOST}"

# Method B: Source with set -a
echo ""
echo "Method B - Source with set -a:"
POSTGRES_HOST=will_be_overwritten
set -a
. /config/.env.production 2>/dev/null || echo "Failed to source"
set +a
echo "After source: POSTGRES_HOST=${POSTGRES_HOST}"

# Method C: Manual parsing
echo ""
echo "Method C - Manual parsing:"
POSTGRES_HOST=will_be_overwritten_again
if [ -f "/config/.env.production" ]; then
    # Extract just POSTGRES_HOST value
    POSTGRES_HOST_VALUE=$(grep "^POSTGRES_HOST=" /config/.env.production | cut -d'=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
    echo "Extracted value: '${POSTGRES_HOST_VALUE}'"
    export POSTGRES_HOST="${POSTGRES_HOST_VALUE}"
    echo "After manual export: POSTGRES_HOST=${POSTGRES_HOST}"
fi

# 4. Final environment check
echo ""
echo "4️⃣ FINAL ENVIRONMENT STATE:"
env | grep -E "(POSTGRES_|NODE_ENV|PORT)" | sort

echo ""
echo "5️⃣ ATTEMPTING DATABASE CONNECTION:"
echo "Will try to connect to: ${POSTGRES_HOST}:${POSTGRES_PORT:-5432}"

# Don't start the app, just exit for debugging
echo ""
echo "🛑 DEBUG MODE: Not starting application"
echo "=================================================="