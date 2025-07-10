-- Fix production endpoints
-- This script creates missing schemas and tables

-- 1. Create documents schema
CREATE SCHEMA IF NOT EXISTS documents;

-- 2. Move documents table to documents schema
DO $$
BEGIN
    -- Check if documents table exists in public schema
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'documents') THEN
        -- Move it to documents schema
        ALTER TABLE public.documents SET SCHEMA documents;
    ELSE
        -- Create it in documents schema if it doesn't exist
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
    END IF;
END$$;

-- 3. Create missing financial tables
-- Clients table
CREATE TABLE IF NOT EXISTS financial.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    tax_id VARCHAR(50),
    tax_id_type VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'active',
    client_type VARCHAR(50) DEFAULT 'business',
    currency VARCHAR(3) DEFAULT 'EUR',
    language VARCHAR(10) DEFAULT 'es',
    credit_limit DECIMAL(15,2),
    payment_terms INTEGER DEFAULT 30,
    payment_method VARCHAR(50),
    bank_account JSONB,
    contact_persons JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_invoices INTEGER DEFAULT 0,
    outstanding_balance DECIMAL(15,2) DEFAULT 0,
    average_invoice_amount DECIMAL(15,2) DEFAULT 0,
    last_invoice_date DATE,
    tags TEXT[],
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client statistics table
CREATE TABLE IF NOT EXISTS financial.client_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES financial.clients(id) ON DELETE CASCADE,
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id)
);

-- Invoice sequences table
CREATE TABLE IF NOT EXISTS financial.invoice_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series VARCHAR(50),
    year INTEGER NOT NULL,
    prefix VARCHAR(10),
    current_number INTEGER DEFAULT 0,
    format VARCHAR(50) DEFAULT '{prefix}{year}/{number:05d}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(series, year, prefix)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS financial.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES financial.clients(id),
    client_name VARCHAR(255),
    client_tax_id VARCHAR(50),
    type VARCHAR(20) DEFAULT 'invoice',
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    currency VARCHAR(3) DEFAULT 'EUR',
    subtotal DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 21.00,
    tax_type VARCHAR(20) DEFAULT 'IVA',
    tax_amount DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    internal_notes TEXT,
    payment_terms TEXT,
    payment_method VARCHAR(50),
    bank_account JSONB,
    items JSONB NOT NULL DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    terms_and_conditions TEXT,
    footer_text TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    paid_date DATE,
    payment_reference VARCHAR(255),
    pdf_url VARCHAR(500),
    public_url VARCHAR(500),
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    is_deductible BOOLEAN DEFAULT false,
    deductible_category VARCHAR(100),
    deductible_percentage DECIMAL(5,2),
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_email ON financial.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_tax_id ON financial.clients(tax_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON financial.clients(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON financial.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON financial.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON financial.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON financial.invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_client_statistics_client_id ON financial.client_statistics(client_id);

-- 5. Grant permissions
GRANT ALL ON SCHEMA documents TO ai_user;
GRANT ALL ON ALL TABLES IN SCHEMA documents TO ai_user;
GRANT ALL ON ALL TABLES IN SCHEMA financial TO ai_user;

-- Verify changes
SELECT 
    'Documents schema exists' as check,
    EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'documents') as result
UNION ALL
SELECT 
    'Documents table in documents schema' as check,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'documents' AND table_name = 'documents') as result
UNION ALL
SELECT 
    'Clients table exists' as check,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'financial' AND table_name = 'clients') as result
UNION ALL
SELECT 
    'Client statistics table exists' as check,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'financial' AND table_name = 'client_statistics') as result
UNION ALL
SELECT 
    'Invoices table exists' as check,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'financial' AND table_name = 'invoices') as result;