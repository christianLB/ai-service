#!/bin/bash

# Update Categorization Schema - Add AI categorization and reporting to existing financial DB
# This script adds the new categorization tables to an existing financial database

set -e

echo "🏦 Updating Financial Database with Categorization System..."

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) not found. Please install PostgreSQL."
    exit 1
fi

# Load environment variables from .env.local if it exists
if [ -f "$(dirname "$0")/../.env.local" ]; then
    echo "📁 Loading environment variables from .env.local"
    export $(grep -v '^#' "$(dirname "$0")/../.env.local" | xargs)
fi

# Default values
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5434}
DB_NAME=${POSTGRES_DB:-ai_service}
DB_USER=${POSTGRES_USER:-ai_user}

# Check for required password
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ POSTGRES_PASSWORD environment variable is required"
    echo "   Set it in .env.local or as an environment variable"
    exit 1
fi
DB_PASSWORD=$POSTGRES_PASSWORD

echo "📊 Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"

# Test database connection
echo "🔍 Testing database connection..."
export PGPASSWORD=$DB_PASSWORD
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Cannot connect to PostgreSQL. Please check your database configuration."
    exit 1
fi

echo "✅ Database connection successful"

# Check if financial schema exists
echo "🔍 Checking if financial schema exists..."
SCHEMA_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = 'financial';")

if [ "$SCHEMA_EXISTS" -eq 0 ]; then
    echo "❌ Financial schema not found. Please run setup-financial-db.sh first."
    exit 1
fi

echo "✅ Financial schema found"

# Apply categorization updates
echo "📋 Applying categorization schema updates..."

# Create temporary SQL file with categorization schema
cat << 'EOF' > /tmp/categorization-update.sql
-- ============================================================================
-- INTELLIGENT CATEGORIZATION SYSTEM - UPDATE SCRIPT
-- ============================================================================

-- Main categories (high-level classification)
CREATE TABLE IF NOT EXISTS financial.categories (
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

-- Insert default categories (only if table is empty)
INSERT INTO financial.categories (name, description, color, icon, type)
SELECT * FROM (VALUES
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
    ('Loans', 'Loan payments and receipts', '#795548', 'payment', 'transfer')
) AS new_categories(name, description, color, icon, type)
WHERE NOT EXISTS (SELECT 1 FROM financial.categories LIMIT 1);

-- Subcategories for detailed classification
CREATE TABLE IF NOT EXISTS financial.subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES financial.categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(category_id, name)
);

-- Insert default subcategories (only if table is empty)
INSERT INTO financial.subcategories (category_id, name, description)
SELECT category_id, name, description FROM (VALUES
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
    ((SELECT id FROM financial.categories WHERE name = 'Transportation'), 'Car Maintenance', 'Car repairs and service')
) AS new_subcategories(category_id, name, description)
WHERE NOT EXISTS (SELECT 1 FROM financial.subcategories LIMIT 1);

-- AI-powered tags for automatic categorization
CREATE TABLE IF NOT EXISTS financial.ai_tags (
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

-- Insert default AI tags (only if table is empty)
INSERT INTO financial.ai_tags (name, keywords, merchant_patterns, category_id, subcategory_id, confidence_score)
SELECT name, keywords, merchant_patterns, category_id, subcategory_id, confidence_score FROM (VALUES
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
     (SELECT id FROM financial.subcategories WHERE name = 'Fuel'), 0.9)
) AS new_tags(name, keywords, merchant_patterns, category_id, subcategory_id, confidence_score)
WHERE NOT EXISTS (SELECT 1 FROM financial.ai_tags LIMIT 1);

-- Transaction categorization (links transactions to categories)
CREATE TABLE IF NOT EXISTS financial.transaction_categorizations (
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
CREATE TABLE IF NOT EXISTS financial.custom_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7), -- Hex color
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many relationship between transactions and custom tags
CREATE TABLE IF NOT EXISTS financial.transaction_custom_tags (
    transaction_id UUID REFERENCES financial.transactions(id) ON DELETE CASCADE,
    custom_tag_id UUID REFERENCES financial.custom_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (transaction_id, custom_tag_id)
);

-- ============================================================================
-- REPORTING & ANALYTICS VIEWS
-- ============================================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS financial.categorized_transactions;
DROP VIEW IF EXISTS financial.monthly_category_summary;
DROP VIEW IF EXISTS financial.account_insights;

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

CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_transaction ON financial.transaction_categorizations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_category ON financial.transaction_categorizations(category_id);
CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_method ON financial.transaction_categorizations(method);
CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_confidence ON financial.transaction_categorizations(confidence_score);

CREATE INDEX IF NOT EXISTS idx_ai_tags_keywords ON financial.ai_tags USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_ai_tags_category ON financial.ai_tags(category_id);
CREATE INDEX IF NOT EXISTS idx_ai_tags_active ON financial.ai_tags(is_active);

CREATE INDEX IF NOT EXISTS idx_categories_type ON financial.categories(type);
CREATE INDEX IF NOT EXISTS idx_subcategories_category ON financial.subcategories(category_id);

-- ============================================================================
-- CATEGORIZATION TRIGGERS
-- ============================================================================

-- Update category and subcategory timestamps
CREATE OR REPLACE FUNCTION financial.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_categories_updated_at ON financial.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON financial.categories FOR EACH ROW EXECUTE FUNCTION financial.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subcategories_updated_at ON financial.subcategories;
CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON financial.subcategories FOR EACH ROW EXECUTE FUNCTION financial.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_tags_updated_at ON financial.ai_tags;
CREATE TRIGGER update_ai_tags_updated_at BEFORE UPDATE ON financial.ai_tags FOR EACH ROW EXECUTE FUNCTION financial.update_updated_at_column();

DROP TRIGGER IF EXISTS update_transaction_categorizations_updated_at ON financial.transaction_categorizations;
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

DROP TRIGGER IF EXISTS update_ai_tag_stats_on_categorization ON financial.transaction_categorizations;
CREATE TRIGGER update_ai_tag_stats_on_categorization 
    AFTER INSERT ON financial.transaction_categorizations 
    FOR EACH ROW 
    WHEN (NEW.ai_tag_id IS NOT NULL)
    EXECUTE FUNCTION financial.update_ai_tag_stats();

-- Update schema comment
COMMENT ON SCHEMA financial IS 'Crypto-ready financial system with unified fiat/crypto transactions, AI-powered categorization, and intelligent reporting';
EOF

# Apply the update
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /tmp/categorization-update.sql

# Clean up
rm /tmp/categorization-update.sql

if [ $? -eq 0 ]; then
    echo "✅ Categorization schema updated successfully"
else
    echo "❌ Failed to update categorization schema"
    exit 1
fi

# Verify update
echo "🔍 Verifying categorization tables..."
TABLES_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'financial' 
    AND table_name IN ('categories', 'subcategories', 'ai_tags', 'transaction_categorizations');
")

if [ "$TABLES_COUNT" -eq 4 ]; then
    echo "✅ All categorization tables verified"
    
    # Show categorization tables
    echo "📊 Categorization tables:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        SELECT table_name, 
               (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'financial' AND table_name = t.table_name) as columns
        FROM information_schema.tables t
        WHERE table_schema = 'financial' 
        AND table_name IN ('categories', 'subcategories', 'ai_tags', 'transaction_categorizations', 'custom_tags')
        ORDER BY table_name;
    "
    
    # Show default categories
    echo "🏷️ Default categories:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        SELECT type, COUNT(*) as category_count
        FROM financial.categories 
        WHERE is_active = true 
        GROUP BY type
        ORDER BY type;
    "
    
    # Show AI tags count
    echo "🤖 AI tags:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        SELECT COUNT(*) as ai_tags_count
        FROM financial.ai_tags 
        WHERE is_active = true;
    "
else
    echo "❌ Categorization tables verification failed"
    exit 1
fi

echo ""
echo "🎉 Categorization system updated successfully!"
echo ""
echo "📝 Next Steps:"
echo "1. Restart your AI Service to load the new features:"
echo "   npm run dev  # or node dist/index.js"
echo ""
echo "2. Access the Financial Dashboard:"
echo "   http://localhost:3000/dashboard"
echo ""
echo "3. Test categorization APIs:"
echo "   curl http://localhost:3000/api/financial/categories"
echo "   curl -X POST http://localhost:3000/api/financial/categorize/auto"
echo ""
echo "4. Generate reports:"
echo "   curl 'http://localhost:3000/api/financial/reports/comprehensive'"
echo ""
echo "✨ Your financial system now has AI-powered categorization!"