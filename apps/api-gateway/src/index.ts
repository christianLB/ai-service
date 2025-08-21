import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Helper function to parse pagination query parameters
function parsePaginationQuery(query: any): { page?: number; limit?: number } {
  const pageStr = typeof query.page === 'string' ? query.page : undefined;
  const limitStr = typeof query.limit === 'string' ? query.limit : undefined;
  const page = pageStr ? parseInt(pageStr, 10) : undefined;
  const limit = limitStr ? parseInt(limitStr, 10) : undefined;
  return { page, limit };
}

// Helper function to handle proxy errors with status preservation
function handleProxyError(err: any, res: express.Response, service?: string, endpoint?: string): void {
  const error = err as Error & { statusCode?: number };
  
  // Record error metrics
  if (service && endpoint) {
    proxyRequestsTotal.inc({ service, endpoint, status: 'error' });
  }
  
  // Preserve status code from upstream service
  if (error.statusCode) {
    res.status(error.statusCode).json({ 
      message: error.message,
      code: error.statusCode === 400 ? 'BAD_REQUEST' : 'ERROR'
    });
  } else {
    // Default to 502 for network/proxy errors
    res.status(502).json({ 
      message: error.message || 'Gateway error',
      code: 'GATEWAY_ERROR'
    });
  }
}

// Helper function to time proxy requests
async function timedProxyRequest<T>(
  service: string,
  endpoint: string,
  requestFn: () => Promise<T>
): Promise<T> {
  return await metricsRegistry!.timeFunction(
    'proxy_request_duration_seconds',
    requestFn,
    { service, endpoint }
  );
}

// Financial service base/client (available for routes below)
const financialSvcBase = process.env.FINANCIAL_SVC_URL || "http://financial-svc:3001";
const financialClient = createAiServiceClient(financialSvcBase);

// CSRF token endpoint for frontend axios interceptor compatibility
app.get("/api/csrf-token", (_req, res) => {
  csrfTokensGenerated.inc();
  const token = crypto.randomBytes(16).toString("hex");
  res.cookie("x-csrf-token", token, {
    httpOnly: false,
    sameSite: "lax",
    secure: false,
    path: "/",
  });
  res.json({ csrfToken: token });
});

// Proxy: get account by id
type GetAccount200 = AiServicePaths["/api/financial/accounts/{id}"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/accounts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await timedProxyRequest('financial-svc', 'accounts/{id}', async () => {
      // @ts-ignore - contract type mismatch
      return await financialClient.GET("/api/financial/accounts/{id}" as const, {
        params: { path: { id } },
      });
    });
    
    if (!result.data) {
      const status = result.response?.status || 502;
      proxyRequestsTotal.inc({ service: 'financial-svc', endpoint: 'accounts/{id}', status: String(status) });
      
      if (status === 404) {
        res.status(404).json({ 
          message: 'Account not found',
          code: 'NOT_FOUND'
        });
      } else if (status === 400) {
        res.status(400).json({ 
          message: 'Invalid account ID',
          code: 'BAD_REQUEST'
        });
      } else {
        res.status(502).json({ 
          message: 'Service unavailable',
          code: 'GATEWAY_ERROR'
        });
      }
      return;
    }
    
    proxyRequestsTotal.inc({ service: 'financial-svc', endpoint: 'accounts/{id}', status: '200' });
    res.json(result.data as GetAccount200);
  } catch (err) {
    handleProxyError(err, res, 'financial-svc', 'accounts/{id}');
  }
});

