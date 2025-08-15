# Restore Financial Integration and Frontend Credentials CRUD (New Architecture)

## Scope

- Restore the previously working frontend credentials CRUD and GoCardless sync under the new multi-service, contract-first architecture.
- Keep DB-backed integration configs (encrypted/masked) via `api-gateway`.
- Ensure `financial-svc` uses GoCardless creds from DB and proxies are wired through the gateway.

## Current Regressions Observed

- Missing `financial.integration_configs` table in current DB instance caused 5xx/404s.
- Gateway did not include new GoCardless sync proxies until rebuilt.
- Some curl POSTs failed due to body-parser rejecting malformed JSON.
- Frontend app location is not present in this monorepo (likely a separate repo or service), so UI could not be brought up from here without the correct path.

## Immediate Recovery (Backend)

1. Create schema/table (idempotent) to unblock gateway CRUD
   - Create `financial` schema.
   - Create `financial.integration_configs` with columns: `user_id NULL`, `integration_type`, `config_key`, `config_value`, `is_encrypted`, `is_global`, `description`, `metadata jsonb`, timestamps, indexes, and `updated_at` trigger.
   - Avoid FKs to `users` to prevent boot failures; add later if needed.
2. Rebuild and restart
   - Rebuild `apps/api-gateway` and `apps/financial-svc` images with `pnpm deploy --legacy` pattern.
   - Start via `infra/compose/docker-compose.dev.yml` and wait for `/health/ready`.
3. Verify Integrations API via gateway
   - GET `/api/integrations/types`.
   - POST/PUT/GET/DELETE `/api/integrations/configs` payloads using proper JSON.
4. Wire GoCardless sync through gateway
   - Ensure proxies exist in `apps/api-gateway/src/index.ts`:
     - `POST /api/financial/gocardless/sync/accounts`
     - `POST /api/financial/gocardless/sync/transactions` (body `{ accountId }`).
   - Test sync endpoints via gateway and confirm status codes and error bodies.
5. Accounts/Transactions endpoints
   - Confirm `/api/financial/accounts` and `/api/financial/transactions` list with pagination and consistent error shapes.

## Frontend Restoration

- Locate the frontend app (not present under `apps/` in this repo). Options:
  - If separate repo: clone/start it, set base API to the gateway (http://localhost:3005).
  - If served by gateway or another service: provide path, add docker-compose service, and map port.
- UI expectations to match legacy:
  - List integration types and existing configs (masked values).
  - Create/Update/Delete GoCardless `secret_id`, `secret_key`, optional `base_url`.
  - Trigger GoCardless sync (accounts first, transactions per account).
  - Show accounts and transactions with pagination and consistent error displays.

## Contract-First Alignment

- Keep `openapi/` as the source of truth and continue generating `@ai/contracts` types.
- Ensure gateway routes and financial-svc handlers conform to the spec (pagination, error shapes).
- Add drift checks in CI (`contracts:check`).

## Migration Plan (Durable)

1. Patch or add migration to create `financial` schema and `integration_configs` table with required columns and trigger.
2. Ensure Prisma services keep the entrypoint pattern (wait for DB, `prisma generate`, `migrate deploy`).
3. Remove any hard FK to `users` unless the table exists beforehand.

## Testing Plan

- Backend:
  - Unit: financial-svc GoCardless helpers (`getAccessToken`, `listAccounts`, `listTransactions`) with mocked HTTP.
  - Integration: gateway CRUD for `/api/integrations/configs` including encryption/masking.
  - E2E: compose up stack, set dummy creds, assert endpoints return expected 4xx/5xx, seed data path, list accounts pagination.
- Frontend:
  - UI tests for credentials CRUD flows; verify masked values and update behavior.
  - Manual run against http://localhost:3005 to confirm sync buttons and listings.

## Rollout Plan

- Save current work on feature branch.
- Create migration patch PR to `main` (schema/table creation).
- Merge after CI passes; deploy dev; verify frontend flows.
- Then implement production rollout with DB backup and canary.

## Backout Plan

- If migration causes issues, drop only the new objects created by the patch (schema/table/trigger).
- Revert gateway proxies if necessary and redeploy previous stable images.

## Commands (Reference)

- Rebuild gateway: `docker compose -f infra/compose/docker-compose.dev.yml up -d --build api-gateway`
- Rebuild financial-svc: `docker compose -f infra/compose/docker-compose.dev.yml up -d --build financial-svc`
- Test endpoints:
  - `curl -s http://localhost:3005/api/integrations/types`
  - `curl -s --json '{"integrationType":"gocardless","configKey":"secret_id","configValue":"<ID>","isGlobal":true,"encrypt":true}' http://localhost:3005/api/integrations/configs`
  - `curl -i -X POST http://localhost:3005/api/financial/gocardless/sync/accounts`
  - `curl -s 'http://localhost:3005/api/financial/accounts?page=1&limit=5'`
