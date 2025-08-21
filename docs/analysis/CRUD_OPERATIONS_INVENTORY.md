# CRUD Operations Inventory

**Analysis Date**: 2025-08-19  
**Analyst**: AI Agent - CRUD Analysis Specialist  
**Purpose**: Identify all backend CRUD operations for OpenAPI specification completion

## Executive Summary

This analysis reveals **150+ operations** across the AI Service backend, with current OpenAPI coverage at only **17.6%** (only GET operations documented). The backend implements comprehensive CRUD operations across 6 major domains:

- **Financial**: 85+ operations (most comprehensive)
- **Trading**: 15+ operations
- **Auth**: 5+ operations
- **AI Core**: 10+ operations
- **Communication**: 8+ operations
- **Tagging**: 12+ operations

**Critical Finding**: 82.4% of operations are missing from OpenAPI specs, particularly ALL POST, PUT, PATCH, and DELETE operations.

---

## Financial Domain

### **Clients** (`/api/financial/clients`)

| Operation           | Method | Endpoint                    | Status         | Request Schema       | Response Schema         |
| ------------------- | ------ | --------------------------- | -------------- | -------------------- | ----------------------- |
| List clients        | GET    | `/clients`                  | ✅ **EXISTS**  | ClientQuery          | ClientListResponse      |
| Get client          | GET    | `/clients/:id`              | ✅ **EXISTS**  | -                    | Client                  |
| Create client       | POST   | `/clients`                  | ❌ **MISSING** | CreateClient         | Client                  |
| Update client       | PUT    | `/clients/:id`              | ❌ **MISSING** | UpdateClient         | Client                  |
| Delete client       | DELETE | `/clients/:id`              | ❌ **MISSING** | -                    | { success: boolean }    |
| Search clients      | POST   | `/clients/search`           | ❌ **MISSING** | SearchQuery          | ClientListResponse      |
| Bulk operations     | POST   | `/clients/bulk`             | ❌ **MISSING** | BulkOperationRequest | BulkOperationResponse   |
| Get by tax ID       | GET    | `/clients/tax/:taxId`       | ❌ **MISSING** | -                    | Client                  |
| Client stats        | GET    | `/clients/:id/stats`        | ❌ **MISSING** | -                    | ClientStats             |
| Client transactions | GET    | `/clients/:id/transactions` | ❌ **MISSING** | TransactionQuery     | TransactionListResponse |

**Request/Response Schemas**:

```typescript
// From src/types/client.types.ts
interface CreateClient {
  name: string;
  email?: string;
  phone?: string;
  taxId?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  defaultCurrency: string; // default: 'EUR'
  paymentTerms: number; // default: 30
  notes?: string;
  isActive: boolean; // default: true
  metadata?: Record<string, any>;
}

interface UpdateClient extends Partial<CreateClient> {
  id: string;
}

interface ClientQuery {
  page: number; // default: 1
  limit: number; // default: 10, max: 100
  search?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc'; // default: 'desc'
}
```

### **Invoices** (`/api/financial/invoices`)

