-- Crear esquema financial si no existe
CREATE SCHEMA IF NOT EXISTS financial;

-- Crear tabla account_insights
CREATE TABLE IF NOT EXISTS financial.account_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(255) NOT NULL,
    institution_name VARCHAR(255),
    account_type VARCHAR(100),
    balance DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'EUR',
    last_sync TIMESTAMP WITH TIME ZONE,
    insights JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_account_insights_account_id ON financial.account_insights(account_id);
CREATE INDEX IF NOT EXISTS idx_account_insights_last_sync ON financial.account_insights(last_sync);

-- Permisos
GRANT ALL PRIVILEGES ON SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA financial TO ai_user;