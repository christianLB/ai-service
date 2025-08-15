# Checkpoint — Epic: Services Split, SSoT & DB Sync

_Fecha:_ 2025-08-15 · _Rama evaluada:_ `feat/architectural-leveling-epic`

## 1) Alcance de la épica

Dividir el servicio en **apps** por dominio detrás de un **api-gateway**, establecer **Single Source of Truth** (OpenAPI→SDK + Prisma), asegurar **sincronía DB** (migrate deploy en entrypoints), incorporar **health/readiness/metrics** y **queues BullMQ + FSM trading**, y reforzar **CI/paridad dev↔prod/NAS**.

---

## 2) Snapshot del repositorio (lo que ya está)

- **Rama de épica creada**: `feat/architectural-leveling-epic`.
- **Estructura multi‑app iniciada**: carpeta `apps/` presente (gateway + dominios a crear/ajustar).
- **Compose infra separado**: carpeta `infra/compose/` (topología para dev/prod a alinear).
- **OpenAPI base**: carpeta `openapi/` ya existe (falta confirmar specs por dominio).
- **Contratos**: paquete `packages/contracts/` existe con `src/` (falta generator/consumo consistente).
- **DB**: `prisma/` + `migrations/` presentes (falta entrypoint por servicio; hoy hay `entrypoint.sh` general).
- **Compose raíz**: siguen los `docker-compose.*` históricos (prod, nas, test).
- **Infra**: `nginx/` y `monitoring/` ya en repo.
- **Frontend**: `frontend/` presente, pendiente de adoptar cliente tipado.
- **Artefactos previos**: `PR1-contracts-and-clients.zip` + `README-PR1.md` (insumo para SSoT).
- **Higiene pendiente**: `.server-3001.pid` aún en el repo.

> Nota: no se encontró `leveling/` en la rama; este checkpoint lo reemplaza como documento fuente para coordinar.

---

## 3) Estado por **fases** (semáforo)

> Todo se implementa **en la misma rama/PR**. Cada fase puede tener subtareas paralelas, pero no se abrirán PRs separados.

| Fase                                | Alcance                                                                                                   | Estado | Qué hay                                    | Qué falta                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------ | ------------------------------------------------------------------------------- |
| **F1 — Scaffold de servicios**      | Crear `apps/*` (gateway, financial, trading, comm, ai-core, workers) con servers mínimos y `/health/live` | 🟡     | Carpeta `apps/` iniciada                   | Confirmar sub‑apps, servers mínimos, rutas base                                 |
| **F2 — Health/Ready/Metrics**       | `/health/ready` + `/metrics` en cada HTTP; compose con `condition: service_healthy`                       | 🔴     | —                                          | Endpoints de salud/metrics y healthchecks en compose                            |
| **F3 — OpenAPI → SDK (SSoT)**       | Specs por dominio + `gateway.yaml`; `packages/contracts` + generator; FE/API usan cliente tipado          | 🟡     | `openapi/` + `packages/contracts/` existen | Especificaciones por dominio, script `contracts.generate`, adopción obligatoria |
| **F4 — Redis/BullMQ + FSM trading** | Servicio `redis`; FSM mínima; endpoints `deploy/stop`; `worker-trading`                                   | 🔴     | —                                          | Wiring de colas, FSM y worker operativo                                         |
| **F5 — Env + Entrypoints Prisma**   | `.env.template` validado (zod) y `entrypoint.sh` por app/worker con `migrate deploy`                      | 🟡     | `entrypoint.sh` global presente            | Validación runtime y entrypoints por servicio                                   |
| **F6 — CI + Paridad prod/NAS**      | Workflow (lint, typecheck, tests, generate, build); composes alineados                                    | 🟡     | `.github/workflows/` y composes históricos | Job completo + compose prod/NAS con los mismos servicios/healthchecks           |
| **F7 — Cleanup & Guardrails**       | .gitignore artefactos; headers de seguridad; `event_log` con `traceId`                                    | 🟡     | nginx/monitoring ya están                  | Limpiar artefactos, activar headers, crear auditoría mínima                     |

## 4) Gaps y riesgos

Gaps y riesgos