// Proxy: list clients
type ListClients200 = AiServicePaths["/api/financial/clients"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/clients", async (req, res) => {
  const email = typeof req.query.email === 'string' ? req.query.email : undefined;
  const name = typeof req.query.name === 'string' ? req.query.name : undefined;
  const { page, limit } = parsePaginationQuery(req.query);
  
  try {
    type ClientsQuery = { email?: string; name?: string; page?: number; limit?: number };
    const query: ClientsQuery | undefined = (email || name || page != null || limit != null)
      ? { ...(email ? { email } : {}), ...(name ? { name } : {}), ...(page != null ? { page } : {}), ...(limit != null ? { limit } : {}) }
      : undefined;
      
    // @ts-ignore - contract type mismatch
    const result = await financialClient.GET("/api/financial/clients" as const, {
      params: { query },
    });
    
    if (!result.data) {
      const status = result.response?.status || 502;
      if (status === 400) {
        res.status(400).json({ 
          message: result.error ? (result.error as any)?.message || 'Invalid request parameters' : 'Invalid request parameters',
          code: 'BAD_REQUEST'
        });
      } else {
        res.status(502).json({ 
          message: 'Service unavailable',
          code: 'GATEWAY_ERROR'
        });
      }
      return;
    }
    
    const data = result.data as ListClients200;
    res.json(data ?? { clients: [], total: 0, page: 1, limit: 20 });
  } catch (err) {
    handleProxyError(err, res);
  }
});

// Proxy: get client by id
type GetClient200 = AiServicePaths["/api/financial/clients/{id}"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/clients/:id", async (req, res) => {
  try {
    const id = req.params.id;
    // @ts-ignore - contract type mismatch
    const result = await financialClient.GET("/api/financial/clients/{id}" as const, {
      params: { path: { id } },
    });
    
    if (!result.data) {
      const status = result.response?.status || 502;
      if (status === 404) {
        res.status(404).json({ 
          message: 'Client not found',
          code: 'NOT_FOUND'
        });
      } else if (status === 400) {
        res.status(400).json({ 
          message: 'Invalid client ID',
          code: 'BAD_REQUEST'
        });
      } else {
        res.status(502).json({ 
          message: 'Service unavailable',
          code: 'GATEWAY_ERROR'
        });
      }
      return;
    }
    
    res.json(result.data as GetClient200);
  } catch (err) {
    handleProxyError(err, res);
  }
});

// Proxy: list invoices
type ListInvoices200 = AiServicePaths["/api/financial/invoices"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/invoices", async (req, res) => {
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const { page, limit } = parsePaginationQuery(req.query);
  
  try {
    type InvoicesQuery = { clientId?: string; status?: string; page?: number; limit?: number };
    const query: InvoicesQuery | undefined = (clientId || status || page != null || limit != null)
      ? { ...(clientId ? { clientId } : {}), ...(status ? { status } : {}), ...(page != null ? { page } : {}), ...(limit != null ? { limit } : {}) }
      : undefined;
      
    // @ts-ignore - contract type mismatch
    const result = await financialClient.GET("/api/financial/invoices" as const, {
      params: { query },
    });
    
    if (!result.data) {
      const status = result.response?.status || 502;
      if (status === 400) {
        res.status(400).json({ 
          message: result.error ? (result.error as any)?.message || 'Invalid request parameters' : 'Invalid request parameters',
          code: 'BAD_REQUEST'
        });
      } else {
        res.status(502).json({ 
          message: 'Service unavailable',
          code: 'GATEWAY_ERROR'
        });
      }
      return;
    }
    
    const data = result.data as ListInvoices200;
    res.json(data ?? { invoices: [], total: 0, page: 1, limit: 20 });
  } catch (err) {
    handleProxyError(err, res);
  }
});

// Proxy: get invoice by id
type GetInvoice200 = AiServicePaths["/api/financial/invoices/{id}"]["get"]["responses"][200]["content"]["application/json"];
app.get("/api/financial/invoices/:id", async (req, res) => {
  try {
    const id = req.params.id;
    // @ts-ignore - contract type mismatch
    const result = await financialClient.GET("/api/financial/invoices/{id}" as const, {
      params: { path: { id } },
    });
    
    if (!result.data) {
      const status = result.response?.status || 502;
      if (status === 404) {
        res.status(404).json({ 
          message: 'Invoice not found',
          code: 'NOT_FOUND'
        });
      } else if (status === 400) {
        res.status(400).json({ 
          message: 'Invalid invoice ID',
          code: 'BAD_REQUEST'
        });
      } else {
        res.status(502).json({ 
          message: 'Service unavailable',
          code: 'GATEWAY_ERROR'
        });
      }
      return;
    }
    
    res.json(result.data as GetInvoice200);
  } catch (err) {
    handleProxyError(err, res);
  }
});

