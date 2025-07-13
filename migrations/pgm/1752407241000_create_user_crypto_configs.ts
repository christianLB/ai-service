import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable({ schema: 'financial', name: 'user_crypto_configs' }, {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    provider: {
      type: 'varchar(50)',
      notNull: true
    },
    api_key: {
      type: 'text'
    },
    secret_key: {
      type: 'text'
    },
    address: {
      type: 'varchar(255)'
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

  pgm.createIndex({ schema: 'financial', name: 'user_crypto_configs' }, ['user_id', 'provider'], { unique: true });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable({ schema: 'financial', name: 'user_crypto_configs' });
}
