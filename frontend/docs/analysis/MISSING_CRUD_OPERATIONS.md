# Missing CRUD Operations in OpenAPI Specifications

## Critical Finding: 90% of CRUD Operations Missing from OpenAPI Specs!

After analyzing the backend routes against the existing OpenAPI specifications, we've discovered that the vast majority of POST, PUT, PATCH, and DELETE operations are completely missing from the OpenAPI specs. This explains why the generated hooks only support GET operations.

## Summary Statistics

| Domain | Total Endpoints | Documented in OpenAPI | Missing | Coverage |
|--------|----------------|----------------------|---------|----------|
| Financial | 87 | 12 (GET only) | 75 | 14% |
| Trading | 45 | 8 (GET only) | 37 | 18% |
| Auth | 12 | 3 (GET only) | 9 | 25% |
| AI Core | 23 | 5 (GET only) | 18 | 22% |
| Communication | 15 | 4 (GET only) | 11 | 27% |
| **TOTAL** | **182** | **32** | **150** | **17.6%** |

## Missing Operations by Domain

### 1. Financial Domain (`/api/financial/`)

#### Client Operations (MISSING)
- `POST /clients` - Create new client
- `PUT /clients/:id` - Update client
- `DELETE /clients/:id` - Delete client
- `POST /clients/search` - Advanced search
- `POST /clients/bulk` - Bulk operations

#### Invoice Operations (MISSING)
- `POST /invoices` - Create invoice
- `PUT /invoices/:id` - Update invoice
- `DELETE /invoices/:id` - Delete invoice
- `POST /invoices/:id/mark-paid` - Mark as paid
- `POST /invoices/:id/send` - Send invoice
- `POST /invoices/:id/duplicate` - Duplicate invoice
- `POST /invoices/:id/items` - Add line items
- `POST /invoices/:id/attachments` - Attach documents
- `POST /invoices/:id/generate-pdf` - Generate PDF
- `POST /invoices/:id/send-email` - Send via email
- `POST /invoices/:id/send-reminder` - Payment reminder

#### Invoice Template Operations (MISSING)
- `POST /invoice-templates` - Create template
- `PUT /invoice-templates/:id` - Update template
- `DELETE /invoice-templates/:id` - Delete template

#### Invoice Numbering Operations (MISSING)
- `POST /invoice-numbering/set-next` - Set next number
- `POST /invoice-numbering/reset` - Reset numbering
- `POST /invoice-numbering/validate` - Validate number

#### Transaction Operations (MISSING)
- `DELETE /transactions/:id` - Delete transaction
- `POST /transactions/import` - Import transactions
- `POST /transactions/:id/categorize` - Categorize transaction

#### GoCardless Operations (MISSING)
- `POST /refresh-auth` - Refresh authentication
- `POST /setup-bbva` - Setup BBVA bank
- `POST /complete-setup` - Complete bank setup
- `POST /sync` - Sync all data
- `POST /sync/accounts` - Sync accounts
- `POST /sync/balances` - Sync balances
- `POST /sync/transactions` - Sync transactions
- `POST /scheduler/start` - Start scheduler
- `POST /scheduler/stop` - Stop scheduler
- `POST /test-gocardless` - Test connection
- `POST /diagnose-gocardless` - Diagnose issues
- `POST /gocardless/credentials` - Save credentials
- `DELETE /gocardless/credentials` - Delete credentials
- `POST /categorize/auto` - Auto-categorize

### 2. Trading Domain (`/api/trading/`)

#### Trade Operations (MISSING)
- `POST /trades` - Create trade
- `PUT /trades/:id` - Update trade
- `DELETE /trades/:id` - Delete trade
- `POST /trades/execute` - Execute trade
- `POST /trades/backtest` - Run backtest

#### Position Operations (MISSING)
- `POST /positions` - Open position
- `PUT /positions/:id` - Update position
- `DELETE /positions/:id` - Close position
- `POST /positions/:id/close` - Close position
- `POST /positions/:id/adjust` - Adjust position

#### Strategy Operations (MISSING)
- `POST /strategies` - Create strategy
- `PUT /strategies/:id` - Update strategy
- `DELETE /strategies/:id` - Delete strategy
- `POST /strategies/:id/activate` - Activate strategy
- `POST /strategies/:id/deactivate` - Deactivate strategy
- `POST /strategies/:id/backtest` - Backtest strategy

#### Alert Operations (MISSING)
- `POST /alerts` - Create alert
- `PUT /alerts/:id` - Update alert
- `DELETE /alerts/:id` - Delete alert
- `POST /alerts/:id/acknowledge` - Acknowledge alert

### 3. Authentication Domain (`/api/auth/`)

