-- Financial Schema: PostgreSQL Crypto-Ready
-- Compatible with: GoCardless (fiat) + Crypto transactions + Invoicing

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create financial schema
DROP SCHEMA IF EXISTS financial CASCADE;
CREATE SCHEMA financial;

-- ============================================================================
-- CORE ENTITIES
-- ============================================================================

-- Currency types (extensible for crypto)
CREATE TABLE financial.currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL, -- EUR, USD, BTC, ETH, etc.
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('fiat', 'crypto')),
    decimals INTEGER DEFAULT 2, -- 2 for fiat, 8+ for crypto
    symbol VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default currencies
INSERT INTO financial.currencies (code, name, type, decimals, symbol) VALUES 
('EUR', 'Euro', 'fiat', 2, '€'),
('USD', 'US Dollar', 'fiat', 2, '$'),
('BTC', 'Bitcoin', 'crypto', 8, '₿'),
('ETH', 'Ethereum', 'crypto', 18, 'Ξ'),
('USDT', 'Tether', 'crypto', 6, '₮');

-- ============================================================================
-- CUSTOMERS & ENTITIES
-- ============================================================================

-- Customers (individuals/companies)
CREATE TABLE financial.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    tax_id VARCHAR(50),
    address JSONB, -- Flexible address storage
    type VARCHAR(20) DEFAULT 'individual' CHECK (type IN ('individual', 'company')),
    metadata JSONB DEFAULT '{}', -- Custom fields
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ACCOUNTS (FIAT + CRYPTO)
-- ============================================================================

-- Account types
CREATE TYPE financial.account_type AS ENUM (
    'bank_account',     -- Traditional banking
    'crypto_wallet',    -- Crypto wallets
    'exchange_account', -- Crypto exchange accounts
    'payment_processor' -- PayPal, Stripe, etc.
);

-- Financial accounts (unified fiat + crypto)
CREATE TABLE financial.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type financial.account_type NOT NULL,
    currency_id UUID REFERENCES financial.currencies(id),
    
    -- Traditional banking (GoCardless)
    account_id VARCHAR(255), -- GoCardless account_id
    institution_id VARCHAR(100), -- Bank identifier
    requisition_id VARCHAR(255), -- GoCardless requisition
    iban VARCHAR(50),
    
    -- Crypto specific
    wallet_address VARCHAR(255), -- Crypto wallet address
    chain_id INTEGER, -- Blockchain network ID
    exchange_name VARCHAR(100), -- Binance, Coinbase, etc.
    
    -- Common fields
    balance DECIMAL(20,8) DEFAULT 0, -- High precision for crypto
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraints based on type
    CONSTRAINT unique_bank_account UNIQUE (account_id, institution_id),
    CONSTRAINT unique_crypto_wallet UNIQUE (wallet_address, chain_id)
);

-- ============================================================================
-- TRANSACTIONS (UNIFIED FIAT + CRYPTO)
-- ============================================================================

-- Transaction types
CREATE TYPE financial.transaction_type AS ENUM (
    'bank_transfer',    -- Traditional bank transfers
    'crypto_send',      -- Crypto outgoing
    'crypto_receive',   -- Crypto incoming
    'exchange_trade',   -- Crypto trading
    'payment',          -- Payment processing
    'fee',             -- Transaction fees
    'conversion'       -- Currency conversion
);

-- Transaction status
CREATE TYPE financial.transaction_status AS ENUM (
    'pending',
    'confirmed',
    'failed',
    'cancelled'
);

