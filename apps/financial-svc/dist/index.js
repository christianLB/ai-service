"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const prom_client_1 = __importDefault(require("prom-client"));
const ioredis_1 = __importDefault(require("ioredis"));
const client_1 = require("@prisma/client");
const config_1 = require("@ai/config");
const crypto_1 = require("crypto");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Metrics
const register = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({ register });
// DB and Redis clients
const prisma = new client_1.PrismaClient();
const redis = new ioredis_1.default(config_1.env.REDIS_URL);
// Dev-only seed: ensure at least one account exists in financial.accounts for smoke tests
async function ensureDevSeed() {
    if (process.env.NODE_ENV === 'production')
        return;
    try {
        const total = await prisma.accounts.count();
        if (total === 0) {
            await prisma.accounts.create({
                data: {
                    id: (0, crypto_1.randomUUID)(),
                    account_id: `acc_${Date.now()}`,
                    name: "FinSvc Demo Account",
                    type: "checking",
                    institution: "demo",
                    created_at: new Date(),
                },
            });
        }
    }
    catch (e) {
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
    }
    catch (err) {
        res.status(503).json({ ok: false, error: err.message });
    }
});
app.get("/metrics", async (_req, res) => {
    try {
        res.set("Content-Type", register.contentType);
        res.end(await register.metrics());
    }
    catch (err) {
        res.status(500).end(String(err));
    }
});
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
        const body = {
            accounts: rows.map((r) => ({
                id: r.id,
                provider: r.institution ?? "unknown",
                name: r.name,
                iban: r.iban ?? undefined,
                currency: r.currencies?.code ?? "USD",
                createdAt: r.created_at.toISOString(),
            })),
            total,
        };
        res.json(body);
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
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
        const body = {
            id: r.id,
            provider: r.institution ?? "unknown",
            name: r.name,
            iban: r.iban ?? undefined,
            currency: r.currencies?.code ?? "USD",
            createdAt: r.created_at.toISOString(),
        };
        res.json(body);
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
    ensureDevSeed()
        .then(() => console.log(`[financial-svc] listening on :${port}`))
        .catch((e) => console.error("[financial-svc] dev seed error", e));
});
