# Migration System Documentation

## Overview

This project uses **node-pg-migrate** for database schema management. All database schema changes MUST go through the migration system.

## Quick Start

### Fix Production Issue (gocardless_data column)

```bash
# Development
make migrate-fix

# Production
make migrate-fix-prod
```

### Common Commands

```bash
# Check migration status
make migrate

# Apply pending migrations (development)
make migrate-up

# Create new migration
make migrate-create NAME="add_new_feature"

# Apply migrations to production
make -f Makefile.migrations migrate-prod-up
```

## Directory Structure

```
migrations/
├── README.md          # This file
├── pgm/              # node-pg-migrate migrations (TypeScript)
│   ├── 1736443200000_baseline-schema.ts
│   └── 1736443201000_add-gocardless-data-column.ts
└── *.sql             # Legacy SQL files (do not use)
```

## Configuration

- `.pgmrc`: JSON configuration for node-pg-migrate
- `migrate-config.ts`: TypeScript configuration with environment variables
- `.env.migrations`: Environment variables for migrations

## Creating New Migrations

1. Create migration file:
   ```bash
   make migrate-create NAME="descriptive_name"
   ```

2. Edit the created file in `migrations/pgm/`:
   ```typescript
   export async function up(pgm: MigrationBuilder): Promise<void> {
     // Add your schema changes here
     pgm.addColumn({ schema: 'financial', name: 'table_name' }, {
       column_name: { type: 'varchar(255)', notNull: true }
     });
   }

   export async function down(pgm: MigrationBuilder): Promise<void> {
     // Add rollback logic here
     pgm.dropColumn({ schema: 'financial', name: 'table_name' }, 'column_name');
   }
   ```

3. Test in development:
   ```bash
   make migrate-up
   ```

4. Apply to production:
   ```bash
   make -f Makefile.migrations migrate-prod-up
   ```

## Migration Best Practices

1. **Always test migrations locally first**
2. **Include both up and down migrations**
3. **Use descriptive names for migrations**
4. **Keep migrations idempotent when possible**
5. **Never modify existing migrations after they're applied**
6. **Always backup production before applying migrations**

## Common Migration Patterns

### Adding a Column
```typescript
pgm.addColumn({ schema: 'financial', name: 'transactions' }, {
  new_column: { type: 'varchar(255)', default: null }
});
```

### Creating an Index
```typescript
pgm.createIndex({ schema: 'financial', name: 'transactions' }, 
  ['account_id', 'booking_date'], 
  { name: 'idx_transactions_account_date' }
);
```

### Adding a Constraint
```typescript
pgm.createConstraint({ schema: 'financial', name: 'invoices' }, 
  'chk_status', 
  { check: "status IN ('draft', 'sent', 'paid', 'cancelled')" }
);
```

### Creating a Table
```typescript
pgm.createTable({ schema: 'financial', name: 'new_table' }, {
  id: {
    type: 'uuid',
    primaryKey: true,
    default: pgm.func('gen_random_uuid()')
  },
  name: {
    type: 'varchar(255)',
    notNull: true
  },
  created_at: {
    type: 'timestamptz',
    default: pgm.func('NOW()')
  }
});
```

## Troubleshooting

### Migration Failed
1. Check error message
2. Fix the migration file
3. If already partially applied, may need to manually fix or use `migrate-down`

### Production Emergency
```bash
# Revert last migration (EMERGENCY ONLY)
make -f Makefile.migrations migrate-prod-emergency-down
```

### Reset Development Migrations
```bash
# WARNING: This will reset all migrations
make -f Makefile.migrations migrate-reset-dev
```

## Migration History

| Date | Migration | Description |
|------|-----------|-------------|
| 2025-01-09 | baseline-schema | Initial schema setup |
| 2025-01-09 | add-gocardless-data-column | Fix missing gocardless_data column |

## References

- [node-pg-migrate documentation](https://salsita.github.io/node-pg-migrate/)
- [PostgreSQL documentation](https://www.postgresql.org/docs/)