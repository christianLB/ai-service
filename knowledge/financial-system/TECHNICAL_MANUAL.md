# 🔧 Sistema Financiero AI Service - Manual Técnico

## 📐 Arquitectura del Sistema

### Componentes Principales

```
AI Service Financial System
├── 🏦 GoCardless Integration Layer
├── 🗃️  PostgreSQL Database (Crypto-Ready)
├── 🔄 Synchronization Engine 
├── 📊 Analytics & Reporting
├── 🛡️  Security & Validation
└── 🔌 RESTful API Endpoints
```

### Stack Tecnológico

- **Backend**: Node.js + TypeScript
- **Database**: PostgreSQL 15 con extensiones UUID
- **API Integration**: GoCardless/Nordigen (PSD2)
- **Container**: Docker + Docker Compose
- **ORM**: Query directo con pg driver
- **Validation**: Joi + custom validators

---

## 🗂️ Esquema de Base de Datos

### Estructura Principal

```sql
financial/
├── currencies          -- Divisas (fiat + crypto)
├── customers           -- Clientes/entidades
├── accounts            -- Cuentas financieras
├── transactions        -- Transacciones unificadas
├── invoices            -- Sistema de facturación
├── invoice_items       -- Líneas de factura
├── transaction_invoice_links  -- Reconciliación
├── exchange_rates      -- Tipos de cambio
└── sync_logs          -- Logs de sincronización
```

### Modelo de Datos Detallado

#### Currencies (Soporte Multi-Divisa)
```sql
CREATE TABLE financial.currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,           -- EUR, USD, BTC, ETH
    name VARCHAR(100) NOT NULL,                 -- Euro, Bitcoin
    type VARCHAR(20) CHECK (type IN ('fiat', 'crypto')),
    decimals INTEGER DEFAULT 2,                 -- 2 fiat, 8+ crypto
    symbol VARCHAR(10),                         -- €, ₿
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Accounts (Unificadas Fiat + Crypto)
```sql
CREATE TABLE financial.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type financial.account_type NOT NULL,       -- ENUM
    currency_id UUID REFERENCES financial.currencies(id),
    
    -- Traditional Banking (GoCardless)
    account_id VARCHAR(255),                    -- GoCardless ID
    institution_id VARCHAR(100),               -- BBVA_BBVAESMM
    requisition_id VARCHAR(255),               -- Consent ID
    iban VARCHAR(50),
    
    -- Crypto Specific  
    wallet_address VARCHAR(255),               -- 0x... addresses
    chain_id INTEGER,                          -- 1=Ethereum, 56=BSC
    exchange_name VARCHAR(100),                -- Binance, Coinbase
    
    -- Common
    balance DECIMAL(20,8) DEFAULT 0,           -- High precision
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',               -- Extensible
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Transactions (Core Business Logic)
```sql
CREATE TABLE financial.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES financial.accounts(id),
    type financial.transaction_type NOT NULL,
    status financial.transaction_status DEFAULT 'pending',
    
    -- Amounts (High Precision)
    amount DECIMAL(20,8) NOT NULL,
    currency_id UUID REFERENCES financial.currencies(id),
    
    -- Transaction Details
    description TEXT,
    reference VARCHAR(255) UNIQUE,             -- Prevents duplicates
    date TIMESTAMPTZ NOT NULL,
    
    -- Fiat Integration (GoCardless)
    gocardless_data JSONB,                     -- Full API response
    
    -- Crypto Integration (Future)
    transaction_hash VARCHAR(255),             -- 0x...
    block_number BIGINT,
    gas_used DECIMAL(20,8),
    gas_price DECIMAL(20,8),
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    
    -- Counterparty Information
    counterparty_name VARCHAR(255),
    counterparty_account VARCHAR(255),
    
    -- Fees
    fee_amount DECIMAL(20,8) DEFAULT 0,
    fee_currency_id UUID REFERENCES financial.currencies(id),
    
    -- Audit Trail
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Índices de Performance

```sql
-- Transacciones por cuenta y fecha (query más común)
CREATE INDEX idx_transactions_account_date 
ON financial.transactions(account_id, date DESC);

-- Búsqueda por referencia (prevención duplicados)
CREATE INDEX idx_transactions_reference 
ON financial.transactions(reference);

