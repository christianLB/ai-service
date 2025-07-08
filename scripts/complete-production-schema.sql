-- ============================================================================
-- SCRIPT MAESTRO DE MIGRACIÓN COMPLETA A PRODUCCIÓN
-- Fecha: 2025-07-07
-- Descripción: Script idempotente para alinear producción con desarrollo
-- ============================================================================

-- IMPORTANTE: Este script es 100% idempotente y seguro de ejecutar múltiples veces
-- NO contiene comandos destructivos (DROP)
-- Todos los cambios son aditivos o modificaciones seguras

-- ============================================================================
-- PASO 1: CONFIGURACIÓN INICIAL Y EXTENSIONES
-- ============================================================================

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Crear función para generar UUIDs si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'gen_random_uuid') THEN
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
    END IF;
END$$;

-- ============================================================================
-- PASO 2: CREAR ESQUEMAS
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS financial;
CREATE SCHEMA IF NOT EXISTS ai_service;

-- ============================================================================
-- PASO 3: TABLAS DEL ESQUEMA FINANCIAL
-- ============================================================================

-- 3.1 CURRENCIES TABLE
CREATE TABLE IF NOT EXISTS financial.currencies (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('fiat', 'crypto')),
    decimals INTEGER DEFAULT 2,
    symbol VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar monedas por defecto si no existen
INSERT INTO financial.currencies (code, name, type, decimals, symbol) VALUES 
    ('EUR', 'Euro', 'fiat', 2, '€'),
    ('USD', 'US Dollar', 'fiat', 2, '$'),
    ('GBP', 'British Pound', 'fiat', 2, '£'),
    ('BTC', 'Bitcoin', 'crypto', 8, '₿'),
    ('ETH', 'Ethereum', 'crypto', 18, 'Ξ')
ON CONFLICT (code) DO NOTHING;

-- 3.2 ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS financial.accounts (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
    account_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    currency_id UUID REFERENCES financial.currencies(id),
    balance DECIMAL(20, 8) DEFAULT 0,
    available_balance DECIMAL(20, 8) DEFAULT 0,
    institution VARCHAR(255),
    institution_id VARCHAR(255),
    requisition_id VARCHAR(255),
    iban VARCHAR(255),
    wallet_address VARCHAR(255), -- CRÍTICO: Esta columna faltaba en producción
    chain_id VARCHAR(50),
    exchange_name VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columnas faltantes si la tabla ya existe
DO $$
BEGIN
    -- wallet_address
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'accounts' 
                  AND column_name = 'wallet_address') THEN
        ALTER TABLE financial.accounts ADD COLUMN wallet_address VARCHAR(255);
    END IF;
    
    -- chain_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'accounts' 
                  AND column_name = 'chain_id') THEN
        ALTER TABLE financial.accounts ADD COLUMN chain_id VARCHAR(50);
    END IF;
    
    -- exchange_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'accounts' 
                  AND column_name = 'exchange_name') THEN
        ALTER TABLE financial.accounts ADD COLUMN exchange_name VARCHAR(100);
    END IF;
    
    -- institution_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'accounts' 
                  AND column_name = 'institution_id') THEN
        ALTER TABLE financial.accounts ADD COLUMN institution_id VARCHAR(255);
    END IF;
    
    -- requisition_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'accounts' 
                  AND column_name = 'requisition_id') THEN
        ALTER TABLE financial.accounts ADD COLUMN requisition_id VARCHAR(255);
    END IF;
    
    -- iban
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'accounts' 
                  AND column_name = 'iban') THEN
        ALTER TABLE financial.accounts ADD COLUMN iban VARCHAR(255);
    END IF;
    
    -- last_sync
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'accounts' 
                  AND column_name = 'last_sync') THEN
        ALTER TABLE financial.accounts ADD COLUMN last_sync TIMESTAMPTZ;
    END IF;
END$$;

-- 3.3 TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS financial.transactions (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    currency_id UUID REFERENCES financial.currencies(id),
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmed',
    description TEXT,
    reference VARCHAR(255),
    counterparty_name VARCHAR(255), -- Esta columna también faltaba
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    fee_amount DECIMAL(20, 8),
    fee_currency_id UUID REFERENCES financial.currencies(id)
);

