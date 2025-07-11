#!/bin/bash
# Fix production endpoints

echo "🔧 Fixing production endpoints..."

# Load environment
if [ -f .make.env ]; then
    source .make.env
    export SSHPASS
    export SUDO_PASS
fi

# Check if SSHPASS is set
if [ -z "$SSHPASS" ]; then
    echo "❌ Error: SSHPASS not set in .make.env"
    exit 1
fi

HOST="192.168.1.11"
USER="k2600x"

echo "📝 Applying migration..."

# Apply the migration
sshpass -e ssh -o StrictHostKeyChecking=no $USER@$HOST "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker exec -i ai-postgres psql -U ai_user -d ai_service" << 'EOSQL'
-- Fix production endpoints
CREATE SCHEMA IF NOT EXISTS documents;

CREATE TABLE IF NOT EXISTS documents.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_path TEXT,
    content_type VARCHAR(100),
    file_size BIGINT,
    content_text TEXT,
    category VARCHAR(100),
    tags TEXT[],
    metadata JSONB,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial.client_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID,
    total_invoiced DECIMAL(15,2) DEFAULT 0,
    total_paid DECIMAL(15,2) DEFAULT 0,
    paid_invoices INTEGER DEFAULT 0,
    pending_invoices INTEGER DEFAULT 0,
    overdue_invoices INTEGER DEFAULT 0,
    total_pending DECIMAL(15,2) DEFAULT 0,
    average_payment_days DECIMAL(10,2) DEFAULT 0,
    last_invoice_date DATE,
    last_payment_date DATE,
    risk_score VARCHAR(20) DEFAULT 'low',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT ALL ON SCHEMA documents TO ai_user;
GRANT ALL ON ALL TABLES IN SCHEMA documents TO ai_user;

-- Show results
\dt documents.*
\dt financial.client_statistics
EOSQL

echo "🔄 Restarting API service..."
sshpass -e ssh -o StrictHostKeyChecking=no $USER@$HOST "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker restart ai-service-api"

echo "✅ Fix applied successfully"

# Verify endpoints
echo ""
echo "🔍 Verifying endpoints..."
sleep 5

echo -n "Documents endpoint: "
curl -s http://$HOST:3000/api/documents | python3 -c "import sys, json; d=json.load(sys.stdin); print('✅ Working' if d.get('success') else f'❌ Error: {d.get(\"error\")}')" 2>/dev/null || echo "❌ Failed"

echo -n "Cash-flow endpoint: "
curl -s http://$HOST:3000/api/financial/dashboard/cash-flow | python3 -c "import sys, json; d=json.load(sys.stdin); print('✅ Working' if d.get('success') else f'❌ Error: {d.get(\"error\")}')" 2>/dev/null || echo "❌ Failed"

echo -n "Clients endpoint: "
curl -s http://$HOST:3000/api/financial/clients | python3 -c "import sys, json; d=json.load(sys.stdin); print('✅ Working' if d.get('success') else f'❌ Error: {d.get(\"error\")}')" 2>/dev/null || echo "❌ Failed"