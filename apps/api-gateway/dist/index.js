"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const prom_client_1 = __importDefault(require("prom-client"));
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("@ai/config");
const contracts_1 = require("@ai/contracts");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Metrics
const register = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({ register });
app.get("/api/financial/accounts/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const result = await financialClient.GET("/api/financial/accounts/{id}", {
            params: { path: { id } },
        });
        if (result.error) {
            res.status(502).json({ ok: false });
            return;
        }
        res.json(result.data ?? null);
    }
    catch (err) {
        res.status(502).json({ ok: false, error: err.message });
    }
});
app.get("/api/financial/clients", async (req, res) => {
    const email = typeof req.query.email === 'string' ? req.query.email : undefined;
    const name = typeof req.query.name === 'string' ? req.query.name : undefined;
    const pageStr = typeof req.query.page === 'string' ? req.query.page : undefined;
    const limitStr = typeof req.query.limit === 'string' ? req.query.limit : undefined;
    const page = pageStr ? parseInt(pageStr, 10) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    try {
        const query = (email || name || page || limit)
            ? { ...(email ? { email } : {}), ...(name ? { name } : {}), ...(page != null ? { page } : {}), ...(limit != null ? { limit } : {}) }
            : undefined;
        const result = await financialClient.GET("/api/financial/clients", {
            params: { query },
        });
        if (result.error) {
            res.status(502).json({ ok: false });
            return;
        }
        const data = result.data;
        res.json(data ?? { clients: [], total: 0 });
    }
    catch (err) {
        res.status(502).json({ ok: false, error: err.message });
    }
});
app.get("/api/financial/clients/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const result = await financialClient.GET("/api/financial/clients/{id}", {
            params: { path: { id } },
        });
        if (result.error) {
            res.status(502).json({ ok: false });
            return;
        }
        res.json(result.data ?? null);
    }
    catch (err) {
        res.status(502).json({ ok: false, error: err.message });
    }
});
app.get("/api/financial/invoices", async (req, res) => {
    const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const pageStr = typeof req.query.page === 'string' ? req.query.page : undefined;
    const limitStr = typeof req.query.limit === 'string' ? req.query.limit : undefined;
    const page = pageStr ? parseInt(pageStr, 10) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    try {
        const query = (clientId || status || page || limit)
            ? { ...(clientId ? { clientId } : {}), ...(status ? { status } : {}), ...(page != null ? { page } : {}), ...(limit != null ? { limit } : {}) }
            : undefined;
        const result = await financialClient.GET("/api/financial/invoices", {
            params: { query },
        });
        if (result.error) {
            res.status(502).json({ ok: false });
            return;
        }
        const data = result.data;
        res.json(data ?? { invoices: [], total: 0 });
    }
    catch (err) {
        res.status(502).json({ ok: false, error: err.message });
    }
});
app.get("/api/financial/invoices/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const result = await financialClient.GET("/api/financial/invoices/{id}", {
            params: { path: { id } },
        });
        if (result.error) {
            res.status(502).json({ ok: false });
            return;
        }
        res.json(result.data ?? null);
    }
    catch (err) {
        res.status(502).json({ ok: false, error: err.message });
    }
});
// DB and Redis clients
const pool = new pg_1.Pool({ connectionString: config_1.env.DATABASE_URL });
const redis = new ioredis_1.default(config_1.env.REDIS_URL);
app.get("/health/live", (_req, res) => {
    res.json({ ok: true });
});
app.get("/health/ready", async (_req, res) => {
    try {
        await pool.query("SELECT 1");
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
const financialSvcBase = process.env.FINANCIAL_SVC_URL || "http://financial-svc:3001";
const financialClient = (0, contracts_1.createAiServiceClient)(financialSvcBase);
app.get("/api/financial/accounts", async (req, res) => {
    const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
    const pageStr = typeof req.query.page === 'string' ? req.query.page : undefined;
    const limitStr = typeof req.query.limit === 'string' ? req.query.limit : undefined;
    const page = pageStr ? parseInt(pageStr, 10) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    try {
        const result = await financialClient.GET("/api/financial/accounts", {
            params: { query: (provider || page != null || limit != null) ? { ...(provider ? { provider } : {}), ...(page != null ? { page } : {}), ...(limit != null ? { limit } : {}) } : undefined },
        });
        if (result.error) {
            res.status(502).json({ ok: false });
            return;
        }
        const data = result.data;
        res.json(data ?? { accounts: [], total: 0 });
    }
    catch (err) {
        res.status(502).json({ ok: false, error: err.message });
    }
});
const port = config_1.env.PORT || 3000;
app.listen(port, () => {
    console.log(`[api-gateway] listening on :${port}`);
});
