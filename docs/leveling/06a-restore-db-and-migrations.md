# 06a — Restore DB and Migrations (financial.integration_configs) ✅

## Objective

Restore the `financial.integration_configs` table and schema reliably across dev/CI/prod without regressions or FK breakage.

## Acceptance Criteria

- ✅ `financial` schema exists before any table creation.
- ✅ `financial.integration_configs` exists with columns used by `api-gateway`:
  - ✅ user_id NULL, integration_type TEXT, config_key TEXT, config_value TEXT
  - ✅ is_encrypted BOOLEAN, is_global BOOLEAN, description TEXT, metadata JSONB
  - ✅ created_at, updated_at + trigger to update updated_at
- ✅ Unique indexes for user-specific and global rows; type index.
- ✅ No hard FK to `users` unless created earlier in the same run.

## Implementation ✅ COMPLETED

- ✅ Added migration (`migrations/1765802400000_fix_integration_configs_indexes.js`) that:
  - ✅ CREATE SCHEMA IF NOT EXISTS financial;
  - ✅ CREATE TABLE IF NOT EXISTS financial.integration_configs (...) - already existed
  - ✅ CREATE INDEX/UNIQUE INDEX IF NOT EXISTS (3 indexes total)
  - ✅ CREATE OR REPLACE FUNCTION update_updated_at_column();
  - ✅ CREATE TRIGGER update_integration_configs_updated_at
- ✅ Updated api-gateway entrypoint.sh: wait-for-DB → create schemas → run migrations → start app
- ✅ Prisma services keep entrypoint: wait-for-DB → prisma generate → migrate deploy.

## Verification ✅ COMPLETED

- ✅ `psql` checks confirmed:
  - Schema: `financial` exists
  - Table: `financial.integration_configs` exists with all columns
  - Indexes: 3 indexes created (idx_integration_configs_type, idx_integration_configs_unique, idx_integration_configs_global_unique)
  - Trigger: `update_integration_configs_updated_at` working (tested with UPDATE)
- ✅ Gateway GET for `/api/integrations/configs` returns data successfully
- ✅ Direct DB operations (INSERT/UPDATE) work with trigger updating timestamps

## Status: COMPLETE

All acceptance criteria met. The table is fully restored with proper indexes, triggers, and API functionality.

## Rollback

- Drop only created objects if needed; do not affect other schemas.
