-- Script para sincronizar tablas faltantes en producción
-- Generado: 2025-07-08

-- 1. Tabla de etiquetas AI
CREATE TABLE IF NOT EXISTS financial.ai_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7),
    icon VARCHAR(50),
    parent_id UUID REFERENCES financial.ai_tags(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de clientes
CREATE TABLE IF NOT EXISTS financial.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    tax_id VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    credit_limit DECIMAL(15,2),
    payment_terms INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Estadísticas de clientes
CREATE TABLE IF NOT EXISTS financial.client_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES financial.clients(id) ON DELETE CASCADE,
    total_invoiced DECIMAL(15,2) DEFAULT 0,
    total_paid DECIMAL(15,2) DEFAULT 0,
    total_pending DECIMAL(15,2) DEFAULT 0,
    average_payment_days INTEGER DEFAULT 0,
    last_invoice_date DATE,
    last_payment_date DATE,
    risk_score VARCHAR(20) DEFAULT 'low',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de etiquetas personalizadas
CREATE TABLE IF NOT EXISTS financial.custom_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de clientes/customers (legacy)
CREATE TABLE IF NOT EXISTS financial.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Secuencias de facturas
CREATE TABLE IF NOT EXISTS financial.invoice_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    prefix VARCHAR(10),
    current_number INTEGER DEFAULT 1,
    format VARCHAR(50) DEFAULT '{prefix}{year}/{number:05d}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, prefix)
);

-- 7. Tabla de facturas
CREATE TABLE IF NOT EXISTS financial.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES financial.clients(id),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    currency VARCHAR(3) DEFAULT 'EUR',
    subtotal DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 21.00,
    tax_amount DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    payment_terms TEXT,
    items JSONB NOT NULL,
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    paid_at TIMESTAMP,
    pdf_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Subcategorías
CREATE TABLE IF NOT EXISTS financial.subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES financial.categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, name)
);

-- 9. Relación transacciones-etiquetas personalizadas
CREATE TABLE IF NOT EXISTS financial.transaction_custom_tags (
    transaction_id UUID REFERENCES financial.transactions(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES financial.custom_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transaction_id, tag_id)
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_clients_code ON financial.clients(code);
CREATE INDEX IF NOT EXISTS idx_clients_email ON financial.clients(email);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON financial.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON financial.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON financial.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_client_statistics_client_id ON financial.client_statistics(client_id);

-- Actualizar vistas si ya existen
DROP VIEW IF EXISTS financial.categorized_transactions CASCADE;
CREATE OR REPLACE VIEW financial.categorized_transactions AS
SELECT 
    t.*,
    c.name as category_name,
    c.type as category_type,
    sc.name as subcategory_name
FROM financial.transactions t
LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
LEFT JOIN financial.categories c ON tc.category_id = c.id
LEFT JOIN financial.subcategories sc ON tc.subcategory_id = sc.id;

DROP VIEW IF EXISTS financial.monthly_category_summary CASCADE;
CREATE OR REPLACE VIEW financial.monthly_category_summary AS
SELECT 
    DATE_TRUNC('month', t.date) as month,
    c.name as category,
    c.type as category_type,
    COUNT(*) as transaction_count,
    SUM(ABS(t.amount)) as total_amount,
    t.currency
FROM financial.transactions t
JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
JOIN financial.categories c ON tc.category_id = c.id
GROUP BY DATE_TRUNC('month', t.date), c.name, c.type, t.currency
ORDER BY month DESC, total_amount DESC;