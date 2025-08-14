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
const http_utils_1 = require("@ai/http-utils");
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
                    id: (0, crypto_1.randomUUID)(),
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
                        id: (0, crypto_1.randomUUID)(),
                        invoiceNumber: `INV-${Date.now()}`,
                        clientId: c.id,
                        clientName: c.name,
                        clientTaxId: c.taxId,
                        status: "draft",
                        total: new client_1.Prisma.Decimal(100),
                        issueDate,
                        dueDate,
                        userId: demoUser.id,
                    },
                });
            }
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
app.get("/api/financial/clients", async (req, res) => {
    const email = typeof req.query.email === 'string' ? req.query.email : undefined;
    const name = typeof req.query.name === 'string' ? req.query.name : undefined;
    try {
        const { page, limit, skip } = (0, http_utils_1.parsePagination)(req.query);
        const where = {};
        if (email)
            where.email = { contains: email, mode: client_1.Prisma.QueryMode.insensitive };
        if (name)
            where.name = { contains: name, mode: client_1.Prisma.QueryMode.insensitive };
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
        const body = {
            clients: rows.map(r => ({
                id: r.id,
                name: r.name,
                email: r.email,
                status: r.status,
                createdAt: r.createdAt.toISOString(),
            })),
            total,
            page,
            limit,
        };
        res.json(body);
    }
    catch (err) {
        const e = err;
        if (e.statusCode === 400)
            return res.status(400).json({ message: e.message });
        res.status(500).json({ ok: false, error: e.message });
    }
});
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
        const body = {
            id: r.id,
            name: r.name,
            email: r.email,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
        };
        res.json(body);
    }
    catch (err) {
        const e = err;
        if (e.statusCode === 400)
            return res.status(400).json({ message: e.message });
        res.status(500).json({ ok: false, error: e.message });
    }
});
app.get("/api/financial/invoices", async (req, res) => {
    const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    try {
        const { page, limit, skip } = (0, http_utils_1.parsePagination)(req.query);
        const where = {};
        if (clientId)
            where.clientId = clientId;
        if (status)
            where.status = status;
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
        const body = {
            invoices: rows.map(r => ({
                id: r.id,
                invoiceNumber: r.invoiceNumber,
                clientId: r.clientId ?? undefined,
                status: r.status,
                total: Number(r.total),
                issueDate: r.issueDate.toISOString().slice(0, 10),
            })),
            total,
            page,
            limit,
        };
        res.json(body);
    }
    catch (err) {
        const e = err;
        if (e.statusCode === 400)
            return res.status(400).json({ message: e.message });
        res.status(500).json({ ok: false, error: e.message });
    }
});
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
        const body = {
            id: r.id,
            invoiceNumber: r.invoiceNumber,
            clientId: r.clientId ?? undefined,
            status: r.status,
            total: Number(r.total),
            issueDate: r.issueDate.toISOString().slice(0, 10),
        };
        res.json(body);
    }
    catch (err) {
        const e = err;
        if (e.statusCode === 400)
            return res.status(400).json({ message: e.message });
        res.status(500).json({ ok: false, error: e.message });
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
        const { page, limit, skip } = (0, http_utils_1.parsePagination)(req.query);
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
            page,
            limit,
        };
        res.json(body);
    }
    catch (err) {
        const e = err;
        if (e.statusCode === 400)
            return res.status(400).json({ message: e.message });
        res.status(500).json({ ok: false, error: e.message });
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
