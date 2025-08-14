# 02 — Prisma Migrations and DB Parity

- Owner: TBA
- Status: Planned

## Scope

- Ensure multi-schema Prisma (`financial`, `public`, `tagging`, `trading`) works in fresh environments.
- Entry points pre-create schemas and apply `prisma migrate deploy` at boot.
- Replicate robust entrypoint pattern across all Prisma services and workers.
- Add indices to support common pagination/filter queries.

## Deliverables

- Entry scripts that run `prisma generate` and `migrate deploy` with retries.
- Schema pre-creation step (`CREATE SCHEMA IF NOT EXISTS ...`).
- New migrations for indices/backfills where needed.
- Docs on DB parity and migration flow.

## Acceptance Criteria

- Fresh CI/dev bring-up succeeds with no "relation does not exist" errors.
- All Prisma services boot reliably with DB wait + migrate deploy.
- Pagination queries use indices as validated by EXPLAIN or observed timings.

## Checklist

- [ ] Audit migrations for schema creation; add pre-creation where needed
- [ ] Replicate entrypoint to trading-svc and worker services
- [ ] Add required indices for list endpoints (clients, invoices, accounts, transactions)
- [ ] Verify prisma client generation in runtime images
- [ ] Update docs and add smoke covering cold-start migrations

## Dependencies

- 04 — CI jobs to exercise cold start and migrations
