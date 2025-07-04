import { logger } from '../utils/log';

export async function migrateFinancialSchema(client: any): Promise<void> {
  try {
    logger.info('🔧 Starting financial schema migration...');
    
    // Step 0: Ensure base tables exist first
    await ensureBaseTables(client);
    
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
  
  // For fresh install, drop and recreate to avoid type conflicts
  logger.info('🧹 Cleaning up existing financial schema for fresh start...');
  await client.query(`
    DROP TABLE IF EXISTS financial.transaction_categorizations CASCADE;
    DROP TABLE IF EXISTS financial.categories CASCADE;
    DROP TABLE IF EXISTS financial.transactions CASCADE;
    DROP TABLE IF EXISTS financial.accounts CASCADE;
    DROP TABLE IF EXISTS financial.currencies CASCADE;
    DROP VIEW IF EXISTS financial.categorized_transactions CASCADE;
    DROP VIEW IF EXISTS financial.monthly_category_summary CASCADE;
  `);
  
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
  
  // Create transactions table (without legacy category column)
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
      date DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      metadata JSONB DEFAULT '{}',
      tags TEXT[],
      fee_amount DECIMAL(20, 8),
      fee_currency_id UUID REFERENCES financial.currencies(id)
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
  
  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON financial.transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial.transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON financial.transactions(status);
    CREATE INDEX IF NOT EXISTS idx_accounts_institution_id ON financial.accounts(institution_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_transaction_id ON financial.transaction_categorizations(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_categorizations_category_id ON financial.transaction_categorizations(category_id);
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
  
  logger.info('✅ Base tables ensured');
}