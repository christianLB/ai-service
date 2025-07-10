-- Initial database setup for AI Service
-- This file is executed when PostgreSQL container is created

-- Create financial schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS financial;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA financial TO ai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA financial TO ai_user;

-- Create pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Initial setup complete
SELECT 'Database initialization completed' AS status;