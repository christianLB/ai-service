-- Create missing invoice tables in production
-- 2025-07-10

-- Create clients table
CREATE TABLE IF NOT EXISTS financial.clients (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    tax_id VARCHAR(100) NOT NULL,
    tax_id_type VARCHAR(20) NOT NULL DEFAULT 'OTHER',
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2) DEFAULT 'ES',
    language VARCHAR(2) DEFAULT 'es',
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_terms INTEGER DEFAULT 30,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create invoice_sequences table
CREATE TABLE IF NOT EXISTS financial.invoice_sequences (
    series VARCHAR(50) PRIMARY KEY,
    current_number INTEGER NOT NULL DEFAULT 0,
    prefix VARCHAR(20),
    suffix VARCHAR(20),
    year INTEGER,
    format VARCHAR(100) DEFAULT '{prefix}{year}/{number:05d}',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS financial.invoices (
    id VARCHAR(255) PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    client_id VARCHAR(255) NOT NULL REFERENCES financial.clients(id),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    type VARCHAR(20) NOT NULL DEFAULT 'invoice',
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    
    -- Line items as JSONB
    items JSONB NOT NULL DEFAULT '[]',
    
    -- Amounts
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 21,
    tax_type VARCHAR(20) DEFAULT 'IVA',
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Payment info
    paid_date DATE,
    payment_method VARCHAR(50),
    payment_reference TEXT,
    
    -- Bank account for receiving payment
    bank_account JSONB,
    
    -- Additional fields
    notes TEXT,
    terms_and_conditions TEXT,
    
    -- File attachments
    attachments JSONB DEFAULT '[]',
    pdf_url TEXT,
    
    -- Metadata
    tags TEXT[],
    custom_fields JSONB,
    
    -- Tracking
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Tax deductibility
    is_deductible BOOLEAN DEFAULT false,
    deductible_category VARCHAR(100),
    deductible_percentage DECIMAL(5,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON financial.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON financial.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON financial.invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON financial.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_clients_tax_id ON financial.clients(tax_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON financial.clients(email);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
        CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON financial.clients
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at') THEN
        CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON financial.invoices
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoice_sequences_updated_at') THEN
        CREATE TRIGGER update_invoice_sequences_updated_at BEFORE UPDATE ON financial.invoice_sequences
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Verify tables were created
SELECT 'Created tables:' as message;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'financial' 
AND table_name IN ('clients', 'invoices', 'invoice_sequences')
ORDER BY table_name;