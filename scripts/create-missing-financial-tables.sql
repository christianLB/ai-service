-- Create missing financial tables for production
-- This script creates clients, invoices, and invoice_sequences tables

BEGIN;

-- 1. Clients table (with simplified structure matching the SQL file)
CREATE TABLE IF NOT EXISTS financial.clients (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    tax_id VARCHAR(100) NOT NULL,
    tax_id_type VARCHAR(20) NOT NULL CHECK (tax_id_type IN ('RFC', 'CIF', 'NIT', 'VAT', 'OTHER')),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address JSONB,
    client_type VARCHAR(20) NOT NULL CHECK (client_type IN ('individual', 'business')),
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    language VARCHAR(10) NOT NULL DEFAULT 'es',
    timezone VARCHAR(50),
    payment_terms INTEGER NOT NULL DEFAULT 30,
    payment_method VARCHAR(20) CHECK (payment_method IN ('transfer', 'cash', 'card', 'crypto', 'other')),
    bank_account VARCHAR(255),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'prospect')),
    total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_invoices INTEGER NOT NULL DEFAULT 0,
    outstanding_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    last_invoice_date TIMESTAMP,
    average_invoice_amount DECIMAL(15,2),
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    last_contact_date TIMESTAMP,
    CONSTRAINT unique_tax_id UNIQUE (tax_id, tax_id_type)
);

-- 2. Invoice sequences table (must be created before invoices)
CREATE TABLE IF NOT EXISTS financial.invoice_sequences (
    id SERIAL PRIMARY KEY,
    prefix VARCHAR(20) NOT NULL,
    current_number INTEGER NOT NULL DEFAULT 0,
    year INTEGER,
    format VARCHAR(50) NOT NULL DEFAULT 'PREFIX-YYYY-0000',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_sequence_prefix_year UNIQUE (prefix, year)
);

-- 3. Invoices table
CREATE TABLE IF NOT EXISTS financial.invoices (
    id VARCHAR(255) PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    client_id VARCHAR(255) NOT NULL REFERENCES financial.clients(id),
    client_name VARCHAR(255) NOT NULL,
    client_tax_id VARCHAR(100) NOT NULL,
    client_address JSONB,
    type VARCHAR(20) NOT NULL CHECK (type IN ('invoice', 'credit_note', 'proforma', 'receipt')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'refunded')),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_date DATE,
    service_start_date DATE,
    service_end_date DATE,
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    exchange_rate DECIMAL(10,6),
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 21,
    tax_type VARCHAR(10) NOT NULL DEFAULT 'IVA' CHECK (tax_type IN ('IVA', 'VAT', 'GST', 'NONE')),
    discount DECIMAL(15,2),
    discount_type VARCHAR(10) CHECK (discount_type IN ('percentage', 'fixed')),
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) CHECK (payment_method IN ('transfer', 'cash', 'card', 'crypto', 'other')),
    payment_terms INTEGER NOT NULL DEFAULT 30,
    bank_account VARCHAR(255),
    payment_reference VARCHAR(255),
    related_documents JSONB DEFAULT '[]',
    related_transaction_ids TEXT[] DEFAULT '{}',
    notes TEXT,
    terms_and_conditions TEXT,
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    created_by VARCHAR(255),
    attachments JSONB DEFAULT '[]',
    pdf_url VARCHAR(500),
    is_deductible BOOLEAN DEFAULT FALSE,
    deductible_category VARCHAR(100),
    deductible_percentage DECIMAL(5,2)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_status ON financial.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email ON financial.clients(email);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON financial.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON financial.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON financial.invoices(issue_date DESC);

-- Verify tables were created
SELECT 'Tables created:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'financial' 
AND table_name IN ('clients', 'invoices', 'invoice_sequences')
ORDER BY table_name;

COMMIT;