// Proxy: list transactions (use fetch to avoid contract type gaps)
app.get("/api/financial/transactions", async (req, res) => {
  try {
    const { page, limit } = parsePaginationQuery(req.query);
    const params = new URLSearchParams();
    if (page != null) params.set("page", String(page));
    if (limit != null) params.set("limit", String(limit));
    const keys = ["accountId","type","status","dateFrom","dateTo","minAmount","maxAmount","search"] as const;
    for (const k of keys) {
      const v = typeof (req.query as any)[k] === 'string' ? (req.query as any)[k] : undefined;
      if (v) params.set(k, v);
    }
    const url = `${financialSvcBase}/api/financial/transactions${params.toString() ? `?${params.toString()}` : ''}`;
    const r = await fetch(url);
    if (!r.ok) {
      const msg = await r.text();
      return res.status(r.status).json({ message: msg || 'Service unavailable', code: r.status === 400 ? 'BAD_REQUEST' : 'GATEWAY_ERROR' });
    }
    const data = await r.json();
    res.json(data ?? { transactions: [], total: 0, page: 1, limit: 20 });
  } catch (err) {
    handleProxyError(err, res);
  }
});

// Proxy: get transaction by id
app.get("/api/financial/transactions/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const r = await fetch(`${financialSvcBase}/api/financial/transactions/${encodeURIComponent(id)}`);
    if (!r.ok) {
      const msg = await r.text();
      const status = r.status;
      if (status === 404) return res.status(404).json({ message: 'Transaction not found', code: 'NOT_FOUND' });
      if (status === 400) return res.status(400).json({ message: 'Invalid transaction ID', code: 'BAD_REQUEST' });
      return res.status(502).json({ message: msg || 'Service unavailable', code: 'GATEWAY_ERROR' });
    }
    const data = await r.json();
    res.json(data);
  } catch (err) {
    handleProxyError(err, res);
  }
});

// Proxy: export transactions
app.get("/api/financial/transactions/export", async (req, res) => {
  try {
    const format = typeof req.query.format === 'string' ? req.query.format : 'csv';
    const params = new URLSearchParams();
    params.set('format', format);
    const keys = ["accountId","dateFrom","dateTo"] as const;
    for (const k of keys) {
      const v = typeof (req.query as any)[k] === 'string' ? (req.query as any)[k] : undefined;
      if (v) params.set(k, v);
    }
    const r = await fetch(`${financialSvcBase}/api/financial/transactions/export?${params.toString()}`);
    if (!r.ok) {
      const msg = await r.text();
      return res.status(r.status === 400 ? 400 : 502).json({ message: msg || 'Invalid request parameters', code: r.status === 400 ? 'BAD_REQUEST' : 'GATEWAY_ERROR' });
    }
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
      const text = await r.text();
      return res.send(text);
    }
    const data = await r.json();
    res.json(data);
  } catch (err) {
    handleProxyError(err, res);
  }
});

// Proxy: list attachments
app.get("/api/financial/attachments", async (req, res) => {
  try {
    const { page, limit } = parsePaginationQuery(req.query);
    const params = new URLSearchParams();
    if (page != null) params.set('page', String(page));
    if (limit != null) params.set('limit', String(limit));
    const keys = ["invoiceId","fileType"] as const;
    for (const k of keys) {
      const v = typeof (req.query as any)[k] === 'string' ? (req.query as any)[k] : undefined;
      if (v) params.set(k, v);
    }
    const r = await fetch(`${financialSvcBase}/api/financial/attachments${params.toString() ? `?${params.toString()}` : ''}`);
    if (!r.ok) {
      const msg = await r.text();
      return res.status(r.status === 400 ? 400 : 502).json({ message: msg || 'Invalid request parameters', code: r.status === 400 ? 'BAD_REQUEST' : 'GATEWAY_ERROR' });
    }
    const data = await r.json();
    res.json(data ?? { attachments: [], total: 0, page: 1, limit: 20 });
  } catch (err) {
    handleProxyError(err, res);
  }
});

