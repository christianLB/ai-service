import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create integration_configs table for storing all API keys and configurations
  pgm.createTable({ schema: 'financial', name: 'integration_configs' }, {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'CASCADE',
      comment: 'NULL for global/system configurations'
    },
    integration_type: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'telegram, gocardless, openai, email, slack, crypto, etc.'
    },
    config_key: {
      type: 'varchar(100)',
      notNull: true,
      comment: 'bot_token, api_key, smtp_host, webhook_url, etc.'
    },
    config_value: {
      type: 'text',
      notNull: true,
      comment: 'Encrypted value for sensitive data'
    },
    is_encrypted: {
      type: 'boolean',
      default: true,
      notNull: true
    },
    is_global: {
      type: 'boolean',
      default: false,
      notNull: true,
      comment: 'True for system-wide configs, false for user-specific'
    },
    description: {
      type: 'text',
      comment: 'Optional description or notes about this configuration'
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
      comment: 'Additional metadata like validation rules, UI hints, etc.'
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Create unique index to prevent duplicate configs
  pgm.createIndex(
    { schema: 'financial', name: 'integration_configs' },
    ['user_id', 'integration_type', 'config_key'],
    { 
      unique: true,
      name: 'idx_integration_configs_unique',
      where: 'user_id IS NOT NULL'
    }
  );

  // Create unique index for global configs
  pgm.createIndex(
    { schema: 'financial', name: 'integration_configs' },
    ['integration_type', 'config_key'],
    { 
      unique: true,
      name: 'idx_integration_configs_global_unique',
      where: 'user_id IS NULL AND is_global = true'
    }
  );

  // Create index for faster lookups by integration type
  pgm.createIndex(
    { schema: 'financial', name: 'integration_configs' },
    ['integration_type'],
    { name: 'idx_integration_configs_type' }
  );

  // Create trigger to update updated_at
  pgm.sql(`
    CREATE TRIGGER update_integration_configs_updated_at
    BEFORE UPDATE ON financial.integration_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  // Add comment to table
  pgm.sql(`
    COMMENT ON TABLE financial.integration_configs IS 'Stores all integration API keys and configurations (encrypted)';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable({ schema: 'financial', name: 'integration_configs' });
}