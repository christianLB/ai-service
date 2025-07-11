#!/bin/bash
# Direct SQL fix for endpoints

source .make.env
export SSHPASS
export SUDO_PASS

echo "🔧 Applying direct SQL fix..."

# Create a temporary SQL file
cat > /tmp/fix-endpoints.sql << 'EOF'
-- Create documents schema
CREATE SCHEMA IF NOT EXISTS documents;

-- Create documents table
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

-- Create client_statistics table
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

-- Grant permissions
GRANT ALL ON SCHEMA documents TO ai_user;
GRANT ALL ON ALL TABLES IN SCHEMA documents TO ai_user;
GRANT ALL ON ALL TABLES IN SCHEMA financial TO ai_user;

-- Verify creation
SELECT 'documents schema' as object, EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'documents') as exists;
SELECT 'documents.documents table' as object, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'documents' AND table_name = 'documents') as exists;
SELECT 'financial.client_statistics table' as object, EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'financial' AND table_name = 'client_statistics') as exists;
EOF

# Copy file to server
echo "📤 Uploading SQL file..."
sshpass -e scp -o StrictHostKeyChecking=no /tmp/fix-endpoints.sql k2600x@192.168.1.11:/tmp/

# Execute SQL
echo "🗄️ Executing SQL..."
sshpass -e ssh -o StrictHostKeyChecking=no k2600x@192.168.1.11 \
    "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker exec -i ai-postgres psql -U ai_user -d ai_service < /tmp/fix-endpoints.sql && rm /tmp/fix-endpoints.sql"

# Clean up
rm /tmp/fix-endpoints.sql

# Restart API
echo "🔄 Restarting API..."
sshpass -e ssh -o StrictHostKeyChecking=no k2600x@192.168.1.11 \
    "echo '$SUDO_PASS' | sudo -S /usr/local/bin/docker restart ai-service-api"

echo "✅ Done!"

# Wait for API to start
echo "⏳ Waiting for API to start..."
sleep 10

# Verify
echo ""
echo "🔍 Verifying endpoints..."
echo -n "Documents: "
curl -s http://192.168.1.11:3000/api/documents | python3 -c "import sys, json; d=json.load(sys.stdin); print('✅ Working' if d.get('success') else f'❌ {d.get(\"error\")}')" 2>/dev/null || echo "❌ Failed"

echo -n "Cash-flow: "
curl -s http://192.168.1.11:3000/api/financial/dashboard/cash-flow | python3 -c "import sys, json; d=json.load(sys.stdin); print('✅ Working' if d.get('success') else f'❌ {d.get(\"error\")}')" 2>/dev/null || echo "❌ Failed"

echo -n "Clients: "
curl -s http://192.168.1.11:3000/api/financial/clients | python3 -c "import sys, json; d=json.load(sys.stdin); print('✅ Working' if d.get('success') else f'❌ {d.get(\"error\")}')" 2>/dev/null || echo "❌ Failed"