/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // Add gocardless_data column if it doesn't exist
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'financial' 
        AND table_name = 'transactions' 
        AND column_name = 'gocardless_data'
      ) THEN
        ALTER TABLE financial.transactions ADD COLUMN gocardless_data JSONB;
      END IF;
    END $$;
  `);

  // Add crypto-related columns
  const cryptoColumns = [
    { name: 'transaction_hash', type: 'VARCHAR(255)' },
    { name: 'block_number', type: 'INTEGER' },
    { name: 'gas_used', type: 'VARCHAR(255)' },
    { name: 'gas_price', type: 'VARCHAR(255)' },
    { name: 'from_address', type: 'VARCHAR(255)' },
    { name: 'to_address', type: 'VARCHAR(255)' },
    { name: 'counterparty_account', type: 'VARCHAR(255)' }
  ];

  cryptoColumns.forEach(column => {
    pgm.sql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'financial' 
          AND table_name = 'transactions' 
          AND column_name = '${column.name}'
        ) THEN
          ALTER TABLE financial.transactions ADD COLUMN ${column.name} ${column.type};
        END IF;
      END $$;
    `);
  });

  // Create account_insights view if it doesn't exist
  pgm.sql(`
    CREATE OR REPLACE VIEW financial.account_insights AS
    SELECT 
      a.id,
      a.name,
      a.balance,
      c.code as currency_code,
      
      -- Last 30 days activity
      (SELECT COUNT(*) FROM financial.transactions t 
       WHERE t.account_id = a.id::text AND t.date >= NOW() - INTERVAL '30 days') as transactions_30d,
      
      (SELECT COALESCE(SUM(t.amount), 0) FROM financial.transactions t 
       WHERE t.account_id = a.id::text 
       AND t.amount > 0 
       AND t.date >= NOW() - INTERVAL '30 days') as income_30d,
       
      (SELECT COALESCE(SUM(ABS(t.amount)), 0) FROM financial.transactions t 
       WHERE t.account_id = a.id::text 
       AND t.amount < 0 
       AND t.date >= NOW() - INTERVAL '30 days') as expenses_30d
       
    FROM financial.accounts a
    JOIN financial.currencies c ON a.currency_id = c.id
    WHERE a.is_active = true;
  `);

  // Create indexes for performance
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_transactions_transaction_hash 
    ON financial.transactions(transaction_hash);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // Drop the view
  pgm.sql('DROP VIEW IF EXISTS financial.account_insights;');
  
  // Drop the index
  pgm.sql('DROP INDEX IF EXISTS financial.idx_transactions_transaction_hash;');
  
  // Drop the columns
  const columnsToRemove = [
    'gocardless_data',
    'transaction_hash',
    'block_number',
    'gas_used',
    'gas_price',
    'from_address',
    'to_address',
    'counterparty_account'
  ];
  
  columnsToRemove.forEach(column => {
    pgm.sql(`ALTER TABLE financial.transactions DROP COLUMN IF EXISTS ${column};`);
  });
};