// Proxy: get attachment by id
app.get("/api/financial/attachments/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const r = await fetch(`${financialSvcBase}/api/financial/attachments/${encodeURIComponent(id)}`);
    if (!r.ok) {
      const msg = await r.text();
      const status = r.status;
      if (status === 404) return res.status(404).json({ message: 'Attachment not found', code: 'NOT_FOUND' });
      if (status === 400) return res.status(400).json({ message: 'Invalid attachment ID', code: 'BAD_REQUEST' });
      return res.status(502).json({ message: msg || 'Service unavailable', code: 'GATEWAY_ERROR' });
    }
    const data = await r.json();
    res.json(data);
  } catch (err) {
    handleProxyError(err, res);
  }
});



// ------------------------------------------------------------
// Integrations API (DB-backed config storage with encryption)
// Base path: /api/integrations
// ------------------------------------------------------------

type IntegrationConfigRow = {
  id: string;
  user_id: string | null;
  integration_type: string;
  config_key: string;
  config_value: string;
  is_encrypted: boolean;
  is_global: boolean;
  description: string | null;
  metadata: unknown | null;
  created_at: string;
  updated_at: string | null;
};

function getEncryptionKey(): Buffer {
  const keySource = process.env.INTEGRATION_CONFIG_KEY || process.env.JWT_SECRET || "default-encryption-key-32-chars!!";
  return crypto.scryptSync(keySource, "salt", 32);
}

function encrypt(value: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", getEncryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${enc.toString("hex")}`;
}

