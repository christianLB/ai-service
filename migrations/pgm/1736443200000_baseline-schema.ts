import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Enable extensions
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "unaccent"');
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Create schemas
  pgm.createSchema('financial', { ifNotExists: true });

  // Create currencies table
  pgm.createTable({ schema: 'financial', name: 'currencies' }, {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('COALESCE(gen_random_uuid(), uuid_generate_v4())'),
    },
    code: {
      type: 'varchar(10)',
      notNull: true,
      unique: true,
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    type: {
      type: 'varchar(20)',
      notNull: true,
      check: "type IN ('fiat', 'crypto')",
    },
    decimals: {
      type: 'integer',
      default: 2,
    },
    symbol: {
      type: 'varchar(10)',
    },
    is_active: {
      type: 'boolean',
      default: true,
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
  }, { ifNotExists: true });

  // Insert default currencies
  pgm.sql(`
    INSERT INTO financial.currencies (code, name, type, decimals, symbol) VALUES 
      ('EUR', 'Euro', 'fiat', 2, '€'),
      ('USD', 'US Dollar', 'fiat', 2, '$'),
      ('GBP', 'British Pound', 'fiat', 2, '£'),
      ('BTC', 'Bitcoin', 'crypto', 8, '₿'),
      ('ETH', 'Ethereum', 'crypto', 18, 'Ξ')
    ON CONFLICT (code) DO NOTHING;
  `);

  // Create accounts table
  pgm.createTable({ schema: 'financial', name: 'accounts' }, {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('COALESCE(gen_random_uuid(), uuid_generate_v4())'),
    },
    account_id: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    type: {
      type: 'varchar(50)',
      notNull: true,
    },
    currency_id: {
      type: 'uuid',
      references: { schema: 'financial', name: 'currencies' },
    },
    balance: {
      type: 'decimal(20, 8)',
      default: 0,
    },
    available_balance: {
      type: 'decimal(20, 8)',
      default: 0,
    },
    institution: {
      type: 'varchar(255)',
    },
    institution_id: {
      type: 'varchar(255)',
    },
    requisition_id: {
      type: 'varchar(255)',
    },
    iban: {
      type: 'varchar(255)',
    },
    wallet_address: {
      type: 'varchar(255)',
    },
    chain_id: {
      type: 'varchar(50)',
    },
    exchange_name: {
      type: 'varchar(100)',
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
    is_active: {
      type: 'boolean',
      default: true,
    },
    last_sync: {
      type: 'timestamptz',
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
  }, { ifNotExists: true });

  // Create transactions table
  pgm.createTable({ schema: 'financial', name: 'transactions' }, {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('COALESCE(gen_random_uuid(), uuid_generate_v4())'),
    },
    transaction_id: {
      type: 'varchar(255)',
      notNull: true,
    },
    account_id: {
      type: 'uuid',
      notNull: true,
      references: { schema: 'financial', name: 'accounts' },
    },
    type: {
      type: 'varchar(50)',
      notNull: true,
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
    },
    amount: {
      type: 'decimal(20, 8)',
      notNull: true,
    },
    currency_id: {
      type: 'uuid',
      references: { schema: 'financial', name: 'currencies' },
    },
    description: {
      type: 'text',
    },
    reference: {
      type: 'varchar(255)',
    },
    merchant_name: {
      type: 'varchar(255)',
    },
    merchant_category_code: {
      type: 'varchar(10)',
    },
    counterparty_name: {
      type: 'varchar(255)',
    },
    counterparty_account: {
      type: 'varchar(255)',
    },
    booking_date: {
      type: 'date',
    },
    value_date: {
      type: 'date',
    },
    transaction_date: {
      type: 'timestamptz',
    },
    internal_transaction_id: {
      type: 'varchar(255)',
    },
    bank_transaction_code: {
      type: 'varchar(50)',
    },
    proprietary_bank_transaction_code: {
      type: 'varchar(255)',
    },
    balance_after_transaction: {
      type: 'decimal(20, 8)',
    },
    tags: {
      type: 'text[]',
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
    gocardless_data: {
      type: 'jsonb',
    },
    tx_hash: {
      type: 'varchar(255)',
    },
    gas_price: {
      type: 'decimal(30, 18)',
    },
    gas_used: {
      type: 'decimal(20, 0)',
    },
    exchange_rate: {
      type: 'decimal(20, 8)',
    },
    fee_amount: {
      type: 'decimal(20, 8)',
    },
    from_address: {
      type: 'varchar(255)',
    },
    to_address: {
      type: 'varchar(255)',
    },
    contract_address: {
      type: 'varchar(255)',
    },
    token_id: {
      type: 'varchar(255)',
    },
    token_amount: {
      type: 'decimal(30, 18)',
    },
    trade_pair: {
      type: 'varchar(50)',
    },
    trade_price: {
      type: 'decimal(20, 8)',
    },
    trade_type: {
      type: 'varchar(20)',
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
    is_categorized: {
      type: 'boolean',
      default: false,
    },
  }, { ifNotExists: true });

  // Create unique index on transaction_id and account_id
  pgm.createIndex({ schema: 'financial', name: 'transactions' }, 
    ['transaction_id', 'account_id'], 
    { unique: true, ifNotExists: true, name: 'idx_unique_transaction_account' }
  );

  // Create categories table
  pgm.createTable({ schema: 'financial', name: 'categories' }, {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('COALESCE(gen_random_uuid(), uuid_generate_v4())'),
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
    },
    parent_id: {
      type: 'uuid',
      references: { schema: 'financial', name: 'categories' },
    },
    type: {
      type: 'varchar(50)',
      notNull: true,
      default: "'expense'",
    },
    color: {
      type: 'varchar(7)',
    },
    icon: {
      type: 'varchar(50)',
    },
    description: {
      type: 'text',
    },
    keywords: {
      type: 'text[]',
    },
    rules: {
      type: 'jsonb',
      default: '[]',
    },
    is_system: {
      type: 'boolean',
      default: false,
    },
    is_active: {
      type: 'boolean',
      default: true,
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
  }, { ifNotExists: true });

  // Create transaction_categorizations table
  pgm.createTable({ schema: 'financial', name: 'transaction_categorizations' }, {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('COALESCE(gen_random_uuid(), uuid_generate_v4())'),
    },
    transaction_id: {
      type: 'uuid',
      notNull: true,
      references: { schema: 'financial', name: 'transactions' },
    },
    category_id: {
      type: 'uuid',
      notNull: true,
      references: { schema: 'financial', name: 'categories' },
    },
    confidence_score: {
      type: 'decimal(3, 2)',
      check: 'confidence_score >= 0 AND confidence_score <= 1',
    },
    method: {
      type: 'varchar(50)',
      notNull: true,
      default: "'manual'",
    },
    is_primary: {
      type: 'boolean',
      default: true,
    },
    notes: {
      type: 'text',
    },
    categorized_by: {
      type: 'varchar(255)',
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
  }, { ifNotExists: true });

  // Create unique index for primary categorization
  pgm.createIndex({ schema: 'financial', name: 'transaction_categorizations' }, 
    ['transaction_id'], 
    { unique: true, where: 'is_primary = true', ifNotExists: true, name: 'idx_unique_primary_categorization' }
  );

  // Create clients table
  pgm.createTable({ schema: 'financial', name: 'clients' }, {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('COALESCE(gen_random_uuid(), uuid_generate_v4())'),
    },
    company_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    contact_name: {
      type: 'varchar(255)',
    },
    email: {
      type: 'varchar(255)',
    },
    phone: {
      type: 'varchar(50)',
    },
    tax_id: {
      type: 'varchar(50)',
    },
    address_line1: {
      type: 'varchar(255)',
    },
    address_line2: {
      type: 'varchar(255)',
    },
    city: {
      type: 'varchar(100)',
    },
    state_province: {
      type: 'varchar(100)',
    },
    postal_code: {
      type: 'varchar(20)',
    },
    country: {
      type: 'varchar(2)',
    },
    currency_id: {
      type: 'uuid',
      references: { schema: 'financial', name: 'currencies' },
    },
    payment_terms_days: {
      type: 'integer',
      default: 30,
    },
    notes: {
      type: 'text',
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
    is_active: {
      type: 'boolean',
      default: true,
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
  }, { ifNotExists: true });

  // Create invoices table
  pgm.createTable({ schema: 'financial', name: 'invoices' }, {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('COALESCE(gen_random_uuid(), uuid_generate_v4())'),
    },
    invoice_number: {
      type: 'varchar(50)',
      notNull: true,
      unique: true,
    },
    client_id: {
      type: 'uuid',
      notNull: true,
      references: { schema: 'financial', name: 'clients' },
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: "'draft'",
      check: "status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')",
    },
    issue_date: {
      type: 'date',
      notNull: true,
    },
    due_date: {
      type: 'date',
      notNull: true,
    },
    paid_date: {
      type: 'date',
    },
    currency_id: {
      type: 'uuid',
      notNull: true,
      references: { schema: 'financial', name: 'currencies' },
    },
    subtotal: {
      type: 'decimal(20, 8)',
      notNull: true,
    },
    tax_rate: {
      type: 'decimal(5, 2)',
      default: 0,
    },
    tax_amount: {
      type: 'decimal(20, 8)',
      default: 0,
    },
    discount_amount: {
      type: 'decimal(20, 8)',
      default: 0,
    },
    total_amount: {
      type: 'decimal(20, 8)',
      notNull: true,
    },
    notes: {
      type: 'text',
    },
    terms_conditions: {
      type: 'text',
    },
    payment_instructions: {
      type: 'text',
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
    qr_code_data: {
      type: 'text',
    },
    pdf_path: {
      type: 'varchar(500)',
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
  }, { ifNotExists: true });

  // Create invoice_items table
  pgm.createTable({ schema: 'financial', name: 'invoice_items' }, {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('COALESCE(gen_random_uuid(), uuid_generate_v4())'),
    },
    invoice_id: {
      type: 'uuid',
      notNull: true,
      references: { schema: 'financial', name: 'invoices', onDelete: 'CASCADE' },
    },
    description: {
      type: 'text',
      notNull: true,
    },
    quantity: {
      type: 'decimal(10, 4)',
      notNull: true,
    },
    unit_price: {
      type: 'decimal(20, 8)',
      notNull: true,
    },
    subtotal: {
      type: 'decimal(20, 8)',
      notNull: true,
    },
    tax_rate: {
      type: 'decimal(5, 2)',
      default: 0,
    },
    tax_amount: {
      type: 'decimal(20, 8)',
      default: 0,
    },
    total: {
      type: 'decimal(20, 8)',
      notNull: true,
    },
    category: {
      type: 'varchar(100)',
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
    sort_order: {
      type: 'integer',
      default: 0,
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
  }, { ifNotExists: true });

  // Create requisitions table
  pgm.createTable({ schema: 'financial', name: 'requisitions' }, {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('COALESCE(gen_random_uuid(), uuid_generate_v4())'),
    },
    requisition_id: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    institution_id: {
      type: 'varchar(255)',
      notNull: true,
    },
    institution_name: {
      type: 'varchar(255)',
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
    },
    reference: {
      type: 'varchar(255)',
    },
    link: {
      type: 'text',
    },
    ssn: {
      type: 'varchar(255)',
    },
    agreement: {
      type: 'varchar(255)',
    },
    accounts: {
      type: 'text[]',
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
    expires_at: {
      type: 'timestamptz',
    },
  }, { ifNotExists: true });

  // Create companies table  
  pgm.createTable({ schema: 'financial', name: 'companies' }, {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('COALESCE(gen_random_uuid(), uuid_generate_v4())'),
    },
    legal_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    trade_name: {
      type: 'varchar(255)',
    },
    tax_id: {
      type: 'varchar(50)',
      notNull: true,
      unique: true,
    },
    company_type: {
      type: 'varchar(50)',
    },
    registration_number: {
      type: 'varchar(100)',
    },
    founded_date: {
      type: 'date',
    },
    address_line1: {
      type: 'varchar(255)',
    },
    address_line2: {
      type: 'varchar(255)',
    },
    city: {
      type: 'varchar(100)',
    },
    state_province: {
      type: 'varchar(100)',
    },
    postal_code: {
      type: 'varchar(20)',
    },
    country: {
      type: 'varchar(2)',
    },
    phone: {
      type: 'varchar(50)',
    },
    email: {
      type: 'varchar(255)',
    },
    website: {
      type: 'varchar(255)',
    },
    bank_accounts: {
      type: 'jsonb',
      default: '[]',
    },
    crypto_wallets: {
      type: 'jsonb',
      default: '[]',
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
    logo_url: {
      type: 'varchar(500)',
    },
    is_active: {
      type: 'boolean',
      default: true,
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
  }, { ifNotExists: true });

  // Create invoice_sequences table
  pgm.createTable({ schema: 'financial', name: 'invoice_sequences' }, {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('COALESCE(gen_random_uuid(), uuid_generate_v4())'),
    },
    company_id: {
      type: 'uuid',
      notNull: true,
      references: { schema: 'financial', name: 'companies' },
    },
    year: {
      type: 'integer',
      notNull: true,
    },
    month: {
      type: 'integer',
      notNull: true,
      check: 'month >= 1 AND month <= 12',
    },
    last_number: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    prefix: {
      type: 'varchar(20)',
    },
    created_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('NOW()'),
    },
  }, { ifNotExists: true });

  // Create unique constraint
  pgm.createConstraint({ schema: 'financial', name: 'invoice_sequences' }, 
    'uq_invoice_sequence_company_year_month', 
    { unique: ['company_id', 'year', 'month'], ifNotExists: true }
  );

  // Create additional indexes
  pgm.createIndex({ schema: 'financial', name: 'accounts' }, 'account_id', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'accounts' }, 'institution_id', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'accounts' }, 'is_active', { ifNotExists: true });

  pgm.createIndex({ schema: 'financial', name: 'transactions' }, 'account_id', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'transactions' }, 'transaction_date', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'transactions' }, 'booking_date', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'transactions' }, 'status', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'transactions' }, 'type', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'transactions' }, 'is_categorized', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'transactions' }, 'merchant_name', { ifNotExists: true });

  pgm.createIndex({ schema: 'financial', name: 'categories' }, 'parent_id', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'categories' }, 'type', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'categories' }, 'is_active', { ifNotExists: true });

  pgm.createIndex({ schema: 'financial', name: 'transaction_categorizations' }, 'transaction_id', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'transaction_categorizations' }, 'category_id', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'transaction_categorizations' }, 'method', { ifNotExists: true });

  pgm.createIndex({ schema: 'financial', name: 'invoices' }, 'client_id', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'invoices' }, 'status', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'invoices' }, 'issue_date', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'invoices' }, 'due_date', { ifNotExists: true });

  pgm.createIndex({ schema: 'financial', name: 'requisitions' }, 'institution_id', { ifNotExists: true });
  pgm.createIndex({ schema: 'financial', name: 'requisitions' }, 'status', { ifNotExists: true });

  // Create trigger function for updated_at
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Apply triggers to all tables with updated_at
  const tablesWithUpdatedAt = [
    'currencies', 'accounts', 'transactions', 'categories', 
    'clients', 'invoices', 'invoice_items', 'requisitions', 
    'companies', 'invoice_sequences'
  ];

  for (const table of tablesWithUpdatedAt) {
    pgm.createTrigger(
      { schema: 'financial', name: table },
      `update_${table}_updated_at`,
      {
        when: 'BEFORE',
        operation: 'UPDATE',
        function: 'update_updated_at_column',
        level: 'ROW',
      }
    );
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop triggers
  const tablesWithUpdatedAt = [
    'currencies', 'accounts', 'transactions', 'categories', 
    'clients', 'invoices', 'invoice_items', 'requisitions', 
    'companies', 'invoice_sequences'
  ];

  for (const table of tablesWithUpdatedAt) {
    pgm.dropTrigger({ schema: 'financial', name: table }, `update_${table}_updated_at`, { ifExists: true });
  }

  // Drop tables in reverse order
  pgm.dropTable({ schema: 'financial', name: 'invoice_sequences' }, { ifExists: true });
  pgm.dropTable({ schema: 'financial', name: 'invoice_items' }, { ifExists: true });
  pgm.dropTable({ schema: 'financial', name: 'invoices' }, { ifExists: true });
  pgm.dropTable({ schema: 'financial', name: 'companies' }, { ifExists: true });
  pgm.dropTable({ schema: 'financial', name: 'requisitions' }, { ifExists: true });
  pgm.dropTable({ schema: 'financial', name: 'clients' }, { ifExists: true });
  pgm.dropTable({ schema: 'financial', name: 'transaction_categorizations' }, { ifExists: true });
  pgm.dropTable({ schema: 'financial', name: 'categories' }, { ifExists: true });
  pgm.dropTable({ schema: 'financial', name: 'transactions' }, { ifExists: true });
  pgm.dropTable({ schema: 'financial', name: 'accounts' }, { ifExists: true });
  pgm.dropTable({ schema: 'financial', name: 'currencies' }, { ifExists: true });

  // Drop schema
  pgm.dropSchema('financial', { ifExists: true });

  // Drop function
  pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
}