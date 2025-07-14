-- Migration: Create integration_configs table
-- Description: Centralized storage for all API keys and integration configurations

-- Create integration_configs table
CREATE TABLE IF NOT EXISTS financial.integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for global configs
    integration_type VARCHAR(50) NOT NULL, -- telegram, gocardless, openai, email, slack, crypto, etc.
    config_key VARCHAR(100) NOT NULL, -- bot_token, api_key, smtp_host, webhook_url, etc.
    config_value TEXT NOT NULL, -- Encrypted value for sensitive data
    is_encrypted BOOLEAN NOT NULL DEFAULT true,
    is_global BOOLEAN NOT NULL DEFAULT false, -- True for system-wide configs
    description TEXT, -- Optional description
    metadata JSONB DEFAULT '{}', -- Additional metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique constraint for user-specific configs
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_configs_unique 
ON financial.integration_configs (user_id, integration_type, config_key) 
WHERE user_id IS NOT NULL;

-- Create unique constraint for global configs
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_configs_global_unique 
ON financial.integration_configs (integration_type, config_key) 
WHERE user_id IS NULL AND is_global = true;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_integration_configs_type 
ON financial.integration_configs (integration_type);

-- Create or replace function for updating timestamps (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamps
DROP TRIGGER IF EXISTS update_integration_configs_updated_at ON financial.integration_configs;
CREATE TRIGGER update_integration_configs_updated_at
BEFORE UPDATE ON financial.integration_configs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add table comment
COMMENT ON TABLE financial.integration_configs IS 'Stores all integration API keys and configurations (encrypted)';

-- Add column comments
COMMENT ON COLUMN financial.integration_configs.user_id IS 'NULL for global/system configurations';
COMMENT ON COLUMN financial.integration_configs.integration_type IS 'telegram, gocardless, openai, email, slack, crypto, etc.';
COMMENT ON COLUMN financial.integration_configs.config_key IS 'bot_token, api_key, smtp_host, webhook_url, etc.';
COMMENT ON COLUMN financial.integration_configs.config_value IS 'Encrypted value for sensitive data';
COMMENT ON COLUMN financial.integration_configs.is_global IS 'True for system-wide configs, false for user-specific';
COMMENT ON COLUMN financial.integration_configs.metadata IS 'Additional metadata like validation rules, UI hints, etc.';