-- Inicialización completa de tablas financieras para AI Service
-- Este script es 100% idempotente - se puede ejecutar múltiples veces sin problemas

-- Crear esquema financial si no existe
CREATE SCHEMA IF NOT EXISTS financial;

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==============================================
-- TABLAS BASE
-- ==============================================

-- Tabla de monedas
CREATE TABLE IF NOT EXISTS financial.currencies (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10),
    decimal_places INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de cuentas bancarias
CREATE TABLE IF NOT EXISTS financial.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id VARCHAR(255) UNIQUE,
    bank_connection_id VARCHAR(255),
    institution_name VARCHAR(255),
    institution_logo TEXT,
    account_name VARCHAR(255),
    account_type VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'EUR',
    balance DECIMAL(15,2) DEFAULT 0,
    available_balance DECIMAL(15,2),
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de transacciones
CREATE TABLE IF NOT EXISTS financial.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(255) UNIQUE,
    account_id VARCHAR(255) REFERENCES financial.accounts(account_id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    date DATE NOT NULL,
    booking_date DATE,
    value_date DATE,
    description TEXT,
    merchant_name VARCHAR(255),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    transaction_type VARCHAR(50),
    reference VARCHAR(255),
    is_pending BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    ai_categorized BOOLEAN DEFAULT false,
    ai_confidence DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS financial.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    parent_id UUID REFERENCES financial.categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de subcategorías
CREATE TABLE IF NOT EXISTS financial.subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES financial.categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- Tabla de etiquetas AI
CREATE TABLE IF NOT EXISTS financial.ai_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID,
    tag_name VARCHAR(100) NOT NULL,
    tag_type VARCHAR(50),
    confidence DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS financial.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tax_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2) DEFAULT 'ES',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de facturas
CREATE TABLE IF NOT EXISTS financial.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES financial.clients(id),
    issue_date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 21.00,
    tax_amount DECIMAL(15,2),
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'draft',
    payment_date DATE,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- TABLA CRÍTICA: account_insights
-- Creada como TABLA, no como vista
-- ==============================================

CREATE TABLE IF NOT EXISTS financial.account_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id VARCHAR(255) NOT NULL,
    institution_name VARCHAR(255),
    account_type VARCHAR(100),
    balance DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'EUR',
    last_sync TIMESTAMP WITH TIME ZONE,
    insights JSONB DEFAULT '{}',
    -- Campos calculados
    total_income_30d DECIMAL(15,2) DEFAULT 0,
    total_expenses_30d DECIMAL(15,2) DEFAULT 0,
    avg_daily_balance DECIMAL(15,2) DEFAULT 0,
    transaction_count_30d INTEGER DEFAULT 0,
    most_frequent_merchant VARCHAR(255),
    largest_expense_category VARCHAR(100),
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_account_insights_account 
        FOREIGN KEY (account_id) 
        REFERENCES financial.accounts(account_id) 
        ON DELETE CASCADE
);

-- Índices para account_insights
CREATE INDEX IF NOT EXISTS idx_account_insights_account_id ON financial.account_insights(account_id);
CREATE INDEX IF NOT EXISTS idx_account_insights_last_sync ON financial.account_insights(last_sync);
CREATE INDEX IF NOT EXISTS idx_account_insights_balance ON financial.account_insights(balance DESC);

-- ==============================================
-- VISTAS PARA REPORTING
-- ==============================================

-- Vista de transacciones categorizadas
CREATE OR REPLACE VIEW financial.categorized_transactions AS
SELECT 
    t.*,
    c.name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    s.name as subcategory_name
FROM financial.transactions t
LEFT JOIN financial.categories c ON t.category = c.name
LEFT JOIN financial.subcategories s ON t.subcategory = s.name;

-- Vista de resumen mensual por categoría
CREATE OR REPLACE VIEW financial.monthly_category_summary AS
SELECT 
    date_trunc('month', t.date) as month,
    t.category,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as total_expenses,
    SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as total_income
FROM financial.transactions t
WHERE t.is_pending = false
GROUP BY date_trunc('month', t.date), t.category;

-- ==============================================
-- FUNCIONES HELPER
-- ==============================================

-- Función para actualizar account_insights
CREATE OR REPLACE FUNCTION financial.update_account_insights(p_account_id VARCHAR(255))
RETURNS void AS $$
BEGIN
    INSERT INTO financial.account_insights (
        account_id,
        institution_name,
        account_type,
        balance,
        currency,
        last_sync,
        total_income_30d,
        total_expenses_30d,
        transaction_count_30d,
        avg_daily_balance
    )
    SELECT 
        a.account_id,
        a.institution_name,
        a.account_type,
        a.balance,
        a.currency,
        a.last_sync,
        COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) as total_income_30d,
        COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) as total_expenses_30d,
        COALESCE(COUNT(t.id), 0) as transaction_count_30d,
        a.balance as avg_daily_balance
    FROM financial.accounts a
    LEFT JOIN financial.transactions t ON a.account_id = t.account_id 
        AND t.date >= CURRENT_DATE - INTERVAL '30 days'
        AND t.is_pending = false
    WHERE a.account_id = p_account_id
    GROUP BY a.account_id, a.institution_name, a.account_type, a.balance, a.currency, a.last_sync
    ON CONFLICT (account_id) DO UPDATE SET
        institution_name = EXCLUDED.institution_name,
        account_type = EXCLUDED.account_type,
        balance = EXCLUDED.balance,
        currency = EXCLUDED.currency,
        last_sync = EXCLUDED.last_sync,
        total_income_30d = EXCLUDED.total_income_30d,
        total_expenses_30d = EXCLUDED.total_expenses_30d,
        transaction_count_30d = EXCLUDED.transaction_count_30d,
        avg_daily_balance = EXCLUDED.avg_daily_balance,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- PERMISOS
-- ==============================================

-- Dar permisos completos al usuario ai_user
GRANT ALL PRIVILEGES ON SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA financial TO ai_user;

-- ==============================================
-- DATOS INICIALES
-- ==============================================

-- Insertar monedas básicas
INSERT INTO financial.currencies (code, name, symbol) VALUES
    ('EUR', 'Euro', '€'),
    ('USD', 'US Dollar', '$'),
    ('GBP', 'British Pound', '£')
ON CONFLICT (code) DO NOTHING;

-- Insertar categorías básicas
INSERT INTO financial.categories (name, description, icon, color) VALUES
    ('Alimentación', 'Comida y bebidas', '🍽️', '#FF6B6B'),
    ('Transporte', 'Gasolina, transporte público', '🚗', '#4ECDC4'),
    ('Hogar', 'Alquiler, suministros', '🏠', '#45B7D1'),
    ('Salud', 'Médicos, farmacia', '🏥', '#96CEB4'),
    ('Ocio', 'Entretenimiento, hobbies', '🎮', '#FECA57'),
    ('Ingresos', 'Salarios, pagos', '💰', '#48C774')
ON CONFLICT (name) DO NOTHING;