-- Clasificación por tipo
CREATE INDEX idx_transactions_type 
ON financial.transactions(type);

-- Hash de blockchain (crypto lookups)
CREATE INDEX idx_transactions_hash 
ON financial.transactions(transaction_hash);
```

---

## 🔌 Integración GoCardless

### Flujo de Autenticación

```typescript
class GoCardlessService {
  private async authenticate(): Promise<string> {
    const response = await axios.post(
      'https://bankaccountdata.gocardless.com/api/v2/token/new/',
      {
        secret_id: this.config.secretId,
        secret_key: this.config.secretKey
      }
    );
    
    this.accessToken = response.data.access;
    this.tokenExpiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000);
    return this.accessToken;
  }
}
```

### Manejo de Consentimientos

```typescript
// 1. Crear requisition
async createRequisition(institutionId: string): Promise<GoCardlessRequisition> {
  const response = await this.api.post('/requisitions/', {
    institution_id: institutionId,        // 'BBVA_BBVAESMM'
    redirect: this.config.redirectUri,
    reference: `req-${Date.now()}`
  });
  return response.data;
}

// 2. Usuario da consentimiento (manual)
// 3. Verificar estado
async getRequisition(id: string): Promise<GoCardlessRequisition> {
  const response = await this.api.get(`/requisitions/${id}/`);
  return response.data; // status: 'LN' = Linked
}
```

### Sincronización de Datos

```typescript
async syncTransactionsToDatabase(
  accountId: string, 
  dbAccountId: string, 
  days = 90
): Promise<number> {
  // 1. Calcular rango de fechas
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(dateTo.getDate() - days);

  // 2. Obtener transacciones de GoCardless
  const transactions = await this.getAccountTransactions(
    accountId, dateFrom, dateTo
  );

  // 3. Procesar e insertar en BD
  for (const gcTransaction of transactions) {
    await this.db.createTransaction({
      accountId: dbAccountId,
      type: 'bank_transfer',
      status: gcTransaction.bookingDate ? 'confirmed' : 'pending',
      amount: gcTransaction.transactionAmount.amount,
      // ... mapping completo
    });
  }
}
```

### Mapeo de Campos GoCardless → Database

| GoCardless (camelCase) | Database (snake_case) | Descripción |
|------------------------|----------------------|-------------|
| `transactionId` | `reference` | ID único de transacción |
| `bookingDate` | `date` | Fecha de contabilización |
| `transactionAmount.amount` | `amount` | Importe |
| `remittanceInformationUnstructured` | `description` | Concepto |
| `creditorName` / `debtorName` | `counterparty_name` | Contrapartida |
| `creditorAccount.iban` | `counterparty_account` | Cuenta contrapartida |

---

## 🔄 Sistema de Sincronización

### Scheduler de Tareas

```typescript
class FinancialSchedulerService {
  // Sincronización 2x/día (8:00 AM y 8:00 PM)
  private scheduleDailySync(): void {
    const now = new Date();
    const next8AM = new Date();
    next8AM.setHours(8, 0, 0, 0);
    
    const next8PM = new Date();
    next8PM.setHours(20, 0, 0, 0);
    
    // Programar próxima ejecución
    const nextRun = now.getHours() < 8 ? next8AM : 
                   now.getHours() < 20 ? next8PM : 
                   this.getNext8AM();
    
    setTimeout(() => {
      this.executeSyncWithRetry();
      this.scheduleRegularSync(); // Cada 12 horas
    }, nextRun.getTime() - now.getTime());
  }
}
```

### Estrategia de Reintentos

```typescript
private async executeSyncWithRetry(maxRetries = 3): Promise<void> {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      const result = await this.goCardless.performPeriodicSync();
      if (result.success) {
        await this.logSyncMetrics({ ...result.data, success: true });
        return;
      }
    } catch (error) {
      attempts++;
      
      // Exponential backoff: 2s, 4s, 8s
      if (attempts < maxRetries) {
        const delay = Math.pow(2, attempts) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  await this.logSyncMetrics({ success: false, attempts });
}
```

### Logging y Monitoreo

```sql
-- Tabla de logs de sincronización
CREATE TABLE financial.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accounts_synced INTEGER NOT NULL,
    transactions_synced INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    attempts INTEGER NOT NULL,
    error TEXT,
    sync_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query de análisis
SELECT 
  DATE_TRUNC('day', created_at) as sync_date,
  COUNT(*) as total_syncs,
  COUNT(CASE WHEN success THEN 1 END) as successful_syncs,
  AVG(attempts) as avg_attempts,
  SUM(transactions_synced) as total_transactions
FROM financial.sync_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY 1 ORDER BY 1 DESC;
```

---

## 🛡️ Seguridad y Validación

### Gestión de Secrets

```typescript
// ❌ NUNCA hacer esto
const config = {
  secretId: "6b4b7fe5-5863-4432-880a-aab64d52a1e6",
  secretKey: "8246fb5525c80628d4d13de..."
};

// ✅ Usar variables de entorno
const config = {
  secretId: process.env.GO_SECRET_ID || '',
  secretKey: process.env.GO_SECRET_KEY || '',
  baseUrl: 'https://bankaccountdata.gocardless.com/api/v2',
  redirectUri: process.env.GO_REDIRECT_URI || ''
};
```

### Validación de Datos

```typescript
import Joi from 'joi';

const transactionSchema = Joi.object({
  accountId: Joi.string().uuid().required(),
  amount: Joi.string().pattern(/^-?\d+(\.\d{1,8})?$/).required(),
  currencyId: Joi.string().uuid().required(),
  date: Joi.date().required(),
  description: Joi.string().max(1000).optional(),
  reference: Joi.string().max(255).required()
});

// Uso en API endpoints
app.post('/api/financial/transactions', async (req, res) => {
  const { error, value } = transactionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  // Procesar transacción validada...
});
```

### Rate Limiting y Protección

```typescript
// Implementación básica de rate limiting
class RateLimiter {
  private requests = new Map<string, number[]>();
  
  isAllowed(clientId: string, maxRequests = 100, windowMs = 3600000): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const clientRequests = this.requests.get(clientId) || [];
    const validRequests = clientRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(clientId, validRequests);
    return true;
  }
}
```

---

## 📊 API Endpoints

### Autenticación y Setup

```typescript
// POST /api/financial/setup-bbva
// Iniciar proceso de consentimiento BBVA
{
  "success": true,
  "data": {
    "requisitionId": "uuid",
    "consentUrl": "https://ob.gocardless.com/...",
    "institutionId": "BBVA_BBVAESMM"
  }
}