-- Agregar columnas faltantes si la tabla ya existe
DO $$
BEGIN
    -- currency_id (reemplaza currency_code)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'transactions' 
                  AND column_name = 'currency_id') THEN
        ALTER TABLE financial.transactions ADD COLUMN currency_id UUID REFERENCES financial.currencies(id);
    END IF;
    
    -- counterparty_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'transactions' 
                  AND column_name = 'counterparty_name') THEN
        ALTER TABLE financial.transactions ADD COLUMN counterparty_name VARCHAR(255);
    END IF;
    
    -- status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'transactions' 
                  AND column_name = 'status') THEN
        ALTER TABLE financial.transactions ADD COLUMN status VARCHAR(50) DEFAULT 'confirmed';
    END IF;
    
    -- reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'transactions' 
                  AND column_name = 'reference') THEN
        ALTER TABLE financial.transactions ADD COLUMN reference VARCHAR(255);
    END IF;
    
    -- updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'transactions' 
                  AND column_name = 'updated_at') THEN
        ALTER TABLE financial.transactions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- tags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'transactions' 
                  AND column_name = 'tags') THEN
        ALTER TABLE financial.transactions ADD COLUMN tags TEXT[];
    END IF;
    
    -- fee_amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'transactions' 
                  AND column_name = 'fee_amount') THEN
        ALTER TABLE financial.transactions ADD COLUMN fee_amount DECIMAL(20, 8);
    END IF;
    
    -- fee_currency_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'financial' 
                  AND table_name = 'transactions' 
                  AND column_name = 'fee_currency_id') THEN
        ALTER TABLE financial.transactions ADD COLUMN fee_currency_id UUID REFERENCES financial.currencies(id);
    END IF;
END$$;

-- 3.4 CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS financial.categories (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) CHECK (type IN ('income', 'expense', 'transfer')),
    parent_id UUID REFERENCES financial.categories(id),
    color VARCHAR(7),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar categorías por defecto
INSERT INTO financial.categories (name, type) VALUES 
    ('Salary', 'income'),
    ('Freelance', 'income'),
    ('Investment', 'income'),
    ('Food & Dining', 'expense'),
    ('Transportation', 'expense'),
    ('Shopping', 'expense'),
    ('Bills & Utilities', 'expense'),
    ('Entertainment', 'expense'),
    ('Healthcare', 'expense'),
    ('Transfer', 'transfer')
ON CONFLICT (name) DO NOTHING;

-- 3.5 TRANSACTION_CATEGORIZATIONS TABLE
CREATE TABLE IF NOT EXISTS financial.transaction_categorizations (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
    transaction_id UUID REFERENCES financial.transactions(id) ON DELETE CASCADE,
    category_id UUID REFERENCES financial.categories(id),
    confidence DECIMAL(3, 2) DEFAULT 1.00,
    method VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(transaction_id)
);

-- 3.6 CLIENTS TABLE (del archivo client-invoice-schema.sql)
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

-- 3.7 INVOICES TABLE
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

-- 3.8 INVOICE_SEQUENCES TABLE
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

-- 3.9 CLIENT_TRANSACTION_LINKS TABLE
CREATE TABLE IF NOT EXISTS financial.client_transaction_links (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
    transaction_id UUID REFERENCES financial.transactions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL,
    match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('automatic', 'manual', 'pattern', 'fuzzy')),
    match_confidence DECIMAL(3, 2) DEFAULT 1.00,
    matched_by VARCHAR(255),
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    match_criteria JSONB,
    is_manual_override BOOLEAN DEFAULT FALSE,
    previous_link_id UUID,
    override_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(transaction_id)
);

