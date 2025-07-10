import { logger } from '../utils/log';

async function ensureMigrationsTable(client: any): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW(),
      checksum VARCHAR(64),
      description TEXT
    )
  `);
}

async function hasMigrationBeenApplied(client: any, version: string): Promise<boolean> {
  const result = await client.query(
    'SELECT 1 FROM public.schema_migrations WHERE version = $1',
    [version]
  );
  return result.rows.length > 0;
}

async function recordMigration(client: any, version: string, description: string): Promise<void> {
  await client.query(
    'INSERT INTO public.schema_migrations (version, description) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
    [version, description]
  );
}

export async function migrateFinancialSchema(client: any): Promise<void> {
  try {
    logger.info('🔧 Starting financial schema migration...');
    
    // Ensure migrations tracking table exists
    await ensureMigrationsTable(client);
    
    // Enable pg_trgm extension for fuzzy string matching
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
      logger.info('✅ pg_trgm extension enabled for fuzzy matching');
    } catch (error: any) {
      logger.warn('Could not enable pg_trgm extension:', error.message);
    }
    
    // Step 0: Ensure base tables exist first
    await ensureBaseTables(client);
    
    // Step 0.5: Ensure all required columns exist (for GoCardless and crypto support)
    await ensureMissingColumns(client);
    
    // PRIORITY 1: Add wallet_address column if missing (this is the critical issue)
    const walletCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'financial' 
        AND table_name = 'accounts' 
        AND column_name = 'wallet_address'
      ) as has_wallet_address
    `);
    
    const { has_wallet_address } = walletCheck.rows[0];
    
    if (!has_wallet_address) {
      logger.info('🚨 CRITICAL: Adding wallet_address column...');
      await client.query(`
        ALTER TABLE financial.accounts 
        ADD COLUMN wallet_address VARCHAR(255)
      `);
      logger.info('✅ wallet_address column added successfully');
    } else {
      logger.info('✅ wallet_address column already exists');
    }
    
    // Simple migration since tables are created fresh
    logger.info('Schema tables already created by ensureBaseTables, migration complete!');
    
    // Add extra currencies that might be missing
    await client.query(`
      INSERT INTO financial.currencies (code, name, type, decimals, symbol) VALUES 
      ('GBP', 'British Pound', 'fiat', 2, '£'),
      ('BTC', 'Bitcoin', 'crypto', 8, '₿'),
      ('ETH', 'Ethereum', 'crypto', 18, 'Ξ')
      ON CONFLICT (code) DO NOTHING
    `);
    
    // Add counterparty_name column if missing
    const counterpartyCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'financial' 
        AND table_name = 'transactions' 
        AND column_name = 'counterparty_name'
      ) as has_counterparty_name
    `);
    
    if (!counterpartyCheck.rows[0].has_counterparty_name) {
      logger.info('Adding counterparty_name column to transactions...');
      await client.query(`
        ALTER TABLE financial.transactions 
        ADD COLUMN counterparty_name VARCHAR(255)
      `);
      logger.info('✅ counterparty_name column added successfully');
    }
    
    // Check and create client_transaction_links table if missing
    const linkTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'financial' 
        AND table_name = 'client_transaction_links'
      ) as has_links_table
    `);
    
    if (!linkTableCheck.rows[0].has_links_table) {
      logger.info('Creating client_transaction_links table...');
      await client.query(`
        CREATE TABLE financial.client_transaction_links (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          transaction_id UUID REFERENCES financial.transactions(id) ON DELETE CASCADE,
          client_id UUID NOT NULL,
          match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('automatic', 'manual', 'pattern', 'fuzzy')),
          match_confidence DECIMAL(3, 2) DEFAULT 1.00,
          matched_by VARCHAR(255),
          matched_at TIMESTAMPTZ DEFAULT NOW(),
          match_criteria JSONB,
          is_manual_override BOOLEAN DEFAULT FALSE,
          previous_link_id UUID,
          override_reason TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(transaction_id)
        )
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX idx_client_transaction_links_transaction_id ON financial.client_transaction_links(transaction_id);
        CREATE INDEX idx_client_transaction_links_client_id ON financial.client_transaction_links(client_id);
        CREATE INDEX idx_client_transaction_links_match_type ON financial.client_transaction_links(match_type);
      `);
      
      logger.info('✅ client_transaction_links table created successfully');
    }
    
    // Check and create transaction_matching_patterns table if missing
    const patternTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'financial' 
        AND table_name = 'transaction_matching_patterns'
      ) as has_patterns_table
    `);
    
    if (!patternTableCheck.rows[0].has_patterns_table) {
      logger.info('Creating transaction_matching_patterns table...');
      await client.query(`
        CREATE TABLE financial.transaction_matching_patterns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id UUID NOT NULL,
          pattern_type VARCHAR(20) NOT NULL CHECK (pattern_type IN ('reference', 'description', 'amount_range', 'recurring')),
          pattern VARCHAR(500) NOT NULL,
          confidence DECIMAL(3, 2) DEFAULT 0.80,
          amount_min DECIMAL(20, 8),
          amount_max DECIMAL(20, 8),
          day_of_month INTEGER,
          frequency VARCHAR(20) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
          is_active BOOLEAN DEFAULT TRUE,
          match_count INTEGER DEFAULT 0,
          last_matched_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX idx_transaction_matching_patterns_client_id ON financial.transaction_matching_patterns(client_id);
        CREATE INDEX idx_transaction_matching_patterns_pattern_type ON financial.transaction_matching_patterns(pattern_type);
        CREATE INDEX idx_transaction_matching_patterns_active ON financial.transaction_matching_patterns(is_active);
      `);
      
      logger.info('✅ transaction_matching_patterns table created successfully');
    }
    
    logger.info('✅ Financial schema migration completed successfully');
    
    /*
    // LEGACY MIGRATION CODE - DISABLED FOR FRESH INSTALLS
    const schemaCheck = await client.query(`
      SELECT 
        EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'financial' 
          AND table_name = 'transactions' 
          AND column_name = 'currency'
        ) as has_old_currency,
        EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'financial' 
          AND table_name = 'transactions' 
          AND column_name = 'currency_id'
        ) as has_currency_id,
        EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'financial' 
          AND table_name = 'categories'
        ) as has_categories
    `);
    
    const { has_old_currency, has_currency_id, has_categories } = schemaCheck.rows[0];
    
    logger.info('Starting financial schema migration...');
    
    // Begin transaction for safe migration
    await client.query('BEGIN');
    
    try {
      // Step 1: Create currencies table if not exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS financial.currencies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(10) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          type VARCHAR(20) NOT NULL CHECK (type IN ('fiat', 'crypto')),
          decimals INTEGER DEFAULT 2,
          symbol VARCHAR(10),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      // Insert default currencies
      await client.query(`
        INSERT INTO financial.currencies (code, name, type, decimals, symbol) VALUES 
        ('EUR', 'Euro', 'fiat', 2, '€'),
        ('USD', 'US Dollar', 'fiat', 2, '$'),
        ('GBP', 'British Pound', 'fiat', 2, '£'),
        ('BTC', 'Bitcoin', 'crypto', 8, '₿'),
        ('ETH', 'Ethereum', 'crypto', 18, 'Ξ')
        ON CONFLICT (code) DO NOTHING
      `);
      
      // Step 2: Ensure currency_id column exists (skip complex migration since we're creating from scratch)
      if (!has_currency_id) {
        logger.info('Adding currency_id column...');
        
        // Add new column if it doesn't exist
        await client.query(`
          ALTER TABLE financial.transactions 
          ADD COLUMN IF NOT EXISTS currency_id UUID REFERENCES financial.currencies(id)
        `);
        
        logger.info('✅ currency_id column added');
      }
      
      // Step 3: Add missing columns to transactions
      await client.query(`
        ALTER TABLE financial.transactions 
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'confirmed',
        ADD COLUMN IF NOT EXISTS reference VARCHAR(255),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS tags TEXT[],
        ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(20, 8),
        ADD COLUMN IF NOT EXISTS fee_currency_id UUID REFERENCES financial.currencies(id)
      `);
      
      // Step 4: Ensure accounts table has all required columns (simplified)
      logger.info('Ensuring accounts table has all required columns...');
      
      // Step 5: Add missing columns to accounts
      logger.info('Adding missing columns to accounts table...');
      try {
        await client.query(`
          ALTER TABLE financial.accounts 
          ADD COLUMN IF NOT EXISTS institution_id VARCHAR(255),
          ADD COLUMN IF NOT EXISTS requisition_id VARCHAR(255),
          ADD COLUMN IF NOT EXISTS iban VARCHAR(255),
          ADD COLUMN IF NOT EXISTS last_sync TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(255),
          ADD COLUMN IF NOT EXISTS chain_id VARCHAR(50),
          ADD COLUMN IF NOT EXISTS exchange_name VARCHAR(100)
        `);
        logger.info('Successfully added missing columns');
      } catch (error: any) {
        logger.error('Error adding columns:', error.message);
        throw error;
      }
      
      // Step 6: Create categories table
      if (!has_categories) {
        await client.query(`
          CREATE TABLE IF NOT EXISTS financial.categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) UNIQUE NOT NULL,
            type VARCHAR(20) CHECK (type IN ('income', 'expense', 'transfer')),
            parent_id UUID REFERENCES financial.categories(id),
            color VARCHAR(7),
            icon VARCHAR(50),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        
        // Insert default categories
        await client.query(`
          INSERT INTO financial.categories (name, type) VALUES 
          ('Salary', 'income'),
          ('Freelance', 'income'),
          ('Investment', 'income'),
          ('Food & Dining', 'expense'),
          ('Transportation', 'expense'),
          ('Shopping', 'expense'),
          ('Bills & Utilities', 'expense'),
          ('Entertainment', 'expense'),
          ('Healthcare', 'expense'),
          ('Transfer', 'transfer')
          ON CONFLICT (name) DO NOTHING
        `);
      }
      
      // Step 7: Create transaction_categorizations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS financial.transaction_categorizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          transaction_id UUID REFERENCES financial.transactions(id) ON DELETE CASCADE,
          category_id UUID REFERENCES financial.categories(id),
          confidence DECIMAL(3, 2) DEFAULT 1.00,
          method VARCHAR(50) DEFAULT 'manual',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(transaction_id)
        )
      `);
      
      // Step 8: Create missing indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_transactions_currency_id ON financial.transactions(currency_id);
        CREATE INDEX IF NOT EXISTS idx_accounts_currency_id ON financial.accounts(currency_id);
        CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_transaction_id ON financial.transaction_categorizations(transaction_id);
        CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_category_id ON financial.transaction_categorizations(category_id);
      `);
      
      // Step 9: Create categorized_transactions view
      await client.query(`
        CREATE OR REPLACE VIEW financial.categorized_transactions AS
        SELECT 
          t.id,
          t.account_id,
          a.name as account_name,
          t.type,
          t.amount,
          t.currency_id,
          c.code as currency_code,
          t.description,
          t.date,
          cat.id as category_id,
          cat.name as category_name,
          cat.type as category_type,
          tc.confidence as confidence_score,
          tc.method as categorization_method,
          t.created_at
        FROM financial.transactions t
        JOIN financial.accounts a ON t.account_id = a.account_id
        JOIN financial.currencies c ON t.currency_id = c.id
        LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
        LEFT JOIN financial.categories cat ON tc.category_id = cat.id
      `);
      
      await client.query('COMMIT');
      logger.info('✅ Financial schema migration completed successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    */
    
  } catch (error: any) {
    logger.error('Financial schema migration failed:', error.message);
    throw error;
  }
}