// POST /api/financial/complete-setup
// Completar setup después del consentimiento
{
  "requisitionId": "uuid"
}
```

### Gestión de Cuentas

```typescript
// GET /api/financial/accounts
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "BBVA 8475",
      "type": "bank_account",
      "iban": "ES3601826165130200198475",
      "balance": "28517.63",
      "currency": { "code": "EUR", "symbol": "€" }
    }
  ]
}

// GET /api/financial/accounts/:id
// Detalles específicos de cuenta
```

### Transacciones

```typescript
// GET /api/financial/transactions?page=1&limit=50&accountId=uuid
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "amount": "-815.00",
        "currency": "EUR",
        "date": "2025-07-01",
        "description": "TRANSFERENCIAS // TRANSFERENCIA REALIZADA",
        "counterpartyName": "CARMEN MARIA ALFONSO PORCAR",
        "accountName": "BBVA 8475"
      }
    ],
    "total": 117,
    "page": 1,
    "limit": 50,
    "hasNext": true
  }
}
```

### Sincronización

```typescript
// POST /api/financial/sync
// Sincronización manual

// GET /api/financial/sync-status
{
  "success": true,
  "data": {
    "scheduler": {
      "isRunning": true,
      "nextSyncEstimate": "2025-07-02T20:00:00.000Z"
    },
    "stats": {
      "summary": {
        "total_syncs": 24,
        "successful_syncs": 23,
        "failed_syncs": 1
      }
    }
  }
}
```

### Health Check

```typescript
// GET /api/financial/health
{
  "success": true,
  "status": "healthy",
  "services": {
    "database": "connected",
    "gocardless": "authenticated",
    "scheduler": "running"
  },
  "timestamp": "2025-07-02T14:30:00.000Z"
}
```

---

## 🚀 Extensibilidad

### Preparación para Crypto

El sistema está diseñado para soportar criptomonedas sin cambios estructurales:

```typescript
// Ejemplo de cuenta crypto (futuro)
const cryptoAccount = {
  name: "MetaMask Wallet",
  type: "crypto_wallet",
  currencyId: btcCurrencyId,
  walletAddress: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  chainId: 1, // Ethereum mainnet
  balance: "0.05430000", // 8 decimals
  metadata: {
    derivationPath: "m/44'/0'/0'/0/0",
    publicKey: "03...",
    provider: "metamask"
  }
};

