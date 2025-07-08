-- Inicialización de Base de Datos para AI Service
-- Synology DSM 420+ + PostgreSQL 15

-- Crear base de datos para n8n si no existe
SELECT 'CREATE DATABASE n8n'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\gexec

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Configurar búsqueda de texto completo en español
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS spanish_unaccent (COPY = spanish);
ALTER TEXT SEARCH CONFIGURATION spanish_unaccent
   ALTER MAPPING FOR hword, hword_part, word
   WITH unaccent, spanish_stem;

-- Crear esquemas para AI Service
CREATE SCHEMA IF NOT EXISTS ai_service;
CREATE SCHEMA IF NOT EXISTS financial;

-- Configurar permisos
GRANT ALL PRIVILEGES ON SCHEMA ai_service TO ai_user;
GRANT ALL PRIVILEGES ON SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ai_service TO ai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ai_service TO ai_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA ai_service TO ai_user;

-- Crear tablas extendidas para experimentación
-- Tabla de documentos ingestados
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Tabla de conocimiento estructurado
CREATE TABLE IF NOT EXISTS knowledge_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    confidence_score DECIMAL(3,2),
    source_document_id UUID REFERENCES documents(id),
    relations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de tareas autónomas
CREATE TABLE IF NOT EXISTS autonomous_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    input_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    requires_approval BOOLEAN DEFAULT false,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    result_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de comunicaciones
CREATE TABLE IF NOT EXISTS communication_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    message_type VARCHAR(50),
    content TEXT,
    metadata JSONB,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category);
CREATE INDEX IF NOT EXISTS idx_autonomous_status ON autonomous_tasks(status);
CREATE INDEX IF NOT EXISTS idx_communication_channel ON communication_log(channel);