async function ensureBaseTables(client: any): Promise<void> {
  logger.info('🏗️ Ensuring base tables exist...');
  
  // CRITICAL: Never drop existing tables - this was destroying production data!
  // Only create tables if they don't exist
  logger.info('📊 Ensuring financial schema exists...');
  
  // Create currencies table
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial.currencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(10) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('fiat', 'crypto')),
      decimals INTEGER DEFAULT 2,
      symbol VARCHAR(10),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  
  // Insert default currencies if not exist
  await client.query(`
    INSERT INTO financial.currencies (code, name, type, decimals, symbol) VALUES 
    ('EUR', 'Euro', 'fiat', 2, '€'),
    ('USD', 'US Dollar', 'fiat', 2, '$')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Create accounts table (with all required columns from the start)
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial.accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      currency_id UUID REFERENCES financial.currencies(id),
      balance DECIMAL(20, 8) DEFAULT 0,
      available_balance DECIMAL(20, 8) DEFAULT 0,
      institution VARCHAR(255),
      institution_id VARCHAR(255),
      requisition_id VARCHAR(255),
      iban VARCHAR(255),
      wallet_address VARCHAR(255),
      chain_id VARCHAR(50),
      exchange_name VARCHAR(100),
      metadata JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT TRUE,
      last_sync TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  
  // Create transactions table with all required columns
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial.transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id VARCHAR(255) UNIQUE NOT NULL,
      account_id VARCHAR(255) NOT NULL,
      amount DECIMAL(20, 8) NOT NULL,
      currency_id UUID REFERENCES financial.currencies(id),
      type VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'confirmed',
      description TEXT,
      reference VARCHAR(255),
      counterparty_name VARCHAR(255),
      date DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      metadata JSONB DEFAULT '{}',
      tags TEXT[],
      fee_amount DECIMAL(20, 8),
      fee_currency_id UUID REFERENCES financial.currencies(id),
      -- GoCardless specific
      gocardless_data JSONB,
      -- Crypto specific
      transaction_hash VARCHAR(255),
      block_number INTEGER,
      gas_used VARCHAR(255),
      gas_price VARCHAR(255),
      from_address VARCHAR(255),
      to_address VARCHAR(255),
      counterparty_account VARCHAR(255)
    )
  `);
  
  // Create categories table
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial.categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) UNIQUE NOT NULL,
      type VARCHAR(20) CHECK (type IN ('income', 'expense', 'transfer')),
      parent_id UUID REFERENCES financial.categories(id),
      color VARCHAR(7),
      icon VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  
  // Create transaction_categorizations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial.transaction_categorizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID REFERENCES financial.transactions(id) ON DELETE CASCADE,
      category_id UUID REFERENCES financial.categories(id),
      confidence DECIMAL(3, 2) DEFAULT 1.00,
      method VARCHAR(50) DEFAULT 'manual',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(transaction_id)
    )
  `);
  
  // Insert default categories
  await client.query(`
    INSERT INTO financial.categories (name, type) VALUES 
    ('Salary', 'income'),
    ('Freelance', 'income'),
    ('Investment', 'income'),
    ('Food & Dining', 'expense'),
    ('Transportation', 'expense'),
    ('Shopping', 'expense'),
    ('Bills & Utilities', 'expense'),
    ('Entertainment', 'expense'),
    ('Healthcare', 'expense'),
    ('Transfer', 'transfer')
    ON CONFLICT (name) DO NOTHING
  `);
  
  // Create client_transaction_links table
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial.client_transaction_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID REFERENCES financial.transactions(id) ON DELETE CASCADE,
      client_id UUID NOT NULL,
      match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('automatic', 'manual', 'pattern', 'fuzzy')),
      match_confidence DECIMAL(3, 2) DEFAULT 1.00,
      matched_by VARCHAR(255),
      matched_at TIMESTAMPTZ DEFAULT NOW(),
      match_criteria JSONB,
      is_manual_override BOOLEAN DEFAULT FALSE,
      previous_link_id UUID,
      override_reason TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(transaction_id)
    )
  `);

  // Create transaction_matching_patterns table
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial.transaction_matching_patterns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL,
      pattern_type VARCHAR(20) NOT NULL CHECK (pattern_type IN ('reference', 'description', 'amount_range', 'recurring')),
      pattern VARCHAR(500) NOT NULL,
      confidence DECIMAL(3, 2) DEFAULT 0.80,
      amount_min DECIMAL(20, 8),
      amount_max DECIMAL(20, 8),
      day_of_month INTEGER,
      frequency VARCHAR(20) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
      is_active BOOLEAN DEFAULT TRUE,
      match_count INTEGER DEFAULT 0,
      last_matched_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON financial.transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial.transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON financial.transactions(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_counterparty ON financial.transactions(counterparty_name);
    CREATE INDEX IF NOT EXISTS idx_accounts_institution_id ON financial.accounts(institution_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_transaction_id ON financial.transaction_categorizations(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_category_id ON financial.transaction_categorizations(category_id);
    CREATE INDEX IF NOT EXISTS idx_client_transaction_links_transaction_id ON financial.client_transaction_links(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_client_transaction_links_client_id ON financial.client_transaction_links(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_transaction_links_match_type ON financial.client_transaction_links(match_type);
    CREATE INDEX IF NOT EXISTS idx_transaction_matching_patterns_client_id ON financial.transaction_matching_patterns(client_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_matching_patterns_pattern_type ON financial.transaction_matching_patterns(pattern_type);
    CREATE INDEX IF NOT EXISTS idx_transaction_matching_patterns_active ON financial.transaction_matching_patterns(is_active);
  `);
  
  // Create views needed for reporting
  await client.query(`
    CREATE OR REPLACE VIEW financial.categorized_transactions AS
    SELECT 
      t.id,
      t.account_id,
      a.name as account_name,
      t.type,
      t.amount,
      t.currency_id,
      c.code as currency_code,
      t.description,
      t.date,
      cat.id as category_id,
      cat.name as category_name,
      cat.type as category_type,
      tc.confidence as confidence_score,
      tc.method as categorization_method,
      t.created_at
    FROM financial.transactions t
    JOIN financial.accounts a ON t.account_id = a.account_id
    JOIN financial.currencies c ON t.currency_id = c.id
    LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
    LEFT JOIN financial.categories cat ON tc.category_id = cat.id
  `);
  
  // Create monthly_category_summary view for reporting
  await client.query(`
    CREATE OR REPLACE VIEW financial.monthly_category_summary AS
    SELECT 
      DATE_TRUNC('month', t.date) as month,
      cat.id as category_id,
      cat.name as category_name,
      cat.type as category_type,
      cur.code as currency_code,
      COUNT(t.id) as transaction_count,
      SUM(ABS(t.amount)) as total_amount,
      AVG(ABS(t.amount)) as avg_amount,
      MIN(ABS(t.amount)) as min_amount,
      MAX(ABS(t.amount)) as max_amount
    FROM financial.transactions t
    JOIN financial.currencies cur ON t.currency_id = cur.id
    LEFT JOIN financial.transaction_categorizations tc ON t.id = tc.transaction_id
    LEFT JOIN financial.categories cat ON tc.category_id = cat.id
    WHERE t.status = 'confirmed'
    GROUP BY DATE_TRUNC('month', t.date), cat.id, cat.name, cat.type, cur.code
    ORDER BY month DESC, total_amount DESC
  `);
  
  // Create clients table for invoice management
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial.clients (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      business_name VARCHAR(255),
      tax_id VARCHAR(100) NOT NULL,
      tax_id_type VARCHAR(20) NOT NULL DEFAULT 'OTHER',
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      address JSONB,
      client_type VARCHAR(20) NOT NULL DEFAULT 'business',
      currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
      language VARCHAR(10) NOT NULL DEFAULT 'es',
      timezone VARCHAR(50),
      payment_terms INTEGER NOT NULL DEFAULT 30,
      payment_method VARCHAR(20),
      bank_account VARCHAR(255),
      credit_limit DECIMAL(15,2) DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
      total_invoices INTEGER NOT NULL DEFAULT 0,
      outstanding_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
      last_invoice_date TIMESTAMP,
      average_invoice_amount DECIMAL(15,2),
      custom_fields JSONB DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(255),
      last_contact_date TIMESTAMP
    )
  `);
  
  // Create invoice_sequences table for invoice numbering
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial.invoice_sequences (
      id SERIAL PRIMARY KEY,
      prefix VARCHAR(20) NOT NULL,
      current_number INTEGER NOT NULL DEFAULT 0,
      year INTEGER,
      format VARCHAR(50) NOT NULL DEFAULT 'PREFIX-YYYY-0000',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_sequence_prefix_year UNIQUE (prefix, year)
    )
  `);
  
  // Create invoices table
  await client.query(`
    CREATE TABLE IF NOT EXISTS financial.invoices (
      id VARCHAR(255) PRIMARY KEY,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      client_id VARCHAR(255) REFERENCES financial.clients(id),
      client_name VARCHAR(255) NOT NULL,
      client_tax_id VARCHAR(100) NOT NULL,
      client_address JSONB,
      type VARCHAR(20) NOT NULL DEFAULT 'invoice',
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
      due_date DATE NOT NULL,
      paid_date DATE,
      service_start_date DATE,
      service_end_date DATE,
      currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
      exchange_rate DECIMAL(10,6),
      items JSONB NOT NULL DEFAULT '[]',
      subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
      tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      tax_rate DECIMAL(5,2) NOT NULL DEFAULT 21,
      tax_type VARCHAR(10) NOT NULL DEFAULT 'IVA',
      discount DECIMAL(15,2),
      discount_type VARCHAR(10),
      total DECIMAL(15,2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(20),
      payment_terms INTEGER NOT NULL DEFAULT 30,
      bank_account VARCHAR(255),
      payment_reference VARCHAR(255),
      related_documents JSONB DEFAULT '[]',
      related_transaction_ids TEXT[] DEFAULT '{}',
      notes TEXT,
      terms_and_conditions TEXT,
      custom_fields JSONB DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sent_at TIMESTAMP,
      viewed_at TIMESTAMP,
      created_by VARCHAR(255),
      attachments JSONB DEFAULT '[]',
      pdf_url VARCHAR(500),
      is_deductible BOOLEAN DEFAULT FALSE,
      deductible_category VARCHAR(100),
      deductible_percentage DECIMAL(5,2)
    )
  `);
  
  // Create indexes for invoice tables
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_clients_status ON financial.clients(status);
    CREATE INDEX IF NOT EXISTS idx_clients_email ON financial.clients(email);
    CREATE INDEX IF NOT EXISTS idx_clients_tax_id ON financial.clients(tax_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON financial.invoices(client_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON financial.invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON financial.invoices(issue_date DESC);
    CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON financial.invoices(invoice_number);
  `);
  
  logger.info('✅ Base tables ensured (including invoice tables)');
}

async function ensureMissingColumns(client: any): Promise<void> {
  logger.info('🔧 Ensuring all required columns exist...');
  
  // Check if this migration has already been applied
  const migrationVersion = '002_add_gocardless_crypto_columns';
  if (await hasMigrationBeenApplied(client, migrationVersion)) {
    logger.info('✅ Missing columns migration already applied');
    return;
  }
  
  // Add missing columns to transactions table if they don't exist
  const columnsToAdd = [
    { name: 'gocardless_data', type: 'JSONB' },
    { name: 'transaction_hash', type: 'VARCHAR(255)' },
    { name: 'block_number', type: 'INTEGER' },
    { name: 'gas_used', type: 'VARCHAR(255)' },
    { name: 'gas_price', type: 'VARCHAR(255)' },
    { name: 'from_address', type: 'VARCHAR(255)' },
    { name: 'to_address', type: 'VARCHAR(255)' },
    { name: 'counterparty_account', type: 'VARCHAR(255)' }
  ];

  for (const column of columnsToAdd) {
    try {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'financial' 
            AND table_name = 'transactions' 
            AND column_name = '${column.name}'
          ) THEN
            ALTER TABLE financial.transactions ADD COLUMN ${column.name} ${column.type};
            RAISE NOTICE 'Added column ${column.name}';
          END IF;
        END $$;
      `);
      logger.info(`✅ Column ${column.name} ensured`);
    } catch (error) {
      logger.error(`Failed to add column ${column.name}:`, error);
    }
  }
  
  // Create indexes for performance
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_transactions_transaction_hash 
    ON financial.transactions(transaction_hash);
  `);
  
  // Record this migration as applied
  await recordMigration(client, migrationVersion, 'Add GoCardless and crypto columns to transactions table');
  
  logger.info('✅ All missing columns ensured');
}