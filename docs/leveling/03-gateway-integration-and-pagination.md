# 03 — Gateway Integration and Pagination

- Owner: TBA
- Status: Planned

## Scope

- Ensure `apps/api-gateway` proxies all financial endpoints with full query param passthrough.
- Normalize response envelope to include pagination metadata (`page`, `limit`, `total`, etc.) where applicable.
- Stabilize fallbacks and typed proxying via generated clients.

## Deliverables

- Gateway routes for accounts/clients/invoices (and upcoming: transactions, attachments).
- Consistent pagination metadata and error shapes.
- Tests/smoke verifying correct forwarding and shapes.

## Acceptance Criteria

- Proxies forward `page`/`limit` and preserve status codes (200/400).
- Fallbacks include `page` and `limit` for CI parsing.
- Typecheck clean with generated client usage.

## Checklist

- [ ] Inventory missing proxies; implement using `@ai/contracts` client
- [ ] Ensure query passthrough and pagination metadata in responses
- [ ] Align error handling with shared schema
- [ ] Add smoke checks for defaults/bounds/invalids
- [ ] Document patterns in leveling doc

## Dependencies

- 01 — Contracts and validation changes
