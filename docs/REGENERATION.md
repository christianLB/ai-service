# Regeneration Plan (Contract-First, End-to-End)

This document tracks the aggressive regeneration of legacy modules into contract-first, type-safe services. The goal is a reliable, scalable app with end-to-end generation as the default.

## Principles
- Contract-first: Zod schemas and ts-rest contracts in `packages/contracts/**` are the single source of truth.
- End-to-end generation: schemas -> OpenAPI -> server routes -> typed clients.
- Incremental inclusion: only re-include modules in the build after they meet stability and test criteria.
- Security and operability as first-class citizens: input validation, auth, rate limits, logs, health, metrics.

## Architecture Flow
1) Define/extend Zod contracts in `packages/contracts/`.
2) Generate OpenAPI + ts-rest clients (`packages/clients/**`).
3) Implement server routes via `@ts-rest/express` matching contracts.
4) Implement Prisma-backed services.
5) Wire routes in `src/index.stable.ts`.
6) Expand `tsconfig.build.json` includes.
7) Add tests (unit + integration) and basic load/health checks.

## Phase 0 – Baseline
- [x] Stable backend entry: `src/index.stable.ts`
- [x] CI uses `npm run build:stable` on main
- [x] Dev DX: `dev:stable`, Postgres/Redis via `docker-compose.dev.yml`, `env.development.example`

## Phase 1 – Financial: Attachments (M2)
- [ ] Contracts: ensure complete attachment schemas in `packages/contracts/src/schemas/finance.ts`
- [ ] Server: `src/routes/financial/attachments.router.ts` via `@ts-rest/express`
- [ ] Service: `src/services/financial/attachments.service.ts` (Prisma + storage)
- [ ] Index: mount under `/api/financial/attachments` in `src/index.stable.ts`
- [ ] Build: include new route/service in `tsconfig.build.json`
- [ ] Tests: upload/download happy path, checksum/mime validation
- [ ] Docs: endpoint examples in `docs/api/financial-attachments.md`

## Phase 2 – Tagging (M3)
- [ ] Contracts: `packages/contracts/src/schemas/tagging.ts`
- [ ] Server: `src/routes/tagging.router.ts`
- [ ] Service: `src/services/tagging.service.ts`
- [ ] Index + Build inclusion, Tests, Docs

## Phase 3 – Trading (M4)
- [ ] Contracts: `packages/contracts/src/schemas/trading.ts` (accounts, exchanges, orders, positions)
- [ ] Phase 3a (Read-only + paper-only)
  - [ ] Server: `src/routes/trading.router.ts`
  - [ ] Service: abstraction over ccxt; paper exchange first
  - [ ] Index + Build inclusion, Tests, Docs
- [ ] Phase 3b (Write ops + feature flag)
  - [ ] Place/cancel orders, risk checks, idempotency

## CI/Quality Expansion (M5)
- [ ] Re-enable strict `quality-checks` on PRs
- [ ] Re-enable tests on PRs
- [ ] Expand stable build to include regenerated modules
- [ ] Remove stabilization-only exceptions from workflows

## Cross-Cutting Requirements
- [ ] Validation: zod input validation at boundaries
- [ ] Auth: JWT + role guards where applicable
- [ ] Security headers: `helmet`, CSP where feasible
- [ ] Rate limits: sensitive endpoints
- [ ] Observability: basic logging + request IDs + `/health` + metrics (Prom)
- [ ] Error contracts: typed error envelopes, HTTP code parity

## OpenAPI & Clients
- [ ] Ensure `scripts/generate-openapi.ts` runs cleanly (contract sanity)
- [ ] Publish or package generated clients in `packages/clients/**`

## Risks / Open Questions
- Storage backend for attachments (local + S3 later?)
- Trading exchange coverage: prioritize read-only and paper trades first
- Backward compatibility: maintain old URLs where feasible with 301/compat routes

## Working Notes
- Keep PRs small and vertical (contract + server + service + route + tests for one slice).
- Record deviations here; update checklists per PR.
