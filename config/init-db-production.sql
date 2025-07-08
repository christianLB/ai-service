-- Inicialización completa para AI Service Production

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Crear esquema financial
CREATE SCHEMA IF NOT EXISTS financial;

-- Crear tabla de documentos
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    content_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de chat history
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_message TEXT NOT NULL,
    assistant_response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla account_insights en esquema financial
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
GRANT ALL PRIVILEGES ON SCHEMA public TO ai_user;
GRANT ALL PRIVILEGES ON SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA financial TO ai_user;