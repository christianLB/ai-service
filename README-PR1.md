
# PR1 – packages/contracts + clients/financial (contract‑first)

Incluye:
- `packages/contracts`: esquemas Zod de dominio (Money, Currency, Account, Transaction, Category, Document) y contrato ts-rest para Finanzas.
- `packages/clients/financial`: cliente TypeScript generado desde el contrato.
- `scripts/generate-openapi.ts`: script para generar `openapi/ai-service.json`.

## Pasos
```bash
git checkout -b feat/contracts-and-clients
pnpm -w add zod zod-to-openapi @ts-rest/core @ts-rest/express @ts-rest/open-api
pnpm install
pnpm dlx tsx scripts/generate-openapi.ts # opcional
pnpm -w tsc -p packages/contracts/tsconfig.json
pnpm -w tsc -p packages/clients/financial/tsconfig.json
git add .
git commit -m "feat(contracts): Zod domain schemas + ts-rest financial contract and client"
git push -u origin feat/contracts-and-clients
```
