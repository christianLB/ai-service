import express from "express";
import cors from "cors";
import helmet from "helmet";
import client from "prom-client";
import { Pool } from "pg";
import Redis from "ioredis";
import { env } from "@ai/config";
import type { AiServicePaths } from "@ai/contracts";
import { createAiServiceClient } from "@ai/contracts";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Proxy: get account by id
type GetAccount200 = AiServicePaths["/api/financial/accounts/{id}"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/accounts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await financialClient.GET("/api/financial/accounts/{id}" as const, {
      params: { path: { id } },
    });
    if (result.error) {
      res.status(502).json({ ok: false });
      return;
    }
    res.json((result.data as GetAccount200 | undefined) ?? null);
  } catch (err) {
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});

// Proxy: list clients
type ListClients200 = AiServicePaths["/api/financial/clients"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/clients", async (req, res) => {
  const email = typeof req.query.email === 'string' ? req.query.email : undefined;
  const name = typeof req.query.name === 'string' ? req.query.name : undefined;
  try {
    const result = await financialClient.GET("/api/financial/clients" as const, {
      params: { query: { ...(email ? { email } : {}), ...(name ? { name } : {}) } as any },
    });
    if (result.error) {
      res.status(502).json({ ok: false });
      return;
    }
    const data = result.data as ListClients200 | undefined;
    res.json(data ?? { clients: [], total: 0 });
  } catch (err) {
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});

// Proxy: get client by id
type GetClient200 = AiServicePaths["/api/financial/clients/{id}"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/clients/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await financialClient.GET("/api/financial/clients/{id}" as const, {
      params: { path: { id } },
    });
    if (result.error) {
      res.status(502).json({ ok: false });
      return;
    }
    res.json((result.data as GetClient200 | undefined) ?? null);
  } catch (err) {
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});

// Proxy: list invoices
type ListInvoices200 = AiServicePaths["/api/financial/invoices"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/invoices", async (req, res) => {
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  try {
    const result = await financialClient.GET("/api/financial/invoices" as const, {
      params: { query: { ...(clientId ? { clientId } : {}), ...(status ? { status } : {}) } as any },
    });
    if (result.error) {
      res.status(502).json({ ok: false });
      return;
    }
    const data = result.data as ListInvoices200 | undefined;
    res.json(data ?? { invoices: [], total: 0 });
  } catch (err) {
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});

// Proxy: get invoice by id
type GetInvoice200 = AiServicePaths["/api/financial/invoices/{id}"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/invoices/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await financialClient.GET("/api/financial/invoices/{id}" as const, {
      params: { path: { id } },
    });
    if (result.error) {
      res.status(502).json({ ok: false });
      return;
    }
    res.json((result.data as GetInvoice200 | undefined) ?? null);
  } catch (err) {
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});

// DB and Redis clients
const pool = new Pool({ connectionString: env.DATABASE_URL });
const redis = new Redis(env.REDIS_URL);

app.get("/health/live", (_req, res) => {
  res.json({ ok: true });
});

app.get("/health/ready", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    await redis.ping();
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: (err as Error).message });
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

// Contract-first endpoint proxied to financial-svc
type ListAccounts200 = AiServicePaths["/api/financial/accounts"]["get"]["responses"][200]["content"]["application/json"];
const financialSvcBase = process.env.FINANCIAL_SVC_URL || "http://financial-svc:3001";
const financialClient = createAiServiceClient(financialSvcBase);

app.get("/api/financial/accounts", async (req, res) => {
  const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
  try {
    const result = await financialClient.GET("/api/financial/accounts" as const, {
      params: { query: provider ? { provider } : undefined },
    });
    if (result.error) {
      res.status(502).json({ ok: false });
      return;
    }
    const data = result.data as ListAccounts200 | undefined;
    res.json(data ?? { accounts: [], total: 0 });
  } catch (err) {
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});

const port = env.PORT || 3000;
app.listen(port, () => {
  console.log(`[api-gateway] listening on :${port}`);
});
