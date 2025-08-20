import express from "express";
import cors from "cors";
import helmet from "helmet";
import Redis from "ioredis";
import { PrismaClient, Prisma } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config(); // Load .env file
import { env } from "@ai/config";
import { randomUUID } from "crypto";
import type { AiServicePaths } from "@ai/contracts";
import { parsePagination } from "@ai/http-utils";
// @ts-ignore - package built locally
// import { createStandardObservability } from "@ai/observability";

// Import our financial services
import { clientService } from './services/client.service';
import { invoiceService } from './services/invoice.service';
import { invoiceAttachmentService } from './services/invoice-attachment.service';
import { transactionService } from './services/transaction.service';
import { goCardlessService } from './services/gocardless.service';

// DB and Redis clients
const prisma = new PrismaClient();
const redis = new Redis(env.REDIS_URL);

// Placeholder metrics for now (observability package not available in isolated service)
const metricsStub = {
  inc: (...args: any[]) => {},
  observe: (...args: any[]) => {},
  set: (...args: any[]) => {},
  reset: (...args: any[]) => {}
};

const transactionsProcessed = metricsStub;
const gocardlessSyncDuration = metricsStub;
const accountsTotal = metricsStub;
const invoicesTotal = metricsStub;
const clientsTotal = metricsStub;
const databaseOperations = metricsStub;

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Observability middleware disabled for now

// Add health endpoints directly
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'financial-svc' });
});

app.get('/health/live', (_req, res) => {
  res.json({ ok: true });
});

app.get('/health/ready', async (_req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (error) {
    res.status(503).json({ ok: false, error: 'Database not ready' });
  }
});

app.get('/metrics', (_req, res) => {
  res.type('text/plain; version=0.0.4');
  res.send(`# HELP service_info Service information
# TYPE service_info gauge
service_info{service="financial-svc"} 1
`);
});

// Function to update gauge metrics periodically
async function updateGaugeMetrics() {
  try {
    // Update accounts total by provider and type
    const accountStats = await prisma.accounts.groupBy({
      by: ['institution', 'type'],
      _count: { id: true }
    });
    
    // Clear previous values
    accountsTotal.reset();
    for (const stat of accountStats) {
      accountsTotal.set(
        { provider: stat.institution || 'unknown', type: stat.type || 'unknown' },
        stat._count.id
      );
    }

    // Update invoices total by status
    const invoiceStats = await prisma.invoice.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    
    invoicesTotal.reset();
    for (const stat of invoiceStats) {
      invoicesTotal.set({ status: stat.status }, stat._count.id);
    }

    // Update clients total by status
    const clientStats = await prisma.client.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    
    clientsTotal.reset();
    for (const stat of clientStats) {
      clientsTotal.set({ status: stat.status }, stat._count.id);
    }

    databaseOperations.inc({ table: 'accounts', operation: 'group_by', status: 'success' });
    databaseOperations.inc({ table: 'invoices', operation: 'group_by', status: 'success' });
    databaseOperations.inc({ table: 'clients', operation: 'group_by', status: 'success' });
  } catch (error) {
    console.error('Failed to update gauge metrics:', error);
    databaseOperations.inc({ table: 'multiple', operation: 'group_by', status: 'error' });
  }
}

// Update metrics every 30 seconds
setInterval(updateGaugeMetrics, 30000);
// Initial update
updateGaugeMetrics();

// =============================================================================
// CLIENT ENDPOINTS
// =============================================================================

// Clients: list
app.get("/api/financial/clients", async (req, res) => {
  try {
    const email = typeof req.query.email === 'string' ? req.query.email : undefined;
    const name = typeof req.query.name === 'string' ? req.query.name : undefined;
    const userId = req.query.userId as string || 'default-user'; // In production, get from auth
    
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    
    const result = await clientService.getClients({
      userId,
      limit,
      offset: skip,
      search: email || name,
    });

    const body = {
      clients: result.data.clients.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
      })),
      pagination: {
        total: result.data.total,
        page,
        limit,
      },
    };
    res.json(body);
  } catch (err) {
    const e = err as Error;
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Clients: get by id
app.get("/api/financial/clients/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await clientService.getClientById(id);
    
    const body = {
      id: result.data.client.id,
      name: result.data.client.name,
      email: result.data.client.email,
      status: result.data.client.status,
      createdAt: result.data.client.createdAt.toISOString(),
    };
    res.json(body);
  } catch (err) {
    const e = err as Error;
    if (e.message.includes('not found')) {
      res.status(404).json({ ok: false, error: "Not found" });
    } else {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
});

// Clients: create
app.post("/api/financial/clients", async (req, res) => {
  try {
    const userId = req.body.userId || 'default-user'; // In production, get from auth
    const result = await clientService.createClient(req.body, userId);
    res.status(201).json(result);
  } catch (err) {
    const e = err as Error;
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Clients: update
app.put("/api/financial/clients/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.body.userId || 'default-user'; // In production, get from auth
    const result = await clientService.updateClient(id, req.body, userId);
    res.json(result);
  } catch (err) {
    const e = err as Error;
    if (e.message.includes('not found')) {
      res.status(404).json({ ok: false, error: "Not found" });
    } else {
      res.status(400).json({ ok: false, error: e.message });
    }
  }
});

// Clients: delete
app.delete("/api/financial/clients/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.query.userId as string || 'default-user'; // In production, get from auth
    const result = await clientService.deleteClient(id, userId);
    res.json(result);
  } catch (err) {
    const e = err as Error;
    if (e.message.includes('not found')) {
      res.status(404).json({ ok: false, error: "Not found" });
    } else {
      res.status(400).json({ ok: false, error: e.message });
    }
  }
});

