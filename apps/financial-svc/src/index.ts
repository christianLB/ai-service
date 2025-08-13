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

// Dev-only seed: ensure at least one account exists in financial.accounts for smoke tests
async function ensureDevSeed() {
  if (process.env.NODE_ENV === 'production') return;
  try {
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM financial.accounts`);
    const total = (count.rows[0]?.total as number) ?? 0;
    if (total === 0) {
      await pool.query(
        `INSERT INTO financial.accounts (id, account_id, name, type, institution, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [randomUUID(), `acc_${Date.now()}`, "FinSvc Demo Account", "checking", "demo"]
      );
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
    const where = provider ? (params.push(provider), `WHERE a.institution = $${params.length}`) : '';
    const rows = await pool.query(
      `SELECT a.id::text,
              a.institution AS provider,
              a.name,
              a.iban,
              COALESCE(c.code, 'USD') AS currency,
              a.created_at
       FROM financial.accounts a
       LEFT JOIN financial.currencies c ON c.id = a.currency_id
       ${where}
       ORDER BY a.created_at DESC`,
      params
    );
    const count = await pool.query(
      `SELECT COUNT(*)::int AS total FROM financial.accounts a ${where}`,
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
      `SELECT a.id::text,
              a.institution AS provider,
              a.name,
              a.iban,
              COALESCE(c.code, 'USD') AS currency,
              a.created_at
       FROM financial.accounts a
       LEFT JOIN financial.currencies c ON c.id = a.currency_id
       WHERE a.id = $1
       LIMIT 1`,
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
  ensureDevSeed()
    .then(() => console.log(`[financial-svc] listening on :${port}`))
    .catch((e) => console.error("[financial-svc] dev seed error", e));
});