// Transacción crypto (futuro)
const cryptoTx = {
  type: "crypto_send",
  amount: "0.00100000",
  transactionHash: "0x742d35cc6d...",
  blockNumber: 18500000,
  gasUsed: "21000",
  gasPrice: "20000000000", // 20 gwei
  fromAddress: "0x...",
  toAddress: "0x..."
};
```

### Arquitectura de Plugins

```typescript
interface FinancialProvider {
  name: string;
  authenticate(): Promise<boolean>;
  getAccounts(): Promise<Account[]>;
  getTransactions(accountId: string, dateRange: DateRange): Promise<Transaction[]>;
  supportsRealTime(): boolean;
}

class ProviderRegistry {
  private providers = new Map<string, FinancialProvider>();
  
  register(name: string, provider: FinancialProvider): void {
    this.providers.set(name, provider);
  }
  
  async syncAll(): Promise<SyncResult[]> {
    const results = [];
    for (const [name, provider] of this.providers) {
      results.push(await this.syncProvider(name, provider));
    }
    return results;
  }
}

// Uso
const registry = new ProviderRegistry();
registry.register('gocardless', new GoCardlessProvider(config));
registry.register('coinbase', new CoinbaseProvider(apiKey)); // Futuro
registry.register('metamask', new MetaMaskProvider()); // Futuro
```

---

## 🔧 Deployment y DevOps

### Docker Compose Setup

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ai_service
      POSTGRES_USER: ai_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5434:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/financial-schema.sql:/docker-entrypoint-initdb.d/
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ai_user"]
      interval: 10s
      retries: 5

  ai-service:
    build: .
    environment:
      - GO_SECRET_ID=${GO_SECRET_ID}
      - GO_SECRET_KEY=${GO_SECRET_KEY}
      - POSTGRES_HOST=postgres
    depends_on:
      postgres:
        condition: service_healthy
```

### Scripts de Utilidad

```bash
#!/bin/bash
# scripts/backup-financial-db.sh

BACKUP_DIR="/home/k2600x/dev/ai-service-data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="financial_backup_${TIMESTAMP}.sql"

docker exec ai-service-postgres-1 pg_dump \
  -U ai_user \
  -d ai_service \
  --schema=financial \
  --data-only \
  > "${BACKUP_DIR}/${BACKUP_FILE}"

echo "Backup created: ${BACKUP_FILE}"
```

### Monitoreo de Performance

```sql
-- Query para monitoring
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables 
WHERE schemaname = 'financial'
ORDER BY n_tup_ins DESC;

-- Índices más utilizados
SELECT 
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'financial'
ORDER BY idx_scan DESC;
```

---

## 🐛 Debugging y Troubleshooting

### Logs Estructurados

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/financial-error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/financial-combined.log' 
    })
  ]
});

// Uso en servicios
logger.info('GoCardless sync started', {
  accountId,
  dateRange: { from: dateFrom, to: dateTo },
  transactionCount: transactions.length
});

logger.error('Transaction insert failed', {
  transactionId: transaction.transactionId,
  accountId,
  error: error.message,
  stack: error.stack
});
```

### Queries de Diagnóstico

```sql
-- Detectar transacciones duplicadas
SELECT reference, COUNT(*) 
FROM financial.transactions 
GROUP BY reference 
HAVING COUNT(*) > 1;

-- Verificar integridad referencial
SELECT 
  'Orphaned Transactions' as issue,
  COUNT(*) as count
FROM financial.transactions t
LEFT JOIN financial.accounts a ON t.account_id = a.id
WHERE a.id IS NULL

UNION ALL

SELECT 
  'Invalid Currency References',
  COUNT(*)