1. **Ausencia de health/metrics** por servicio → carreras de arranque y poca observabilidad.
2. **Contratos aún no canónicos** → riesgo de drift entre FE/API.
3. **FSM/colas trading sin wiring** → bloquea pruebas de estrategia y orquestación.
4. **Entry points por app** sin `migrate deploy` → inconsistencias de esquema.
5. **CI sin regla de ruptura por contratos** → integraciones frágiles.
6. **Paridad dev/prod incompleta** (compose duplicados) → sorpresas en prod/NAS.

---

## 5) **Fases** de ejecución (misma rama/PR)

### F1 — Scaffold de servicios

**Objetivo:** crear sub‑apps y servers mínimos.

- `apps/api-gateway`, `apps/financial-svc`, `apps/trading-svc`, `apps/comm-svc`, `apps/ai-core`, `apps/worker-financial`, `apps/worker-trading`.
- En cada HTTP: `GET /health/live` (dummy).
  **DoD:** `docker compose up` levanta todos y responden a `/health/live`.

### F2 — Health/Ready/Metrics + Compose ordenado

**Objetivo:** observabilidad y arranque determinista.

- `GET /health/ready` (pings a DB/Redis).
- `GET /metrics` con `prom-client`.
- `infra/compose/docker-compose.dev.yml`: `depends_on: condition: service_healthy` cadena db→redis→dominios→gateway→nginx.
  **DoD:** `curl :port/metrics` devuelve métricas default; compose espera correctamente.

### F3 — OpenAPI por dominio + Generator de SDK (SSoT)

**Objetivo:** contrato canónico.

- `openapi/{financial,trading,comm,ai-core}.yaml` + `openapi/gateway.yaml`.
- `packages/contracts`: `openapi-typescript` + `openapi-fetch` + script `generate`.
- FE/API migran a cliente tipado.
  **DoD:** CI falla si hay drift; build FE/API usa solo el SDK.

### F4 — Redis + BullMQ + FSM Trading

**Objetivo:** orquestación y robot mínimo.

- Compose: `redis`.
- `packages/trading/fsm.ts` (Idle→Live→Stopped).
- `trading-svc`: `POST /v1/trading/deploy|stop` → `Queue("trading")`.
- `worker-trading`: procesa jobs y emite métricas.
  **DoD:** Logs muestran transiciones; `/metrics` refleja contadores.

### F5 — Validación de env + Entrypoints Prisma

**Objetivo:** arrancar solo con config válida y esquema aplicado.

- `packages/config/env.ts` (zod) consumido por todas las apps.
- `entrypoint.sh` por app/worker con `prisma migrate deploy`.
  **DoD:** falla temprano si falta env; migrations aplicadas en boot.

### F6 — CI Pipeline + Paridad prod/NAS

**Objetivo:** calidad y coherencia por entorno.

- Workflow: install (pnpm), lint, typecheck, tests, `make contracts.generate`, build.
- Alinear `docker-compose.production.yml` y `docker-compose.nas.yml` con servicios y healthchecks.
  **DoD:** no se puede mergear si CI falla; prod/NAS usa misma topología que dev.

### F7 — Cleanup & Guardrails

**Objetivo:** higiene y seguridad.

- Eliminar artefactos (`.server-3001.pid`) y agregar a `.gitignore`.
- Headers de seguridad en `nginx` (HSTS, CSP básica); `event_log` + `traceId`.
  **DoD:** repo limpio; headers visibles; auditoría mínima operativa.

## 6) Checklists operativas

Checklists
(Se mantienen como en el documento anterior para cada área: servicios, contratos, trading, DB/entrypoints, CI/paridad, higiene).

---

## 7) Comandos de validación rápida

```bash
# Health + metrics
curl -fsS http://localhost:3001/health/live
curl -fsS http://localhost:3001/health/ready
curl -fsS http://localhost:3001/metrics | head

# Contratos
pnpm -w run generate && git diff --exit-code packages/contracts/src || echo "Drift detectado"

# Trading (cuando esté)
curl -X POST http://localhost:3002/v1/trading/deploy -d '{}' -H 'Content-Type: application/json'
```

---

## 8) Decisiones abiertas

- Framework para gateway: Fastify recomendado.
- Routing gateway: subpath inicial (`/v1/financial/*`).
- Mocks de OpenAPI para FE: recomendado `msw`.

---

## 9) Conclusión

La rama ya tiene la base para multi‑app e infraestructura de compose, pero faltan fases críticas para llegar a la **observabilidad completa, contratos canónicos, orquestación de trading y CI robusto**. Este checkpoint guía la ejecución secuencial dentro de la misma rama/PR.
