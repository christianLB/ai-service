-- AI Service Complete Schema
-- This includes all tables with GoCardless and crypto support

-- Create schemas
CREATE SCHEMA IF NOT EXISTS financial;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Currencies table
CREATE TABLE IF NOT EXISTS financial.currencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10),
    decimals INTEGER DEFAULT 2,
    is_crypto BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Accounts table
CREATE TABLE IF NOT EXISTS financial.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    currency_id UUID REFERENCES financial.currencies(id),
    balance DECIMAL(20, 8) DEFAULT 0,
    provider VARCHAR(50),
    metadata JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table with all required columns
CREATE TABLE IF NOT EXISTS financial.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(255) UNIQUE,
    account_id VARCHAR(255) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    currency_id UUID REFERENCES financial.currencies(id),
    type VARCHAR(50),
    status VARCHAR(50),
    description TEXT,
    reference VARCHAR(255),
    counterparty_name VARCHAR(255),
    date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES financial.categories(id),
    color VARCHAR(7),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transaction categorizations
CREATE TABLE IF NOT EXISTS financial.transaction_categorizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES financial.transactions(id) ON DELETE CASCADE,
    category_id UUID REFERENCES financial.categories(id),
    confidence DECIMAL(3, 2),
    is_manual BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sync logs
CREATE TABLE IF NOT EXISTS financial.sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB
);

-- Transaction matching patterns
CREATE TABLE IF NOT EXISTS financial.transaction_matching_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern TEXT NOT NULL,
    category_id UUID REFERENCES financial.categories(id),
    confidence DECIMAL(3, 2) DEFAULT 0.80,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categorized transactions view
CREATE OR REPLACE VIEW financial.categorized_transactions AS
SELECT 
    t.*,
    c.name as category_name,
    c.color as category_color,
    tc.confidence,
    tc.is_manual
FROM financial.transactions t
LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
LEFT JOIN financial.categories c ON tc.category_id = c.id;

-- Monthly category summary
CREATE OR REPLACE VIEW financial.monthly_category_summary AS
SELECT 
    DATE_TRUNC('month', t.date) as month,
    c.name as category,
    COUNT(*) as transaction_count,
    SUM(ABS(t.amount)) as total_amount,
    t.currency_id
FROM financial.transactions t
JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
JOIN financial.categories c ON tc.category_id = c.id
WHERE t.amount < 0
GROUP BY DATE_TRUNC('month', t.date), c.name, t.currency_id;

-- Client transaction links (for AI service)
CREATE TABLE IF NOT EXISTS financial.client_transaction_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(255) NOT NULL,
    transaction_id UUID REFERENCES financial.transactions(id),
    link_type VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Account insights view
CREATE OR REPLACE VIEW financial.account_insights AS
SELECT 
    a.id,
    a.name,
    a.balance,
    c.code as currency_code,
    
    -- Last 30 days activity
    (SELECT COUNT(*) FROM financial.transactions t 
     WHERE t.account_id = a.id::text AND t.date >= NOW() - INTERVAL '30 days') as transactions_30d,
    
    (SELECT COALESCE(SUM(t.amount), 0) FROM financial.transactions t 
     WHERE t.account_id = a.id::text 
     AND t.amount > 0 
     AND t.date >= NOW() - INTERVAL '30 days') as income_30d,
     
    (SELECT COALESCE(SUM(ABS(t.amount)), 0) FROM financial.transactions t 
     WHERE t.account_id = a.id::text 
     AND t.amount < 0 
     AND t.date >= NOW() - INTERVAL '30 days') as expenses_30d
     
FROM financial.accounts a
JOIN financial.currencies c ON a.currency_id = c.id
WHERE a.is_active = true;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON financial.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON financial.transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_hash ON financial.transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_from_address ON financial.transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to_address ON financial.transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_transaction_id ON financial.transaction_categorizations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_provider_status ON financial.sync_logs(provider, status);

-- Default data
INSERT INTO financial.currencies (code, name, symbol, decimals, is_crypto) VALUES
    ('EUR', 'Euro', '€', 2, false),
    ('USD', 'US Dollar', '$', 2, false),
    ('GBP', 'British Pound', '£', 2, false),
    ('ETH', 'Ethereum', 'Ξ', 18, true),
    ('BTC', 'Bitcoin', '₿', 8, true)
ON CONFLICT (code) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA financial TO ai_user;