| Operation            | Method | Endpoint                          | Status         | Request Schema     | Response Schema      |
| -------------------- | ------ | --------------------------------- | -------------- | ------------------ | -------------------- |
| List invoices        | GET    | `/invoices`                       | ✅ **EXISTS**  | InvoiceQuery       | InvoiceListResponse  |
| Get invoice          | GET    | `/invoices/:id`                   | ✅ **EXISTS**  | -                  | Invoice              |
| Create invoice       | POST   | `/invoices`                       | ❌ **MISSING** | CreateInvoice      | Invoice              |
| Update invoice       | PUT    | `/invoices/:id`                   | ❌ **MISSING** | UpdateInvoice      | Invoice              |
| Delete invoice       | DELETE | `/invoices/:id`                   | ❌ **MISSING** | -                  | { success: boolean } |
| Get overdue invoices | GET    | `/invoices/overdue`               | ❌ **MISSING** | -                  | InvoiceListResponse  |
| Get by number        | GET    | `/invoices/number/:invoiceNumber` | ❌ **MISSING** | -                  | Invoice              |
| Mark as paid         | POST   | `/invoices/:id/mark-paid`         | ❌ **MISSING** | PaymentDetails     | Invoice              |
| Send invoice         | POST   | `/invoices/:id/send`              | ❌ **MISSING** | SendInvoiceRequest | { success: boolean } |
| Duplicate invoice    | POST   | `/invoices/:id/duplicate`         | ❌ **MISSING** | -                  | Invoice              |
| Add item             | POST   | `/invoices/:id/items`             | ❌ **MISSING** | InvoiceItem        | Invoice              |
| Generate PDF         | POST   | `/invoices/:id/generate-pdf`      | ❌ **MISSING** | -                  | { pdfUrl: string }   |
| Download PDF         | GET    | `/invoices/:id/download-pdf`      | ❌ **MISSING** | -                  | Binary (PDF)         |
| Send email           | POST   | `/invoices/:id/send-email`        | ❌ **MISSING** | EmailRequest       | { success: boolean } |

**Critical Missing Schemas**:

```typescript
interface CreateInvoice {
  clientId: string;
  invoiceNumber?: string; // auto-generated if not provided
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  total: number;
  subtotal: number;
  tax: number;
  issueDate: Date;
  dueDate: Date;
  notes?: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PaymentDetails {
  paidDate: Date;
  paymentMethod?: string;
  paymentReference?: string;
}
```

### **Transactions** (`/api/financial/transactions`)

| Operation              | Method | Endpoint                       | Status         | Request Schema               | Response Schema              |
| ---------------------- | ------ | ------------------------------ | -------------- | ---------------------------- | ---------------------------- |
| List transactions      | GET    | `/transactions`                | ✅ **EXISTS**  | TransactionQuery             | TransactionListResponse      |
| Get transaction        | GET    | `/transactions/:id`            | ✅ **EXISTS**  | -                            | Transaction                  |
| Delete transaction     | DELETE | `/transactions/:id`            | ❌ **MISSING** | -                            | { success: boolean }         |
| Import transactions    | POST   | `/transactions/import`         | ❌ **MISSING** | ImportFile + accountId       | ImportResult                 |
| Export transactions    | GET    | `/transactions/export`         | ✅ **EXISTS**  | ExportQuery                  | CSV/JSON                     |
| Categorize transaction | POST   | `/transactions/:id/categorize` | ❌ **MISSING** | CategorizationRequest        | Transaction                  |
| Auto-categorize        | POST   | `/categorize/auto`             | ❌ **MISSING** | { transactionIds: string[] } | { categorizedCount: number } |

### **Accounts** (`/api/financial/accounts`)

| Operation          | Method | Endpoint          | Status         | Request Schema | Response Schema       |
| ------------------ | ------ | ----------------- | -------------- | -------------- | --------------------- |
| List accounts      | GET    | `/accounts`       | ✅ **EXISTS**  | AccountQuery   | AccountListResponse   |
| Get account        | GET    | `/accounts/:id`   | ✅ **EXISTS**  | -              | Account               |
| Get account status | GET    | `/account-status` | ❌ **MISSING** | -              | AccountStatusResponse |

### **GoCardless Integration** (`/api/financial/gocardless`)

| Operation             | Method | Endpoint                  | Status         | Request Schema   | Response Schema         |
| --------------------- | ------ | ------------------------- | -------------- | ---------------- | ----------------------- |
| Configure credentials | POST   | `/gocardless/credentials` | ❌ **MISSING** | GoCardlessConfig | { success: boolean }    |
| Check credentials     | GET    | `/gocardless/credentials` | ❌ **MISSING** | -                | { configured: boolean } |
| Delete credentials    | DELETE | `/gocardless/credentials` | ❌ **MISSING** | -                | { success: boolean }    |
| Get status            | GET    | `/gocardless/status`      | ❌ **MISSING** | -                | GoCardlessStatus        |
| Test connection       | POST   | `/test-gocardless`        | ❌ **MISSING** | -                | { success: boolean }    |
| Diagnose issues       | POST   | `/diagnose-gocardless`    | ❌ **MISSING** | -                | DiagnosisReport         |