-- Main transactions table
CREATE TABLE financial.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic transaction data
    account_id UUID REFERENCES financial.accounts(id),
    type financial.transaction_type NOT NULL,
    status financial.transaction_status DEFAULT 'pending',
    
    -- Amount and currency
    amount DECIMAL(20,8) NOT NULL,
    currency_id UUID REFERENCES financial.currencies(id),
    
    -- Transaction details
    description TEXT,
    reference VARCHAR(255), -- External reference (GoCardless, txHash, etc.)
    date TIMESTAMPTZ NOT NULL,
    
    -- Fiat specific (GoCardless)
    gocardless_data JSONB, -- Raw GoCardless response
    
    -- Crypto specific
    transaction_hash VARCHAR(255), -- Blockchain tx hash
    block_number BIGINT, -- Block number
    gas_used DECIMAL(20,8), -- Gas consumed
    gas_price DECIMAL(20,8), -- Gas price
    from_address VARCHAR(255), -- Sender address
    to_address VARCHAR(255), -- Recipient address
    
    -- Counterparty
    counterparty_name VARCHAR(255),
    counterparty_account VARCHAR(255),
    
    -- Fees
    fee_amount DECIMAL(20,8) DEFAULT 0,
    fee_currency_id UUID REFERENCES financial.currencies(id),
    
    -- Metadata and audit
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT valid_amount CHECK (amount != 0)
);

-- ============================================================================
-- INVOICING SYSTEM
-- ============================================================================

-- Invoice status
CREATE TYPE financial.invoice_status AS ENUM (
    'draft',
    'sent',
    'paid',
    'partial_paid',
    'overdue',
    'cancelled'
);

-- Invoices
CREATE TABLE financial.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES financial.customers(id),
    
    -- Invoice details
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255),
    description TEXT,
    
    -- Amounts
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    currency_id UUID REFERENCES financial.currencies(id),
    
    -- Dates
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    
    -- Status
    status financial.invoice_status DEFAULT 'draft',
    
    -- Payment tracking
    amount_paid DECIMAL(12,2) DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_amounts CHECK (
        subtotal >= 0 AND 
        tax_amount >= 0 AND 
        total_amount >= 0 AND
        amount_paid >= 0 AND
        amount_paid <= total_amount
    )
);

-- Invoice line items
CREATE TABLE financial.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES financial.invoices(id) ON DELETE CASCADE,
    
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRANSACTION-INVOICE RECONCILIATION
-- ============================================================================

-- Links transactions to invoices (payment matching)
CREATE TABLE financial.transaction_invoice_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES financial.transactions(id),
    invoice_id UUID REFERENCES financial.invoices(id),
    
    amount_allocated DECIMAL(20,8) NOT NULL,
    currency_id UUID REFERENCES financial.currencies(id),
    
    -- Exchange rate if different currencies
    exchange_rate DECIMAL(20,8) DEFAULT 1,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT positive_allocation CHECK (amount_allocated > 0)
);

-- ============================================================================
-- EXCHANGE RATES (FOR MULTI-CURRENCY)
-- ============================================================================