// =============================================================================
// INVOICE ENDPOINTS
// =============================================================================

// Invoices: list
app.get("/api/financial/invoices", async (req, res) => {
  try {
    const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const userId = req.query.userId as string || 'default-user'; // In production, get from auth
    
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    
    const result = await invoiceService.getInvoices({
      userId,
      limit,
      offset: skip,
      clientId,
      status,
    });

    const body = {
      invoices: result.data.invoices.map(i => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        clientId: i.clientId ?? undefined,
        status: i.status,
        total: Number(i.total),
        issueDate: i.issueDate.toISOString().slice(0, 10),
      })),
      total: result.data.total,
      page,
      limit,
    };
    res.json(body);
  } catch (err) {
    const e = err as Error;
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Invoices: get by id
app.get("/api/financial/invoices/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await invoiceService.getInvoiceById(id);
    
    const body = {
      id: result.data.invoice.id,
      invoiceNumber: result.data.invoice.invoiceNumber,
      clientId: result.data.invoice.clientId ?? undefined,
      status: result.data.invoice.status,
      total: Number(result.data.invoice.total),
      issueDate: result.data.invoice.issueDate.toISOString().slice(0, 10),
    };
    res.json(body);
  } catch (err) {
    const e = err as Error;
    if (e.message.includes('not found')) {
      res.status(404).json({ ok: false, error: "Not found" });
    } else {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
});

// Invoices: create
app.post("/api/financial/invoices", async (req, res) => {
  try {
    const userId = req.body.userId || 'default-user'; // In production, get from auth
    const result = await invoiceService.createInvoice(req.body, userId);
    res.status(201).json(result);
  } catch (err) {
    const e = err as Error;
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Invoices: update
app.put("/api/financial/invoices/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.body.userId || 'default-user'; // In production, get from auth
    const result = await invoiceService.updateInvoice(id, req.body, userId);
    res.json(result);
  } catch (err) {
    const e = err as Error;
    if (e.message.includes('not found')) {
      res.status(404).json({ ok: false, error: "Not found" });
    } else {
      res.status(400).json({ ok: false, error: e.message });
    }
  }
});

// Invoices: delete
app.delete("/api/financial/invoices/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.query.userId as string || 'default-user'; // In production, get from auth
    const result = await invoiceService.deleteInvoice(id, userId);
    res.json(result);
  } catch (err) {
    const e = err as Error;
    if (e.message.includes('not found')) {
      res.status(404).json({ ok: false, error: "Not found" });
    } else {
      res.status(400).json({ ok: false, error: e.message });
    }
  }
});

// =============================================================================
// TRANSACTION ENDPOINTS
// =============================================================================

// Transactions: list
app.get("/api/financial/transactions", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    
    // Parse query parameters
    const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;
    const minAmount = typeof req.query.minAmount === 'string' ? parseFloat(req.query.minAmount) : undefined;
    const maxAmount = typeof req.query.maxAmount === 'string' ? parseFloat(req.query.maxAmount) : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const result = await transactionService.getTransactions({
      accountId,
      type,
      status,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      search,
      limit,
      offset: skip,
    });

    const body = {
      transactions: result.data.transactions,
      total: result.data.total,
      page,
      limit,
      stats: result.data.summary,
    };
    res.json(body);
  } catch (err) {
    const e = err as Error;
    res.status(500).json({ message: e.message, code: 'INTERNAL_ERROR' });
  }
});

// Transactions: get by id
app.get("/api/financial/transactions/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await transactionService.getTransactionById(id);
    res.json(result.data.transaction);
  } catch (err) {
    const e = err as Error;
    if (e.message.includes('not found')) {
      res.status(404).json({ message: 'Transaction not found', code: 'NOT_FOUND' });
    } else {
      res.status(500).json({ message: e.message, code: 'INTERNAL_ERROR' });
    }
  }
});

