# Invoice Services SQL to Prisma Migration Guide

## Overview

This document outlines the migration of two critical invoice services from raw SQL to Prisma ORM:

1. **Invoice Numbering Service** - Sequential invoice number generation with database locking
2. **Invoice Storage Service** - Invoice file storage metadata management

## Migration Status

| Service | SQL Version | Prisma Version | Status |
|---------|-------------|----------------|--------|
| Invoice Numbering | `invoice-numbering.service.ts` | `invoice-numbering-prisma.service.ts` | ✅ Complete |
| Invoice Storage | `invoice-storage.service.ts` | `invoice-storage-prisma.service.ts` | ✅ Complete |

## Feature Flags

```env
# Enable Prisma implementations
USE_PRISMA_INVOICE_NUMBERING=true
USE_PRISMA_INVOICE_STORAGE=true

# Enable validation during transition
ENABLE_INVOICE_VALIDATION=true
LOG_INVOICE_PERFORMANCE=true
```

## Key Migration Challenges

### 1. Invoice Numbering - Database Locking

The invoice numbering service requires atomic operations with row-level locking to prevent duplicate numbers.

**SQL Implementation:**
```sql
BEGIN;
SELECT * FROM invoice_numbering_sequences 
WHERE series = $1 AND prefix = $2 AND current_year = $3
FOR UPDATE;
-- Update or insert logic
COMMIT;
```

**Prisma Implementation:**
```typescript
await this.prisma.$transaction(async (tx) => {
  // Use raw query for SELECT FOR UPDATE
  const existingSequence = await tx.$queryRaw`
    SELECT * FROM financial.invoice_numbering_sequences
    WHERE series = ${series} AND prefix = ${prefix} AND current_year = ${year}
    FOR UPDATE
  `;
  // Rest of logic using Prisma
}, {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable
});
```

### 2. Invoice Storage - File System Integration

The storage service manages both database records and physical files.

**Key Considerations:**
- Atomic operations between file system and database
- Cleanup of orphaned files
- Path handling consistency

## API Compatibility

Both Prisma implementations maintain 100% API compatibility with SQL versions:

```typescript
// Invoice Numbering - Identical interface
getNextInvoiceNumber(options?: InvoiceNumberOptions): Promise<string>
getSequenceInfo(series?: string): Promise<NumberingSequence[]>
resetSequence(series: string, prefix: string, year?: number): Promise<void>

// Invoice Storage - Identical interface  
storeInvoice(invoiceId: string, invoiceNumber: string, pdfBuffer: Buffer, fileName: string, options?: InvoiceStorageOptions): Promise<StoredInvoice>
retrieveInvoice(invoiceId: string): Promise<{ metadata: StoredInvoice; buffer: Buffer } | null>
listInvoices(filters?: ListFilters): Promise<StoredInvoice[]>
```

## Performance Optimizations

### Raw Queries for Complex Operations

Both services use Prisma's `$queryRaw` for performance-critical operations:

1. **Row-level locking** in invoice numbering
2. **Aggregate statistics** with window functions
3. **Monthly grouping** with date functions

### Example:
```typescript
const monthlyStats = await this.prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
  SELECT 
    TO_CHAR(created_at, 'YYYY-MM') as month,
    COUNT(*)::bigint as count
  FROM financial.stored_invoices
  WHERE created_at >= NOW() - INTERVAL '12 months'
  GROUP BY TO_CHAR(created_at, 'YYYY-MM')
  ORDER BY month DESC
`;
```

## Validation Scripts

Two comprehensive validation scripts ensure data integrity:

1. **`invoice-numbering-validation.js`**
   - Tests sequential number generation
   - Validates concurrent access (no duplicates)
   - Verifies statistics and sequence info

2. **`invoice-storage-validation.js`**
   - Tests file storage and retrieval
   - Validates metadata consistency
   - Checks cleanup operations

## Migration Steps

### 1. Pre-Migration
```bash
# Backup database
make db-backup

# Run validation scripts
node scripts/validation/invoice-numbering-validation.js
node scripts/validation/invoice-storage-validation.js
```

### 2. Gradual Rollout
```bash
# Enable feature flags progressively
USE_PRISMA_INVOICE_NUMBERING=true  # 10% traffic
USE_PRISMA_INVOICE_STORAGE=true    # 10% traffic

# Monitor for 24 hours, then increase
# 10% → 25% → 50% → 100%
```

### 3. Deprecation
```typescript
// Update route handlers
// From:
import { InvoiceNumberingService } from './invoice-numbering.service';
// To:
import { InvoiceNumberingPrismaService } from './invoice-numbering-prisma.service';
```

### 4. Cleanup
- Remove SQL service files
- Remove feature flags
- Update documentation

## Rollback Plan

If issues arise:

1. **Immediate:** Set feature flags to `false`
2. **Data Fix:** Run recovery scripts if needed
3. **Investigation:** Check logs for specific errors
4. **Resolution:** Fix issues and retry migration

## Monitoring

Key metrics to monitor during migration:

1. **Invoice Number Generation**
   - Generation time (should be <100ms)
   - Duplicate detection (must be 0)
   - Sequence continuity

2. **Invoice Storage**
   - Storage operation time
   - File/database consistency
   - Retrieval success rate

## Success Criteria

- ✅ Zero duplicate invoice numbers
- ✅ 100% file/database consistency
- ✅ Performance within 10% of SQL version
- ✅ All validation scripts pass
- ✅ 7 days stable operation

## Next Steps

After successful migration:

1. Remove SQL implementations
2. Remove feature flags
3. Update all documentation
4. Archive validation scripts
5. Celebrate! 🎉