# 04 — CI Observability and Enforcement

- Owner: TBA
- Status: Planned

## Scope

- Strengthen CI to enforce contract/type drift, pagination behavior, and service health.
- Improve diagnostics: print HTTP status/body and dump container logs on failure.
- Ensure pnpm/corepack reliability and deterministic builds.

## Deliverables

- Updated workflows for contracts drift, build, smoke.
- Pagination smoke tests (defaults, bounds, invalids) for gateway/financial-svc; expand to other services.
- Standardized steps to collect logs and failing responses.

## Acceptance Criteria

- CI fails fast on contract drift or missing pagination semantics.
- Smoke tests pass on cold start with migrations.
- Clear logs on any failure to unblock rapid fixes.

## Checklist

- [ ] Harden pnpm setup and cache usage
- [ ] Add pagination smoke tests and jq assertions
- [ ] Dump logs on failure; include HTTP status and body
- [ ] Enforce `pnpm contracts:check` in PRs
- [ ] Add typecheck/build across workspace

## Dependencies

- 01/03 — Contracts and gateway semantics for smoke assertions