function decrypt(stored: string): string {
  const [ivHex, dataHex] = stored.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", getEncryptionKey(), iv);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

// GET /api/integrations/types?category=integrations
// Provide at least gocardless with expected keys
app.get("/api/integrations/types", async (_req, res) => {
  try {
    integrationConfigOps.inc({ operation: 'list_types', integration_type: 'all', status: 'success' });
    const types = [
      {
        type: "gocardless",
        name: "GoCardless",
        description: "Bank Account Data (Nordigen) via GoCardless",
        configKeys: [
          { key: "secret_id", required: true, encrypted: true, description: "GoCardless Secret ID" },
          { key: "secret_key", required: true, encrypted: true, description: "GoCardless Secret Key" },
          { key: "base_url", required: false, encrypted: false, description: "API Base URL (optional)" },
        ],
      },
      {
        type: "openai",
        name: "OpenAI",
        description: "OpenAI API",
        configKeys: [
          { key: "api_key", required: true, encrypted: true, description: "OpenAI API Key" },
        ],
      },
      {
        type: "claude",
        name: "Anthropic Claude",
        description: "Anthropic API",
        configKeys: [
          { key: "api_key", required: true, encrypted: true, description: "Claude API Key" },
        ],
      },
      {
        type: "email",
        name: "Email",
        description: "SMTP / Email Integration",
        configKeys: [
          { key: "smtp_host", required: true, encrypted: false, description: "SMTP Host" },
          { key: "smtp_user", required: true, encrypted: false, description: "SMTP User" },
          { key: "smtp_pass", required: true, encrypted: true, description: "SMTP Password" },
        ],
      },
    ];
    // For now, return all regardless of category; frontend passes 'integrations'
    res.json({ success: true, data: types });
  } catch (err) {
    integrationConfigOps.inc({ operation: 'list_types', integration_type: 'all', status: 'error' });
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// GET /api/integrations/configs
app.get("/api/integrations/configs", async (req, res) => {
  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const integrationType = typeof req.query.integrationType === "string" ? req.query.integrationType : undefined;
    const params: any[] = [];
    let q = "SELECT * FROM financial.integration_configs WHERE 1=1";
    if (userId) {
      q += " AND user_id = $" + (params.push(userId));
    }
    if (integrationType) {
      q += " AND integration_type = $" + (params.push(integrationType));
    }
    q += " ORDER BY integration_type, config_key";
    const { rows } = await pool.query<IntegrationConfigRow>(q, params);
    res.json({ success: true, data: rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      integrationType: r.integration_type,
      configKey: r.config_key,
      configValue: r.is_encrypted ? "***CONFIGURED***" : r.config_value,
      isEncrypted: r.is_encrypted,
      isGlobal: r.is_global,
      description: r.description,
      metadata: r.metadata,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })) });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// GET /api/integrations/configs/:type/:key
app.get("/api/integrations/configs/:type/:key", async (req, res) => {
  try {
    const type = req.params.type;
    const key = req.params.key;
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const params: any[] = [type, key];
    let q = "SELECT * FROM financial.integration_configs WHERE integration_type = $1 AND config_key = $2";
    if (userId) {
      q += " AND user_id = $3";
      params.push(userId);
    } else {
      q += " AND user_id IS NULL AND is_global = true";
    }
    const { rows } = await pool.query<IntegrationConfigRow>(q, params);
    if (rows.length === 0) return res.status(404).json({ success: false, message: "Config not found" });
    const r = rows[0];
    const value = r.is_encrypted ? "***CONFIGURED***" : r.config_value;
    res.json({ success: true, data: { value } });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// POST /api/integrations/configs
app.post("/api/integrations/configs", async (req, res) => {
  try {
    const { integrationType, configKey, configValue, userId, isGlobal, description, encrypt } = req.body || {};
    if (!integrationType || !configKey) {
      return res.status(400).json({ success: false, message: "integrationType and configKey are required" });
    }
    const finalValue = encrypt ? encryptValue(configValue) : String(configValue ?? "");

    // Upsert logic for global vs user-specific
    let q: string;
    let params: any[];
    if (isGlobal && !userId) {
      q = `
        INSERT INTO financial.integration_configs (
          user_id, integration_type, config_key, config_value, is_encrypted, is_global, description, metadata
        ) VALUES (NULL, $1, $2, $3, $4, true, $5, '{}'::jsonb)
        ON CONFLICT (integration_type, config_key)
        WHERE user_id IS NULL AND is_global = true
        DO UPDATE SET config_value = EXCLUDED.config_value, is_encrypted = EXCLUDED.is_encrypted,
          description = EXCLUDED.description, updated_at = NOW()
      `;
      params = [integrationType, configKey, finalValue, !!encrypt, description ?? null];
    } else {
      q = `
        INSERT INTO financial.integration_configs (
          user_id, integration_type, config_key, config_value, is_encrypted, is_global, description, metadata
        ) VALUES ($1, $2, $3, $4, $5, false, $6, '{}'::jsonb)
        ON CONFLICT (user_id, integration_type, config_key)
        DO UPDATE SET config_value = EXCLUDED.config_value, is_encrypted = EXCLUDED.is_encrypted,
          description = EXCLUDED.description, updated_at = NOW()
      `;
      params = [userId ?? null, integrationType, configKey, finalValue, !!encrypt, description ?? null];
    }
    await pool.query(q, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }

  function encryptValue(v: string): string {
    if (typeof v !== "string" || v.length === 0) return "";
    return encrypt(v);
  }
});

// PUT /api/integrations/configs/:type/:key
app.put("/api/integrations/configs/:type/:key", async (req, res) => {
  try {
    const type = req.params.type;
    const key = req.params.key;
    const { configValue, userId, description } = req.body || {};
    const isEncrypted = false; // PUT is plain unless you send encrypted yourself
    const params: any[] = [configValue ?? "", description ?? null, type, key];
    let q = `
      UPDATE financial.integration_configs
      SET config_value = $1, description = $2, is_encrypted = $3, updated_at = NOW()
      WHERE integration_type = $4 AND config_key = $5 AND user_id IS NULL AND is_global = true
    `;
    params.splice(2, 0, isEncrypted);
    if (userId) {
      q = `
        UPDATE financial.integration_configs
        SET config_value = $1, description = $2, is_encrypted = $3, updated_at = NOW()
        WHERE integration_type = $4 AND config_key = $5 AND user_id = $6
      `;
      params.push(userId);
    }
    const result = await pool.query(q, params);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Config not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// DELETE /api/integrations/configs/:type/:key
app.delete("/api/integrations/configs/:type/:key", async (req, res) => {
  try {
    const type = req.params.type;
    const key = req.params.key;
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const params: any[] = [type, key];
    let q = `DELETE FROM financial.integration_configs WHERE integration_type = $1 AND config_key = $2`;
    if (userId) {
      q += ` AND user_id = $3`;
      params.push(userId);
    } else {
      q += ` AND user_id IS NULL AND is_global = true`;
    }
    const result = await pool.query(q, params);
    res.json({ success: true, deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// POST /api/integrations/test/:type - basic validation stub
app.post("/api/integrations/test/:type", async (req, res) => {
  try {
    const type = req.params.type;
    const configs = (req.body && req.body.configs) || {};
    if (type === "gocardless") {
      const sid = configs.secret_id || configs.SECRET_ID;
      const sk = configs.secret_key || configs.SECRET_KEY;
      if (!sid || !sk) return res.status(400).json({ success: false, data: { integrationType: type, isValid: false, message: "Missing secret_id/secret_key" } });
      return res.json({ success: true, data: { integrationType: type, isValid: true, message: "Credentials look valid (format check)" } });
    }
    return res.json({ success: true, data: { integrationType: type, isValid: true, message: "OK" } });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// GoCardless sync proxies
app.post("/api/financial/gocardless/sync/accounts", async (_req, res) => {
  try {
    const r = await fetch(`${financialSvcBase}/api/financial/gocardless/sync/accounts`, { method: 'POST' });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text || 'Sync accounts failed');
    try { return res.json(JSON.parse(text)); } catch { return res.send(text); }
  } catch (err) {
    handleProxyError(err, res);
  }
});

app.post("/api/financial/gocardless/sync/transactions", async (req, res) => {
  try {
    const body = JSON.stringify({ accountId: req.body?.accountId });
    const r = await fetch(`${financialSvcBase}/api/financial/gocardless/sync/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text || 'Sync transactions failed');
    try { return res.json(JSON.parse(text)); } catch { return res.send(text); }
  } catch (err) {
    handleProxyError(err, res);
  }
});

// Contract-first endpoint proxied to financial-svc
type ListAccounts200 = AiServicePaths["/api/financial/accounts"]["get"]["responses"][200]["content"]["application/json"];

app.get("/api/financial/accounts", async (req, res) => {
  const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
  const { page, limit } = parsePaginationQuery(req.query);
  
  try {
    // @ts-ignore - contract type mismatch
    const result = await financialClient.GET("/api/financial/accounts" as const, {
      params: { 
        query: (provider || page != null || limit != null) 
          ? { ...(provider ? { provider } : {}), ...(page != null ? { page } : {}), ...(limit != null ? { limit } : {}) } 
          : undefined 
      },
    });
    
    if (!result.data) {
      const status = result.response?.status || 502;
      if (status === 400) {
        res.status(400).json({ 
          message: result.error ? (result.error as any)?.message || 'Invalid request parameters' : 'Invalid request parameters',
          code: 'BAD_REQUEST'
        });
      } else {
        res.status(502).json({ 
          message: 'Service unavailable',
          code: 'GATEWAY_ERROR'
        });
      }
      return;
    }
    
    const data = result.data as ListAccounts200;
    res.json(data ?? { accounts: [], total: 0, page: 1, limit: 20 });
  } catch (err) {
    handleProxyError(err, res);
  }
});

const port = env.PORT || 3000;
app.listen(port, () => {
  console.log(`[api-gateway] listening on :${port}`);
});
