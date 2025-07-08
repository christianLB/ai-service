-- Inicialización limpia para producción
-- Este archivo se ejecuta automáticamente cuando PostgreSQL inicia con un volumen vacío

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- El schema completo se crea cuando la aplicación inicia
-- No necesitamos crear tablas aquí porque la aplicación las creará

-- Solo aseguramos que el usuario ai_user tenga todos los permisos necesarios
GRANT ALL PRIVILEGES ON DATABASE ai_service TO ai_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO ai_user;

-- Crear schema financial
CREATE SCHEMA IF NOT EXISTS financial;
GRANT ALL PRIVILEGES ON SCHEMA financial TO ai_user;