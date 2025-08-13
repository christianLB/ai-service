## Documento de implementación de arquitectura base con **servicios** y sincronía DB para `ai-service`

> **Objetivo:** entregar a GPT‑5 en Cursor un plan ejecutable para levantar una arquitectura con **múltiples servicios** (no solo monolito), mantener **sincronía sin dolor** de DB entre dev y prod, y establecer **Single Source of Truth** (OpenAPI + Prisma + config). Incluye blueprint de carpetas, `docker-compose`, healthchecks, migrations, contracts, workers y CI.

---

### 1) Topología de servicios (dentro del mismo repo y compose)

**Edge / Gateway / Dominios / Workers / Infra**

- **nginx-edge**: TLS, gzip, headers de seguridad.
- **api-gateway** (Fastify/Express): auth, RBAC, CORS, rate‑limit, tracing, _routing por dominio_.
- **financial-svc**: cuentas, transacciones, categorías, reportes.
- **trading-svc**: estrategias, conectores a exchanges, FSM de ejecución.
- **comm-svc**: webhooks/commands de Telegram y notificaciones.
- **ai-core**: orquestación de LLMs, prompts/templates, clasificación automática.
- **worker-financial** (BullMQ): `syncBank`, `autoCategorize`, backfills.
- **worker-trading** (BullMQ): ejecución de estrategias, gestión de órdenes.
- **db**: Postgres 16 (Prisma).
- **redis**: Redis 7 (colas/eventos y cache liviana).
- **monitoring (opcional)**: Prometheus + Grafana.

**Diagrama textual**

```
[client/web] → nginx-edge → api-gateway → { financial-svc | trading-svc | comm-svc | ai-core }
                                              ↓ events/queues (Redis)
                                 { worker-financial | worker-trading }
                                              ↓
                                           Postgres
```

---

### 2) Estructura de carpetas (monorepo pnpm)

```
apps/
  api-gateway/
  financial-svc/
  trading-svc/
  comm-svc/
  ai-core/
  worker-financial/
  worker-trading/
  web/
packages/
  contracts/          # OpenAPI → SDK TS + tipos
  trading/            # FSM y utilidades trading
  config/             # env zod + helpers comunes
  shared/             # utils, middlewares, logger
openapi/
  gateway.yaml        # solo rutas públicas (agrega refs a dominios)
  financial.yaml
  trading.yaml
  comm.yaml
  ai-core.yaml
prisma/
  schema.prisma
  migrations/
infra/
  nginx/
  compose/
    docker-compose.dev.yml
    docker-compose.production.yml
.github/workflows/
```

---

### 3) `.env.template` único + validación

Archivo raíz `.env.template` (no subir `.env` reales):

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@db:5432/ai_service
REDIS_URL=redis://redis:6379
JWT_SECRET=change-me
TELEGRAM_BOT_TOKEN=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

`packages/config/env.ts` valida con **zod** y exporta `env`. Todas las apps lo importan en el boot.

---

### 4) Docker Compose con healthchecks y arranque ordenado