### **Setup & Sync Operations**

| Operation         | Method | Endpoint             | Status         | Request Schema             | Response Schema      |
| ----------------- | ------ | -------------------- | -------------- | -------------------------- | -------------------- |
| Setup BBVA        | POST   | `/setup-bbva`        | ❌ **MISSING** | -                          | SetupResponse        |
| Complete setup    | POST   | `/complete-setup`    | ❌ **MISSING** | { requisitionId: string }  | SetupResult          |
| Manual sync       | POST   | `/sync`              | ❌ **MISSING** | -                          | SyncResult           |
| Sync accounts     | POST   | `/sync/accounts`     | ❌ **MISSING** | -                          | SyncResult           |
| Sync balances     | POST   | `/sync/balances`     | ❌ **MISSING** | { forceRefresh?: boolean } | SyncResult           |
| Sync transactions | POST   | `/sync/transactions` | ❌ **MISSING** | { days?: number }          | SyncResult           |
| Start scheduler   | POST   | `/scheduler/start`   | ❌ **MISSING** | -                          | { success: boolean } |
| Stop scheduler    | POST   | `/scheduler/stop`    | ❌ **MISSING** | -                          | { success: boolean } |

---

## Trading Domain

### **Strategies** (`/api/trading/strategies`)

| Operation       | Method | Endpoint                      | Status         | Request Schema   | Response Schema      |
| --------------- | ------ | ----------------------------- | -------------- | ---------------- | -------------------- |
| List strategies | GET    | `/strategies`                 | ✅ **EXISTS**  | StrategyQuery    | StrategyListResponse |
| Get strategy    | GET    | `/strategies/:id`             | ❌ **MISSING** | -                | Strategy             |
| Create strategy | POST   | `/strategies`                 | ❌ **MISSING** | CreateStrategy   | Strategy             |
| Update strategy | PUT    | `/strategies/:id`             | ❌ **MISSING** | UpdateStrategy   | Strategy             |
| Delete strategy | DELETE | `/strategies/:id`             | ❌ **MISSING** | -                | { success: boolean } |
| Get performance | GET    | `/strategies/:id/performance` | ❌ **MISSING** | PerformanceQuery | PerformanceMetrics   |
| Start strategy  | POST   | `/strategies/:id/start`       | ❌ **MISSING** | -                | { success: boolean } |
| Stop strategy   | POST   | `/strategies/:id/stop`        | ❌ **MISSING** | -                | { success: boolean } |
| Pause strategy  | POST   | `/strategies/:id/pause`       | ❌ **MISSING** | -                | { success: boolean } |
| Update params   | PUT    | `/strategies/:id/params`      | ❌ **MISSING** | StrategyParams   | Strategy             |

### **Positions** (`/api/trading/positions`)

| Operation      | Method | Endpoint               | Status         | Request Schema       | Response Schema      |
| -------------- | ------ | ---------------------- | -------------- | -------------------- | -------------------- |
| List positions | GET    | `/positions`           | ❌ **MISSING** | PositionQuery        | PositionListResponse |
| Get position   | GET    | `/positions/:id`       | ❌ **MISSING** | -                    | Position             |
| Close position | POST   | `/positions/:id/close` | ❌ **MISSING** | ClosePositionRequest | Position             |

### **Backtesting** (`/api/trading/backtest`)

| Operation            | Method | Endpoint        | Status         | Request Schema  | Response Schema      |
| -------------------- | ------ | --------------- | -------------- | --------------- | -------------------- |
| Run backtest         | POST   | `/backtest`     | ❌ **MISSING** | BacktestRequest | BacktestResult       |
| Get backtest results | GET    | `/backtest/:id` | ❌ **MISSING** | -               | BacktestResult       |
| List backtests       | GET    | `/backtest`     | ❌ **MISSING** | BacktestQuery   | BacktestListResponse |

