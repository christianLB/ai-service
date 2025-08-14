import express from "express";
import cors from "cors";
import helmet from "helmet";
import client from "prom-client";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
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
