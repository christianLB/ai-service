"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const ioredis_1 = __importDefault(require("ioredis"));
const client_1 = require("@prisma/client");
const dotenv = __importStar(require("dotenv"));
dotenv.config(); // Load .env file
const config_1 = require("@ai/config");
const crypto_1 = require("crypto");
const http_utils_1 = require("@ai/http-utils");
// @ts-ignore - package built locally
// import { createStandardObservability } from "@ai/observability";
// Import our financial services
const client_service_1 = require("./services/client.service");
const invoice_service_1 = require("./services/invoice.service");
const invoice_attachment_service_1 = require("./services/invoice-attachment.service");
const transaction_service_1 = require("./services/transaction.service");
const gocardless_service_1 = require("./services/gocardless.service");
const auth_1 = require("./middleware/auth");
// DB and Redis clients
const prisma = new client_1.PrismaClient();
const redis = new ioredis_1.default(config_1.env.REDIS_URL);
// Placeholder metrics for now (observability package not available in isolated service)
const metricsStub = {
    inc: (...args) => { },
    observe: (...args) => { },
    set: (...args) => { },
    reset: (...args) => { }
};
const transactionsProcessed = metricsStub;
const gocardlessSyncDuration = metricsStub;
const accountsTotal = metricsStub;
const invoicesTotal = metricsStub;
const clientsTotal = metricsStub;
const databaseOperations = metricsStub;
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Observability middleware disabled for now
// Add health endpoints directly
app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'financial-svc' });
});
app.get('/health/live', (_req, res) => {
    res.json({ ok: true });
});
app.get('/health/ready', async (_req, res) => {
    try {
        // Check database connection
        await prisma.$queryRaw `SELECT 1`;
        res.json({ ok: true });
    }
    catch (error) {
        res.status(503).json({ ok: false, error: 'Database not ready' });
    }
});
app.get('/metrics', (_req, res) => {
    res.type('text/plain; version=0.0.4');
    res.send(`# HELP service_info Service information
# TYPE service_info gauge
service_info{service="financial-svc"} 1
`);
});
// Function to update gauge metrics periodically
async function updateGaugeMetrics() {
    try {
        // Update accounts total by provider and type
        const accountStats = await prisma.accounts.groupBy({
            by: ['institution', 'type'],
            _count: { id: true }
        });
        // Clear previous values
        accountsTotal.reset();
        for (const stat of accountStats) {
            accountsTotal.set({ provider: stat.institution || 'unknown', type: stat.type || 'unknown' }, stat._count.id);
        }
        // Update invoices total by status
        const invoiceStats = await prisma.invoice.groupBy({
            by: ['status'],
            _count: { id: true }
        });
        invoicesTotal.reset();
        for (const stat of invoiceStats) {
            invoicesTotal.set({ status: stat.status }, stat._count.id);
        }
        // Update clients total by status
        const clientStats = await prisma.client.groupBy({
            by: ['status'],
            _count: { id: true }
        });
        clientsTotal.reset();
        for (const stat of clientStats) {
            clientsTotal.set({ status: stat.status }, stat._count.id);
        }
        databaseOperations.inc({ table: 'accounts', operation: 'group_by', status: 'success' });
        databaseOperations.inc({ table: 'invoices', operation: 'group_by', status: 'success' });
        databaseOperations.inc({ table: 'clients', operation: 'group_by', status: 'success' });
    }
    catch (error) {
        console.error('Failed to update gauge metrics:', error);
        databaseOperations.inc({ table: 'multiple', operation: 'group_by', status: 'error' });
    }
}
// Update metrics every 30 seconds
setInterval(updateGaugeMetrics, 30000);
// Initial update
updateGaugeMetrics();
// =============================================================================
// CLIENT ENDPOINTS
// =============================================================================
// Clients: list
app.get("/api/financial/clients", auth_1.authenticateToken, async (req, res) => {
    try {
        const email = typeof req.query.email === 'string' ? req.query.email : undefined;
        const name = typeof req.query.name === 'string' ? req.query.name : undefined;
        const userId = (0, auth_1.extractUserId)(req);
        const { page, limit, skip } = (0, http_utils_1.parsePagination)(req.query);
        const result = await client_service_1.clientService.getClients({
            userId,
            limit,
            offset: skip,
            search: email || name,
        });
        const body = {
            clients: result.data.clients.map(c => ({
                id: c.id,
                name: c.name,
                email: c.email,
                status: c.status,
                createdAt: c.createdAt.toISOString(),
            })),
            pagination: {
                total: result.data.total,
                page,
                limit,
            },
        };
        res.json(body);
    }
    catch (err) {
        const e = err;
        res.status(500).json({ ok: false, error: e.message });
    }
});
// Clients: get by id
app.get("/api/financial/clients/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const id = req.params.id;
        const result = await client_service_1.clientService.getClientById(id);
        const body = {
            id: result.data.client.id,
            name: result.data.client.name,
            email: result.data.client.email,
            status: result.data.client.status,
            createdAt: result.data.client.createdAt.toISOString(),
        };
        res.json(body);
    }
    catch (err) {
        const e = err;
        if (e.message.includes('not found')) {
            res.status(404).json({ ok: false, error: "Not found" });
        }
        else {
            res.status(500).json({ ok: false, error: e.message });
        }
    }
});
// Clients: create
app.post("/api/financial/clients", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = (0, auth_1.extractUserId)(req);
        const result = await client_service_1.clientService.createClient(req.body, userId);
        res.status(201).json(result);
    }
    catch (err) {
        const e = err;
        res.status(400).json({ ok: false, error: e.message });
    }
});
// Clients: update
app.put("/api/financial/clients/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const id = req.params.id;
        const userId = (0, auth_1.extractUserId)(req);
        const result = await client_service_1.clientService.updateClient(id, req.body, userId);
        res.json(result);
    }
    catch (err) {
        const e = err;
        if (e.message.includes('not found')) {
            res.status(404).json({ ok: false, error: "Not found" });
        }
        else {
            res.status(400).json({ ok: false, error: e.message });
        }
    }
});
// Clients: delete
app.delete("/api/financial/clients/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const id = req.params.id;
        const userId = (0, auth_1.extractUserId)(req);
        const result = await client_service_1.clientService.deleteClient(id, userId);
        res.json(result);
    }
    catch (err) {
        const e = err;
        if (e.message.includes('not found')) {
            res.status(404).json({ ok: false, error: "Not found" });
        }
        else {
            res.status(400).json({ ok: false, error: e.message });
        }
    }
});
// =============================================================================
// INVOICE ENDPOINTS
// =============================================================================
// Invoices: list
app.get("/api/financial/invoices", async (req, res) => {
    try {
        const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const userId = (0, auth_1.extractUserId)(req);
        const { page, limit, skip } = (0, http_utils_1.parsePagination)(req.query);
        const result = await invoice_service_1.invoiceService.getInvoices({
            userId,
            limit,
            offset: skip,
            clientId,
            status,
        });
        const body = {
            invoices: result.data.invoices.map(i => ({
                id: i.id,
                invoiceNumber: i.invoiceNumber,
                clientId: i.clientId ?? undefined,
                status: i.status,
                total: Number(i.total),
                issueDate: i.issueDate.toISOString().slice(0, 10),
            })),
            total: result.data.total,
            page,
            limit,
        };
        res.json(body);
    }
    catch (err) {
        const e = err;
        res.status(500).json({ ok: false, error: e.message });
    }
});
// Invoices: get by id
app.get("/api/financial/invoices/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const result = await invoice_service_1.invoiceService.getInvoiceById(id);
        const body = {
            id: result.data.invoice.id,
            invoiceNumber: result.data.invoice.invoiceNumber,
            clientId: result.data.invoice.clientId ?? undefined,
            status: result.data.invoice.status,
            total: Number(result.data.invoice.total),
            issueDate: result.data.invoice.issueDate.toISOString().slice(0, 10),
        };
        res.json(body);
    }
    catch (err) {
        const e = err;
        if (e.message.includes('not found')) {
            res.status(404).json({ ok: false, error: "Not found" });
        }
        else {
            res.status(500).json({ ok: false, error: e.message });
        }
    }
});
// Invoices: create
app.post("/api/financial/invoices", async (req, res) => {
    try {
        const userId = (0, auth_1.extractUserId)(req);
        const result = await invoice_service_1.invoiceService.createInvoice(req.body, userId);
        res.status(201).json(result);
    }
    catch (err) {
        const e = err;
        res.status(400).json({ ok: false, error: e.message });
    }
});
// Invoices: update
app.put("/api/financial/invoices/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const userId = (0, auth_1.extractUserId)(req);
        const result = await invoice_service_1.invoiceService.updateInvoice(id, req.body, userId);
        res.json(result);
    }
    catch (err) {
        const e = err;
        if (e.message.includes('not found')) {
            res.status(404).json({ ok: false, error: "Not found" });
        }
        else {
            res.status(400).json({ ok: false, error: e.message });
        }
    }
});
// Invoices: delete
app.delete("/api/financial/invoices/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const userId = (0, auth_1.extractUserId)(req);
        const result = await invoice_service_1.invoiceService.deleteInvoice(id, userId);
        res.json(result);
    }
    catch (err) {
        const e = err;
        if (e.message.includes('not found')) {
            res.status(404).json({ ok: false, error: "Not found" });
        }
        else {
            res.status(400).json({ ok: false, error: e.message });
        }
    }
});
// =============================================================================
// TRANSACTION ENDPOINTS
// =============================================================================
// Transactions: list
app.get("/api/financial/transactions", async (req, res) => {
    try {
        const { page, limit, skip } = (0, http_utils_1.parsePagination)(req.query);
        // Parse query parameters
        const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
        const type = typeof req.query.type === 'string' ? req.query.type : undefined;
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
        const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;
        const minAmount = typeof req.query.minAmount === 'string' ? parseFloat(req.query.minAmount) : undefined;
        const maxAmount = typeof req.query.maxAmount === 'string' ? parseFloat(req.query.maxAmount) : undefined;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const result = await transaction_service_1.transactionService.getTransactions({
            accountId,
            type,
            status,
            dateFrom,
            dateTo,
            minAmount,
            maxAmount,
            search,
            limit,
            offset: skip,
        });
        const body = {
            transactions: result.data.transactions,
            total: result.data.total,
            page,
            limit,
            stats: result.data.summary,
        };
        res.json(body);
    }
    catch (err) {
        const e = err;
        res.status(500).json({ message: e.message, code: 'INTERNAL_ERROR' });
    }
});
// Transactions: get by id
app.get("/api/financial/transactions/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const result = await transaction_service_1.transactionService.getTransactionById(id);
        res.json(result.data.transaction);
    }
    catch (err) {
        const e = err;
        if (e.message.includes('not found')) {
            res.status(404).json({ message: 'Transaction not found', code: 'NOT_FOUND' });
        }
        else {
            res.status(500).json({ message: e.message, code: 'INTERNAL_ERROR' });
        }
    }
});
// Transactions: export
app.get("/api/financial/transactions/export", async (req, res) => {
    try {
        const format = typeof req.query.format === 'string' ? req.query.format : 'csv';
        const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
        const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
        const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;
        const result = await transaction_service_1.transactionService.exportTransactions({
            accountId,
            dateFrom,
            dateTo,
        }, format);
        if (format === 'json') {
            res.json(result.data);
        }
        else {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
            res.send(result.data);
        }
    }
    catch (err) {
        const e = err;
        res.status(500).json({ message: e.message, code: 'INTERNAL_ERROR' });
    }
});
// =============================================================================
// INVOICE ATTACHMENT ENDPOINTS
// =============================================================================
// Attachments: list
app.get("/api/financial/attachments", async (req, res) => {
    try {
        const { page, limit, skip } = (0, http_utils_1.parsePagination)(req.query);
        const invoiceId = typeof req.query.invoiceId === 'string' ? req.query.invoiceId : undefined;
        const fileType = typeof req.query.fileType === 'string' ? req.query.fileType : undefined;
        const result = await invoice_attachment_service_1.invoiceAttachmentService.getAttachments({
            invoiceId,
            fileType,
            limit,
            offset: skip,
        });
        const body = {
            attachments: result.data.attachments.map(a => ({
                id: a.id,
                invoiceId: a.invoiceId,
                fileName: a.fileName,
                filePath: a.filePath,
                fileSize: Number(a.fileSize),
                fileType: a.fileType,
                description: a.description,
                uploadedBy: a.uploadedBy,
                uploadedAt: a.uploadedAt.toISOString(),
                isDeleted: a.isDeleted,
                deletedAt: a.deletedAt?.toISOString(),
                deletedBy: a.deletedBy,
            })),
            total: result.data.total,
            page,
            limit,
        };
        res.json(body);
    }
    catch (err) {
        const e = err;
        res.status(500).json({ message: e.message, code: 'INTERNAL_ERROR' });
    }
});
// Attachments: get by id
app.get("/api/financial/attachments/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const result = await invoice_attachment_service_1.invoiceAttachmentService.getAttachmentById(id);
        const body = {
            id: result.data.attachment.id,
            invoiceId: result.data.attachment.invoiceId,
            fileName: result.data.attachment.fileName,
            filePath: result.data.attachment.filePath,
            fileSize: Number(result.data.attachment.fileSize),
            fileType: result.data.attachment.fileType,
            description: result.data.attachment.description,
            uploadedBy: result.data.attachment.uploadedBy,
            uploadedAt: result.data.attachment.uploadedAt.toISOString(),
            isDeleted: result.data.attachment.isDeleted,
            deletedAt: result.data.attachment.deletedAt?.toISOString(),
            deletedBy: result.data.attachment.deletedBy,
        };
        res.json(body);
    }
    catch (err) {
        const e = err;
        if (e.message.includes('not found')) {
            res.status(404).json({ message: 'Attachment not found', code: 'NOT_FOUND' });
        }
        else {
            res.status(500).json({ message: e.message, code: 'INTERNAL_ERROR' });
        }
    }
});
// =============================================================================
// GOCARDLESS ENDPOINTS
// =============================================================================
// GoCardless: sync accounts
app.post("/api/financial/gocardless/sync/accounts", async (_req, res) => {
    const startTime = Date.now();
    try {
        const result = await gocardless_service_1.goCardlessService.syncAccounts();
        const duration = (Date.now() - startTime) / 1000;
        gocardlessSyncDuration.observe({ operation: 'sync_accounts', status: 'success' }, duration);
        res.json({ ok: true, count: result.count, errors: result.errors });
    }
    catch (err) {
        const duration = (Date.now() - startTime) / 1000;
        gocardlessSyncDuration.observe({ operation: 'sync_accounts', status: 'error' }, duration);
        const e = err;
        res.status(500).json({ ok: false, error: e.message });
    }
});
// GoCardless: sync transactions for a given account
app.post("/api/financial/gocardless/sync/transactions", async (req, res) => {
    const startTime = Date.now();
    try {
        const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : undefined;
        if (!accountId) {
            return res.status(400).json({ message: "accountId is required", code: "BAD_REQUEST" });
        }
        const result = await gocardless_service_1.goCardlessService.syncTransactions(accountId);
        const duration = (Date.now() - startTime) / 1000;
        gocardlessSyncDuration.observe({ operation: 'sync_transactions', status: 'success' }, duration);
        res.json({ ok: true, count: result.count, errors: result.errors });
    }
    catch (err) {
        const duration = (Date.now() - startTime) / 1000;
        gocardlessSyncDuration.observe({ operation: 'sync_transactions', status: 'error' }, duration);
        const e = err;
        res.status(500).json({ ok: false, error: e.message });
    }
});
// GoCardless: full sync
app.post("/api/financial/gocardless/sync/full", async (_req, res) => {
    const startTime = Date.now();
    try {
        const result = await gocardless_service_1.goCardlessService.fullSync();
        const duration = (Date.now() - startTime) / 1000;
        gocardlessSyncDuration.observe({ operation: 'full_sync', status: 'success' }, duration);
        res.json({
            ok: true,
            accountsCount: result.accountsCount,
            transactionsCount: result.transactionsCount,
            errors: result.errors
        });
    }
    catch (err) {
        const duration = (Date.now() - startTime) / 1000;
        gocardlessSyncDuration.observe({ operation: 'full_sync', status: 'error' }, duration);
        const e = err;
        res.status(500).json({ ok: false, error: e.message });
    }
});
// GoCardless: test connection
app.get("/api/financial/gocardless/test", async (_req, res) => {
    try {
        const result = await gocardless_service_1.goCardlessService.testConnection();
        res.json(result);
    }
    catch (err) {
        const e = err;
        res.status(500).json({ ok: false, error: e.message });
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
                    account_id: true,
                    institution: true,
                    name: true,
                    type: true,
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
                account_id: r.account_id ?? `acc_${r.id}`,
                name: r.name,
                type: r.type ?? "checking",
                institution: r.institution ?? undefined,
                iban: r.iban ?? undefined,
                currency: r.currencies?.code ?? undefined,
                balance: 0,
                created_at: r.created_at.toISOString(),
            })),
            total,
            page,
            limit,
        };
        res.json(body);
    }
    catch (err) {
        const e = err;
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
                account_id: true,
                institution: true,
                name: true,
                type: true,
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
            account_id: r.account_id ?? `acc_${r.id}`,
            name: r.name,
            type: r.type ?? "checking",
            institution: r.institution ?? undefined,
            iban: r.iban ?? undefined,
            currency: r.currencies?.code ?? undefined,
            created_at: r.created_at.toISOString(),
        };
        res.json(body);
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
// =============================================================================
// DEV SEED & STARTUP
// =============================================================================
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
const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
    ensureDevSeed()
        .then(() => console.log(`[financial-svc] listening on :${port}`))
        .catch((e) => console.error("[financial-svc] dev seed error", e));
});
