import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
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
        RAISE NOTICE 'Added gocardless_data column to financial.transactions';
      ELSE
        RAISE NOTICE 'gocardless_data column already exists in financial.transactions';
      END IF;
    END $$;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove gocardless_data column
  pgm.dropColumn({ schema: 'financial', name: 'transactions' }, 'gocardless_data', { ifExists: true });
}