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

COMMENT ON SCHEMA financial IS 'Crypto-ready financial system with unified fiat/crypto transactions, invoicing, and multi-currency support';