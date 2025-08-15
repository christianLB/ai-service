exports.shorthands = undefined;

exports.up = async (pgm) => {
  // Ensure financial schema exists
  pgm.sql('CREATE SCHEMA IF NOT EXISTS financial;');

  // Create or replace the function for updating timestamps
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create unique index for user-specific configs (if not exists)
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_configs_unique 
    ON financial.integration_configs (user_id, integration_type, config_key) 
    WHERE user_id IS NOT NULL;
  `);

  // Create unique index for global configs (if not exists)
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_configs_global_unique 
    ON financial.integration_configs (integration_type, config_key) 
    WHERE user_id IS NULL AND is_global = true;
  `);

  // Drop trigger if exists and recreate (to ensure it's properly set up)
  pgm.sql(`
    DROP TRIGGER IF EXISTS update_integration_configs_updated_at ON financial.integration_configs;
    
    CREATE TRIGGER update_integration_configs_updated_at
    BEFORE UPDATE ON financial.integration_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
};

exports.down = async (pgm) => {
  // Drop the trigger
  pgm.sql('DROP TRIGGER IF EXISTS update_integration_configs_updated_at ON financial.integration_configs;');
  
  // Drop the unique indexes
  pgm.sql('DROP INDEX IF EXISTS financial.idx_integration_configs_unique;');
  pgm.sql('DROP INDEX IF EXISTS financial.idx_integration_configs_global_unique;');
  
  // Note: We don't drop the update_updated_at_column function as it might be used by other tables
};