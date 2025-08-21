# Database Migrations and Schema Parity

This document describes the database migration strategy and schema parity procedures for the AI Service platform.

## Overview

The AI Service uses Prisma ORM with PostgreSQL multi-schema support. The database is organized into four schemas:

- **financial**: Banking, clients, invoices, transactions
- **public**: Users, auth, system tables
- **tagging**: Universal tagging system
- **trading**: Trading strategies, positions, orders

## Migration Strategy

### 1. Entrypoint Pattern

All services that use the database now follow a consistent entrypoint pattern that ensures:

- Schemas exist before migrations run
- Prisma client is generated in runtime containers
- Migrations are applied with retry logic
- Services wait for database availability

Services with entrypoints:

- `financial-svc` - Primary financial service (uses Prisma)
- `trading-svc` - Trading service (currently raw SQL, prepared for Prisma)
- `worker-financial` - Financial worker (prepared for future DB usage)
- `worker-trading` - Trading worker (prepared for future DB usage)

### 2. Schema Pre-Creation

PostgreSQL schemas must exist before Prisma migrations can run. Each entrypoint ensures schemas exist by running:

```sql
CREATE SCHEMA IF NOT EXISTS financial;
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS tagging;
CREATE SCHEMA IF NOT EXISTS trading;
```

This is done via `prisma db execute` for services with Prisma, or direct `psql` for services using raw SQL.

### 3. Migration Application

Migrations are applied using `prisma migrate deploy` with:

- **Retry logic**: Up to 60 attempts with 2-second delays
- **Idempotent**: Safe to run multiple times
- **Production-safe**: Uses `deploy` not `dev` command

## Cold-Start Procedure

When starting the system from scratch (fresh database):

1. **Database starts first** (via docker-compose dependencies)
2. **Services start and run entrypoints**:
   - Create schemas if missing
   - Generate Prisma client
   - Apply all migrations
3. **Health checks verify readiness**
4. **Smoke tests validate schema and indices**

## Performance Optimization

### Pagination Indices

The following indices are created for optimal pagination performance:

**Clients table**:

- `idx_clients_created_at` - For ordering by creation date
- `idx_clients_status_created_at` - For filtering by status + ordering

**Accounts table**:

- `idx_accounts_created_at` - For ordering by creation date
- `idx_accounts_institution_created_at` - For filtering by provider + ordering

**Invoices table**:

- `idx_invoices_issue_date` - For ordering by issue date (DESC)
- `idx_invoices_status_issue_date` - For filtering by status + ordering

**Transactions table**:

- `idx_transactions_account_date` - For account filtering + date ordering
- `idx_transactions_status_date` - For status filtering + date ordering

## Troubleshooting

### Common Issues

#### "relation does not exist" errors

**Cause**: Schema doesn't exist or migrations haven't run
**Solution**: Ensure entrypoint runs and creates schemas before app starts

#### "prisma client not found" errors

**Cause**: Prisma client not generated in runtime container
**Solution**: Entrypoint now runs `prisma generate` before starting

#### Slow pagination queries

**Cause**: Missing indices on sort/filter columns
**Solution**: Migration 20250814_add_pagination_indices adds necessary indices

### Manual Migration

If you need to manually run migrations:

```bash
# From project root
export DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"

# Generate client
npx prisma generate

# Apply migrations (production)
npx prisma migrate deploy

# Create a new migration (development)
npx prisma migrate dev --name description_here
```

### Rollback Procedure

To rollback a migration:

1. **Identify the target migration**:

```bash
npx prisma migrate status
```

2. **Reset to specific migration**:

```bash
# WARNING: This is destructive in production!
npx prisma migrate resolve --rolled-back <migration_name>
```

3. **Apply corrections and create new forward migration**

## CI/CD Integration

### Smoke Tests

The CI pipeline includes cold-start smoke tests that verify:

- All schemas are created
- All tables exist
- All indices are present
- Pagination queries use indices

Tests run in `.github/workflows/ci-build.yml` during the smoke job.

### Local Testing

To test cold-start locally:

```bash
# Start fresh (removes volumes)
make dev-down-clean

# Start services
make dev-up

# Check migration status
make db-migrate-status

# Run smoke tests
npm test tests/smoke-cold-start.test.ts
```

## Best Practices

1. **Always test migrations locally first**
2. **Use `IF NOT EXISTS` for schema/index creation**
3. **Keep migrations small and focused**
4. **Document breaking changes in migration files**
5. **Use composite indices for common filter+sort combinations**
6. **Monitor query performance with EXPLAIN ANALYZE**

## Migration Checklist

When adding a new migration:

- [ ] Create migration with descriptive name
- [ ] Use `IF NOT EXISTS` for indices
- [ ] Test on fresh database
- [ ] Test on existing database
- [ ] Verify rollback procedure
- [ ] Update this documentation if needed
- [ ] Add smoke tests for new tables/indices
- [ ] Check query plans with EXPLAIN

## Future Improvements

- [ ] Automated performance monitoring for slow queries
- [ ] Migration validation in pre-commit hooks
- [ ] Backup before migration in production
- [ ] Blue-green deployment for zero-downtime migrations
- [ ] Automated index recommendations based on query patterns