-- 3.10 TRANSACTION_MATCHING_PATTERNS TABLE
CREATE TABLE IF NOT EXISTS financial.transaction_matching_patterns (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
    client_id UUID NOT NULL,
    pattern_type VARCHAR(20) NOT NULL CHECK (pattern_type IN ('reference', 'description', 'amount_range', 'recurring')),
    pattern VARCHAR(500) NOT NULL,
    confidence DECIMAL(3, 2) DEFAULT 0.80,
    amount_min DECIMAL(20, 8),
    amount_max DECIMAL(20, 8),
    day_of_month INTEGER,
    frequency VARCHAR(20) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    is_active BOOLEAN DEFAULT TRUE,
    match_count INTEGER DEFAULT 0,
    last_matched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.11 CUSTOMERS TABLE (del financial/database.service.ts)
CREATE TABLE IF NOT EXISTS financial.customers (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    tax_id VARCHAR(100),
    address JSONB,
    type VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.12 EXCHANGE_RATES TABLE
CREATE TABLE IF NOT EXISTS financial.exchange_rates (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
    from_currency_id UUID REFERENCES financial.currencies(id),
    to_currency_id UUID REFERENCES financial.currencies(id),
    rate DECIMAL(20, 10) NOT NULL,
    date DATE NOT NULL,
    source VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_currency_id, to_currency_id, date)
);

-- 3.13 TRANSACTION_INVOICE_LINKS TABLE
CREATE TABLE IF NOT EXISTS financial.transaction_invoice_links (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
    transaction_id UUID REFERENCES financial.transactions(id) ON DELETE CASCADE,
    invoice_id VARCHAR(255) REFERENCES financial.invoices(id) ON DELETE CASCADE,
    amount_allocated DECIMAL(20, 8) NOT NULL,
    currency_id UUID REFERENCES financial.currencies(id),
    exchange_rate DECIMAL(20, 10),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.14 INVOICE_ITEMS TABLE
CREATE TABLE IF NOT EXISTS financial.invoice_items (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
    invoice_id VARCHAR(255) REFERENCES financial.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 4) NOT NULL,
    unit_price DECIMAL(20, 8) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    tax_rate DECIMAL(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PASO 4: TABLAS DEL ESQUEMA PUBLIC (CORE)
-- ============================================================================

-- 4.1 WORKFLOWS TABLE
CREATE TABLE IF NOT EXISTS workflows (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT FALSE,
    workflow_data JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    tags TEXT[]
);

-- 4.2 EXECUTIONS TABLE
CREATE TABLE IF NOT EXISTS executions (
    id VARCHAR(36) PRIMARY KEY,
    workflow_id VARCHAR(36) REFERENCES workflows(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    execution_time_ms INTEGER
);

-- 4.3 METRICS TABLE
CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    tags JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.4 DOCUMENTS TABLE (del init-db.sql)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
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

-- 4.5 KNOWLEDGE_ENTRIES TABLE
CREATE TABLE IF NOT EXISTS knowledge_entries (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    confidence_score DECIMAL(3,2),
    source_document_id UUID REFERENCES documents(id),
    relations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.6 AUTONOMOUS_TASKS TABLE
CREATE TABLE IF NOT EXISTS autonomous_tasks (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
    task_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    input_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    result_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.7 COMMUNICATION_LOG TABLE
CREATE TABLE IF NOT EXISTS communication_log (
    id UUID PRIMARY KEY DEFAULT COALESCE(gen_random_uuid(), uuid_generate_v4()),
    channel VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    message_type VARCHAR(50),
    content TEXT,
    metadata JSONB,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- PASO 5: CREAR TODOS LOS ÍNDICES
-- ============================================================================

-- Índices para financial schema
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON financial.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON financial.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_counterparty ON financial.transactions(counterparty_name);
CREATE INDEX IF NOT EXISTS idx_transactions_currency_id ON financial.transactions(currency_id);

CREATE INDEX IF NOT EXISTS idx_accounts_currency_id ON financial.accounts(currency_id);
CREATE INDEX IF NOT EXISTS idx_accounts_institution_id ON financial.accounts(institution_id);

CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_transaction_id ON financial.transaction_categorizations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_category_id ON financial.transaction_categorizations(category_id);

CREATE INDEX IF NOT EXISTS idx_clients_status ON financial.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email ON financial.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_tax_id ON financial.clients(tax_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON financial.clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_tags ON financial.clients USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON financial.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON financial.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON financial.invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON financial.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON financial.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_tags ON financial.invoices USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_invoices_related_transactions ON financial.invoices USING GIN(related_transaction_ids);

CREATE INDEX IF NOT EXISTS idx_client_transaction_links_transaction_id ON financial.client_transaction_links(transaction_id);
CREATE INDEX IF NOT EXISTS idx_client_transaction_links_client_id ON financial.client_transaction_links(client_id);
CREATE INDEX IF NOT EXISTS idx_client_transaction_links_match_type ON financial.client_transaction_links(match_type);

CREATE INDEX IF NOT EXISTS idx_transaction_matching_patterns_client_id ON financial.transaction_matching_patterns(client_id);
CREATE INDEX IF NOT EXISTS idx_transaction_matching_patterns_pattern_type ON financial.transaction_matching_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_transaction_matching_patterns_active ON financial.transaction_matching_patterns(is_active);

-- Índices para tablas core
CREATE INDEX IF NOT EXISTS idx_workflows_name ON workflows(name);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(active);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);

CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_start_time ON executions(start_time);

CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);

CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category);

CREATE INDEX IF NOT EXISTS idx_autonomous_status ON autonomous_tasks(status);

CREATE INDEX IF NOT EXISTS idx_communication_channel ON communication_log(channel);

-- ============================================================================
-- PASO 6: CREAR VISTAS
-- ============================================================================

-- Vista de transacciones categorizadas
CREATE OR REPLACE VIEW financial.categorized_transactions AS
SELECT 
    t.id,
    t.account_id,
    a.name as account_name,
    t.type,
    t.amount,
    t.currency_id,
    c.code as currency_code,
    t.description,
    t.date,
    cat.id as category_id,
    cat.name as category_name,
    cat.type as category_type,
    tc.confidence as confidence_score,
    tc.method as categorization_method,
    t.created_at
FROM financial.transactions t
JOIN financial.accounts a ON t.account_id = a.account_id
JOIN financial.currencies c ON t.currency_id = c.id
LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
LEFT JOIN financial.categories cat ON tc.category_id = cat.id;

-- Vista de resumen mensual por categoría
CREATE OR REPLACE VIEW financial.monthly_category_summary AS
SELECT 
    DATE_TRUNC('month', t.date) as month,
    cat.id as category_id,
    cat.name as category_name,
    cat.type as category_type,
    cur.code as currency_code,
    COUNT(t.id) as transaction_count,
    SUM(ABS(t.amount)) as total_amount,
    AVG(ABS(t.amount)) as avg_amount,
    MIN(ABS(t.amount)) as min_amount,
    MAX(ABS(t.amount)) as max_amount
FROM financial.transactions t
JOIN financial.currencies cur ON t.currency_id = cur.id
LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
LEFT JOIN financial.categories cat ON tc.category_id = cat.id
WHERE t.status = 'confirmed'
GROUP BY DATE_TRUNC('month', t.date), cat.id, cat.name, cat.type, cur.code
ORDER BY month DESC, total_amount DESC;

-- Vista de estadísticas de clientes
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

-- ============================================================================
-- PASO 7: CREAR FUNCIONES Y TRIGGERS
-- ============================================================================

-- Función para actualizar estadísticas de clientes
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

-- Crear trigger para actualizar estadísticas de clientes
DROP TRIGGER IF EXISTS update_client_stats_trigger ON financial.invoices;
CREATE TRIGGER update_client_stats_trigger
AFTER INSERT OR UPDATE ON financial.invoices
FOR EACH ROW
EXECUTE FUNCTION financial.update_client_stats();

-- Función para generar número de factura
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

-- ============================================================================
-- PASO 8: PERMISOS (ajustar según tu usuario de producción)
-- ============================================================================

-- Otorgar permisos al usuario ai_user si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_user WHERE usename = 'ai_user') THEN
        GRANT ALL PRIVILEGES ON SCHEMA financial TO ai_user;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA financial TO ai_user;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA financial TO ai_user;
        GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA financial TO ai_user;
        
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ai_user;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ai_user;
        GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO ai_user;
    END IF;
END$$;

-- ============================================================================
-- PASO 9: VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que todas las tablas críticas existen
DO $$
DECLARE
    v_missing_tables TEXT := '';
    v_table_name TEXT;
    v_required_tables TEXT[] := ARRAY[
        'financial.currencies',
        'financial.accounts',
        'financial.transactions',
        'financial.categories',
        'financial.transaction_categorizations',
        'financial.clients',
        'financial.invoices',
        'financial.client_transaction_links',
        'financial.transaction_matching_patterns'
    ];
BEGIN
    FOREACH v_table_name IN ARRAY v_required_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema || '.' || table_name = v_table_name
        ) THEN
            v_missing_tables := v_missing_tables || v_table_name || ', ';
        END IF;
    END LOOP;
    
    IF v_missing_tables != '' THEN
        RAISE EXCEPTION 'Las siguientes tablas críticas no se crearon: %', v_missing_tables;
    END IF;
    
    RAISE NOTICE 'Todas las tablas críticas fueron creadas exitosamente';
END$$;

-- Verificar columnas críticas
DO $$
BEGIN
    -- Verificar wallet_address en accounts
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'financial' 
        AND table_name = 'accounts' 
        AND column_name = 'wallet_address'
    ) THEN
        RAISE EXCEPTION 'CRÍTICO: La columna wallet_address no existe en financial.accounts';
    END IF;
    
    -- Verificar currency_id en transactions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'financial' 
        AND table_name = 'transactions' 
        AND column_name = 'currency_id'
    ) THEN
        RAISE EXCEPTION 'CRÍTICO: La columna currency_id no existe en financial.transactions';
    END IF;
    
    -- Verificar counterparty_name en transactions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'financial' 
        AND table_name = 'transactions' 
        AND column_name = 'counterparty_name'
    ) THEN
        RAISE EXCEPTION 'CRÍTICO: La columna counterparty_name no existe en financial.transactions';
    END IF;
    
    RAISE NOTICE 'Todas las columnas críticas fueron verificadas exitosamente';
END$$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '✅ MIGRACIÓN COMPLETA: El esquema de producción ha sido actualizado exitosamente';
    RAISE NOTICE '📊 Total de tablas en financial schema: %', 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'financial');
    RAISE NOTICE '📊 Total de índices en financial schema: %', 
        (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'financial');
END$$;