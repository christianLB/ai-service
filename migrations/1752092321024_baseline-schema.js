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
  // This is a baseline migration - it assumes the financial schema already exists
  // We'll mark this as already run in production
  
  // Create schema if not exists
  pgm.createSchema('financial', { ifNotExists: true });
  
  // Note: In production, these tables already exist
  // This migration serves as the baseline for future migrations
  // We'll manually mark it as run in the pgmigrations table
  
  console.log('Baseline schema migration - assuming tables exist in production');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // We don't drop the schema in down migration for baseline
  console.log('Baseline migration - no rollback');
};
