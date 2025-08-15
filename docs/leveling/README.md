# Architectural Leveling — Parallel Workstream

This directory organizes the epic into four parallelizable subtasks. Each task doc includes scope, deliverables, acceptance criteria, checklists, and dependencies.

Source document: `../ARCHITECTURAL_LEVELING.md`

## Status Overview

| Task                                                  | Owner           | Status       | Completion |
| ----------------------------------------------------- | --------------- | ------------ | ---------- |
| 01 - Contracts and Validation                         | AI Service Team | ✅ COMPLETED | 100%       |
| 02 - Prisma Migrations and DB Parity                  | AI Service Team | ✅ COMPLETED | 100%       |
| 03 - Gateway Integration and Pagination               | AI Service Team | ✅ COMPLETED | 100%       |
| 04 - CI Observability and Enforcement                 | AI Service Team | ✅ COMPLETED | 100%       |
| 05 - Frontend/Backend Integration and Stabilization   | AI Service Team | ✅ COMPLETED | 100%       |
| 06a - Restore DB and Migrations (integration_configs) | AI Service Team | In Progress  | 0%         |
| 06b - Restore Gateway and Proxies (GoCardless)        | AI Service Team | In Progress  | 0%         |
| 06c - Restore Frontend and UI Wiring                  | AI Service Team | Planned      | 0%         |
| 06d - Postmortem: Regressions and Remediation         | AI Service Team | Planned      | 0%         |

## Subtasks

- 01-contracts-and-validation.md — Contract-first rollout and shared request validation (✅ Completed)
- 02-prisma-migrations-and-db-parity.md — Prisma migrations, multi-schema setup, and runtime parity (✅ Completed)
- 03-gateway-integration-and-pagination.md — Gateway proxies, pagination consistency, and error shapes (✅ Completed)
- 04-ci-observability-and-enforcement.md — CI smoke tests, drift checks, and observability (✅ Completed)
- 05-frontend-backend-integration-and-stabilization.md — End-to-end integration hardening (✅ Completed)
- 06a-restore-db-and-migrations.md — Restore `financial.integration_configs` schema/table
- 06b-restore-gateway-and-proxies.md — Restore GoCardless sync proxies and integrations CRUD
- 06c-restore-frontend-and-ui-wiring.md — Restore UI wiring for credentials CRUD and sync
- 06d-postmortem-regressions.md — Incident analysis and remediation plan

## Progress

- **5 core tasks completed** (100% of 01–05)
- Restoration track (06a–06c) initiated; postmortem (06d) planned
- Work proceeds in parallel with strict CI/health gates
