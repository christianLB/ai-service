-- Migration: Create security logs table
-- Date: 2025-07-11
-- Description: Add security event logging

CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255),
  ip_address INET NOT NULL,
  user_agent TEXT,
  details JSONB,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX idx_security_logs_event_type ON security_logs(event_type, created_at);
CREATE INDEX idx_security_logs_email ON security_logs(email, created_at);
CREATE INDEX idx_security_logs_ip ON security_logs(ip_address, created_at);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at DESC);

-- Add comment
COMMENT ON TABLE security_logs IS 'Audit trail for all security-related events in the system';