-- Exchange rates between currencies
CREATE TABLE financial.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency_id UUID REFERENCES financial.currencies(id),
    to_currency_id UUID REFERENCES financial.currencies(id),
    
    rate DECIMAL(20,8) NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    source VARCHAR(100), -- API source: coinmarketcap, exchangerate-api, etc.
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT different_currencies CHECK (from_currency_id != to_currency_id),
    CONSTRAINT positive_rate CHECK (rate > 0),
    UNIQUE (from_currency_id, to_currency_id, date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Transactions indexes
CREATE INDEX idx_transactions_account_date ON financial.transactions(account_id, date DESC);
CREATE INDEX idx_transactions_type ON financial.transactions(type);
CREATE INDEX idx_transactions_status ON financial.transactions(status);
CREATE INDEX idx_transactions_reference ON financial.transactions(reference);
CREATE INDEX idx_transactions_hash ON financial.transactions(transaction_hash);
CREATE INDEX idx_transactions_addresses ON financial.transactions(from_address, to_address);

-- Invoices indexes
CREATE INDEX idx_invoices_customer ON financial.invoices(customer_id);
CREATE INDEX idx_invoices_status ON financial.invoices(status);
CREATE INDEX idx_invoices_due_date ON financial.invoices(due_date);
CREATE INDEX idx_invoices_number ON financial.invoices(invoice_number);

-- Accounts indexes
CREATE INDEX idx_accounts_type ON financial.accounts(type);
CREATE INDEX idx_accounts_currency ON financial.accounts(currency_id);
CREATE INDEX idx_accounts_active ON financial.accounts(is_active);

-- Exchange rates indexes
CREATE INDEX idx_exchange_rates_currencies ON financial.exchange_rates(from_currency_id, to_currency_id);
CREATE INDEX idx_exchange_rates_date ON financial.exchange_rates(date DESC);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION financial.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_currencies_updated_at BEFORE UPDATE ON financial.currencies FOR EACH ROW EXECUTE FUNCTION financial.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON financial.customers FOR EACH ROW EXECUTE FUNCTION financial.update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON financial.accounts FOR EACH ROW EXECUTE FUNCTION financial.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON financial.transactions FOR EACH ROW EXECUTE FUNCTION financial.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON financial.invoices FOR EACH ROW EXECUTE FUNCTION financial.update_updated_at_column();

-- Auto-update invoice totals when items change
CREATE OR REPLACE FUNCTION financial.update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE financial.invoices 
    SET subtotal = (
        SELECT COALESCE(SUM(total_price), 0) 
        FROM financial.invoice_items 
        WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ),
    total_amount = subtotal + tax_amount
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoice_totals_on_items 
    AFTER INSERT OR UPDATE OR DELETE ON financial.invoice_items 
    FOR EACH ROW EXECUTE FUNCTION financial.update_invoice_totals();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Transaction summary with currency info
CREATE VIEW financial.transaction_summary AS
SELECT 
    t.id,
    t.account_id,
    a.name as account_name,
    t.type,
    t.status,
    t.amount,
    c.code as currency_code,
    c.symbol as currency_symbol,
    t.description,
    t.date,
    t.created_at
FROM financial.transactions t
JOIN financial.accounts a ON t.account_id = a.id
JOIN financial.currencies c ON t.currency_id = c.id;

-- Invoice summary with customer info
CREATE VIEW financial.invoice_summary AS
SELECT 
    i.id,
    i.invoice_number,
    i.customer_id,
    cu.name as customer_name,
    i.total_amount,
    c.code as currency_code,
    i.status,
    i.issue_date,
    i.due_date,
    i.amount_paid,
    (i.total_amount - i.amount_paid) as amount_due
FROM financial.invoices i
JOIN financial.customers cu ON i.customer_id = cu.id
JOIN financial.currencies c ON i.currency_id = c.id;

-- Account balances with currency
CREATE VIEW financial.account_balances AS
SELECT 
    a.id,
    a.name,
    a.type,
    a.balance,
    c.code as currency_code,
    c.symbol as currency_symbol,
    c.type as currency_type
FROM financial.accounts a
JOIN financial.currencies c ON a.currency_id = c.id
WHERE a.is_active = true;

-- ============================================================================
-- INTELLIGENT CATEGORIZATION SYSTEM
-- ============================================================================

-- Main categories (high-level classification)
CREATE TABLE financial.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Hex color for UI
    icon VARCHAR(50), -- Icon identifier
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO financial.categories (name, description, color, icon, type) VALUES 
-- Income categories
('Salary', 'Regular employment income', '#4CAF50', 'work', 'income'),
('Freelancing', 'Freelance and consulting income', '#8BC34A', 'person', 'income'),
('Investments', 'Investment returns, dividends, crypto gains', '#2196F3', 'trending_up', 'income'),
('Business', 'Business revenue and profits', '#FF9800', 'business', 'income'),
('Other Income', 'Miscellaneous income sources', '#9C27B0', 'account_balance', 'income'),

-- Expense categories
('Housing', 'Rent, mortgage, utilities, maintenance', '#F44336', 'home', 'expense'),
('Food & Dining', 'Groceries, restaurants, food delivery', '#FF5722', 'restaurant', 'expense'),
('Transportation', 'Car, public transport, fuel, parking', '#795548', 'directions_car', 'expense'),
('Shopping', 'Clothing, electronics, general purchases', '#E91E63', 'shopping_cart', 'expense'),
('Entertainment', 'Movies, games, hobbies, subscriptions', '#9C27B0', 'movie', 'expense'),
('Healthcare', 'Medical expenses, insurance, pharmacy', '#009688', 'local_hospital', 'expense'),
('Education', 'Courses, books, training, conferences', '#3F51B5', 'school', 'expense'),
('Travel', 'Flights, hotels, vacation expenses', '#00BCD4', 'flight', 'expense'),
('Financial', 'Banking fees, insurance, taxes', '#607D8B', 'account_balance', 'expense'),
('Other Expenses', 'Miscellaneous expenses', '#9E9E9E', 'more_horiz', 'expense'),

-- Transfer categories
('Savings', 'Transfers to savings accounts', '#4CAF50', 'savings', 'transfer'),
('Investments', 'Money moved to investment accounts', '#2196F3', 'trending_up', 'transfer'),
('Family', 'Money transfers to/from family', '#FF9800', 'family_restroom', 'transfer'),
('Loans', 'Loan payments and receipts', '#795548', 'payment', 'transfer');

-- Subcategories for detailed classification
CREATE TABLE financial.subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES financial.categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(category_id, name)
);

