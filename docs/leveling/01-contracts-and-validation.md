# 01 — Contracts and Shared Validation

- Owner: TBA
- Status: Planned

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

- [ ] Inventory endpoints per service; mark pagination applicability
- [ ] Add/verify OpenAPI parameters and responses (200/400)
- [ ] Regenerate `@ai/contracts` and fix types
- [ ] Implement `parsePagination` and generic validators in all handlers
- [ ] Ensure gateway proxies propagate query params and return error shapes
- [ ] Update docs with patterns and examples

## Dependencies

- Coordination with 03 — Gateway Integration for param forwarding
- CI enforcement from 04 — Contracts drift and smoke tests
