# Prisma ORM

## Overview

Prisma is a next-generation ORM that provides type-safe database access with an auto-generated query builder. In our AI Service, we use Prisma 6.12.0 with PostgreSQL to manage complex multi-schema database operations across financial, trading, and public data domains.

### Key Features We Use
- 🔷 Type-safe database queries with TypeScript
- 🏗️ Multi-schema support (financial, public, trading)
- 🔄 Automated migrations with version control
- 🚀 Query optimization and performance monitoring
- 🛡️ Built-in SQL injection protection

## Quick Start

### Installation & Setup
```bash
# Already in package.json:
# "@prisma/client": "^6.12.0"
# "prisma": "^6.12.0" (dev dependency)

# Generate Prisma Client (after schema changes)
npm run db:generate

# Create and apply migrations
make db-migrate-create NAME=your_migration_name
make db-migrate

# Open Prisma Studio (GUI)
make db-studio
```

### Our Implementation Files
- **Schema Definition**: `prisma/schema.prisma`
- **Client Singleton**: `src/services/database/prisma.service.ts`
- **Service Examples**: `src/services/financial/client-prisma.service.ts`
- **Migrations**: `prisma/migrations/`
- **Types**: Auto-generated in `node_modules/.prisma/client`

## Our Implementation

### 1. Multi-Schema Configuration

```prisma
// From prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema", "postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  schemas    = ["financial", "public", "trading"]
  extensions = [pgcrypto(schema: "public"), uuid_ossp(schema: "public")]
}

// Example model with schema assignment
model Client {
  id             String    @id @default(dbgenerated("gen_random_uuid()"))
  name           String
  email          String?   @unique
  phone          String?
  tax_id         String?   @unique
  // ... more fields
  invoices       Invoice[]
  
  @@schema("financial")
  @@map("clients")
}
```

### 2. Client Singleton Pattern

```typescript
// From src/services/database/prisma.service.ts
import { PrismaClient } from '@prisma/client';

class PrismaService {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'error', 'warn'] 
          : ['error'],
        errorFormat: 'pretty',
      });

      // Graceful shutdown
      process.on('beforeExit', async () => {
        await PrismaService.instance.$disconnect();
      });
    }
    return PrismaService.instance;
  }
}

export const prisma = PrismaService.getInstance();
```

### 3. Service Layer Implementation

```typescript
// From src/services/financial/client-prisma.service.ts
export class ClientPrismaService {
  private prisma = PrismaService.getInstance();

  async findAll(filters?: ClientFilters) {
    const where: Prisma.ClientWhereInput = {};
    
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { tax_id: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    return this.prisma.client.findMany({
      where,
      include: {
        invoices: {
          select: {
            id: true,
            invoice_number: true,
            total_amount: true,
            status: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async create(data: Prisma.ClientCreateInput) {
    try {
      return await this.prisma.client.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Client with this email or tax_id already exists');
        }
      }
      throw error;
    }
  }
}
```

### 4. Complex Queries with Relations

```typescript
// Invoice with related data
async getInvoiceWithDetails(invoiceId: string) {
  return this.prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      line_items: {
        orderBy: { created_at: 'asc' }
      },
      transactions: {
        where: { matched: true }
      }
    }
  });
}

// Aggregations
async getClientMetrics(clientId: string) {
  const metrics = await this.prisma.invoice.aggregate({
    where: { client_id: clientId },
    _sum: { total_amount: true },
    _count: true,
    _avg: { total_amount: true }
  });

  return {
    totalRevenue: metrics._sum.total_amount || 0,
    invoiceCount: metrics._count,
    averageInvoice: metrics._avg.total_amount || 0
  };
}
```

### 5. Transaction Handling

```typescript
// Multi-table transaction
async createInvoiceWithItems(
  invoiceData: InvoiceCreateInput,
  items: LineItemCreateInput[]
) {
  return this.prisma.$transaction(async (tx) => {
    // Create invoice
    const invoice = await tx.invoice.create({
      data: invoiceData
    });

    // Create line items
    const lineItems = await tx.invoiceLineItem.createMany({
      data: items.map(item => ({
        ...item,
        invoice_id: invoice.id
      }))
    });

    // Update invoice total
    const total = items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    );

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: { total_amount: total }
    });

    return { invoice: updatedInvoice, itemCount: lineItems.count };
  });
}
```

## Code Examples

### Advanced Query Patterns

