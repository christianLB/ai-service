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

// Contract-first example endpoint (typed by OpenAPI)
type ListAccounts200 = AiServicePaths["/api/financial/accounts"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/accounts", async (req, res) => {
  // In a future step, proxy to financial-svc or aggregate DB results.
  const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
  const body: ListAccounts200 = {
    accounts: [
      {
        id: "00000000-0000-0000-0000-000000000000",
        provider: provider ?? "demo",
        name: "Demo Account",
        currency: "USD",
        createdAt: new Date().toISOString(),
      },
    ],
    total: 1,
  };
  res.json(body);
});

const port = env.PORT || 3000;
app.listen(port, () => {
  console.log(`[api-gateway] listening on :${port}`);
});