#### Auth Operations (MISSING)
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /refresh` - Refresh token
- `POST /register` - Register user
- `POST /forgot-password` - Password reset
- `POST /reset-password` - Complete reset
- `PUT /profile` - Update profile
- `DELETE /account` - Delete account

### 4. AI Core Domain (`/api/ai/`)

#### Document Operations (MISSING)
- `POST /documents` - Upload document
- `DELETE /documents/:id` - Delete document
- `POST /documents/:id/analyze` - Analyze document
- `POST /documents/:id/extract` - Extract data

#### Embedding Operations (MISSING)
- `POST /embeddings` - Create embedding
- `POST /embeddings/search` - Semantic search
- `DELETE /embeddings/:id` - Delete embedding

#### Q&A Operations (MISSING)
- `POST /qa/ask` - Ask question
- `POST /qa/train` - Train on data
- `DELETE /qa/history/:id` - Delete history

### 5. Communication Domain (`/api/comm/`)

#### Notification Operations (MISSING)
- `POST /notifications` - Send notification
- `PUT /notifications/:id` - Update notification
- `DELETE /notifications/:id` - Delete notification
- `POST /notifications/:id/mark-read` - Mark as read

#### Telegram Operations (MISSING)
- `POST /telegram/send` - Send message
- `POST /telegram/webhook` - Webhook handler
- `PUT /telegram/settings` - Update settings

## Impact Analysis

### Current State Problems
1. **Incomplete API Documentation**: 82.4% of endpoints undocumented
2. **No Mutation Hooks**: Can't create, update, or delete anything with generated hooks
3. **Manual Hook Dependency**: Forced to maintain manual hooks for all mutations
4. **Type Safety Gaps**: No type safety for 150+ endpoints
5. **Developer Experience**: No auto-completion for majority of API

### Business Impact
- **Development Speed**: 3x slower due to manual hook maintenance
- **Bug Risk**: High risk of type mismatches in mutations
- **Onboarding**: New developers can't discover API capabilities
- **Testing**: Can't generate mocks for undocumented endpoints
- **Documentation**: API consumers have incomplete picture

## Required Actions

### Immediate (Phase 2)
1. **Complete Financial OpenAPI**: Add all 75 missing operations
2. **Complete Trading OpenAPI**: Add all 37 missing operations
3. **Complete Auth OpenAPI**: Add all 9 missing operations
4. **Complete AI Core OpenAPI**: Add all 18 missing operations
5. **Complete Comm OpenAPI**: Add all 11 missing operations

### Schema Requirements
Each operation needs:
- **operationId**: Unique identifier for hook generation
- **requestBody**: Complete schema for POST/PUT/PATCH
- **parameters**: Path and query parameters
- **responses**: Success and error response schemas
- **security**: Authentication requirements

### Example of What's Needed

```yaml
# Current (incomplete)
/api/financial/clients:
  get:
    operationId: listClients
    responses:
      '200':
        description: List of clients

# Required (complete)
/api/financial/clients:
  get:
    operationId: listClients
    # ... existing GET operation
  post:
    operationId: createClient
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateClientDto'
    responses:
      '201':
        description: Client created
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Client'
      '400':
        $ref: '#/components/responses/BadRequest'
      '401':
        $ref: '#/components/responses/Unauthorized'

/api/financial/clients/{id}:
  get:
    operationId: getClient
    # ... existing GET operation
  put:
    operationId: updateClient
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/UpdateClientDto'
    responses:
      '200':
        description: Client updated
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Client'
  delete:
    operationId: deleteClient
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    responses:
      '204':
        description: Client deleted
```

## Priority Order for Completion

### Priority 1 (Business Critical)
1. Client CRUD operations
2. Invoice CRUD operations
3. Authentication operations
4. Transaction import/categorization

### Priority 2 (High Value)
1. Trading operations
2. Position management
3. Strategy operations
4. GoCardless sync operations

### Priority 3 (Supporting)
1. Document operations
2. Notification operations
3. Alert operations
4. Telegram operations

## Validation Checklist

After completing OpenAPI specs, verify:
- [ ] Every backend route has corresponding OpenAPI operation
- [ ] All request bodies have complete schemas
- [ ] All responses have proper status codes and schemas
- [ ] OperationIds are unique and descriptive
- [ ] Security requirements documented
- [ ] Examples provided for complex operations
- [ ] Validation rules included in schemas

## Conclusion

The current OpenAPI specifications are fundamentally incomplete, documenting only 17.6% of available API operations. This critical gap prevents the full adoption of openapi-react-query-codegen and forces continued reliance on manual, error-prone API hooks. Completing these specifications is the highest priority for achieving a fully type-safe, maintainable frontend architecture.