FROM financial.transactions t
LEFT JOIN financial.currencies c ON t.currency_id = c.id
WHERE c.id IS NULL;

-- Performance de sincronización
SELECT 
  DATE_TRUNC('hour', created_at) as sync_hour,
  COUNT(*) as syncs,
  AVG(accounts_synced) as avg_accounts,
  AVG(transactions_synced) as avg_transactions,
  COUNT(CASE WHEN success THEN 1 END) * 100.0 / COUNT(*) as success_rate
FROM financial.sync_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1 DESC;
```

### Testing Framework

```typescript
// tests/financial/gocardless.test.ts
import { GoCardlessService } from '../../src/services/financial/gocardless.service';

describe('GoCardlessService', () => {
  let service: GoCardlessService;
  
  beforeEach(() => {
    service = new GoCardlessService(testConfig, mockDatabase);
  });
  
  it('should authenticate successfully', async () => {
    const token = await service.authenticate();
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(0);
  });
  
  it('should handle API rate limits', async () => {
    // Mock rate limit response
    mockAxios.onPost().reply(429, { detail: 'Rate limit exceeded' });
    
    await expect(service.authenticate()).rejects.toThrow('Rate limit');
  });
  
  it('should map GoCardless fields correctly', () => {
    const gcTransaction = {
      transactionId: '123',
      bookingDate: '2025-07-01',
      transactionAmount: { amount: '-100.00', currency: 'EUR' }
    };
    
    const mapped = service.mapTransaction(gcTransaction);
    expect(mapped.reference).toBe('123');
    expect(mapped.amount).toBe('-100.00');
    expect(mapped.date).toEqual(new Date('2025-07-01'));
  });
});
```

---

## 📈 Métricas y Analytics

### KPIs Técnicos

```sql
-- SLA Dashboard
WITH sync_stats AS (
  SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_syncs,
    COUNT(CASE WHEN success THEN 1 END) as successful_syncs,
    AVG(CASE WHEN success THEN transactions_synced ELSE 0 END) as avg_tx_per_sync
  FROM financial.sync_logs
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY 1
)
SELECT 
  'Sync Success Rate' as metric,
  ROUND(AVG(successful_syncs * 100.0 / total_syncs), 2) || '%' as value
FROM sync_stats

UNION ALL

SELECT 
  'Avg Transactions/Sync',
  ROUND(AVG(avg_tx_per_sync), 0)::text
FROM sync_stats

UNION ALL

SELECT 
  'Data Freshness (hours)',
  EXTRACT(EPOCH FROM NOW() - MAX(created_at))/3600::text
FROM financial.sync_logs
WHERE success = true;
```

### Business Intelligence

```sql
-- Financial Insights Dashboard
SELECT 
  'Monthly Cash Flow' as category,
  json_agg(json_build_object(
    'month', to_char(month, 'YYYY-MM'),
    'inflow', inflow,
    'outflow', outflow,
    'net', inflow - outflow
  ) ORDER BY month) as data
FROM (
  SELECT 
    DATE_TRUNC('month', date) as month,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as inflow,
    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as outflow
  FROM financial.transactions
  WHERE date > NOW() - INTERVAL '12 months'
  GROUP BY 1
) monthly_data;

-- Transaction Categories Analysis
SELECT 
  category,
  COUNT(*) as transaction_count,
  ROUND(SUM(ABS(amount)), 2) as total_amount,
  ROUND(AVG(ABS(amount)), 2) as avg_amount
FROM (
  SELECT 
    amount,
    CASE 
      WHEN UPPER(description) LIKE '%TRANSFERENCIA%' THEN 'Transfers'
      WHEN UPPER(description) LIKE '%TARJETA%' THEN 'Card Payments'
      WHEN UPPER(description) LIKE '%ADEUDO%' THEN 'Direct Debits'
      WHEN UPPER(description) LIKE '%NOMINA%' THEN 'Salary'
      ELSE 'Other'
    END as category
  FROM financial.transactions
  WHERE date > NOW() - INTERVAL '3 months'
) categorized
GROUP BY category
ORDER BY total_amount DESC;
```

---

*Documento técnico actualizado: Julio 2025*  
*Versión del sistema: 1.0.0*  
*Maintainer: AI Service Team*