-- Insert default subcategories
INSERT INTO financial.subcategories (category_id, name, description) VALUES 
-- Housing subcategories
((SELECT id FROM financial.categories WHERE name = 'Housing'), 'Rent', 'Monthly rent payments'),
((SELECT id FROM financial.categories WHERE name = 'Housing'), 'Mortgage', 'Mortgage payments'),
((SELECT id FROM financial.categories WHERE name = 'Housing'), 'Utilities', 'Electricity, water, gas, internet'),
((SELECT id FROM financial.categories WHERE name = 'Housing'), 'Maintenance', 'Home repairs and maintenance'),
((SELECT id FROM financial.categories WHERE name = 'Housing'), 'Insurance', 'Home insurance'),

-- Food & Dining subcategories
((SELECT id FROM financial.categories WHERE name = 'Food & Dining'), 'Groceries', 'Supermarket purchases'),
((SELECT id FROM financial.categories WHERE name = 'Food & Dining'), 'Restaurants', 'Dining out'),
((SELECT id FROM financial.categories WHERE name = 'Food & Dining'), 'Delivery', 'Food delivery services'),
((SELECT id FROM financial.categories WHERE name = 'Food & Dining'), 'Coffee', 'Coffee shops and cafes'),

-- Transportation subcategories
((SELECT id FROM financial.categories WHERE name = 'Transportation'), 'Fuel', 'Gasoline and charging'),
((SELECT id FROM financial.categories WHERE name = 'Transportation'), 'Public Transport', 'Bus, metro, train tickets'),
((SELECT id FROM financial.categories WHERE name = 'Transportation'), 'Parking', 'Parking fees'),
((SELECT id FROM financial.categories WHERE name = 'Transportation'), 'Ride Sharing', 'Uber, taxi, etc.'),
((SELECT id FROM financial.categories WHERE name = 'Transportation'), 'Car Maintenance', 'Car repairs and service');

-- AI-powered tags for automatic categorization
CREATE TABLE financial.ai_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    
    -- AI matching patterns
    keywords TEXT[], -- Array of keywords to match
    merchant_patterns TEXT[], -- Regex patterns for merchant names
    amount_patterns JSONB, -- Min/max amounts, recurring patterns
    
    -- Association strength
    category_id UUID REFERENCES financial.categories(id),
    subcategory_id UUID REFERENCES financial.subcategories(id),
    confidence_score DECIMAL(3,2) DEFAULT 0.8, -- 0.0 to 1.0
    
    -- Learning metadata
    match_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.0,
    last_used TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert AI tags for common patterns
INSERT INTO financial.ai_tags (name, keywords, merchant_patterns, category_id, subcategory_id, confidence_score) VALUES 
-- Salary patterns
('Salary Payment', 
 ARRAY['nomina', 'sueldo', 'salary', 'payroll', 'wages'],
 ARRAY['.*NOMINA.*', '.*SUELDO.*', '.*PAYROLL.*'],
 (SELECT id FROM financial.categories WHERE name = 'Salary'), 
 NULL, 0.95),

