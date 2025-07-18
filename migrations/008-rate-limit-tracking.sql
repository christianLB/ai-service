-- Migration: Add rate limit tracking for GoCardless API calls
-- This helps manage the 4 calls per day limit per account

-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS financial.rate_limit_status (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL,
  endpoint_type TEXT NOT NULL CHECK (endpoint_type IN ('accounts', 'balances', 'transactions', 'full')),
  calls_made INTEGER DEFAULT 0,
  calls_limit INTEGER DEFAULT 4,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  retry_after TIMESTAMP WITH TIME ZONE,
  last_call_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, endpoint_type, window_start)
);

-- Create index for efficient queries
CREATE INDEX idx_rate_limit_account_window ON financial.rate_limit_status(account_id, window_start, window_end);
CREATE INDEX idx_rate_limit_retry ON financial.rate_limit_status(retry_after) WHERE retry_after IS NOT NULL;

-- Add operation type to sync logs
ALTER TABLE financial.sync_logs 
ADD COLUMN IF NOT EXISTS operation_type TEXT DEFAULT 'full' CHECK (operation_type IN ('full', 'accounts', 'balances', 'transactions'));

-- Create a function to get current rate limit status
CREATE OR REPLACE FUNCTION financial.get_rate_limit_status(p_account_id TEXT, p_endpoint_type TEXT)
RETURNS TABLE (
  can_sync BOOLEAN,
  calls_remaining INTEGER,
  window_reset_at TIMESTAMP WITH TIME ZONE,
  retry_after TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_current_window RECORD;
BEGIN
  -- Get or create current 24-hour window
  SELECT * INTO v_current_window
  FROM financial.rate_limit_status
  WHERE account_id = p_account_id
    AND endpoint_type = p_endpoint_type
    AND NOW() BETWEEN window_start AND window_end
  LIMIT 1;
  
  -- If no window exists, create one
  IF v_current_window IS NULL THEN
    INSERT INTO financial.rate_limit_status (
      account_id, endpoint_type, calls_made, calls_limit,
      window_start, window_end
    ) VALUES (
      p_account_id, p_endpoint_type, 0, 4,
      NOW(), NOW() + INTERVAL '24 hours'
    )
    RETURNING * INTO v_current_window;
  END IF;
  
  -- Return status
  RETURN QUERY
  SELECT 
    (v_current_window.calls_made < v_current_window.calls_limit 
     AND (v_current_window.retry_after IS NULL OR v_current_window.retry_after < NOW())) AS can_sync,
    (v_current_window.calls_limit - v_current_window.calls_made) AS calls_remaining,
    v_current_window.window_end AS window_reset_at,
    v_current_window.retry_after AS retry_after;
END;
$$ LANGUAGE plpgsql;

-- Create a function to record API call
CREATE OR REPLACE FUNCTION financial.record_api_call(
  p_account_id TEXT, 
  p_endpoint_type TEXT,
  p_retry_after TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_window RECORD;
BEGIN
  -- Get current window
  SELECT * INTO v_current_window
  FROM financial.rate_limit_status
  WHERE account_id = p_account_id
    AND endpoint_type = p_endpoint_type
    AND NOW() BETWEEN window_start AND window_end
  FOR UPDATE;
  
  -- If no window or expired, create new one
  IF v_current_window IS NULL THEN
    INSERT INTO financial.rate_limit_status (
      account_id, endpoint_type, calls_made, calls_limit,
      window_start, window_end, last_call_at, retry_after
    ) VALUES (
      p_account_id, p_endpoint_type, 1, 4,
      NOW(), NOW() + INTERVAL '24 hours', NOW(), p_retry_after
    );
    RETURN TRUE;
  END IF;
  
  -- Update existing window
  UPDATE financial.rate_limit_status
  SET calls_made = calls_made + 1,
      last_call_at = NOW(),
      retry_after = p_retry_after,
      updated_at = NOW()
  WHERE id = v_current_window.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON TABLE financial.rate_limit_status IS 'Tracks GoCardless API rate limits (4 calls per day per account)';