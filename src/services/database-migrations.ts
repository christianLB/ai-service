import { logger } from '../utils/log';

export async function migrateFinancialSchema(client: any): Promise<void> {
  try {
    // Check current schema version
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
    
    if (!has_old_currency && has_currency_id && has_categories) {
      logger.info('Financial schema is up to date');
      return;
    }
    
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
      
      // Step 2: Add currency_id column if it doesn't exist
      if (has_old_currency && !has_currency_id) {
        logger.info('Migrating currency to currency_id...');
        
        // Add new column
        await client.query(`
          ALTER TABLE financial.transactions 
          ADD COLUMN IF NOT EXISTS currency_id UUID
        `);
        
        // Migrate data
        await client.query(`
          UPDATE financial.transactions t
          SET currency_id = c.id
          FROM financial.currencies c
          WHERE t.currency = c.code
        `);
        
        // Set NOT NULL after migration
        await client.query(`
          ALTER TABLE financial.transactions 
          ALTER COLUMN currency_id SET NOT NULL
        `);
        
        // Add foreign key
        await client.query(`
          ALTER TABLE financial.transactions 
          ADD CONSTRAINT fk_transactions_currency 
          FOREIGN KEY (currency_id) REFERENCES financial.currencies(id)
        `);
        
        // Drop old column
        await client.query(`
          ALTER TABLE financial.transactions 
          DROP COLUMN IF EXISTS currency
        `);
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
      
      // Step 4: Update accounts table
      if (has_old_currency) {
        // Check if accounts has currency column
        const accountsCheck = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'financial' 
            AND table_name = 'accounts' 
            AND column_name = 'currency'
          ) as has_currency
        `);
        
        if (accountsCheck.rows[0].has_currency) {
          // Add currency_id column
          await client.query(`
            ALTER TABLE financial.accounts 
            ADD COLUMN IF NOT EXISTS currency_id UUID
          `);
          
          // Migrate data
          await client.query(`
            UPDATE financial.accounts a
            SET currency_id = c.id
            FROM financial.currencies c
            WHERE a.currency = c.code
          `);
          
          // Add foreign key
          await client.query(`
            ALTER TABLE financial.accounts 
            ADD CONSTRAINT fk_accounts_currency 
            FOREIGN KEY (currency_id) REFERENCES financial.currencies(id)
          `);
          
          // Drop old column
          await client.query(`
            ALTER TABLE financial.accounts 
            DROP COLUMN IF EXISTS currency
          `);
        }
      }
      
      // Step 5: Add missing columns to accounts
      await client.query(`
        ALTER TABLE financial.accounts 
        ADD COLUMN IF NOT EXISTS institution_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS requisition_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS iban VARCHAR(255),
        ADD COLUMN IF NOT EXISTS last_sync TIMESTAMPTZ
      `);
      
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
      
      await client.query('COMMIT');
      logger.info('✅ Financial schema migration completed successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
  } catch (error: any) {
    logger.error('Financial schema migration failed:', error.message);
    throw error;
  }
}