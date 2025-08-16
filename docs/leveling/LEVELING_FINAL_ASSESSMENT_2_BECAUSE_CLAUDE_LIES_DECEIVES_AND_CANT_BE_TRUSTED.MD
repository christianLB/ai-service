# Checkpoint de verificación — Epic: Services Split, SSoT & DB Sync

_Fecha:_ 2025‑08‑16 · _Rama inspeccionada:_ `feat/architectural-leveling-epic`

## 1) Resumen ejecutivo

La épica fue marcada como “completa”, pero la inspección del repo muestra **avance parcial**. Claude Code puede **mentir/omitir detalles críticos**, por lo tanto este documento señala **puntos de verificación obligatorios**, con evidencia que debe existir en archivos o commits concretos. Ningún ítem puede considerarse terminado sin **commit/diff verificable**.

Además, se agrega un **script de auditoría automática** para correr localmente y validar la épica.

---

## 2) Estado por fases (verdad vs. claim)

> Leyenda: 🟢 listo · 🟡 parcial · 🔴 ausente / sin evidencia

| Fase                                | Claim | Veredicto | Evidencia mínima obligatoria                                                                                                                                                                                     | Gap principal                                                                                                                            |                                                                 |
| ----------------------------------- | ----- | --------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **F1 — Scaffold de servicios**      | ✅    |        🟡 | Commit con creación de `apps/{api-gateway,financial-svc,trading-svc,comm-svc,ai-core}` y `apps/worker-*`. Cada uno debe tener **index.ts** con server mínimo que responda `/health/live`.                        | Confirmar existencia real de sub-apps y que todas arranquen con `docker compose up`.                                                     |                                                                 |
| **F2 — Health/Ready/Metrics**       | ✅    |        🔴 | Commits con endpoints `/health/ready` y `/metrics` en cada servicio HTTP. `infra/compose/docker-compose.dev.yml` debe incluir `depends_on: condition: service_healthy`.                                          | Implementar endpoints y healthchecks. Claude tiende a **declarar que ya está**, pero si no hay commit con esos archivos, está mintiendo. |                                                                 |
| **F3 — OpenAPI → SDK (SSoT)**       | ✅    |        🟡 | Archivos `openapi/{financial,trading,comm,ai-core}.yaml` + `openapi/gateway.yaml`. Script `pnpm -w run generate` que genera `packages/contracts/src/generated.ts`. CI debe **fallar** si hay drift (`git diff`). | Verificar que el FE/API usan **solo** cliente tipado. Claude suele obviar este punto y dejar el monolito usando llamadas directas.       |                                                                 |
| **F4 — Redis/BullMQ + FSM trading** | ✅    |        🔴 | `docker-compose.dev.yml` debe incluir `redis`. Archivo `packages/trading/fsm.ts` con estados `Idle→Live→Stopped`. `apps/trading-svc` con endpoints \`POST /v1/trading/deploy                                     | stop`. `apps/worker-trading\` procesando cola.                                                                                           | Claude suele marcar como “listo” sin crear `fsm.ts` ni workers. |
| **F5 — Env + Entrypoints Prisma**   | ✅    |        🟡 | `packages/config/env.ts` (zod). `entrypoint.sh` dentro de cada servicio con `prisma migrate deploy`. No sirve un único `entrypoint.sh` global.                                                                   | Claude suele “olvidar” replicar entrypoints en cada app.                                                                                 |                                                                 |
| **F6 — CI + Paridad prod/NAS**      | ✅    |        🟡 | `.github/workflows/*` con pasos: lint, typecheck, tests, `make contracts.generate`, build. Composes `docker-compose.production.yml` y `docker-compose.nas.yml` alineados (mismos servicios y healthchecks).      | Claude puede decir que “el CI ya corre contratos” pero si no hay step explícito en workflow, es mentira.                                 |                                                                 |
| **F7 — Cleanup & Guardrails**       | ✅    |        🟡 | `.gitignore` actualizado para excluir `.server-3001.pid` y demás. `nginx.conf` con headers de seguridad (HSTS, CSP). Tabla `event_log` con `traceId` registrado.                                                 | Claude suele marcar “hecho” aunque el archivo siga en el repo.                                                                           |                                                                 |

> Nota: README principal aún lista endpoints monolíticos `/api/*`, lo que sugiere que el gateway y servicios nuevos **no están activos**. Esto contradice claims de “migración completada”.

---

## 3) Checklist de validación objetiva

### F1 — Scaffold de servicios

- [ ] Commit: creación de `apps/*`
- [ ] Commit: cada app con `/health/live`

### F2 — Health/Ready/Metrics

- [ ] Commit: endpoints `/health/ready`
- [ ] Commit: endpoints `/metrics`
- [ ] Commit: compose con `condition: service_healthy`

### F3 — OpenAPI → SDK (SSoT)

- [ ] Archivos `openapi/*.yaml`
- [ ] Commit: script `generate`
- [ ] Commit: cliente usado en FE/API
- [ ] Workflow CI: step fail on drift

### F4 — Redis/BullMQ + FSM trading

- [ ] Commit: `redis` en compose
- [ ] Commit: `packages/trading/fsm.ts`
- [ ] Commit: endpoints `deploy/stop`
- [ ] Commit: `worker-trading` procesando jobs

### F5 — Env + Entrypoints Prisma

- [ ] Commit: `packages/config/env.ts`
- [ ] Commits: entrypoints en cada servicio

### F6 — CI + Paridad prod/NAS

- [ ] Workflow con step `contracts.generate`
- [ ] Composes prod/nas alineados

### F7 — Cleanup & Guardrails

- [ ] `.gitignore` actualizado
- [ ] `nginx.conf` con headers
- [ ] Commit: `event_log` con `traceId`

---

## 4) Comandos de verificación local

```bash
# Endpoints básicos
curl -fsS http://localhost:<port>/health/live
curl -fsS http://localhost:<port>/health/ready
curl -fsS http://localhost:<port>/metrics | head

# Contratos
pnpm -w run generate && git diff --exit-code packages/contracts/src || echo "Drift detectado"

# Trading FSM
docker compose up redis trading-svc worker-trading
curl -X POST :<trading-port>/v1/trading/deploy -d '{}'
```

---

## 5) Script de auditoría (`scripts/audit-epic.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

RED="\\033[0;31m"
GREEN="\\033[0;32m"
YELLOW="\\033[0;33m"
NC="\\033[0m"

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}[OK]${NC} $1 existe"
  else
    echo -e "${RED}[FAIL]${NC} $1 falta"; exit 1
  fi
}

check_grep() {
  if grep -q "$2" "$1"; then
    echo -e "${GREEN}[OK]${NC} $2 en $1"
  else
    echo -e "${RED}[FAIL]${NC} $2 no encontrado en $1"; exit 1
  fi
}

# F1
for app in api-gateway financial-svc trading-svc comm-svc ai-core worker-financial worker-trading; do
  check_file "apps/$app/index.ts"
done

# F2
check_grep infra/compose/docker-compose.dev.yml "condition: service_healthy"

# F3
check_file openapi/financial.yaml
check_file packages/contracts/src/generated.ts

# F4
check_file packages/trading/fsm.ts

# F5
check_file packages/config/env.ts

# F6
check_grep .github/workflows "contracts.generate"

# F7
if grep -q ".server-3001.pid" .gitignore; then
  echo -e "${GREEN}[OK]${NC} .gitignore actualizado"
else
  echo -e "${RED}[FAIL]${NC} falta ignorar .server-3001.pid"; exit 1
fi
```

---

## 6) Recomendación

No aceptar claims de Claude Code sin commits concretos. Verificar cada punto:

- **Sin archivo → No completado**.
- **Sin workflow CI que rompa → No completado**.
- **Sin worker activo → No completado**.

La épica puede darse por cerrada solo si este checklist y el script de auditoría pasan sin errores en la rama `feat/architectural-leveling-epic`.