-- Rent patterns
('Rent Payment',
 ARRAY['alquiler', 'rent', 'rental', 'arrendamiento'],
 ARRAY['.*ALQUILER.*', '.*RENT.*', '.*ARRENDAMIENTO.*'],
 (SELECT id FROM financial.categories WHERE name = 'Housing'),
 (SELECT id FROM financial.subcategories WHERE name = 'Rent'), 0.9),

-- Supermarket patterns
('Supermarket',
 ARRAY['mercadona', 'carrefour', 'lidl', 'dia', 'eroski', 'hipercor'],
 ARRAY['MERCADONA.*', 'CARREFOUR.*', 'LIDL.*', 'DIA.*', 'EROSKI.*'],
 (SELECT id FROM financial.categories WHERE name = 'Food & Dining'),
 (SELECT id FROM financial.subcategories WHERE name = 'Groceries'), 0.95),

-- Gas stations
('Gas Station',
 ARRAY['gasolina', 'gas', 'fuel', 'combustible', 'repsol', 'galp', 'cepsa'],
 ARRAY['REPSOL.*', 'GALP.*', 'CEPSA.*', '.*GASOLINA.*'],
 (SELECT id FROM financial.categories WHERE name = 'Transportation'),
 (SELECT id FROM financial.subcategories WHERE name = 'Fuel'), 0.9);

-- Transaction categorization (links transactions to categories)
CREATE TABLE financial.transaction_categorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES financial.transactions(id) ON DELETE CASCADE,
    category_id UUID REFERENCES financial.categories(id),
    subcategory_id UUID REFERENCES financial.subcategories(id),
    
    -- Categorization metadata
    method VARCHAR(20) NOT NULL CHECK (method IN ('manual', 'ai_auto', 'ai_suggested', 'rule_based')),
    confidence_score DECIMAL(3,2), -- AI confidence (0.0 to 1.0)
    ai_tag_id UUID REFERENCES financial.ai_tags(id), -- Which AI tag triggered this
    
    -- User feedback for learning
    user_confirmed BOOLEAN DEFAULT NULL, -- NULL=no feedback, TRUE=correct, FALSE=incorrect
    user_corrected_category_id UUID REFERENCES financial.categories(id),
    user_corrected_subcategory_id UUID REFERENCES financial.subcategories(id),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(transaction_id) -- One categorization per transaction
);

-- Custom user tags (flexible tagging system)
CREATE TABLE financial.custom_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7), -- Hex color
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many relationship between transactions and custom tags
CREATE TABLE financial.transaction_custom_tags (
    transaction_id UUID REFERENCES financial.transactions(id) ON DELETE CASCADE,
    custom_tag_id UUID REFERENCES financial.custom_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (transaction_id, custom_tag_id)
);

-- ============================================================================
-- REPORTING & ANALYTICS VIEWS
-- ============================================================================

-- Categorized transactions view
CREATE VIEW financial.categorized_transactions AS
SELECT 
    t.id,
    t.account_id,
    a.name as account_name,
    t.type,
    t.amount,
    t.currency_id,
    c.code as currency_code,
    t.description,
    t.counterparty_name,
    t.date,
    
    -- Categorization
    cat.id as category_id,
    cat.name as category_name,
    cat.type as category_type,
    cat.color as category_color,
    cat.icon as category_icon,
    
    subcat.id as subcategory_id,
    subcat.name as subcategory_name,
    
    tc.method as categorization_method,
    tc.confidence_score,
    tc.user_confirmed,
    
    t.created_at
FROM financial.transactions t
JOIN financial.accounts a ON t.account_id = a.id
JOIN financial.currencies c ON t.currency_id = c.id
LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
LEFT JOIN financial.categories cat ON tc.category_id = cat.id
LEFT JOIN financial.subcategories subcat ON tc.subcategory_id = subcat.id;

