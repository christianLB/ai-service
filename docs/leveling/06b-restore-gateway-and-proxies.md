# 06b — Restore API Gateway and Proxies (GoCardless)

## Objective

Ensure the `api-gateway` exposes the exact endpoints the frontend relies on and correctly proxies to `financial-svc`.

## Acceptance Criteria

- Proxies exist and return upstream status/body with consistent error shapes:
  - POST `/api/financial/gocardless/sync/accounts`
  - POST `/api/financial/gocardless/sync/transactions` (body: `{ accountId: string }`)
- Integrations CRUD (encrypted) works:
  - GET `/api/integrations/types`
  - GET `/api/integrations/configs`
  - GET `/api/integrations/configs/:type/:key`
  - POST `/api/integrations/configs`
  - PUT `/api/integrations/configs/:type/:key`
  - DELETE `/api/integrations/configs/:type/:key`
- Health endpoints OK: `/health/live`, `/health/ready`, `/metrics`.

## Implementation Status (2025-08-15)

### ✅ Completed

- **Integrations CRUD endpoints** - All 7 endpoints fully functional:
  - GET `/api/integrations/types` - Returns GoCardless, OpenAI, Claude, Email configs
  - GET `/api/integrations/configs` - Lists all configs (encrypted values masked)
  - GET `/api/integrations/configs/:type/:key` - Gets specific config
  - POST `/api/integrations/configs` - Creates new config with encryption
  - PUT `/api/integrations/configs/:type/:key` - Updates existing config
  - DELETE `/api/integrations/configs/:type/:key` - Removes config
  - POST `/api/integrations/test/:type` - Tests config validity
- **Health endpoints** - All operational:
  - `/health/live` - Returns `{"ok":true}`
  - `/health/ready` - Checks DB and Redis connectivity
  - `/metrics` - Prometheus metrics endpoint
- **Database connectivity** - Pool and Redis clients configured
- **Docker image rebuilt** - Container running with latest code

### ⚠️ Known Issue

- **GoCardless sync proxies** - Routes defined but Express returns 404:
  - Code exists in `apps/api-gateway/src/index.ts` (lines 657-679)
  - Compiled into `dist/index.js` (verified in container)
  - However, Express not registering these POST routes
  - Other POST routes (integrations) work correctly
  - Appears to be a route registration bug specific to these endpoints

### Implementation Details

- Routes moved from line 396 to line 657 (after integrations section)
- Container rebuilt with cache bust (2025-08-15-v2)
- Financial service connectivity verified
- All helper functions (encryption, error handling) operational

## Verification Commands

```bash
# Working endpoints
curl -s http://localhost:3005/api/integrations/types
curl -s http://localhost:3005/health/live
curl -s http://localhost:3005/health/ready

# Issue with these (return 404 despite code being present)
curl -X POST http://localhost:3005/api/financial/gocardless/sync/accounts
curl -X POST http://localhost:3005/api/financial/gocardless/sync/transactions \
  -H "Content-Type: application/json" -d '{"accountId":"test"}'
```

## Next Steps

- Investigate Express route registration issue
- Consider moving GoCardless routes to separate router module
- May require full docker-compose restart for clean state

## Rollback

- Previous image tagged as `compose_api-gateway:latest`
- Can revert source changes in `apps/api-gateway/src/index.ts`