```typescript
// Pagination with cursor
async getPaginatedClients(cursor?: string, take: number = 20) {
  const clients = await this.prisma.client.findMany({
    take: take + 1, // Fetch one extra to check if more exist
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { created_at: 'desc' },
    include: { _count: { select: { invoices: true } } }
  });

  const hasMore = clients.length > take;
  const items = hasMore ? clients.slice(0, -1) : clients;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return { items, nextCursor, hasMore };
}

// Full-text search (PostgreSQL)
async searchTransactions(searchTerm: string) {
  return this.prisma.$queryRaw`
    SELECT * FROM financial.transactions
    WHERE to_tsvector('english', description || ' ' || COALESCE(reference, ''))
    @@ plainto_tsquery('english', ${searchTerm})
    ORDER BY created_at DESC
    LIMIT 50
  `;
}

// Upsert pattern
async syncBankAccount(accountData: BankAccountData) {
  return this.prisma.bankAccount.upsert({
    where: { external_id: accountData.id },
    update: {
      balance: accountData.balance,
      last_synced: new Date()
    },
    create: {
      external_id: accountData.id,
      bank_name: accountData.bank,
      account_number: accountData.number,
      balance: accountData.balance,
      currency: accountData.currency
    }
  });
}
```

### Migration Best Practices

```bash
# Development workflow
# 1. Modify schema.prisma
# 2. Create migration
make db-migrate-create NAME=add_invoice_status

# 3. Review generated SQL in prisma/migrations/
# 4. Apply migration
make db-migrate

# Production workflow
# 1. Test migration in staging
# 2. Backup production database
make db-backup

# 3. Apply migration
NODE_ENV=production npx prisma migrate deploy
```

## Best Practices

### 1. Query Optimization
- ✅ Use `select` to fetch only needed fields
- ✅ Implement proper indexes for frequent queries
- ✅ Use `findFirst` instead of `findMany` for single results
- ✅ Batch operations with `createMany`, `updateMany`

### 2. Error Handling
```typescript
import { Prisma } from '@prisma/client';

export function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new ConflictError('Unique constraint violation');
      case 'P2025':
        throw new NotFoundError('Record not found');
      case 'P2003':
        throw new ValidationError('Foreign key constraint violation');
      default:
        throw new DatabaseError(error.message);
    }
  }
  throw error;
}
```

### 3. Connection Management
- ✅ Use singleton pattern for PrismaClient
- ✅ Implement graceful shutdown
- ✅ Configure connection pool size
- ✅ Monitor connection health

### 4. Security
- ✅ Never use raw SQL with user input (use parameters)
- ✅ Validate input data before queries
- ✅ Use environment variables for connection strings
- ✅ Implement row-level security where needed

## Troubleshooting

### Common Issues

#### 1. "The table does not exist in the current database"
```bash
# Solution: Run migrations
make db-migrate-status  # Check pending migrations
make db-migrate         # Apply migrations
```

#### 2. "Invalid prisma.client invocation"
```bash
# Solution: Regenerate Prisma Client
npm run db:generate
# Restart your application
```

#### 3. Connection pool exhausted
```typescript
// Solution: Configure connection limit
// In DATABASE_URL: ?connection_limit=10&pool_timeout=30
```

#### 4. Slow queries
```typescript
// Enable query logging to identify
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 1000) { // Log queries over 1 second
    console.warn('Slow query:', e.query, 'Duration:', e.duration);
  }
});
```

### Debug Tips

1. **Use Prisma Studio**:
```bash
make db-studio  # Visual database browser
```

2. **Enable debug mode**:
```bash
DEBUG="prisma:*" npm run dev
```

3. **Check migration status**:
```bash
make db-migrate-status
```

4. **Validate schema**:
```bash
npx prisma validate
```

## Resources

### Official Documentation
- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma Client API Reference](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Error Reference](https://www.prisma.io/docs/reference/api-reference/error-reference)
- [Performance Guide](https://www.prisma.io/docs/guides/performance-and-optimization)

### Our Internal Docs
- [Database Schema](../../prisma/schema.prisma)
- [Migration Guide](../INSTALLATION_GUIDE.md#database-setup)
- [CRUD Generator](../AUTOMATED-DEVELOPMENT-STACK.md)

### Useful Commands
```bash
# Our Makefile commands
make db-studio          # Open Prisma Studio
make db-migrate         # Run migrations
make db-migrate-status  # Check migration status
make db-backup          # Backup database
make db-generate        # Generate Prisma Client

# Direct Prisma commands
npx prisma format       # Format schema.prisma
npx prisma validate     # Validate schema
npx prisma db pull      # Introspect database
```

---

> **Note**: Always test schema changes in development first. Use migrations for all schema changes - never modify the database directly. The multi-schema setup requires careful attention to cross-schema relations.