# Phase 5 Prerequisites - Missing OpenAPI Endpoints Analysis

## Executive Summary

Before we can remove axios from the frontend, we need to add missing endpoints to OpenAPI specifications and fix blocking issues. This document identifies exactly what needs to be done.

## Hooks Still Using Axios Directly

### 1. **use-alert.ts**
**Endpoints Used:**
- GET `/alerts` - List alerts with pagination
- GET `/alerts/{id}` - Get single alert
- GET `/alerts/search` - Search alerts
- POST `/alerts` - Create alert
- PUT `/alerts/{id}` - Update alert
- DELETE `/alerts/{id}` - Delete alert
- DELETE `/alerts` - Bulk delete
- GET `/alerts/active` - Get active alerts
- GET `/alerts/history` - Get alert history

**OpenAPI Spec:** Should be added to `comm.yaml` or new `monitoring.yaml`

### 2. **use-trade.ts**
**Endpoints Used:**
- GET `/trades` - List trades with pagination
- GET `/trades/{id}` - Get single trade
- GET `/trades/search` - Search trades
- POST `/trades` - Create trade
- PUT `/trades/{id}` - Update trade
- DELETE `/trades/{id}` - Delete trade

**OpenAPI Spec:** Should be added to `trading.yaml`

### 3. **use-position.ts**
**Endpoints Used:**
- GET `/positions` - List positions (Note: `/trading/positions` exists in trading.yaml)
- GET `/positions/{id}` - Get single position
- POST `/positions` - Create position
- PUT `/positions/{id}` - Update position
- DELETE `/positions/{id}` - Delete position

**OpenAPI Spec:** Already partially in `trading.yaml` but needs CRUD operations

### 4. **use-report.ts**
**Endpoints Used:**
- GET `/reports` - List reports
- GET `/reports/{id}` - Get single report
- POST `/reports/generate` - Generate report
- GET `/reports/download/{id}` - Download report
- DELETE `/reports/{id}` - Delete report

**OpenAPI Spec:** Should be added to `financial.yaml` or new `reporting.yaml`

### 5. **use-entity-tag.ts**
**Endpoints Used:**
- GET `/tags/entity` - List entity tags
- GET `/tags/entity/{entityType}/{entityId}` - Get tags for entity
- POST `/tags/entity` - Add tag to entity
- DELETE `/tags/entity/{id}` - Remove tag from entity
- PUT `/tags/entity/{id}` - Update entity tag

**OpenAPI Spec:** Needs new `tagging.yaml` (routes currently disabled)
**Blocker:** TypeScript errors in tagging service

### 6. **use-universal-tag.ts**
**Endpoints Used:**
- GET `/tags` - List all tags
- GET `/tags/{id}` - Get single tag
- POST `/tags` - Create tag
- PUT `/tags/{id}` - Update tag
- DELETE `/tags/{id}` - Delete tag
- GET `/tags/search` - Search tags

**OpenAPI Spec:** Needs new `tagging.yaml` (routes currently disabled)
**Blocker:** TypeScript errors in tagging service

### 7. **use-notification.ts**
**Endpoints Used:**
- GET `/notifications` - List notifications
- GET `/notifications/{id}` - Get single notification
- POST `/notifications` - Create notification
- PUT `/notifications/{id}/read` - Mark as read
- PUT `/notifications/read-all` - Mark all as read
- DELETE `/notifications/{id}` - Delete notification

**OpenAPI Spec:** Should be added to `comm.yaml`

## Existing OpenAPI Specs Status

### ✅ Complete Coverage
- `financial.yaml` - Clients, Invoices, Transactions, GoCardless
- `auth.yaml` - Authentication endpoints

### ⚠️ Partial Coverage
- `trading.yaml` - Has strategies and positions but missing trades
- `comm.yaml` - Has some communication endpoints but missing notifications/alerts

### ❌ Missing Specs
- Tagging system (routes disabled)
- Reporting system
- Alert/monitoring system

## Blocking Issues

### 1. Tagging System TypeScript Errors
**Location:** `/src/routes/tagging.ts` and related services
**Impact:** Routes are commented out in `src/index.ts:296`
**Action Required:** Fix TypeScript errors before creating OpenAPI spec

### 2. Missing CRUD Operations
Several endpoints only have read operations:
- Accounts (only GET operations)
- Attachments (only GET operations)
- Positions (only GET, missing CRUD)

## Implementation Plan

### Step 1: Fix Tagging System (Priority 1)
1. Fix TypeScript errors in tagging services
2. Re-enable routes in `src/index.ts`
3. Create `openapi/tagging.yaml` specification
4. Generate hooks

### Step 2: Add Missing Endpoints (Priority 2)

#### Update `trading.yaml`:
```yaml
/trades:
  get: # List trades
  post: # Create trade
/trades/{id}:
  get: # Get trade
  put: # Update trade
  delete: # Delete trade
/trades/search:
  get: # Search trades
```

#### Update `comm.yaml`:
```yaml
/alerts:
  get: # List alerts
  post: # Create alert
  delete: # Bulk delete
/alerts/{id}:
  get: # Get alert
  put: # Update alert
  delete: # Delete alert
/alerts/search:
  get: # Search alerts
/alerts/active:
  get: # Active alerts
/alerts/history:
  get: # Alert history

/notifications:
  get: # List notifications
  post: # Create notification
/notifications/{id}:
  get: # Get notification
  delete: # Delete notification
/notifications/{id}/read:
  put: # Mark as read
/notifications/read-all:
  put: # Mark all as read
```

#### Create `reporting.yaml`:
```yaml
/reports:
  get: # List reports
/reports/{id}:
  get: # Get report
  delete: # Delete report
/reports/generate:
  post: # Generate report
/reports/download/{id}:
  get: # Download report
```

### Step 3: Generate Hooks (Priority 3)
```bash
# Generate hooks for updated specs
npx openapi-rq -i ../openapi/trading.yaml -o src/generated/hooks/trading
npx openapi-rq -i ../openapi/comm.yaml -o src/generated/hooks/comm
npx openapi-rq -i ../openapi/tagging.yaml -o src/generated/hooks/tagging
npx openapi-rq -i ../openapi/reporting.yaml -o src/generated/hooks/reporting
```

### Step 4: Create Wrapper Hooks (Priority 4)
Create wrapper hooks for:
- use-alert-wrapper.ts
- use-trade-wrapper.ts
- use-position-wrapper.ts
- use-report-wrapper.ts
- use-entity-tag-wrapper.ts
- use-universal-tag-wrapper.ts
- use-notification-wrapper.ts

## Success Criteria

- [ ] All 7 hooks have OpenAPI implementations
- [ ] Tagging system TypeScript errors fixed
- [ ] All endpoints documented in OpenAPI specs
- [ ] Hooks generated successfully
- [ ] Wrapper hooks created
- [ ] TypeScript compilation passes
- [ ] Feature flags configured

## Risk Assessment

### High Risk
- **Tagging System**: Currently broken, needs repair
- **Trading Operations**: Real money implications

### Medium Risk
- **Alerts/Notifications**: May affect monitoring
- **Reports**: May affect business operations

### Low Risk
- **Read-only operations**: Can fallback quickly

## Timeline

- **Week 1**: Fix tagging, add endpoints to specs
- **Week 2**: Generate hooks, create wrappers
- **Week 3**: Test and validate
- **Week 4**: Remove axios

---

*Document Version: 1.0*
*Date: 2025-08-19*
*Status: Analysis Complete*