`infra/compose/docker-compose.dev.yml` (extracto):

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ai_service
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres -d ${POSTGRES_DB:-ai_service}']
      interval: 5s
      timeout: 3s
      retries: 20

  redis:
    image: redis:7
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 20

  api-gateway:
    build: ../../apps/api-gateway
    env_file: ../../.env
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_healthy }
      financial-svc: { condition: service_healthy }
      trading-svc: { condition: service_healthy }
      comm-svc: { condition: service_healthy }
      ai-core: { condition: service_healthy }
    healthcheck:
      test: ['CMD', 'curl', '-fsS', 'http://localhost:3000/health/ready']
      interval: 5s
      timeout: 3s
      retries: 20

  financial-svc:
    build: ../../apps/financial-svc
    env_file: ../../.env
    depends_on:
      db: { condition: service_healthy }
    healthcheck:
      test: ['CMD', 'curl', '-fsS', 'http://localhost:3001/health/ready']
      interval: 5s
      timeout: 3s
      retries: 20

  trading-svc:
    build: ../../apps/trading-svc
    env_file: ../../.env
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_healthy }
    healthcheck:
      test: ['CMD', 'curl', '-fsS', 'http://localhost:3002/health/ready']
      interval: 5s
      timeout: 3s
      retries: 20

  comm-svc:
    build: ../../apps/comm-svc
    env_file: ../../.env
    depends_on:
      redis: { condition: service_healthy }
    healthcheck:
      test: ['CMD', 'curl', '-fsS', 'http://localhost:3003/health/ready']
      interval: 5s
      timeout: 3s
      retries: 20

  ai-core:
    build: ../../apps/ai-core
    env_file: ../../.env
    depends_on:
      redis: { condition: service_healthy }
    healthcheck:
      test: ['CMD', 'curl', '-fsS', 'http://localhost:3004/health/ready']
      interval: 5s
      timeout: 3s
      retries: 20

  worker-financial:
    build: ../../apps/worker-financial
    env_file: ../../.env
    depends_on:
      financial-svc: { condition: service_healthy }
      redis: { condition: service_healthy }

  worker-trading:
    build: ../../apps/worker-trading
    env_file: ../../.env
    depends_on:
      trading-svc: { condition: service_healthy }
      redis: { condition: service_healthy }

  nginx-edge:
    build: ../../infra/nginx
    depends_on:
      api-gateway: { condition: service_healthy }
