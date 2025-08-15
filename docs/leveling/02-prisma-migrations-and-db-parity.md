# 02 — Prisma Migrations and DB Parity

- Owner: Claude (completed 2025-08-14)
- Status: ✅ COMPLETED

## Scope

- Ensure multi-schema Prisma (`financial`, `public`, `tagging`, `trading`) works in fresh environments.
- Entry points pre-create schemas and apply `prisma migrate deploy` at boot.
- Replicate robust entrypoint pattern across all Prisma services and workers.
- Add indices to support common pagination/filter queries.

## Deliverables

- Entry scripts that run `prisma generate` and `migrate deploy` with retries.
- Schema pre-creation step (`CREATE SCHEMA IF NOT EXISTS ...`).
- New migrations for indices/backfills where needed.
- Docs on DB parity and migration flow.

## Acceptance Criteria

- Fresh CI/dev bring-up succeeds with no "relation does not exist" errors.
- All Prisma services boot reliably with DB wait + migrate deploy.
- Pagination queries use indices as validated by EXPLAIN or observed timings.

## Checklist

- [x] Audit migrations for schema creation; add pre-creation where needed
- [x] Replicate entrypoint to trading-svc and worker services
- [x] Add required indices for list endpoints (clients, invoices, accounts, transactions)
- [x] Verify prisma client generation in runtime images
- [x] Update docs and add smoke covering cold-start migrations

## Dependencies

- 04 — CI jobs to exercise cold start and migrations

## Implementation Summary

### Files Created

1. **Entrypoint Scripts** (all with retry logic and schema pre-creation):
   - `apps/trading-svc/entrypoint.sh` - Handles both raw SQL and future Prisma
   - `apps/worker-financial/entrypoint.sh` - Ready for future Prisma usage
   - `apps/worker-trading/entrypoint.sh` - Ready for future Prisma usage

2. **Migration for Pagination Indices**:
   - `prisma/migrations/20250814221815_add_pagination_indices/migration.sql`
   - Added indices for `clients.created_at`, `accounts.created_at`
   - Added composite indices for filter+sort combinations
   - Ensures all schemas exist (idempotent)

3. **Testing**:
   - `tests/smoke-cold-start.test.ts` - Comprehensive cold-start verification
   - Updated `.github/workflows/ci-build.yml` with schema and index verification

4. **Documentation**:
   - `docs/database-migrations.md` - Complete migration procedures and best practices

### Files Modified

1. **Dockerfiles** (updated to use entrypoints):
   - `apps/trading-svc/Dockerfile`
   - `apps/worker-financial/Dockerfile`
   - `apps/worker-trading/Dockerfile`

2. **CI Workflow**:
   - `.github/workflows/ci-build.yml` - Added cold-start verification steps

### Key Improvements

- **Reliability**: All services handle cold-start scenarios gracefully
- **Performance**: Pagination queries optimized with proper indices
- **Consistency**: Unified entrypoint pattern across all services
- **Future-Proof**: Services ready for Prisma migration when needed
- **CI Coverage**: Automated tests verify migrations in fresh environments

### Verification

All acceptance criteria have been met:

- ✅ Fresh environments start without "relation does not exist" errors
- ✅ Services boot reliably with proper migration handling
- ✅ Pagination queries use indices for optimal performance
- ✅ Comprehensive documentation and testing in place
