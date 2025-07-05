-- Client Management Schema
-- This migration adds client and invoice tables to the financial schema

-- Clients table
CREATE TABLE IF NOT EXISTS financial.clients (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    tax_id VARCHAR(100) NOT NULL,
    tax_id_type VARCHAR(20) NOT NULL CHECK (tax_id_type IN ('RFC', 'CIF', 'NIT', 'VAT', 'OTHER')),
    
    -- Contact Information
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address JSONB,
    
    -- Business Information
    client_type VARCHAR(20) NOT NULL CHECK (client_type IN ('individual', 'business')),
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    language VARCHAR(10) NOT NULL DEFAULT 'es',
    timezone VARCHAR(50),
    
    -- Payment & Billing
    payment_terms INTEGER NOT NULL DEFAULT 30,
    payment_method VARCHAR(20) CHECK (payment_method IN ('transfer', 'cash', 'card', 'crypto', 'other')),
    bank_account VARCHAR(255),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    
    -- Status & Metrics
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'prospect')),
    total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_invoices INTEGER NOT NULL DEFAULT 0,
    outstanding_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    last_invoice_date TIMESTAMP,
    average_invoice_amount DECIMAL(15,2),
    
    -- Custom Fields
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    last_contact_date TIMESTAMP,
    
    -- Indexes
    CONSTRAINT unique_tax_id UNIQUE (tax_id, tax_id_type)
);

-- Create indexes for clients
CREATE INDEX idx_clients_status ON financial.clients(status);
CREATE INDEX idx_clients_email ON financial.clients(email);
CREATE INDEX idx_clients_tax_id ON financial.clients(tax_id);
CREATE INDEX idx_clients_created_at ON financial.clients(created_at DESC);
CREATE INDEX idx_clients_tags ON financial.clients USING GIN(tags);

-- Invoices table
CREATE TABLE IF NOT EXISTS financial.invoices (
    id VARCHAR(255) PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Client Information
    client_id VARCHAR(255) NOT NULL REFERENCES financial.clients(id),
    client_name VARCHAR(255) NOT NULL, -- Denormalized
    client_tax_id VARCHAR(100) NOT NULL, -- Denormalized
    client_address JSONB,
    
    -- Invoice Details
    type VARCHAR(20) NOT NULL CHECK (type IN ('invoice', 'credit_note', 'proforma', 'receipt')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'refunded')),
    
    -- Dates
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_date DATE,
    service_start_date DATE,
    service_end_date DATE,
    
    -- Financial Information
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    exchange_rate DECIMAL(10,6),
    
    -- Line Items (stored as JSONB array)
    items JSONB NOT NULL DEFAULT '[]',
    
    -- Totals
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 21,
    tax_type VARCHAR(10) NOT NULL DEFAULT 'IVA' CHECK (tax_type IN ('IVA', 'VAT', 'GST', 'NONE')),
    discount DECIMAL(15,2),
    discount_type VARCHAR(10) CHECK (discount_type IN ('percentage', 'fixed')),
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Payment Information
    payment_method VARCHAR(20) CHECK (payment_method IN ('transfer', 'cash', 'card', 'crypto', 'other')),
    payment_terms INTEGER NOT NULL DEFAULT 30,
    bank_account VARCHAR(255),
    payment_reference VARCHAR(255),
    
    -- Related Documents
    related_documents JSONB DEFAULT '[]',
    related_transaction_ids TEXT[] DEFAULT '{}',
    
    -- Custom Fields
    notes TEXT,
    terms_and_conditions TEXT,
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    created_by VARCHAR(255),
    
    -- Attachments
    attachments JSONB DEFAULT '[]',
    pdf_url VARCHAR(500),
    
    -- Tax Deductible Info
    is_deductible BOOLEAN DEFAULT FALSE,
    deductible_category VARCHAR(100),
    deductible_percentage DECIMAL(5,2)
);

