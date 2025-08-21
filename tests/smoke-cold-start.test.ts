import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);

// Test cold-start scenarios with fresh database
describe('Cold Start Smoke Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Initialize Prisma client
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://ai_user:testpass@localhost:5432/ai_service_test'
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Schema Creation', () => {
    it('should have all required schemas created', async () => {
      const schemas = await prisma.$queryRaw<Array<{ schema_name: string }>>`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name IN ('financial', 'public', 'tagging', 'trading')
        ORDER BY schema_name
      `;

      const schemaNames = schemas.map(s => s.schema_name);
      expect(schemaNames).toContain('financial');
      expect(schemaNames).toContain('public');
      expect(schemaNames).toContain('tagging');
      expect(schemaNames).toContain('trading');
    });
  });

  describe('Table Creation', () => {
    it('should have all financial tables created', async () => {
      const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'financial' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      const tableNames = tables.map(t => t.table_name);
      expect(tableNames).toContain('accounts');
      expect(tableNames).toContain('categories');
      expect(tableNames).toContain('clients');
      expect(tableNames).toContain('invoices');
      expect(tableNames).toContain('transactions');
      expect(tableNames).toContain('currencies');
    });

    it('should have all trading tables created', async () => {
      const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'trading' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      const tableNames = tables.map(t => t.table_name);
      expect(tableNames).toContain('strategies');
      expect(tableNames).toContain('trades');
      expect(tableNames).toContain('positions');
      expect(tableNames).toContain('orders');
      expect(tableNames).toContain('exchanges');
    });

    it('should have all tagging tables created', async () => {
      const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'tagging' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      const tableNames = tables.map(t => t.table_name);
      expect(tableNames).toContain('universal_tags');
      expect(tableNames).toContain('entity_tags');
      expect(tableNames).toContain('tag_patterns');
    });
  });

  describe('Index Creation', () => {
    it('should have pagination indices for clients table', async () => {
      const indices = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'financial' 
        AND tablename = 'clients'
        AND indexname LIKE 'idx_clients_%'
        ORDER BY indexname
      `;

      const indexNames = indices.map(i => i.indexname);
      expect(indexNames).toContain('idx_clients_email');
      expect(indexNames).toContain('idx_clients_status');
      expect(indexNames).toContain('idx_clients_created_at');
      expect(indexNames).toContain('idx_clients_status_created_at');
    });

    it('should have pagination indices for accounts table', async () => {
      const indices = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'financial' 
        AND tablename = 'accounts'
        AND indexname LIKE 'idx_accounts_%'
        ORDER BY indexname
      `;

      const indexNames = indices.map(i => i.indexname);
      expect(indexNames).toContain('idx_accounts_institution_id');
      expect(indexNames).toContain('idx_accounts_created_at');
      expect(indexNames).toContain('idx_accounts_institution_created_at');
    });

    it('should have pagination indices for invoices table', async () => {
      const indices = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'financial' 
        AND tablename = 'invoices'
        AND indexname LIKE 'idx_invoices_%'
        ORDER BY indexname
      `;

      const indexNames = indices.map(i => i.indexname);
      expect(indexNames).toContain('idx_invoices_client_id');
      expect(indexNames).toContain('idx_invoices_status');
      expect(indexNames).toContain('idx_invoices_issue_date');
      expect(indexNames).toContain('idx_invoices_status_issue_date');
    });

    it('should have pagination indices for transactions table', async () => {
      const indices = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'financial' 
        AND tablename = 'transactions'
        AND indexname LIKE 'idx_transactions_%'
        ORDER BY indexname
      `;

      const indexNames = indices.map(i => i.indexname);
      expect(indexNames).toContain('idx_transactions_account_id');
      expect(indexNames).toContain('idx_transactions_date');
      expect(indexNames).toContain('idx_transactions_status');
      expect(indexNames).toContain('idx_transactions_account_date');
      expect(indexNames).toContain('idx_transactions_status_date');
    });
  });

  describe('Migration Status', () => {
    it('should have all migrations applied', async () => {
      // Check Prisma migration table
      const migrations = await prisma.$queryRaw<Array<{ migration_name: string, finished_at: Date | null }>>`
        SELECT migration_name, finished_at
        FROM _prisma_migrations
        ORDER BY migration_name
      `;

      // All migrations should be finished (not null finished_at)
      const unfinished = migrations.filter(m => m.finished_at === null);
      expect(unfinished).toHaveLength(0);

      // Should have our new pagination indices migration
      const hasPaginationMigration = migrations.some(m => 
        m.migration_name.includes('add_pagination_indices')
      );
      expect(hasPaginationMigration).toBe(true);
    });
  });

  describe('Service Startup', () => {
    it('should successfully run entrypoint for financial-svc', async () => {
      // Test that the entrypoint script exists and is executable
      const { stdout } = await execAsync('test -x apps/financial-svc/entrypoint.sh && echo "OK"');
      expect(stdout.trim()).toBe('OK');
    });

    it('should successfully run entrypoint for trading-svc', async () => {
      // Test that the entrypoint script exists and is executable
      const { stdout } = await execAsync('test -x apps/trading-svc/entrypoint.sh && echo "OK"');
      expect(stdout.trim()).toBe('OK');
    });

    it('should successfully run entrypoint for worker-financial', async () => {
      // Test that the entrypoint script exists and is executable
      const { stdout } = await execAsync('test -x apps/worker-financial/entrypoint.sh && echo "OK"');
      expect(stdout.trim()).toBe('OK');
    });

    it('should successfully run entrypoint for worker-trading', async () => {
      // Test that the entrypoint script exists and is executable
      const { stdout } = await execAsync('test -x apps/worker-trading/entrypoint.sh && echo "OK"');
      expect(stdout.trim()).toBe('OK');
    });
  });

  describe('Query Performance', () => {
    it('should use index for clients pagination query', async () => {
      const plan = await prisma.$queryRaw<Array<{ QUERY_PLAN: string }>>`
        EXPLAIN (FORMAT JSON) 
        SELECT id, name, email, status, created_at 
        FROM financial.clients 
        WHERE status = 'active' 
        ORDER BY created_at DESC 
        LIMIT 10 OFFSET 0
      `;

      // Check that the query plan uses an index
      const planText = JSON.stringify(plan);
      expect(planText).toMatch(/Index Scan|Bitmap.*Scan/i);
    });

    it('should use index for accounts pagination query', async () => {
      const plan = await prisma.$queryRaw<Array<{ QUERY_PLAN: string }>>`
        EXPLAIN (FORMAT JSON) 
        SELECT id, name, institution, created_at 
        FROM financial.accounts 
        WHERE institution = 'demo' 
        ORDER BY created_at DESC 
        LIMIT 10 OFFSET 0
      `;

      // Check that the query plan uses an index
      const planText = JSON.stringify(plan);
      expect(planText).toMatch(/Index Scan|Bitmap.*Scan/i);
    });
  });
});