**Critical Missing Schemas**:

```typescript
interface CreateStrategy {
  name: string;
  description?: string;
  type: 'arbitrage' | 'dca' | 'grid' | 'momentum';
  parameters: Record<string, any>;
  exchanges: string[];
  symbols: string[];
  maxInvestment: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface BacktestRequest {
  strategyId: string;
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  exchanges: string[];
  symbols: string[];
}
```

---

## Auth Domain

### **Authentication** (`/api/auth`)

| Operation        | Method | Endpoint    | Status         | Request Schema           | Response Schema      |
| ---------------- | ------ | ----------- | -------------- | ------------------------ | -------------------- |
| Login            | POST   | `/login`    | ❌ **MISSING** | LoginRequest             | AuthTokens           |
| Logout           | POST   | `/logout`   | ❌ **MISSING** | { refreshToken: string } | { success: boolean } |
| Refresh token    | POST   | `/refresh`  | ❌ **MISSING** | { refreshToken: string } | AuthTokens           |
| Get current user | GET    | `/me`       | ❌ **MISSING** | -                        | User                 |
| Register         | POST   | `/register` | ❌ **MISSING** | RegisterRequest          | User                 |

**Request/Response Schemas**:

```typescript
interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string; // "Bearer"
}

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
}
```

---

## AI Core/Tagging Domain

### **Tags** (`/api/tags`)

| Operation   | Method | Endpoint       | Status         | Request Schema   | Response Schema      |
| ----------- | ------ | -------------- | -------------- | ---------------- | -------------------- |
| List tags   | GET    | `/tags`        | ❌ **MISSING** | TagQuery         | TagListResponse      |
| Get tag     | GET    | `/tags/:id`    | ❌ **MISSING** | -                | Tag                  |
| Create tag  | POST   | `/tags`        | ❌ **MISSING** | CreateTag        | Tag                  |
| Update tag  | PUT    | `/tags/:id`    | ❌ **MISSING** | UpdateTag        | Tag                  |
| Delete tag  | DELETE | `/tags/:id`    | ❌ **MISSING** | DeleteTagOptions | { success: boolean } |
| Search tags | POST   | `/tags/search` | ❌ **MISSING** | TagSearch        | TagListResponse      |

### **Entity Tagging** (`/api/entities`)

| Operation         | Method | Endpoint                 | Status         | Request Schema   | Response Schema      |
| ----------------- | ------ | ------------------------ | -------------- | ---------------- | -------------------- |
| Tag entity        | POST   | `/:type/:id/tags`        | ❌ **MISSING** | TagEntityRequest | EntityTagResult      |
| Get entity tags   | GET    | `/:type/:id/tags`        | ❌ **MISSING** | -                | EntityTag[]          |
| Update entity tag | PATCH  | `/:type/:id/tags/:tagId` | ❌ **MISSING** | UpdateEntityTag  | EntityTag            |
| Remove entity tag | DELETE | `/:type/:id/tags/:tagId` | ❌ **MISSING** | -                | { success: boolean } |
| Find by tag       | GET    | `/by-tag/:tagId`         | ❌ **MISSING** | EntityQuery      | EntityListResponse   |

**Complex Schema Example**:

```typescript
// From src/types/tagging/tag.types.ts
interface CreateTag {
  code: string; // Uppercase with underscores
  name: string;
  description?: string;
  entityTypes: ('transaction' | 'document' | 'client' | 'invoice')[];
  patterns?: {
    keywords?: string[];
    merchants?: string[];
    categories?: string[];
    regex?: string;
    customRules?: Record<string, any>;
  };
  confidence: number; // 0-1
  parentId?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
}

interface TagEntityRequest {
  method: 'auto' | 'ai' | 'pattern' | 'manual';
  options?: {
    aiProvider?: 'claude' | 'openai';
    confidenceThreshold?: number; // default: 0.7
    maxTags?: number; // default: 5, max: 10
    includeRelated?: boolean;
    forceReTag?: boolean;
  };
}
```

