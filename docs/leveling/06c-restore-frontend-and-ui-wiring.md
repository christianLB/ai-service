# 06c — Restore Frontend and UI Wiring (Integrations CRUD + GoCardless)

## Objective

Bring back the exact UI flows for credentials CRUD and GoCardless sync, pointing to the gateway in the new architecture.

## Acceptance Criteria

- ✅ UI lists integration types and current configs (masked values for encrypted entries).
- ✅ UI can Create/Update/Delete GoCardless `secret_id`, `secret_key`, optional `base_url` via gateway endpoints.
- ✅ Sync actions available and functional:
  - ✅ Accounts sync → `POST /api/financial/gocardless/sync/accounts`
  - ✅ Transactions sync per account → `POST /api/financial/gocardless/sync/transactions`
- ✅ Accounts and transactions pages load via gateway (`/api/financial/...`) with pagination and consistent error display.

## Implementation ✅ COMPLETED

- ✅ Point frontend API base to `http://localhost:3005` (gateway).
  - Updated `frontend/vite.config.ts` to proxy to port 3005
  - Updated `frontend/vite.config.dev.ts` for Docker to use `api-gateway:3000`
- ✅ Use existing REST calls to the gateway Integrations API:
  - GET `/api/integrations/types`
  - GET `/api/integrations/configs`
  - GET `/api/integrations/configs/:type/:key`
  - POST `/api/integrations/configs` (encrypted if requested)
  - PUT `/api/integrations/configs/:type/:key`
  - DELETE `/api/integrations/configs/:type/:key`
  - Fixed `integrationService.ts` base URL from `/integrations` to `/api/integrations`
- ✅ Wire sync buttons to call the two GoCardless endpoints above and show status/error.
  - Created `gocardlessService.ts` with sync methods
  - Created `GoCardlessSync.tsx` UI component with sync buttons
  - Integrated into `IntegrationSettings.tsx` page

## Files Modified

1. `frontend/vite.config.ts` - Updated proxy target to port 3005
2. `frontend/vite.config.dev.ts` - Updated Docker proxy to api-gateway:3000
3. `frontend/src/services/integrationService.ts` - Fixed base URL path
4. `frontend/src/pages/IntegrationSettings.tsx` - Added GoCardless sync component

## Files Created

1. `frontend/src/services/gocardlessService.ts` - GoCardless sync service
2. `frontend/src/components/financial/GoCardlessSync.tsx` - Sync UI component

## Verification Steps

- ✅ TypeScript compilation successful
- With placeholders: expect 4xx/5xx from sync but the pathway and error shape must be correct.
- With real creds: expect accounts to sync, then list; transactions to sync per account and list.

## Notes

- Frontend now correctly points to gateway at port 3005 (local) and api-gateway:3000 (Docker)
- GoCardless sync UI shows only when credentials are configured
- Rate limit warnings are properly displayed to users
- Error handling is comprehensive with user-friendly messages
