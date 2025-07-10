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
  // Add gocardless_data column to transactions table
  pgm.addColumn({ schema: 'financial', name: 'transactions' }, {
    gocardless_data: {
      type: 'jsonb',
      notNull: false,
      comment: 'GoCardless transaction metadata'
    }
  });

  // Add other missing columns for crypto support
  pgm.addColumn({ schema: 'financial', name: 'transactions' }, {
    transaction_hash: {
      type: 'varchar(255)',
      notNull: false,
      comment: 'Blockchain transaction hash'
    },
    block_number: {
      type: 'integer',
      notNull: false,
      comment: 'Block number for blockchain transactions'
    },
    gas_used: {
      type: 'varchar(255)',
      notNull: false,
      comment: 'Gas used for blockchain transactions'
    },
    gas_price: {
      type: 'varchar(255)',
      notNull: false,
      comment: 'Gas price for blockchain transactions'
    },
    from_address: {
      type: 'varchar(255)',
      notNull: false,
      comment: 'From address for blockchain transactions'
    },
    to_address: {
      type: 'varchar(255)',
      notNull: false,
      comment: 'To address for blockchain transactions'
    },
    counterparty_account: {
      type: 'varchar(255)',
      notNull: false,
      comment: 'Counterparty account information'
    }
  });

  // Create indexes for performance
  pgm.createIndex({ schema: 'financial', name: 'transactions' }, 'transaction_hash', {
    ifNotExists: true,
    name: 'idx_transactions_transaction_hash'
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // Drop indexes first
  pgm.dropIndex({ schema: 'financial', name: 'transactions' }, 'transaction_hash', {
    ifExists: true,
    name: 'idx_transactions_transaction_hash'
  });

  // Drop columns
  pgm.dropColumn({ schema: 'financial', name: 'transactions' }, [
    'gocardless_data',
    'transaction_hash',
    'block_number',
    'gas_used',
    'gas_price',
    'from_address',
    'to_address',
    'counterparty_account'
  ]);
};