// Transactions: export
app.get("/api/financial/transactions/export", async (req, res) => {
  try {
    const format = typeof req.query.format === 'string' ? req.query.format : 'csv';
    const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;

    const result = await transactionService.exportTransactions({
      accountId,
      dateFrom,
      dateTo,
    }, format as 'csv' | 'json');

    if (format === 'json') {
      res.json(result.data);
    } else {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
      res.send(result.data);
    }
  } catch (err) {
    const e = err as Error;
    res.status(500).json({ message: e.message, code: 'INTERNAL_ERROR' });
  }
});

// =============================================================================
// INVOICE ATTACHMENT ENDPOINTS
// =============================================================================

// Attachments: list
app.get("/api/financial/attachments", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    
    const invoiceId = typeof req.query.invoiceId === 'string' ? req.query.invoiceId : undefined;
    const fileType = typeof req.query.fileType === 'string' ? req.query.fileType : undefined;

    const result = await invoiceAttachmentService.getAttachments({
      invoiceId,
      fileType,
      limit,
      offset: skip,
    });

    const body = {
      attachments: result.data.attachments.map(a => ({
        id: a.id,
        invoiceId: a.invoiceId,
        fileName: a.fileName,
        filePath: a.filePath,
        fileSize: Number(a.fileSize),
        fileType: a.fileType,
        description: a.description,
        uploadedBy: a.uploadedBy,
        uploadedAt: a.uploadedAt.toISOString(),
        isDeleted: a.isDeleted,
        deletedAt: a.deletedAt?.toISOString(),
        deletedBy: a.deletedBy,
      })),
      total: result.data.total,
      page,
      limit,
    };
    res.json(body);
  } catch (err) {
    const e = err as Error;
    res.status(500).json({ message: e.message, code: 'INTERNAL_ERROR' });
  }
});

// Attachments: get by id
app.get("/api/financial/attachments/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await invoiceAttachmentService.getAttachmentById(id);
    
    const body = {
      id: result.data.attachment.id,
      invoiceId: result.data.attachment.invoiceId,
      fileName: result.data.attachment.fileName,
      filePath: result.data.attachment.filePath,
      fileSize: Number(result.data.attachment.fileSize),
      fileType: result.data.attachment.fileType,
      description: result.data.attachment.description,
      uploadedBy: result.data.attachment.uploadedBy,
      uploadedAt: result.data.attachment.uploadedAt.toISOString(),
      isDeleted: result.data.attachment.isDeleted,
      deletedAt: result.data.attachment.deletedAt?.toISOString(),
      deletedBy: result.data.attachment.deletedBy,
    };
    res.json(body);
  } catch (err) {
    const e = err as Error;
    if (e.message.includes('not found')) {
      res.status(404).json({ message: 'Attachment not found', code: 'NOT_FOUND' });
    } else {
      res.status(500).json({ message: e.message, code: 'INTERNAL_ERROR' });
    }
  }
});

// =============================================================================
// GOCARDLESS ENDPOINTS
// =============================================================================