-- Monthly category summaries
CREATE VIEW financial.monthly_category_summary AS
SELECT 
    DATE_TRUNC('month', t.date) as month,
    cat.id as category_id,
    cat.name as category_name,
    cat.type as category_type,
    c.code as currency_code,
    COUNT(*) as transaction_count,
    SUM(t.amount) as total_amount,
    AVG(t.amount) as avg_amount,
    MIN(t.amount) as min_amount,
    MAX(t.amount) as max_amount
FROM financial.transactions t
JOIN financial.currencies c ON t.currency_id = c.id
JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
JOIN financial.categories cat ON tc.category_id = cat.id
WHERE t.status = 'confirmed'
GROUP BY DATE_TRUNC('month', t.date), cat.id, cat.name, cat.type, c.code;

-- Account balance with categorization insights
CREATE VIEW financial.account_insights AS
SELECT 
    a.id,
    a.name,
    a.balance,
    c.code as currency_code,
    
    -- Last 30 days activity
    (SELECT COUNT(*) FROM financial.transactions t 
     WHERE t.account_id = a.id AND t.date >= NOW() - INTERVAL '30 days') as transactions_30d,
    
    (SELECT SUM(t.amount) FROM financial.transactions t 
     JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
     JOIN financial.categories cat ON tc.category_id = cat.id
     WHERE t.account_id = a.id AND cat.type = 'income' AND t.date >= NOW() - INTERVAL '30 days') as income_30d,
     
    (SELECT SUM(ABS(t.amount)) FROM financial.transactions t 
     JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
     JOIN financial.categories cat ON tc.category_id = cat.id
     WHERE t.account_id = a.id AND cat.type = 'expense' AND t.date >= NOW() - INTERVAL '30 days') as expenses_30d
     
FROM financial.accounts a
JOIN financial.currencies c ON a.currency_id = c.id
WHERE a.is_active = true;

-- ============================================================================
-- CATEGORIZATION INDEXES
-- ============================================================================

CREATE INDEX idx_transaction_categorizations_transaction ON financial.transaction_categorizations(transaction_id);
CREATE INDEX idx_transaction_categorizations_category ON financial.transaction_categorizations(category_id);
CREATE INDEX idx_transaction_categorizations_method ON financial.transaction_categorizations(method);
CREATE INDEX idx_transaction_categorizations_confidence ON financial.transaction_categorizations(confidence_score);

CREATE INDEX idx_ai_tags_keywords ON financial.ai_tags USING GIN(keywords);
CREATE INDEX idx_ai_tags_category ON financial.ai_tags(category_id);
CREATE INDEX idx_ai_tags_active ON financial.ai_tags(is_active);

CREATE INDEX idx_categories_type ON financial.categories(type);
CREATE INDEX idx_subcategories_category ON financial.subcategories(category_id);

-- ============================================================================
-- CATEGORIZATION TRIGGERS
-- ============================================================================

-- Update category and subcategory timestamps
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON financial.categories FOR EACH ROW EXECUTE FUNCTION financial.update_updated_at_column();
CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON financial.subcategories FOR EACH ROW EXECUTE FUNCTION financial.update_updated_at_column();
CREATE TRIGGER update_ai_tags_updated_at BEFORE UPDATE ON financial.ai_tags FOR EACH ROW EXECUTE FUNCTION financial.update_updated_at_column();
CREATE TRIGGER update_transaction_categorizations_updated_at BEFORE UPDATE ON financial.transaction_categorizations FOR EACH ROW EXECUTE FUNCTION financial.update_updated_at_column();

-- Update AI tag statistics when used
CREATE OR REPLACE FUNCTION financial.update_ai_tag_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update match count and last used
    UPDATE financial.ai_tags 
    SET match_count = match_count + 1,
        last_used = NOW()
    WHERE id = NEW.ai_tag_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_tag_stats_on_categorization 
    AFTER INSERT ON financial.transaction_categorizations 
    FOR EACH ROW 
    WHEN (NEW.ai_tag_id IS NOT NULL)
    EXECUTE FUNCTION financial.update_ai_tag_stats();

COMMENT ON SCHEMA financial IS 'Crypto-ready financial system with unified fiat/crypto transactions, AI-powered categorization, and intelligent reporting';