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
  // Create account_insights view
  pgm.createView(
    { schema: 'financial', name: 'account_insights' },
    {},
    `
    SELECT 
      a.id,
      a.name,
      a.balance,
      c.code as currency_code,
      
      -- Last 30 days activity
      (SELECT COUNT(*) FROM financial.transactions t 
       WHERE t.account_id = a.id AND t.date >= NOW() - INTERVAL '30 days') as transactions_30d,
      
      (SELECT COALESCE(SUM(t.amount), 0) FROM financial.transactions t 
       WHERE t.account_id = a.id 
       AND t.amount > 0 
       AND t.date >= NOW() - INTERVAL '30 days') as income_30d,
       
      (SELECT COALESCE(SUM(ABS(t.amount)), 0) FROM financial.transactions t 
       WHERE t.account_id = a.id 
       AND t.amount < 0 
       AND t.date >= NOW() - INTERVAL '30 days') as expenses_30d
       
    FROM financial.accounts a
    JOIN financial.currencies c ON a.currency_id = c.id
    WHERE a.is_active = true
    `
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropView({ schema: 'financial', name: 'account_insights' });
};