// GoCardless: sync accounts
app.post("/api/financial/gocardless/sync/accounts", async (_req, res) => {
  const startTime = Date.now();
  try {
    const result = await goCardlessService.syncAccounts();
    
    const duration = (Date.now() - startTime) / 1000;
    gocardlessSyncDuration.observe({ operation: 'sync_accounts', status: 'success' }, duration);
    
    res.json({ ok: true, count: result.count, errors: result.errors });
  } catch (err) {
    const duration = (Date.now() - startTime) / 1000;
    gocardlessSyncDuration.observe({ operation: 'sync_accounts', status: 'error' }, duration);
    
    const e = err as Error;
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GoCardless: sync transactions for a given account
app.post("/api/financial/gocardless/sync/transactions", async (req, res) => {
  const startTime = Date.now();
  try {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : undefined;
    if (!accountId) {
      return res.status(400).json({ message: "accountId is required", code: "BAD_REQUEST" });
    }

    const result = await goCardlessService.syncTransactions(accountId);
    
    const duration = (Date.now() - startTime) / 1000;
    gocardlessSyncDuration.observe({ operation: 'sync_transactions', status: 'success' }, duration);
    
    res.json({ ok: true, count: result.count, errors: result.errors });
  } catch (err) {
    const duration = (Date.now() - startTime) / 1000;
    gocardlessSyncDuration.observe({ operation: 'sync_transactions', status: 'error' }, duration);
    
    const e = err as Error;
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GoCardless: full sync
app.post("/api/financial/gocardless/sync/full", async (_req, res) => {
  const startTime = Date.now();
  try {
    const result = await goCardlessService.fullSync();
    
    const duration = (Date.now() - startTime) / 1000;
    gocardlessSyncDuration.observe({ operation: 'full_sync', status: 'success' }, duration);
    
    res.json({ 
      ok: true, 
      accountsCount: result.accountsCount,
      transactionsCount: result.transactionsCount,
      errors: result.errors 
    });
  } catch (err) {
    const duration = (Date.now() - startTime) / 1000;
    gocardlessSyncDuration.observe({ operation: 'full_sync', status: 'error' }, duration);
    
    const e = err as Error;
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GoCardless: test connection
app.get("/api/financial/gocardless/test", async (_req, res) => {
  try {
    const result = await goCardlessService.testConnection();
    res.json(result);
  } catch (err) {
    const e = err as Error;
    res.status(500).json({ ok: false, error: e.message });
  }
});

// =============================================================================
// ACCOUNT ENDPOINTS
// =============================================================================

// Accounts: list (contract-typed route)
type ListAccounts200 = AiServicePaths["/api/financial/accounts"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/accounts", async (req, res) => {
  const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);

    const whereClause = provider ? { institution: provider } : {};
    const [rows, total] = await Promise.all([
      prisma.accounts.findMany({
        where: whereClause,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          account_id: true,
          institution: true,
          name: true,
          type: true,
          iban: true,
          created_at: true,
          currencies: { select: { code: true } },
        },
        skip,
        take: limit,
      }),
      prisma.accounts.count({ where: whereClause }),
    ]);

    const body: ListAccounts200 = {
      accounts: rows.map((r) => ({
        id: r.id,
        account_id: r.account_id ?? `acc_${r.id}`,
        name: r.name,
        type: r.type ?? "checking",
        institution: r.institution ?? undefined,
        iban: r.iban ?? undefined,
        currency: r.currencies?.code ?? undefined,
        balance: 0,
        created_at: (r.created_at as Date).toISOString(),
      })),
      total,
      page,
      limit,
    };
    res.json(body);
  } catch (err) {
    const e = err as Error;
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Accounts: get by id (contract-typed route)
type GetAccount200 = AiServicePaths["/api/financial/accounts/{id}"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/accounts/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const r = await prisma.accounts.findUnique({
      where: { id },
      select: {
        id: true,
        account_id: true,
        institution: true,
        name: true,
        type: true,
        iban: true,
        created_at: true,
        currencies: { select: { code: true } },
      },
    });
    if (!r) {
      res.status(404).json({ ok: false, error: "Not found" });
      return;
    }
    const body: GetAccount200 = {
      id: r.id,
      account_id: r.account_id ?? `acc_${r.id}`,
      name: r.name,
      type: r.type ?? "checking",
      institution: r.institution ?? undefined,
      iban: r.iban ?? undefined,
      currency: r.currencies?.code ?? undefined,
      created_at: (r.created_at as Date).toISOString(),
    };
    res.json(body);
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// =============================================================================
// DEV SEED & STARTUP
// =============================================================================

// Dev-only seed: ensure at least one account exists in financial.accounts for smoke tests
async function ensureDevSeed() {
  if (process.env.NODE_ENV === 'production') return;
  try {
    const total = await prisma.accounts.count();
    if (total === 0) {
      await prisma.accounts.create({
        data: {
          id: randomUUID(),
          account_id: `acc_${Date.now()}`,
          name: "FinSvc Demo Account",
          type: "checking",
          institution: "demo",
          created_at: new Date(),
        },
      });
    }
    // Ensure a demo user exists (required by Client.userId and Invoice.userId)
    let demoUser = await prisma.user.findFirst({ where: { email: "demo.user@local.test" } });
    if (!demoUser) {
      demoUser = await prisma.user.create({
        data: {
          email: "demo.user@local.test",
          password_hash: "dev-only",
          full_name: "Demo User",
        },
      });
    }

    const clients = await prisma.client.count();
    if (clients === 0) {
      const c = await prisma.client.create({
        data: {
          id: randomUUID(),
          name: "Acme Corp",
          email: `demo.client@acme.test`,
          taxId: "TAX-DEMO-0001",
          status: "active",
          userId: demoUser.id,
          createdAt: new Date(),
        },
      });
      const invoices = await prisma.invoice.count();
      if (invoices === 0) {
        const issueDate = new Date();
        const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        await prisma.invoice.create({
          data: {
            id: randomUUID(),
            invoiceNumber: `INV-${Date.now()}`,
            clientId: c.id,
            clientName: c.name,
            clientTaxId: c.taxId,
            status: "draft",
            total: new Prisma.Decimal(100),
            issueDate,
            dueDate,
            userId: demoUser.id,
          },
        });
      }
    }
  } catch (e) {
    console.error("[financial-svc] ensureDevSeed error", e);
  }
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  ensureDevSeed()
    .then(() => console.log(`[financial-svc] listening on :${port}`))
    .catch((e) => console.error("[financial-svc] dev seed error", e));
});