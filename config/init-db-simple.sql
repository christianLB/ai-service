-- Inicialización simple para AI Service

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla básica de documentos
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    content_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla básica de chat history
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_message TEXT NOT NULL,
    assistant_response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permisos básicos
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ai_user;