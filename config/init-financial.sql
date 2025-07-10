-- Financial Schema Initialization for AI Service
-- Complete schema with GoCardless and crypto support

-- Create financial schema
CREATE SCHEMA IF NOT EXISTS financial;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Currencies table
CREATE TABLE IF NOT EXISTS financial.currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('fiat', 'crypto')),
    decimals INTEGER DEFAULT 2,
    symbol VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table
CREATE TABLE IF NOT EXISTS financial.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    currency_id UUID REFERENCES financial.currencies(id),
    balance DECIMAL(20, 8) DEFAULT 0,
    provider VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMPTZ,
    wallet_address VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table with ALL required columns
CREATE TABLE IF NOT EXISTS financial.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    currency_id UUID REFERENCES financial.currencies(id),
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmed',
    description TEXT,
    reference VARCHAR(255),
    counterparty_name VARCHAR(255),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    fee_amount DECIMAL(20, 8),
    fee_currency_id UUID REFERENCES financial.currencies(id),
    -- GoCardless specific
    gocardless_data JSONB,
    -- Crypto specific
    transaction_hash VARCHAR(255),
    block_number INTEGER,
    gas_used VARCHAR(255),
    gas_price VARCHAR(255),
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    counterparty_account VARCHAR(255)
);

-- Categories table
CREATE TABLE IF NOT EXISTS financial.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) CHECK (type IN ('income', 'expense', 'transfer')),
    parent_id UUID REFERENCES financial.categories(id),
    color VARCHAR(7),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction categorizations
CREATE TABLE IF NOT EXISTS financial.transaction_categorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES financial.transactions(id) ON DELETE CASCADE,
    category_id UUID REFERENCES financial.categories(id),
    confidence DECIMAL(3, 2) DEFAULT 1.00,
    method VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(transaction_id)
);

-- Client transaction links
CREATE TABLE IF NOT EXISTS financial.client_transaction_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Transaction matching patterns
CREATE TABLE IF NOT EXISTS financial.transaction_matching_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Sync logs
CREATE TABLE IF NOT EXISTS financial.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB
);

-- Schema migrations tracking (CRITICAL for preventing re-runs)
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    checksum VARCHAR(64),
    description TEXT
);

-- Create views
CREATE OR REPLACE VIEW financial.categorized_transactions AS
SELECT 
    t.*,
    cat.name as category_name,
    cat.type as category_type,
    tc.confidence as categorization_confidence,
    tc.method as categorization_method
FROM financial.transactions t
LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
LEFT JOIN financial.categories cat ON tc.category_id = cat.id;

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

-- Account insights view
CREATE OR REPLACE VIEW financial.account_insights AS
SELECT 
    a.id,
    a.name,
    a.balance,
    c.code as currency_code,
    
    -- Last 30 days activity
    (SELECT COUNT(*) FROM financial.transactions t 
     WHERE t.account_id = a.account_id AND t.date >= NOW() - INTERVAL '30 days') as transactions_30d,
    
    (SELECT COALESCE(SUM(t.amount), 0) FROM financial.transactions t 
     WHERE t.account_id = a.account_id 
     AND t.amount > 0 
     AND t.date >= NOW() - INTERVAL '30 days') as income_30d,
     
    (SELECT COALESCE(SUM(ABS(t.amount)), 0) FROM financial.transactions t 
     WHERE t.account_id = a.account_id 
     AND t.amount < 0 
     AND t.date >= NOW() - INTERVAL '30 days') as expenses_30d
     
FROM financial.accounts a
JOIN financial.currencies c ON a.currency_id = c.id
WHERE a.is_active = true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON financial.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON financial.transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_hash ON financial.transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_from_address ON financial.transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to_address ON financial.transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_transaction_id ON financial.transaction_categorizations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_client_links_client_id ON financial.client_transaction_links(client_id);
CREATE INDEX IF NOT EXISTS idx_matching_patterns_client ON financial.transaction_matching_patterns(client_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_provider_status ON financial.sync_logs(provider, status);

-- Insert default currencies
INSERT INTO financial.currencies (code, name, type, decimals, symbol) VALUES 
    ('EUR', 'Euro', 'fiat', 2, '€'),
    ('USD', 'US Dollar', 'fiat', 2, '$'),
    ('GBP', 'British Pound', 'fiat', 2, '£'),
    ('BTC', 'Bitcoin', 'crypto', 8, '₿'),
    ('ETH', 'Ethereum', 'crypto', 18, 'Ξ')
ON CONFLICT (code) DO NOTHING;

-- Insert default categories
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

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA financial TO ai_user;

-- Mark this schema version as applied
INSERT INTO public.schema_migrations (version, description) 
VALUES ('001_complete_financial_schema', 'Complete financial schema with GoCardless and crypto support')
ON CONFLICT (version) DO NOTHING;