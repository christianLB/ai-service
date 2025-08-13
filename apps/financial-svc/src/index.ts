import express from "express";
import cors from "cors";
import helmet from "helmet";
import client from "prom-client";
import { Pool } from "pg";
import Redis from "ioredis";
import { env } from "@ai/config";
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
  // TODO: Replace with real DB-backed data
  const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
  const body: ListAccounts200 = {
    accounts: [
      {
        id: "00000000-0000-0000-0000-000000000001",
        provider: provider ?? "demo",
        name: "FinSvc Account",
        currency: "USD",
        createdAt: new Date().toISOString(),
      },
    ],
    total: 1,
  };
  res.json(body);
});

// Typed route: get account by id
type GetAccount200 = AiServicePaths["/api/financial/accounts/{id}"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/accounts/:id", async (req, res) => {
  const id = req.params.id;
  // TODO: Replace with DB lookup by id
  const body: GetAccount200 = {
    id,
    provider: "demo",
    name: "FinSvc Account",
    currency: "USD",
    createdAt: new Date().toISOString(),
  };
  res.json(body);
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`[financial-svc] listening on :${port}`);
});
