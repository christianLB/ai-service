#!/bin/bash
# Apply production fix with verbose output

echo "🔧 Applying production fix..."

# Direct execution with password
export SSHPASS='!Nas3,14159265@'

echo "📝 Creating documents schema and tables..."

# Execute each command separately to see output
echo "1. Creating documents schema..."
sshpass -e ssh k2600x@192.168.1.11 \
  "echo '!Nas3,14159265@' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c 'CREATE SCHEMA IF NOT EXISTS documents;'"

echo ""
echo "2. Creating documents.documents table..."
sshpass -e ssh k2600x@192.168.1.11 \
  "echo '!Nas3,14159265@' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c 'CREATE TABLE IF NOT EXISTS documents.documents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), filename VARCHAR(255) NOT NULL, original_path TEXT, content_type VARCHAR(100), file_size BIGINT, content_text TEXT, category VARCHAR(100), tags TEXT[], metadata JSONB, processed_at TIMESTAMP WITH TIME ZONE, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());'"

echo ""
echo "3. Creating financial.client_statistics table..."
sshpass -e ssh k2600x@192.168.1.11 \
  "echo '!Nas3,14159265@' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c 'CREATE TABLE IF NOT EXISTS financial.client_statistics (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID, total_invoiced DECIMAL(15,2) DEFAULT 0, total_paid DECIMAL(15,2) DEFAULT 0, paid_invoices INTEGER DEFAULT 0, pending_invoices INTEGER DEFAULT 0, overdue_invoices INTEGER DEFAULT 0, total_pending DECIMAL(15,2) DEFAULT 0, average_payment_days DECIMAL(10,2) DEFAULT 0, last_invoice_date DATE, last_payment_date DATE, risk_score VARCHAR(20) DEFAULT '\''low'\'', updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());'"

echo ""
echo "4. Granting permissions..."
sshpass -e ssh k2600x@192.168.1.11 \
  "echo '!Nas3,14159265@' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c 'GRANT ALL ON SCHEMA documents TO ai_user; GRANT ALL ON ALL TABLES IN SCHEMA documents TO ai_user;'"

echo ""
echo "5. Verifying creation..."
sshpass -e ssh k2600x@192.168.1.11 \
  "echo '!Nas3,14159265@' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c \"SELECT 'documents schema exists: ' || EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'documents')::text as check_result;\""

echo ""
echo "6. Restarting API..."
sshpass -e ssh k2600x@192.168.1.11 \
  "echo '!Nas3,14159265@' | sudo -S /usr/local/bin/docker restart ai-service-api"

echo ""
echo "✅ Fix applied!"

# Wait for API
sleep 10

echo ""
echo "🔍 Testing endpoints..."
curl -s http://192.168.1.11:3000/api/documents | head -50