import express from "express";
import cors from "cors";
import helmet from "helmet";
import Redis from "ioredis";
import { PrismaClient, Prisma } from "@prisma/client";
import { env } from "@ai/config";
import { randomUUID } from "crypto";
import type { AiServicePaths } from "@ai/contracts";
import { parsePagination } from "@ai/http-utils";
import { listAccounts as gcListAccounts, listTransactions as gcListTransactions, getAccessToken as gcGetAccessToken } from "./gocardless";
// @ts-ignore - package built locally
// @ts-ignore - package built locally
import { createStandardObservability } from "@ai/observability";

// Integration config loader (DB-backed) for GoCardless
async function getGoCardlessCreds() {
  // Expect rows in financial.integration_configs
  // keys: base_url (optional), secret_id (required), secret_key (required)
  type Row = { config_key: string; config_value: string };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT config_key, config_value
    FROM financial.integration_configs
    WHERE integration_type = 'gocardless' AND is_global = true
  `;
  const map = new Map<string, string>(rows.map(r => [r.config_key, r.config_value]));
  const secretId = map.get('secret_id') || map.get('SECRET_ID') || '';
  const secretKey = map.get('secret_key') || map.get('SECRET_KEY') || '';
  const baseUrl = map.get('base_url') || 'https://bankaccountdata.gocardless.com/api/v2';
  if (!secretId || !secretKey) {
    const err: Error & { statusCode?: number } = new Error('GoCardless secret_id/secret_key not configured in integration configs');
    err.statusCode = 400;
    throw err;
  }
  const accessToken = await gcGetAccessToken(baseUrl, secretId, secretKey);
  return { baseUrl, accessToken };
}

// DB and Redis clients
const prisma = new PrismaClient();
const redis = new Redis(env.REDIS_URL);

// Create observability setup
const observability = createStandardObservability({
  serviceName: 'financial-svc',
  version: process.env.npm_package_version,
  environment: process.env.NODE_ENV,
  dependencies: {
    database: { connectionString: env.DATABASE_URL },
    redis: { url: env.REDIS_URL }
  }
});

const { metricsRegistry } = observability;

// Create business-specific metrics for Financial Service
const transactionsProcessed = metricsRegistry!.createCounter(
  'transactions_processed_total',
  'Total number of transactions processed',
  ['source', 'type', 'status']
);

const gocardlessSyncDuration = metricsRegistry!.createHistogram(
  'gocardless_sync_duration_seconds',
  'Duration of GoCardless sync operations',
  ['operation', 'status'],
  [0.1, 0.5, 1, 2, 5, 10, 30, 60]
);

const accountsTotal = metricsRegistry!.createGauge(
  'accounts_total',
  'Total number of accounts by provider',
  ['provider', 'type']
);

const invoicesTotal = metricsRegistry!.createGauge(
  'invoices_total',
  'Total number of invoices by status',
  ['status']
);

const clientsTotal = metricsRegistry!.createGauge(
  'clients_total',
  'Total number of clients by status',
  ['status']
);

const databaseOperations = metricsRegistry!.createCounter(
  'database_operations_total',
  'Total database operations',
  ['table', 'operation', 'status']
);

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Setup observability middleware
observability.setupExpress(app);

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

// GoCardless: sync accounts into financial.accounts
app.post("/api/financial/gocardless/sync/accounts", async (_req, res) => {
  const startTime = Date.now();
  try {
    const { baseUrl, accessToken } = await getGoCardlessCreds();
    
    const accounts = await metricsRegistry!.timeFunction(
      'gocardless_sync_duration_seconds',
      () => gcListAccounts(baseUrl, accessToken),
      { operation: 'list_accounts', status: 'success' }
    );
    
    let upserted = 0;
    for (const a of accounts) {
      // Try to find by provider account_id
      const existing = await prisma.accounts.findFirst({ where: { account_id: a.id } });
      if (existing) {
        await prisma.accounts.update({
          where: { id: existing.id },
          data: {
            name: a.name ?? existing.name,
            institution: a.institution_id ?? existing.institution,
            iban: a.iban ?? existing.iban,
          },
        });
      } else {
        await prisma.accounts.create({
          data: {
            id: randomUUID(),
            account_id: a.id,
            name: a.name ?? "Account",
            type: "checking",
            institution: a.institution_id ?? "gocardless",
            iban: a.iban ?? null,
            created_at: a.created ? new Date(a.created) : new Date(),
          },
        });
      }
      upserted += 1;
      databaseOperations.inc({ table: 'accounts', operation: 'upsert', status: 'success' });
    }
    
    const duration = (Date.now() - startTime) / 1000;
    gocardlessSyncDuration.observe({ operation: 'sync_accounts', status: 'success' }, duration);
    
    res.json({ ok: true, count: upserted });
  } catch (err) {
    const duration = (Date.now() - startTime) / 1000;
    gocardlessSyncDuration.observe({ operation: 'sync_accounts', status: 'error' }, duration);
    databaseOperations.inc({ table: 'accounts', operation: 'upsert', status: 'error' });
    
    const e = err as Error & { statusCode?: number };
    const status = e.statusCode && e.statusCode >= 400 && e.statusCode < 600 ? e.statusCode : 500;
    res.status(status).json({ ok: false, error: e.message });
  }
});

// GoCardless: sync transactions for a given GoCardless account id
// Body: { accountId: string }
app.post("/api/financial/gocardless/sync/transactions", async (req, res) => {
  const startTime = Date.now();
  try {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : undefined;
    if (!accountId) {
      return res.status(400).json({ message: "accountId is required", code: "BAD_REQUEST" });
    }

    // Ensure local account exists (by provider account_id)
    let local = await prisma.accounts.findFirst({ where: { account_id: accountId } });
    if (!local) {
      // Create a placeholder account so FK constraints are satisfied
      local = await prisma.accounts.create({
        data: {
          id: randomUUID(),
          account_id: accountId,
          name: "GoCardless Account",
          type: "checking",
          institution: "gocardless",
          created_at: new Date(),
        },
      });
    }

    const { baseUrl, accessToken } = await getGoCardlessCreds();
    
    const txs = await metricsRegistry!.timeFunction(
      'gocardless_sync_duration_seconds',
      () => gcListTransactions(baseUrl, accessToken, accountId),
      { operation: 'list_transactions', status: 'success' }
    );
    
    let upserts = 0;
    for (const t of txs) {
      const bookingDate = t.booking_date || t.value_date || undefined;
      const amountNum = Number(t.amount?.value ?? 0);
      const description = t.remittanceInformationUnstructured ?? t.description ?? null;

      const existing = await prisma.transactions.findFirst({ where: { transaction_id: t.id } });
      if (existing) {
        await prisma.transactions.update({
          where: { id: existing.id },
          data: {
            account_id: local.account_id,
            amount: new Prisma.Decimal(isFinite(amountNum) ? amountNum : 0),
            description,
            date: bookingDate ? new Date(bookingDate) : new Date(),
            status: t.status ?? existing.status,
            gocardless_data: t as unknown as Prisma.InputJsonValue,
          },
        });
      } else {
        await prisma.transactions.create({
          data: {
            id: randomUUID(),
            transaction_id: t.id,
            account_id: local.account_id,
            amount: new Prisma.Decimal(isFinite(amountNum) ? amountNum : 0),
            type: amountNum >= 0 ? "credit" : "debit",
            status: t.status ?? "booked",
            description,
            date: bookingDate ? new Date(bookingDate) : new Date(),
            gocardless_data: t as unknown as Prisma.InputJsonValue,
            created_at: new Date(),
          },
        });
      }
      upserts += 1;
      transactionsProcessed.inc({ source: 'gocardless', type: t.status || 'unknown', status: 'success' });
      databaseOperations.inc({ table: 'transactions', operation: 'upsert', status: 'success' });
    }
    
    const duration = (Date.now() - startTime) / 1000;
    gocardlessSyncDuration.observe({ operation: 'sync_transactions', status: 'success' }, duration);
    
    res.json({ ok: true, count: upserts });
  } catch (err) {
    const duration = (Date.now() - startTime) / 1000;
    gocardlessSyncDuration.observe({ operation: 'sync_transactions', status: 'error' }, duration);
    databaseOperations.inc({ table: 'transactions', operation: 'upsert', status: 'error' });
    
    const e = err as Error & { statusCode?: number };
    const status = e.statusCode && e.statusCode >= 400 && e.statusCode < 600 ? e.statusCode : 500;
    res.status(status).json({ ok: false, error: e.message });
  }
});

// Clients: list
type ListClients200 = AiServicePaths["/api/financial/clients"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/clients", async (req, res) => {
  const email = typeof req.query.email === 'string' ? req.query.email : undefined;
  const name = typeof req.query.name === 'string' ? req.query.name : undefined;
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const where: Prisma.ClientWhereInput = {};
    if (email) where.email = { contains: email, mode: Prisma.QueryMode.insensitive };
    if (name) where.name = { contains: name, mode: Prisma.QueryMode.insensitive };
    const [rows, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, status: true, createdAt: true },
        skip,
        take: limit,
      }),
      prisma.client.count({ where }),
    ]);
    const body: ListClients200 = {
      clients: rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        status: r.status,
        createdAt: (r.createdAt as Date).toISOString(),
      })),
      pagination: {
        total,
        page,
        limit,
      },
    };
    res.json(body);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) return res.status(400).json({ message: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Clients: get by id
type GetClient200 = AiServicePaths["/api/financial/clients/{id}"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/clients/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const r = await prisma.client.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, status: true, createdAt: true },
    });
    if (!r) {
      res.status(404).json({ ok: false, error: "Not found" });
      return;
    }
    const body: GetClient200 = {
      id: r.id,
      name: r.name,
      email: r.email,
      status: r.status,
      createdAt: (r.createdAt as Date).toISOString(),
    };
    res.json(body);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) return res.status(400).json({ message: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Invoices: list
type ListInvoices200 = AiServicePaths["/api/financial/invoices"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/invoices", async (req, res) => {
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);

    const where: Prisma.InvoiceWhereInput = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { issueDate: 'desc' },
        select: { id: true, invoiceNumber: true, clientId: true, status: true, total: true, issueDate: true },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);
    const body: ListInvoices200 = {
      invoices: rows.map(r => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        clientId: r.clientId ?? undefined,
        status: r.status,
        total: Number(r.total),
        issueDate: (r.issueDate as Date).toISOString().slice(0, 10),
      })),
      total,
      page,
      limit,
    };
    res.json(body);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) return res.status(400).json({ message: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Invoices: get by id
type GetInvoice200 = AiServicePaths["/api/financial/invoices/{id}"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/invoices/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const r = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true, invoiceNumber: true, clientId: true, status: true, total: true, issueDate: true },
    });
    if (!r) {
      res.status(404).json({ ok: false, error: "Not found" });
      return;
    }
    const body: GetInvoice200 = {
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      clientId: r.clientId ?? undefined,
      status: r.status,
      total: Number(r.total),
      issueDate: (r.issueDate as Date).toISOString().slice(0, 10),
    };
    res.json(body);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) return res.status(400).json({ message: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
});

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

    // Build where clause
    const where: Prisma.transactionsWhereInput = {};
    if (accountId) where.account_id = accountId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) where.amount.gte = new Prisma.Decimal(minAmount);
      if (maxAmount !== undefined) where.amount.lte = new Prisma.Decimal(maxAmount);
    }
    if (search) {
      where.OR = [
        { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { counterparty_name: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    // Fetch data
    const [rows, total] = await Promise.all([
      prisma.transactions.findMany({
        where,
        orderBy: { date: 'desc' },
        include: {
          currencies_transactions_currency_idTocurrencies: { select: { code: true } },
        },
        skip,
        take: limit,
      }),
      prisma.transactions.count({ where }),
    ]);

    // Calculate stats
    let totalIncome = 0;
    let totalExpenses = 0;
    const allTransactions = await prisma.transactions.findMany({
      where,
      select: { amount: true, type: true },
    });
    allTransactions.forEach(t => {
      const amount = Number(t.amount);
      if (t.type === 'credit') totalIncome += amount;
      else if (t.type === 'debit') totalExpenses += amount;
    });

    const body = {
      transactions: rows.map(r => ({
        id: r.id,
        transaction_id: r.transaction_id,
        account_id: r.account_id,
        amount: Number(r.amount),
        currency: r.currencies_transactions_currency_idTocurrencies?.code,
        type: r.type,
        status: r.status,
        description: r.description,
        reference: r.reference,
        counterparty_name: r.counterparty_name,
        counterparty_account: r.counterparty_account,
        date: r.date.toISOString().slice(0, 10),
        tags: r.tags,
        fee_amount: r.fee_amount ? Number(r.fee_amount) : undefined,
        metadata: r.metadata,
        gocardless_data: r.gocardless_data,
        created_at: r.created_at?.toISOString(),
        updated_at: r.updated_at?.toISOString(),
      })),
      total,
      page,
      limit,
      stats: {
        totalIncome,
        totalExpenses,
      },
    };
    res.json(body);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) {
      return res.status(400).json({ message: e.message, code: 'BAD_REQUEST' });
    }
    res.status(500).json({ message: e.message, code: 'INTERNAL_ERROR' });
  }
});

// Transactions: get by id
app.get("/api/financial/transactions/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const r = await prisma.transactions.findUnique({
      where: { id },
      include: {
        currencies_transactions_currency_idTocurrencies: { select: { code: true } },
      },
    });
    if (!r) {
      return res.status(404).json({ message: 'Transaction not found', code: 'NOT_FOUND' });
    }
    const body = {
      id: r.id,
      transaction_id: r.transaction_id,
      account_id: r.account_id,
      amount: Number(r.amount),
      currency: r.currencies_transactions_currency_idTocurrencies?.code,
      type: r.type,
      status: r.status,
      description: r.description,
      reference: r.reference,
      counterparty_name: r.counterparty_name,
      counterparty_account: r.counterparty_account,
      date: r.date.toISOString().slice(0, 10),
      tags: r.tags,
      fee_amount: r.fee_amount ? Number(r.fee_amount) : undefined,
      metadata: r.metadata,
      gocardless_data: r.gocardless_data,
      created_at: r.created_at?.toISOString(),
      updated_at: r.updated_at?.toISOString(),
    };
    res.json(body);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message, code: 'INTERNAL_ERROR' });
  }
});

// Transactions: export
app.get("/api/financial/transactions/export", async (req, res) => {
  try {
    const format = typeof req.query.format === 'string' ? req.query.format : 'csv';
    const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;

    // Build where clause
    const where: Prisma.transactionsWhereInput = {};
    if (accountId) where.account_id = accountId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const transactions = await prisma.transactions.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        currencies_transactions_currency_idTocurrencies: { select: { code: true } },
      },
    });

    if (format === 'json') {
      const body = transactions.map(r => ({
        id: r.id,
        transaction_id: r.transaction_id,
        account_id: r.account_id,
        amount: Number(r.amount),
        currency: r.currencies_transactions_currency_idTocurrencies?.code,
        type: r.type,
        status: r.status,
        description: r.description,
        reference: r.reference,
        counterparty_name: r.counterparty_name,
        date: r.date.toISOString().slice(0, 10),
        tags: r.tags,
      }));
      res.json(body);
    } else {
      // CSV format
      const csv = [
        'Date,Description,Amount,Currency,Type,Status,Reference,Counterparty',
        ...transactions.map(r => 
          `${r.date.toISOString().slice(0, 10)},"${r.description || ''}",${r.amount},"${r.currencies_transactions_currency_idTocurrencies?.code || 'EUR'}","${r.type}","${r.status}","${r.reference || ''}","${r.counterparty_name || ''}"`
        ),
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
      res.send(csv);
    }
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) {
      return res.status(400).json({ message: e.message, code: 'BAD_REQUEST' });
    }
    res.status(500).json({ message: e.message, code: 'INTERNAL_ERROR' });
  }
});

// Attachments: list
app.get("/api/financial/attachments", async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    
    const invoiceId = typeof req.query.invoiceId === 'string' ? req.query.invoiceId : undefined;
    const fileType = typeof req.query.fileType === 'string' ? req.query.fileType : undefined;

    const where: Prisma.InvoiceAttachmentWhereInput = {
      isDeleted: false,
    };
    if (invoiceId) where.invoiceId = invoiceId;
    if (fileType) where.fileType = fileType;

    const [rows, total] = await Promise.all([
      prisma.invoiceAttachment.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoiceAttachment.count({ where }),
    ]);

    const body = {
      attachments: rows.map(r => ({
        id: r.id,
        invoiceId: r.invoiceId,
        fileName: r.fileName,
        filePath: r.filePath,
        fileSize: Number(r.fileSize),
        fileType: r.fileType,
        description: r.description,
        uploadedBy: r.uploadedBy,
        uploadedAt: r.uploadedAt.toISOString(),
        isDeleted: r.isDeleted,
        deletedAt: r.deletedAt?.toISOString(),
        deletedBy: r.deletedBy,
      })),
      total,
      page,
      limit,
    };
    res.json(body);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) {
      return res.status(400).json({ message: e.message, code: 'BAD_REQUEST' });
    }
    res.status(500).json({ message: e.message, code: 'INTERNAL_ERROR' });
  }
});

// Attachments: get by id
app.get("/api/financial/attachments/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const r = await prisma.invoiceAttachment.findUnique({
      where: { id },
    });
    if (!r || r.isDeleted) {
      return res.status(404).json({ message: 'Attachment not found', code: 'NOT_FOUND' });
    }
    const body = {
      id: r.id,
      invoiceId: r.invoiceId,
      fileName: r.fileName,
      filePath: r.filePath,
      fileSize: Number(r.fileSize),
      fileType: r.fileType,
      description: r.description,
      uploadedBy: r.uploadedBy,
      uploadedAt: r.uploadedAt.toISOString(),
      isDeleted: r.isDeleted,
      deletedAt: r.deletedAt?.toISOString(),
      deletedBy: r.deletedBy,
    };
    res.json(body);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message, code: 'INTERNAL_ERROR' });
  }
});


// Typed contract route for accounts (matches OpenAPI spec used by gateway)
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
          institution: true,
          name: true,
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
        name: r.name,
        type: "checking",
        balance: 0,
        currency: r.currencies?.code ?? "USD",
        provider: r.institution ?? "unknown",
        iban: r.iban ?? undefined,
        createdAt: (r.created_at as Date).toISOString(),
      })),
      pagination: {
        total,
        page,
        limit,
      },
    };
    res.json(body);
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 400) return res.status(400).json({ message: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Typed route: get account by id
type GetAccount200 = AiServicePaths["/api/financial/accounts/{id}"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/accounts/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const r = await prisma.accounts.findUnique({
      where: { id },
      select: {
        id: true,
        institution: true,
        name: true,
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
      provider: r.institution ?? "unknown",
      name: r.name,
      iban: r.iban ?? undefined,
      currency: r.currencies?.code ?? "USD",
      createdAt: (r.created_at as Date).toISOString(),
    };
    res.json(body);
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  ensureDevSeed()
    .then(() => console.log(`[financial-svc] listening on :${port}`))
    .catch((e) => console.error("[financial-svc] dev seed error", e));
});
