import express from "express";
import cors from "cors";
import helmet from "helmet";
import client from "prom-client";
import { Pool } from "pg";
import Redis from "ioredis";
import { env } from "@ai/config";
import { randomUUID } from "crypto";
import type { AiServicePaths } from "@ai/contracts";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// DB and Redis clients
const pool = new Pool({ connectionString: env.DATABASE_URL });
const redis = new Redis(env.REDIS_URL);

// Ensure minimal schema exists (idempotent)
async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS financial_accounts (
      id UUID PRIMARY KEY,
      provider TEXT NOT NULL,
      name TEXT NOT NULL,
      iban TEXT,
      currency CHAR(3) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // Seed one demo account if empty (CI smoke tests rely on at least one row)
  const count = await pool.query(`SELECT COUNT(*)::int AS total FROM financial_accounts`);
  const total = (count.rows[0]?.total as number) ?? 0;
  if (total === 0) {
    await pool.query(
      `INSERT INTO financial_accounts (id, provider, name, iban, currency)
       VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), "demo", "FinSvc Account", null, "USD"]
    );
  }
}

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

// Typed contract route for accounts (matches OpenAPI spec used by gateway)
type ListAccounts200 = AiServicePaths["/api/financial/accounts"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/accounts", async (req, res) => {
  const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
  try {
    const params: string[] = [];
    const where = provider ? (params.push(provider), `WHERE provider = $${params.length}`) : '';
    const rows = await pool.query(
      `SELECT id::text, provider, name, iban, currency, created_at FROM financial_accounts ${where} ORDER BY created_at DESC`,
      params
    );
    const count = await pool.query(
      `SELECT COUNT(*)::int AS total FROM financial_accounts ${where}`,
      params
    );
    const body: ListAccounts200 = {
      accounts: rows.rows.map(r => ({
        id: r.id,
        provider: r.provider,
        name: r.name,
        iban: r.iban ?? undefined,
        currency: r.currency,
        createdAt: (r.created_at as Date).toISOString(),
      })),
      total: (count.rows[0]?.total as number) ?? 0,
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
    const q = await pool.query(
      `SELECT id::text, provider, name, iban, currency, created_at FROM financial_accounts WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (q.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Not found" });
      return;
    }
    const r = q.rows[0];
    const body: GetAccount200 = {
      id: r.id,
      provider: r.provider,
      name: r.name,
      iban: r.iban ?? undefined,
      currency: r.currency,
      createdAt: (r.created_at as Date).toISOString(),
    };
    res.json(body);
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  ensureSchema()
    .then(() => console.log(`[financial-svc] schema ensured, listening on :${port}`))
    .catch((e) => console.error("[financial-svc] schema error", e));
});
