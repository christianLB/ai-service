-- Quick fix for production endpoints
-- Creates only the essential missing items

-- 1. Create documents schema
CREATE SCHEMA IF NOT EXISTS documents;

-- 2. Ensure documents table exists in documents schema
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

-- 3. Create client_statistics table
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

-- 4. Grant permissions
GRANT ALL ON SCHEMA documents TO ai_user;
GRANT ALL ON ALL TABLES IN SCHEMA documents TO ai_user;
GRANT ALL ON ALL TABLES IN SCHEMA financial TO ai_user;