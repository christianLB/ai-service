import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder) => {
  // Create rate limit tracking table
  pgm.createTable({ schema: 'financial', name: 'rate_limit_status' }, {
    id: {
      type: 'serial',
      primaryKey: true
    },
    account_id: {
      type: 'text',
      notNull: true
    },
    endpoint_type: {
      type: 'text',
      notNull: true,
      check: "endpoint_type IN ('accounts', 'balances', 'transactions', 'full')"
    },
    calls_made: {
      type: 'integer',
      default: 0
    },
    calls_limit: {
      type: 'integer',
      default: 4
    },
    window_start: {
      type: 'timestamptz',
      notNull: true
    },
    window_end: {
      type: 'timestamptz',
      notNull: true
    },
    retry_after: {
      type: 'timestamptz'
    },
    last_call_at: {
      type: 'timestamptz'
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()')
    }
  });

  // Add unique constraint
  pgm.addConstraint({ schema: 'financial', name: 'rate_limit_status' }, 
    'unique_account_endpoint_window', {
      unique: ['account_id', 'endpoint_type', 'window_start']
    }
  );

  // Create indexes
  pgm.createIndex({ schema: 'financial', name: 'rate_limit_status' }, 
    ['account_id', 'window_start', 'window_end'], {
      name: 'idx_rate_limit_account_window'
    }
  );

  pgm.createIndex({ schema: 'financial', name: 'rate_limit_status' }, 
    ['retry_after'], {
      name: 'idx_rate_limit_retry',
      where: 'retry_after IS NOT NULL'
    }
  );

  // Add operation type to sync logs
  pgm.addColumn({ schema: 'financial', name: 'sync_logs' }, {
    operation_type: {
      type: 'text',
      default: 'full',
      check: "operation_type IN ('full', 'accounts', 'balances', 'transactions')"
    }
  });

  // Create function to get rate limit status
  pgm.createFunction(
    { schema: 'financial', name: 'get_rate_limit_status' },
    [
      { name: 'p_account_id', type: 'text' },
      { name: 'p_endpoint_type', type: 'text' }
    ],
    {
      returns: `TABLE (
        can_sync BOOLEAN,
        calls_remaining INTEGER,
        window_reset_at TIMESTAMP WITH TIME ZONE,
        retry_after TIMESTAMP WITH TIME ZONE
      )`,
      language: 'plpgsql',
      replace: true
    },
    `
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
    `
  );

  // Create function to record API call
  pgm.createFunction(
    { schema: 'financial', name: 'record_api_call' },
    [
      { name: 'p_account_id', type: 'text' },
      { name: 'p_endpoint_type', type: 'text' },
      { name: 'p_retry_after', type: 'timestamptz', default: null }
    ],
    {
      returns: 'boolean',
      language: 'plpgsql',
      replace: true
    },
    `
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
    `
  );

  // Add comment
  pgm.comment({ schema: 'financial', name: 'rate_limit_status' }, null, 
    'Tracks GoCardless API rate limits (4 calls per day per account)'
  );
};

export const down = (pgm: MigrationBuilder) => {
  // Drop functions
  pgm.dropFunction({ schema: 'financial', name: 'record_api_call' }, 
    [
      { name: 'p_account_id', type: 'text' },
      { name: 'p_endpoint_type', type: 'text' },
      { name: 'p_retry_after', type: 'timestamptz' }
    ]
  );
  
  pgm.dropFunction({ schema: 'financial', name: 'get_rate_limit_status' }, 
    [
      { name: 'p_account_id', type: 'text' },
      { name: 'p_endpoint_type', type: 'text' }
    ]
  );

  // Drop column from sync_logs
  pgm.dropColumn({ schema: 'financial', name: 'sync_logs' }, 'operation_type');

  // Drop indexes
  pgm.dropIndex({ schema: 'financial', name: 'rate_limit_status' }, 'idx_rate_limit_retry');
  pgm.dropIndex({ schema: 'financial', name: 'rate_limit_status' }, 'idx_rate_limit_account_window');

  // Drop table
  pgm.dropTable({ schema: 'financial', name: 'rate_limit_status' });
};