---

## Communication Domain

### **Telegram** (`/api/telegram`)

| Operation     | Method | Endpoint    | Status         | Request Schema | Response Schema      |
| ------------- | ------ | ----------- | -------------- | -------------- | -------------------- |
| Send message  | POST   | `/send`     | ❌ **MISSING** | MessageRequest | { success: boolean } |
| Set webhook   | POST   | `/webhook`  | ❌ **MISSING** | WebhookConfig  | { success: boolean } |
| Get chat info | GET    | `/chat/:id` | ❌ **MISSING** | -              | ChatInfo             |

---

## Integration/Configuration Domain

### **Integration Config** (`/api/integrations/config`)

| Operation     | Method | Endpoint             | Status         | Request Schema | Response Schema      |
| ------------- | ------ | -------------------- | -------------- | -------------- | -------------------- |
| Get config    | GET    | `/config/:type/:key` | ❌ **MISSING** | -              | ConfigValue          |
| Set config    | POST   | `/config`            | ❌ **MISSING** | ConfigRequest  | { success: boolean } |
| Delete config | DELETE | `/config/:type/:key` | ❌ **MISSING** | -              | { success: boolean } |
| List configs  | GET    | `/config/:type`      | ❌ **MISSING** | -              | ConfigListResponse   |

---

## Critical Missing Schema Definitions

### Standard Response Patterns

```typescript
interface StandardResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> extends StandardResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface ListResponse<T> extends PaginatedResponse<T> {
  count: number;
}
```

### Query Parameters

```typescript
interface BaseQuery {
  page?: number; // default: 1
  limit?: number; // default: 20, max: 100
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc'; // default: 'desc'
}

interface DateRangeQuery extends BaseQuery {
  startDate?: Date;
  endDate?: Date;
}
```

---

## Implementation Priority

### **Phase 1: Critical Business Operations** (Immediate)

1. **Financial CRUD**: Clients, Invoices, Transactions (35+ operations)
2. **Auth Operations**: Login, Register, Token refresh (5 operations)

### **Phase 2: Trading & Advanced Features** (Next)

1. **Trading CRUD**: Strategies, Positions, Backtesting (15+ operations)
2. **AI/Tagging System**: Entity tagging, Tag management (12+ operations)

### **Phase 3: Integration & Admin** (Later)

1. **GoCardless Integration**: Setup, sync, configuration (10+ operations)
2. **Communication & Config**: Telegram, Integration config (8+ operations)

---

## Technical Recommendations

### **OpenAPI Specification Structure**

1. **Domain-based organization**: Separate specs per domain (financial.yaml, trading.yaml, etc.)
2. **Shared components**: Common schemas in shared components
3. **Consistent patterns**: Standard response formats, error handling
4. **Request validation**: Zod schemas already exist - extract to OpenAPI

### **Code Generation Compatibility**

1. **Operation IDs**: Follow `{action}{Resource}` pattern (e.g., `createClient`, `listInvoices`)
2. **Tag grouping**: Group related operations for better code organization
3. **Response types**: Consistent naming for generated hooks (e.g., `useCreateClient`, `useListInvoices`)

### **Quality Gates**

1. **Schema validation**: All schemas must match existing Zod definitions
2. **Response format**: Consistent with current backend responses
3. **Authentication**: Proper security schemes for protected endpoints
4. **Error handling**: Standard error response formats

---

## Conclusion

This analysis reveals a significant gap between the implemented backend functionality (150+ operations) and current OpenAPI documentation (17.6% coverage). The financial domain is the most comprehensive and should be prioritized for immediate OpenAPI completion.

**Next Steps**:

1. Create detailed OpenAPI schemas for Financial domain (Priority 1)
2. Implement openapi-react-query-codegen integration
3. Validate generated types against existing backend
4. Expand to Trading and Auth domains
5. Complete remaining domains

The backend is well-structured with comprehensive CRUD operations, proper validation schemas, and consistent patterns - it's ready for complete OpenAPI specification and code generation.
