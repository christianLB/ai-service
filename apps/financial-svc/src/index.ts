import express from "express";
import cors from "cors";
import helmet from "helmet";
import client from "prom-client";
import Redis from "ioredis";
import { PrismaClient, Prisma } from "@prisma/client";
import { env } from "@ai/config";
import { randomUUID } from "crypto";
import type { AiServicePaths } from "@ai/contracts";
import { parsePagination } from "@ai/http-utils";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// DB and Redis clients
const prisma = new PrismaClient();
const redis = new Redis(env.REDIS_URL);

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

app.get("/health/live", (_req, res) => {
  res.json({ ok: true });
});

app.get("/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    await redis.ping();
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: (err as Error).message });
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

app.get("/metrics", async (_req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(String(err));
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
        provider: r.institution ?? "unknown",
        name: r.name,
        iban: r.iban ?? undefined,
        currency: r.currencies?.code ?? "USD",
        createdAt: (r.created_at as Date).toISOString(),
      })),
      total,
      page,
      limit,
    };
    res.json(body);
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
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
