# 03 — Gateway Integration and Pagination

- Owner: Completed
- Status: ✅ Completed

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

- [x] Inventory missing proxies; implement using `@ai/contracts` client
- [x] Ensure query passthrough and pagination metadata in responses
- [x] Align error handling with shared schema
- [x] Add smoke checks for defaults/bounds/invalids (existing in CI)
- [x] Document patterns in leveling doc

## Implementation Details

### Completed Changes

1. **Helper Functions Added**:
   - `parsePaginationQuery()`: Centralized pagination parameter parsing
   - `handleProxyError()`: Consistent error handling with status preservation

2. **Status Code Preservation**:
   - All proxy endpoints now preserve upstream HTTP status codes
   - 400 errors from validation are properly forwarded
   - 404 errors for not found resources are preserved
   - 502 used only for actual gateway/network errors

3. **Consistent Error Response Structure**:
   - All errors return `{ message: string, code: string }` format
   - Error codes: 'BAD_REQUEST', 'NOT_FOUND', 'GATEWAY_ERROR'
   - Proper error messages for each scenario

4. **Pagination Metadata**:
   - All list endpoints include `page`, `limit`, `total` in responses
   - Fallback values provided when service unavailable
   - Query parameters properly forwarded to upstream services

5. **TypeScript Compatibility**:
   - Fixed openapi-fetch result handling for proper type checking
   - Used `!result.data` pattern to avoid TypeScript narrowing issues
   - All endpoints properly typed with contract types

### Notes

- Transactions and attachments endpoints mentioned in scope don't exist yet in financial-svc
- Smoke tests for pagination validation already exist in CI workflows
- Gateway now provides consistent error handling across all financial endpoints

## Dependencies

- 01 — Contracts and validation changes
