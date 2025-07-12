-- Initialize authentication tables
-- This script runs after the main init-db.sql

\echo 'Initializing authentication tables...'

-- Include auth migrations
\ir /docker-entrypoint-initdb.d/migrations/005-create-users-auth.sql
\ir /docker-entrypoint-initdb.d/migrations/006-create-security-logs.sql

\echo 'Authentication tables initialized successfully!'