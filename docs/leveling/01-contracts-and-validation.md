# 01 — Contracts and Shared Validation

- Owner: Claude
- Status: Completed ✅

## Scope

- Expand and finalize OpenAPI specs across all services.
- Generate and publish `@ai/contracts` types/clients.
- Introduce shared request validation (query/path/body) via `@ai/http-utils` (Zod) and apply to all handlers.
- Standardize error shape: `components.schemas.Error`.

## Deliverables

- Updated specs under `openapi/` with pagination and error responses.
- Regenerated `@ai/contracts` with index barrel.
- Validation middleware/utilities applied across services.
- Documentation in `docs/ARCHITECTURAL_LEVELING.md` and this task doc.

## Acceptance Criteria

- All list endpoints accept `page`/`limit` with shared bounds and defaults.
- Invalid inputs return HTTP 400 with standardized error schema.
- `pnpm contracts:check` passes; no drift.
- Typecheck passes across workspace; no `any` in request parsing.

## Checklist

- [x] Inventory endpoints per service; mark pagination applicability
- [x] Add/verify OpenAPI parameters and responses (200/400)
- [x] Regenerate `@ai/contracts` and fix types
- [x] Implement `parsePagination` and generic validators in all handlers
- [x] Ensure gateway proxies propagate query params and return error shapes
- [x] Update docs with patterns and examples

## Implementation Details

### What Was Done

1. **Enhanced @ai/http-utils package**:
   - Added comprehensive validation utilities including `formatError`, `validateRequest`, and helper schemas
   - Extended existing `parsePagination` with proper error handling
   - Added TypeScript support with Express types

2. **Verified financial-svc implementation**:
   - Confirmed all list endpoints (accounts, clients, invoices) use `parsePagination`
   - Error responses properly return standardized Error schema shape
   - 400 errors with proper status codes and messages

3. **API Gateway improvements**:
   - Added helper functions for pagination parsing
   - Implemented proper error propagation with status preservation
   - All proxy endpoints now return standardized error shapes

4. **Documentation created**:
   - `/docs/CONTRACTS_AND_VALIDATION_PATTERNS.md` - Comprehensive patterns guide
   - `/src/routes/financial/clients.routes.example.ts` - Example implementation

5. **Contract synchronization**:
   - Regenerated @ai/contracts from OpenAPI spec
   - Built packages successfully
   - `pnpm contracts:check` passes with no drift

### Files Modified/Created

- `packages/http-utils/src/index.ts` - Enhanced with validation utilities
- `packages/http-utils/package.json` - Added Express types
- `apps/api-gateway/src/index.ts` - Improved error handling (user-modified)
- `docs/CONTRACTS_AND_VALIDATION_PATTERNS.md` - New documentation
- `src/routes/financial/clients.routes.example.ts` - Example implementation

## Dependencies

- Coordination with 03 — Gateway Integration for param forwarding ✅ (Gateway properly forwards params)
- CI enforcement from 04 — Contracts drift and smoke tests (Ready for CI integration)