-- Create indexes for invoices
CREATE INDEX idx_invoices_client_id ON financial.invoices(client_id);
CREATE INDEX idx_invoices_status ON financial.invoices(status);
CREATE INDEX idx_invoices_issue_date ON financial.invoices(issue_date DESC);
CREATE INDEX idx_invoices_due_date ON financial.invoices(due_date);
CREATE INDEX idx_invoices_invoice_number ON financial.invoices(invoice_number);
CREATE INDEX idx_invoices_tags ON financial.invoices USING GIN(tags);
CREATE INDEX idx_invoices_related_transactions ON financial.invoices USING GIN(related_transaction_ids);

-- Invoice number sequences table
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

-- Client statistics view
CREATE OR REPLACE VIEW financial.client_statistics AS
SELECT 
    c.id AS client_id,
    c.name AS client_name,
    c.total_revenue,
    c.total_invoices,
    COUNT(CASE WHEN i.status = 'paid' THEN 1 END) AS paid_invoices,
    COUNT(CASE WHEN i.status IN ('sent', 'viewed') THEN 1 END) AS pending_invoices,
    COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) AS overdue_invoices,
    AVG(CASE 
        WHEN i.paid_date IS NOT NULL 
        THEN (i.paid_date - i.issue_date) 
    END) AS average_payment_days,
    MAX(i.paid_date) AS last_payment_date,
    CASE 
        WHEN COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) > 2 THEN 'high'
        WHEN COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) > 0 THEN 'medium'
        ELSE 'low'
    END AS risk_score
FROM financial.clients c
LEFT JOIN financial.invoices i ON c.id = i.client_id
GROUP BY c.id, c.name, c.total_revenue, c.total_invoices;

-- Function to update client statistics after invoice changes
CREATE OR REPLACE FUNCTION financial.update_client_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        UPDATE financial.clients
        SET 
            total_revenue = (
                SELECT COALESCE(SUM(total), 0) 
                FROM financial.invoices 
                WHERE client_id = NEW.client_id AND status = 'paid'
            ),
            total_invoices = (
                SELECT COUNT(*) 
                FROM financial.invoices 
                WHERE client_id = NEW.client_id AND status != 'cancelled'
            ),
            outstanding_balance = (
                SELECT COALESCE(SUM(total), 0) 
                FROM financial.invoices 
                WHERE client_id = NEW.client_id AND status IN ('sent', 'viewed', 'overdue')
            ),
            last_invoice_date = GREATEST(
                last_invoice_date, 
                NEW.issue_date
            ),
            average_invoice_amount = (
                SELECT AVG(total) 
                FROM financial.invoices 
                WHERE client_id = NEW.client_id AND status = 'paid'
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.client_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic client stats update
CREATE TRIGGER update_client_stats_trigger
AFTER INSERT OR UPDATE ON financial.invoices
FOR EACH ROW
EXECUTE FUNCTION financial.update_client_stats();

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION financial.generate_invoice_number(
    p_prefix VARCHAR DEFAULT 'INV',
    p_year INTEGER DEFAULT NULL
)
RETURNS VARCHAR AS $$
DECLARE
    v_year INTEGER;
    v_current_number INTEGER;
    v_format VARCHAR;
    v_invoice_number VARCHAR;
BEGIN
    -- Use current year if not provided
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE));
    
    -- Get or create sequence
    INSERT INTO financial.invoice_sequences (prefix, year, current_number)
    VALUES (p_prefix, v_year, 0)
    ON CONFLICT (prefix, year) DO NOTHING;
    
    -- Get and increment the number
    UPDATE financial.invoice_sequences
    SET 
        current_number = current_number + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE prefix = p_prefix AND year = v_year
    RETURNING current_number, format INTO v_current_number, v_format;
    
    -- Generate invoice number
    v_invoice_number := REPLACE(v_format, 'PREFIX', p_prefix);
    v_invoice_number := REPLACE(v_invoice_number, 'YYYY', v_year::TEXT);
    v_invoice_number := REPLACE(v_invoice_number, '0000', LPAD(v_current_number::TEXT, 4, '0'));
    
    RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON financial.clients TO ai_user;
GRANT ALL ON financial.invoices TO ai_user;
GRANT ALL ON financial.invoice_sequences TO ai_user;
GRANT ALL ON financial.client_statistics TO ai_user;