import express from "express";
import cors from "cors";
import helmet from "helmet";
import client from "prom-client";
import Redis from "ioredis";
import { env } from "@ai/config";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Redis client
const redis = new Redis(env.REDIS_URL);

app.get("/health/live", (_req, res) => {
  res.json({ ok: true });
});

app.get("/health/ready", async (_req, res) => {
  try {
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

const port = Number(process.env.PORT ?? 3003);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[comm-svc] listening on :${port}`);
});
