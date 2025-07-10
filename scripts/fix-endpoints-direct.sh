#!/bin/bash
# Direct fix for endpoints

export SSHPASS='!Nas3,14159265@'
export SUDO_PASS='!Nas3,14159265@'

echo "Applying endpoint fixes..."

# Connect and apply SQL
sshpass -e ssh k2600x@192.168.1.11 "echo '!Nas3,14159265@' | sudo -S /usr/local/bin/docker exec -i ai-postgres psql -U ai_user -d ai_service" << 'EOF'
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

-- List tables to verify
\dt documents.*
\dt financial.client*
EOF

echo "Restarting API service..."
sshpass -e ssh k2600x@192.168.1.11 "echo '!Nas3,14159265@' | sudo -S /usr/local/bin/docker restart ai-service-api"

echo "Done!"