```

**Entrypoints de servicios que tocan DB** (API de dominio y workers):

```
# entrypoint.sh
set -e
npx prisma migrate deploy
node dist/index.js
```

---

### 5) Health y métricas

Cada servicio HTTP debe exponer:

- `GET /health/live` → responde `{ok:true}`.
- `GET /health/ready` → ping a dependencias (DB/Redis).
- `GET /metrics` → `prom-client` con default metrics + contadores propios.

KPIs sugeridos:

- financial-svc: `transactions_synced_total`, `categorization_latency_ms`.
- trading-svc/worker-trading: `strategies_live`, `orders_sent_total`, `pnl_estimated`.
- gateway: `http_requests_total`, `http_request_duration_seconds`.

---

### 6) Single Source of Truth (contratos + tipos + config)

**OpenAPI** por dominio y un spec del gateway que referencia a los demás (con `$ref`).

- `openapi/financial.yaml`, `openapi/trading.yaml`, `openapi/comm.yaml`, `openapi/ai-core.yaml`.
- `openapi/gateway.yaml` incluye/une los paths públicos (versión v1).

**Generación (packages/contracts):**

- `openapi-typescript` → `src/generated.ts` (tipos de rutas por dominio).
- `openapi-fetch` → cliente tipado por dominio y para gateway.
- Target Makefile: `make contracts.generate` re‑genera todo y falla en CI si hay drift.

**Prisma como verdad del modelo:**

- `schema.prisma` → migrations con `prisma migrate dev` (local) y `prisma migrate deploy` (staging/prod/entrypoint).
- Constraints para idempotencia (ej., `unique (external_id)`, claves compuestas en transacciones).

**Config**: `.env.template` validado en runtime con zod + **tabla `integration_settings`** en DB para toggles sandbox/live y secretos por entorno/tenant (el binario no cambia por entorno).

---

### 7) Colas y eventos (Redis + BullMQ)

- **Queues**: `financial` (jobs: `syncBank`, `autoCategorize`), `trading` (jobs: `deploy`, `stop`, `tick`).
- **Eventos** (opcional con Redis Streams o pub/sub): `TransactionSynced`, `CategoryUpdated`, `ArbitrageOpportunityFound`, `TradeExecuted`.
- **Idempotencia**: locks por clave natural (p.ej., `sync:<accountId>:<yyyymm>`), y constraints DB.

---

### 8) Trading FSM mínima

`packages/trading/fsm.ts`

- Estados: `Idle → Live → Stopped`.
- Métodos: `start()`, `stop()`.
- Loop `Live`: tick configurable; por ahora, dummy (lee orderbooks simulado o consulta balance/latencia) y emite métricas.

API en **trading-svc**:

- `POST /v1/trading/deploy` → encola `deploy`.
- `POST /v1/trading/stop` → encola `stop`.

Worker **worker-trading**:

- Procesa jobs, mueve estado de la FSM, registra métricas y logs estructurados.

---

### 9) Plan de implementación por commits (para Cursor / GPT‑5)

**Commit 1 — Bootstrap de servicios + env**

- Crear `apps/*` bases (gateway y dominios) con server minimal y `env` importado.
- `.env.template` + `packages/config/env.ts` con zod.

**Commit 2 — Health/Ready/Metrics**

- Endpoints `/health/live`, `/health/ready`, `/metrics` en todos los servicios HTTP.

**Commit 3 — Prisma y entrypoints**

- `schema.prisma` consolidado, `migrations/` iniciales.
- `entrypoint.sh` con `prisma migrate deploy` en financial, trading y workers.

**Commit 4 — OpenAPI como fuente canónica**

- Especificaciones por dominio + `gateway.yaml`.
- `packages/contracts` con scripts para generar `generated.ts` por dominio + cliente gateway.
- `make contracts.generate` en la raíz.

**Commit 5 — Redis + BullMQ**

- Config base en `shared/queue.ts`.
- Queues `financial` y `trading`; producers en servicios; consumers en workers.

**Commit 6 — Trading FSM mínima**

- `packages/trading/fsm.ts` + rutas `deploy/stop` en trading-svc + `worker-trading` básico.

**Commit 7 — Nginx Edge + routing**

- nginx que enruta `/{api,v1}` → api-gateway y static web → `web`.
- Headers de seguridad (HSTS, X-CTO, CSP básica con nonce si aplica).

**Commit 8 — CI básico**

- Action: install (pnpm), lint, typecheck, `make contracts.generate`, build, (opcional) docker buildx bake.

---

### 10) Criterios de aceptación

- `docker-compose up` levanta **db → redis → servicios de dominio → gateway → nginx** sin carreras.
- Todos los servicios responden a `/health/ready` y el compose espera a que estén healthy.
- `prisma migrate deploy` corre automáticamente en cada servicio con DB.
- `make contracts.generate` produce clientes TS; un cambio en `openapi/*` sin regenerar rompe CI.
- `POST /v1/trading/deploy` y `.../stop` encolan y el `worker-trading` cambia estado de la FSM.
- `/metrics` expone métricas default + contadores básicos por servicio.

---

### 11) Playbook de despliegue (dev → prod/NAS)

- **Dev**: `make db.up && pnpm i && make contracts.generate && docker compose -f infra/compose/docker-compose.dev.yml up`.
- **Build**: cada app con Dockerfile propio; entrada `entrypoint.sh` con `migrate deploy`.
- **Prod/NAS**: mismo compose (production) con imágenes versionadas, secrets por entorno y backups programados.

---

### 12) Paralelización segura

- En paralelo: **Commit 1/2/4** (bootstrap, health, contratos).
- En paralelo: **Commit 5/6** (colas + FSM trading) una vez esté Redis.
- **CI** (Commit 8) cuando contratos generan.

---

### 13) Notas de seguridad

- Nada de secretos en git. `.env.template` sólo placeholders.
- Headers de seguridad en nginx. Tokens con caducidad. RBAC en gateway.
- Auditoría básica en tabla `event_log` con `traceId` por request/job.

> Con este documento, Cursor/GPT‑5 debe poder scaffoldear servicios, wiring de colas, contratos y pipelines de build/CI, dejando la base lista para iterar estrategias de trading y reporting financiero sin deuda estructural.
