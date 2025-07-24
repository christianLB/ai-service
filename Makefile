# Makefile principal - AI Service
# Sistema completo de gestión de ambientes y deployment

# Cargar configuración local si existe
-include .make.env

# Export variables for SSH authentication
export SSHPASS
export SUDO_PASS

# Los Makefiles modulares se llaman directamente con -f
# No los incluimos aquí para evitar conflictos

# Variables de configuración (con valores por defecto)
NAS_HOST ?= 192.168.1.11
NAS_USER ?= admin
NAS_PATH ?= /volume1/docker/ai-service
LOCAL_NAS_PATH ?= ~/ai-service-prod
DB_NAME ?= ai_service
DB_USER ?= ai_user
CONTAINER_NAME ?= ai-postgres

# Configurar SSH con sshpass si está disponible
ifdef SSHPASS
    SSH_CMD := sshpass -e ssh
    SCP_CMD := sshpass -e scp
else
    SSH_CMD := ssh
    SCP_CMD := scp
endif

# Script helper para comandos remotos
REMOTE_EXEC := ./scripts/remote-exec.sh

# Colores para output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# =============================================================================
# 🎯 COMANDOS PRINCIPALES (atajos directos)
# =============================================================================

.PHONY: migrate
migrate: ## Ver estado de migraciones
	@$(MAKE) -f Makefile.migrations migrate-status

.PHONY: migrate-up
migrate-up: ## Aplicar migraciones pendientes
	@$(MAKE) -f Makefile.migrations migrate-up

.PHONY: migrate-fix
migrate-fix: ## Fix rápido para gocardless_data
	@$(MAKE) -f Makefile.migrations migrate-fix-gocardless

.PHONY: migrate-fix-prod
migrate-fix-prod: ## Fix gocardless_data en PRODUCCIÓN
	@$(MAKE) -f Makefile.migrations migrate-fix-gocardless-prod

# =============================================================================
# 💰 COMANDOS FINANCIEROS (sincronización de datos)
# =============================================================================

.PHONY: financial-sync
financial-sync: ## 🔽 Sincronizar datos financieros de producción a desarrollo
	@$(MAKE) -f Makefile.financial-sync financial-sync-down

.PHONY: financial-backup
financial-backup: ## 💾 Crear backup de datos financieros
	@$(MAKE) -f Makefile.financial-sync financial-backup-prod

.PHONY: financial-validate
financial-validate: ## ✅ Validar integridad de datos financieros
	@$(MAKE) -f Makefile.financial-sync financial-validate

.PHONY: financial-diff
financial-diff: ## 🔍 Comparar datos financieros entre ambientes
	@$(MAKE) -f Makefile.financial-sync financial-diff

# =============================================================================
# 🌉 COMANDOS MCP BRIDGE
# =============================================================================

.PHONY: mcp-deploy
mcp-deploy: ## 🚀 Desplegar MCP Bridge en NAS
	@$(MAKE) -f Makefile.mcp mcp-deploy

.PHONY: mcp-status
mcp-status: ## 📊 Ver estado de MCP Bridge
	@$(MAKE) -f Makefile.mcp mcp-status

.PHONY: mcp-logs
mcp-logs: ## 📋 Ver logs de MCP Bridge
	@$(MAKE) -f Makefile.mcp mcp-logs

.PHONY: mcp-tools
mcp-tools: ## 🔧 Listar herramientas MCP disponibles
	@$(MAKE) -f Makefile.mcp mcp-tools

.PHONY: mcp-restart
mcp-restart: ## 🔄 Reiniciar MCP Bridge
	@$(MAKE) -f Makefile.mcp mcp-restart

.PHONY: mcp-stop
mcp-stop: ## 🛑 Detener MCP Bridge
	@$(MAKE) -f Makefile.mcp mcp-stop

.PHONY: mcp-test-secure
mcp-test-secure: ## 🧪 Testing seguro de MCP Bridge
	@$(MAKE) -f Makefile.mcp mcp-test-secure

.PHONY: mcp-validate-deployment
mcp-validate-deployment: ## 🔍 Validación completa del despliegue
	@$(MAKE) -f Makefile.mcp mcp-validate-deployment

.PHONY: mcp-help
mcp-help: ## ❓ Mostrar ayuda de MCP
	@$(MAKE) -f Makefile.mcp mcp-help

.PHONY: mcp-backup
mcp-backup: ## 💾 Backup de configuración MCP
	@$(MAKE) -f Makefile.mcp mcp-backup

.PHONY: mcp-test-tool
mcp-test-tool: ## 🎯 Probar una herramienta MCP (uso: make mcp-test-tool TOOL=health_check)
	@$(MAKE) -f Makefile.mcp mcp-test-tool TOOL=$(TOOL)

# =============================================================================
# 💹 COMANDOS DE TRADING
# =============================================================================

.PHONY: trading-status
trading-status: ## 📊 Ver estado del módulo de trading
	@$(MAKE) -f Makefile.trading trading-status

.PHONY: trading-up
trading-up: ## 🚀 Iniciar servicios de trading
	@$(MAKE) -f Makefile.trading trading-dev-up

.PHONY: trading-down
trading-down: ## 🛑 Detener servicios de trading
	@$(MAKE) -f Makefile.trading trading-dev-down

.PHONY: trading-migrate
trading-migrate: ## 📄 Aplicar migraciones de trading
	@$(MAKE) -f Makefile.trading trading-migrate

.PHONY: trading-setup
trading-setup: ## 🔧 Configurar API keys de exchanges
	@$(MAKE) -f Makefile.trading trading-setup-keys

.PHONY: trading-paper
trading-paper: ## 📝 Activar paper trading
	@$(MAKE) -f Makefile.trading trading-paper

.PHONY: trading-positions
trading-positions: ## 📈 Ver posiciones abiertas
	@$(MAKE) -f Makefile.trading trading-positions

# =============================================================================
# 🔐 COMANDOS DE AUTENTICACIÓN
# =============================================================================

.PHONY: auth-setup
auth-setup: ## 🔐 Configurar sistema de autenticación completo
	@$(MAKE) -f Makefile.auth auth-setup

.PHONY: auth-bypass-on
auth-bypass-on: ## 🔓 Activar bypass de auth para desarrollo
	@$(MAKE) -f Makefile.auth auth-bypass-on

.PHONY: auth-bypass-off
auth-bypass-off: ## 🔒 Desactivar bypass de auth
	@$(MAKE) -f Makefile.auth auth-bypass-off

.PHONY: auth-test
auth-test: ## 🧪 Probar sistema de autenticación
	@$(MAKE) -f Makefile.auth auth-test

.PHONY: auth-token
auth-token: ## 🔑 Obtener token JWT de admin para desarrollo
	@$(MAKE) -f Makefile.development dev-auth-get-token

.PHONY: auth-check
auth-check: ## 🔍 Verificar salud completa del sistema de autenticación
	@./scripts/check-auth.sh

.PHONY: auth-test-endpoints
auth-test-endpoints: ## 🌐 Probar todos los endpoints protegidos con token
	@echo "$(BLUE)🔐 Probando endpoints con autenticación...$(NC)"
	@./scripts/check-auth.sh

.PHONY: fix-db
fix-db: ## 🔧 Arreglar vistas y objetos faltantes en la base de datos
	@$(MAKE) -f Makefile.development dev-fix-missing-views

.PHONY: check-db
check-db: ## 🏥 Verificar salud de la base de datos
	@$(MAKE) -f Makefile.development dev-check-db-health

.PHONY: dev-redeploy-frontend
dev-redeploy-frontend: ## 🔄 Redesplegar frontend con última versión
	@$(MAKE) -f Makefile.development dev-redeploy-frontend

.PHONY: frontend-build
frontend-build: ## 🔨 Compilar frontend
	@$(MAKE) -f Makefile.development dev-build-frontend

.PHONY: build-frontend
build-frontend: ## 🔨 Compilar frontend (alias)
	@$(MAKE) -f Makefile.development dev-build-frontend

.PHONY: 811
811: ## 🆘 Guía rápida de comandos de desarrollo
	@$(MAKE) -f Makefile.development 811

.PHONY: dev-up
dev-up: ## 🚀 Levantar ambiente de desarrollo
	@$(MAKE) -f Makefile.development dev-up

.PHONY: dev-down
dev-down: ## 🛑 Detener ambiente de desarrollo
	@$(MAKE) -f Makefile.development dev-down

.PHONY: dev-refresh
dev-refresh: ## 🔄 Refrescar ambiente de desarrollo (down, build, up)
	@$(MAKE) -f Makefile.development dev-refresh

.PHONY: dev-status
dev-status: ## 📊 Estado del desarrollo local
	@$(MAKE) -f Makefile.development dev-status

.PHONY: dev-logs
dev-logs: ## 📋 Ver logs del servicio local
	@$(MAKE) -f Makefile.development dev-logs

.PHONY: dev-restart
dev-restart: ## 🔄 Reiniciar servicios de desarrollo
	@$(MAKE) -f Makefile.development dev-restart

.PHONY: dev-shell
dev-shell: ## 💻 Abrir shell en contenedor
	@$(MAKE) -f Makefile.development dev-shell

.PHONY: dev-db-shell
dev-db-shell: ## 🗄️ Abrir psql en desarrollo
	@$(MAKE) -f Makefile.development dev-db-shell

# =============================================================================
# 🔐 COMANDOS DE AUTENTICACIÓN (atajos rápidos)
# =============================================================================

.PHONY: auth-reset
auth-reset: ## Limpiar todos los intentos de login
	@$(MAKE) -f Makefile.development dev-auth-reset-attempts

.PHONY: auth-password
auth-password: ## Resetear contraseña de usuario
	@$(MAKE) -f Makefile.development dev-auth-reset-password

.PHONY: auth-create
auth-create: ## Crear nuevo usuario
	@$(MAKE) -f Makefile.development dev-auth-create-user

.PHONY: auth-admin
auth-admin: ## Crear/resetear admin (admin@ai-service.local / admin123)
	@$(MAKE) -f Makefile.development dev-auth-create-admin

.PHONY: auth-list
auth-list: ## Listar todos los usuarios
	@$(MAKE) -f Makefile.development dev-auth-list-users

.PHONY: auth-status
auth-status: ## Ver intentos recientes de login
	@$(MAKE) -f Makefile.development dev-auth-check-attempts

.PHONY: auth-unblock
auth-unblock: ## Desbloquear IP específica
	@$(MAKE) -f Makefile.development dev-auth-unblock-ip

# =============================================================================
# 🚨 COMANDOS DE EMERGENCIA (recuperación < 30 segundos)
# =============================================================================

.PHONY: 911
911: ## 🚨 EMERGENCIA - Muestra el runbook de emergencia
	@cat docs/EMERGENCY_RUNBOOK.md | less

.PHONY: emergency-diagnose
emergency-diagnose: ## 🚨 Diagnóstico rápido del sistema (10s)
	@echo "$(RED)🚨 EJECUTANDO DIAGNÓSTICO DE EMERGENCIA...$(NC)"
	@./scripts/emergency/diagnose.sh

.PHONY: emergency-backup
emergency-backup: ## 🚨 Backup de emergencia ultra-rápido
	@echo "$(RED)🚨 CREANDO BACKUP DE EMERGENCIA...$(NC)"
	@./scripts/emergency/pre-deploy-backup.sh emergency

.PHONY: emergency-rollback
emergency-rollback: ## 🚨 Rollback al último backup estable (20s)
	@echo "$(RED)🚨 EJECUTANDO ROLLBACK DE EMERGENCIA...$(NC)"
	@./scripts/emergency/rollback.sh latest

.PHONY: prod-emergency-stop
prod-emergency-stop: ## 🚨 DETIENE TODO INMEDIATAMENTE
	@echo "$(RED)🚨 DETENIENDO TODOS LOS SERVICIOS DE EMERGENCIA...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && docker-compose -f docker-compose.production.yml down --timeout 5"
	@echo "$(GREEN)✓ Servicios detenidos$(NC)"

.PHONY: prod-emergency-restore
prod-emergency-restore: ## 🚨 Restaura el último backup automáticamente
	@echo "$(RED)🚨 RESTAURANDO DESDE ÚLTIMO BACKUP...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && ./scripts/emergency/rollback.sh latest"

.PHONY: emergency-help
emergency-help: ## 🚨 Muestra ayuda rápida de emergencia
	@echo "$(RED)═══════════════════════════════════════════════════════════════$(NC)"
	@echo "$(RED)                    🚨 COMANDOS DE EMERGENCIA 🚨                $(NC)"
	@echo "$(RED)═══════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(YELLOW)RESPUESTA INMEDIATA (0-30 segundos):$(NC)"
	@echo "  $(GREEN)make emergency-diagnose$(NC)    - Diagnóstico rápido (10s)"
	@echo "  $(GREEN)make emergency-rollback$(NC)    - Rollback automático (20s)"
	@echo "  $(GREEN)make prod-emergency-stop$(NC)   - Detener TODO inmediatamente"
	@echo "  $(GREEN)make prod-emergency-restore$(NC)- Restaurar último backup"
	@echo ""
	@echo "$(YELLOW)INFORMACIÓN:$(NC)"
	@echo "  $(GREEN)make 911$(NC)                   - Ver runbook completo"
	@echo "  $(GREEN)make emergency-help$(NC)        - Esta ayuda"
	@echo ""
	@echo "$(RED)Si todo falla: ./scripts/emergency/rollback.sh latest$(NC)"
	@echo ""

.PHONY: emergency-sync
emergency-sync: ## 🚨 Sincroniza scripts de emergencia con producción
	@echo "$(YELLOW)🔄 Sincronizando scripts de emergencia con producción...$(NC)"
	@./scripts/emergency/sync-to-production.sh
	@echo "$(GREEN)✓ Scripts de emergencia sincronizados$(NC)"

# =============================================================================
# 🎯 COMANDOS PRINCIPALES (atajos directos) - continuación
# =============================================================================

.PHONY: cicd-setup
cicd-setup: ## Configurar secretos para CI/CD (GHCR, GitHub Actions)
	@$(MAKE) -f Makefile.security cicd-setup

.PHONY: ghcr-setup
ghcr-setup: ## Configurar autenticación GitHub Container Registry
	@$(MAKE) -f Makefile.security ghcr-setup

.PHONY: validate-cicd
validate-cicd: ## Validar configuración de CI/CD
	@$(MAKE) -f Makefile.security validate-cicd

.PHONY: prod
prod: ## Ver estado de producción
	@$(MAKE) -f Makefile.quick prod

.PHONY: dev
dev: ## Ver estado de desarrollo  
	@$(MAKE) -f Makefile.quick dev

.PHONY: st
st: ## Status ultra-rápido
	@$(MAKE) -f Makefile.quick st

911: ## Guía de emergencia
	@$(MAKE) -f Makefile.quick 911

.PHONY: fix
fix: ## Fix schema financiero en producción (gocardless_data + account_insights)
	@./scripts/apply-production-fix.sh

.PHONY: migrate-test
migrate-test: ## Test SSH connection for migrations
	@$(MAKE) -f Makefile.migrate-simple test

.PHONY: migrate-verify
migrate-verify: ## Verify endpoints are working
	@$(MAKE) -f Makefile.migrate-simple verify

.PHONY: help-all
help-all: ## Ver TODOS los comandos
	@$(MAKE) -f Makefile.quick help-all

.PHONY: doctor
doctor: ## Diagnóstico completo del sistema
	@$(MAKE) -f Makefile.monitoring doctor

# =============================================================================
# 🔄 SCHEMA SYNC COMMANDS
# =============================================================================

.PHONY: schema-fix
schema-fix: ## 🚨 Fix urgente de schema en producción
	@$(MAKE) -f Makefile.schema schema-hotfix

.PHONY: schema
schema: ## 🔄 Sincronización automática de schemas
	@$(MAKE) -f Makefile.schema schema-sync

.PHONY: schema-help
schema-help: ## 📘 Ver ayuda de comandos de schema
	@$(MAKE) -f Makefile.schema help

.PHONY: secrets-validate
secrets-validate: ## Validar configuración de secrets
	@$(MAKE) -f Makefile.security secrets-validate

.PHONY: metrics
metrics: ## Ver métricas del sistema
	@$(MAKE) -f Makefile.monitoring metrics

# =============================================================================
# 🚀 COMANDOS DE PRODUCCIÓN (operaciones críticas)
# =============================================================================

.PHONY: prod-sql
prod-sql: ## Ejecutar SQL directo en producción (uso: make prod-sql SQL="SELECT 1")
	@$(MAKE) -f Makefile.production prod-sql

.PHONY: prod-sql-file
prod-sql-file: ## Ejecutar archivo SQL en producción (uso: make prod-sql-file FILE=script.sql)
	@$(MAKE) -f Makefile.production prod-sql-file

.PHONY: prod-health
prod-health: ## Verificación completa de salud en producción
	@$(MAKE) -f Makefile.production prod-health

.PHONY: prod-backup-list
prod-backup-list: ## Listar backups disponibles en producción
	@$(MAKE) -f Makefile.production prod-backup-list

.PHONY: prod-restore
prod-restore: ## Restaurar desde backup específico
	@$(MAKE) -f Makefile.production prod-restore

.PHONY: prod-logs
prod-logs: ## 📋 Ver logs de producción
	@$(MAKE) -f Makefile.production prod-logs

.PHONY: prod-status
prod-status: ## 📊 Estado de producción
	@$(MAKE) -f Makefile.production prod-status

.PHONY: prod-ps
prod-ps: ## 🐳 Ver contenedores en producción
	@$(MAKE) -f Makefile.production prod-ps

.PHONY: prod-update-config
prod-update-config: ## 🔧 Actualizar configuración de producción
	@$(MAKE) -f Makefile.production prod-update-config

# =============================================================================
# 📊 COMANDOS DE MONITOREO Y LOGS
# =============================================================================

.PHONY: logs-errors
logs-errors: ## Mostrar solo errores y warnings
	@$(MAKE) -f Makefile.monitoring logs-errors

.PHONY: logs-tail
logs-tail: ## 📜 Ver logs en tiempo real
	@$(MAKE) -f Makefile.monitoring logs-tail

.PHONY: logs-analyze
logs-analyze: ## Analizar patrones en logs
	@$(MAKE) -f Makefile.monitoring logs-analyze

.PHONY: metrics
metrics: ## 📈 Ver métricas del sistema
	@$(MAKE) -f Makefile.monitoring metrics

.PHONY: performance-check
performance-check: ## Análisis detallado de performance
	@$(MAKE) -f Makefile.monitoring performance-check

.PHONY: resource-usage
resource-usage: ## Ver uso detallado de recursos
	@$(MAKE) -f Makefile.monitoring resource-usage

.PHONY: alerts-check
alerts-check: ## Verificar condiciones de alerta
	@$(MAKE) -f Makefile.monitoring alerts-check

.PHONY: monitor-start
monitor-start: ## Iniciar monitor ligero local
	@$(MAKE) -f Makefile.monitoring monitor-start

# =============================================================================
# 🔒 COMANDOS DE SEGURIDAD
# =============================================================================

.PHONY: env-check
env-check: ## 🔍 Verificar variables de entorno
	@$(MAKE) -f Makefile.security env-check

.PHONY: secrets-audit
secrets-audit: ## 🔐 Auditar todos los secretos
	@$(MAKE) -f Makefile.security secrets-audit

.PHONY: security-scan
security-scan: ## 🛡️ Escaneo de seguridad
	@$(MAKE) -f Makefile.security security-scan

.PHONY: permissions-check
permissions-check: ## 📁 Verificar permisos de archivos
	@$(MAKE) -f Makefile.security permissions-check

# =============================================================================
# 💰 COMANDOS DE DATOS FINANCIEROS (adicionales)
# =============================================================================

.PHONY: sync-accounts
sync-accounts: ## 🏦 Sincronizar solo cuentas desde producción
	@$(MAKE) -f Makefile.financial-sync sync-accounts

.PHONY: sync-transactions
sync-transactions: ## 💸 Sincronizar solo transacciones desde producción
	@$(MAKE) -f Makefile.financial-sync sync-transactions

.PHONY: financial-backup-dev
financial-backup-dev: ## 💾 Backup de datos financieros en desarrollo
	@$(MAKE) -f Makefile.financial-sync financial-backup-dev

.PHONY: financial-clean
financial-clean: ## 🧹 Limpiar archivos temporales de sincronización
	@$(MAKE) -f Makefile.financial-sync financial-clean

# =============================================================================
# 🔄 COMANDOS DE SCHEMA (gestión avanzada)
# =============================================================================

.PHONY: schema-compare
schema-compare: ## 🔍 Comparar schemas entre ambientes
	@$(MAKE) -f Makefile.schema schema-compare

.PHONY: schema-validate
schema-validate: ## ✅ Validar integridad del schema
	@$(MAKE) -f Makefile.schema schema-validate

.PHONY: schema-drift-check
schema-drift-check: ## 🚨 Verificar drift del schema
	@$(MAKE) -f Makefile.schema schema-drift-check

.PHONY: schema-export
schema-export: ## 📤 Exportar schema actual
	@$(MAKE) -f Makefile.schema schema-export

# =============================================================================
# 🛠️ COMANDOS DE DESARROLLO (utilidades adicionales)
# =============================================================================

.PHONY: dev-reset-db
dev-reset-db: ## 🔄 Reset BD desarrollo sin confirmación
	@$(MAKE) -f Makefile.development dev-reset-db

.PHONY: dev-seed
dev-seed: ## 🌱 Cargar datos de prueba
	@$(MAKE) -f Makefile.development dev-seed

.PHONY: dev-test
dev-test: ## 🧪 Ejecutar tests
	@$(MAKE) -f Makefile.development dev-test

.PHONY: dev-lint
dev-lint: ## 🔍 Ejecutar linter
	@$(MAKE) -f Makefile.development dev-lint

.PHONY: dev-clean
dev-clean: ## 🧹 Limpiar archivos temporales y cache
	@$(MAKE) -f Makefile.development dev-clean

.PHONY: dev-shell
dev-shell: ## 💻 Abrir shell en contenedor de desarrollo
	@$(MAKE) -f Makefile.development dev-shell

# =============================================================================
# 🚀 GITHUB-FIRST WORKFLOW COMMANDS
# =============================================================================

.PHONY: github-flow
github-flow: ## 🔄 Complete GitHub workflow (tests, quality, build)
	@echo "$(BLUE)🔄 Starting GitHub-First workflow...$(NC)"
	@$(MAKE) pre-commit
	@$(MAKE) quality-gates
	@echo "$(GREEN)✅ Ready for GitHub push!$(NC)"
	@echo "$(YELLOW)💡 Tip: Create a PR and let CI/CD handle the rest$(NC)"

.PHONY: pre-commit
pre-commit: ## 🔍 Pre-commit validation (types, lint, tests)
	@echo "$(BLUE)🔍 Running pre-commit checks...$(NC)"
	@echo "$(YELLOW)→ Type checking...$(NC)"
	@npm run typecheck || (echo "$(RED)❌ Type errors found$(NC)" && exit 1)
	@cd frontend && npm run typecheck || (echo "$(RED)❌ Frontend type errors$(NC)" && exit 1)
	@echo "$(YELLOW)→ Linting...$(NC)"
	@npm run lint || (echo "$(RED)❌ Linting errors found$(NC)" && exit 1)
	@cd frontend && npm run lint || (echo "$(RED)❌ Frontend linting errors$(NC)" && exit 1)
	@echo "$(YELLOW)→ Running tests...$(NC)"
	@npm test -- --passWithNoTests || (echo "$(RED)❌ Tests failed$(NC)" && exit 1)
	@echo "$(GREEN)✅ Pre-commit checks passed!$(NC)"

.PHONY: quality-gates
quality-gates: ## ✅ Run all quality gates (security, tests, build)
	@echo "$(BLUE)🎯 Running quality gates...$(NC)"
	@echo "$(YELLOW)→ Security audit...$(NC)"
	@npm audit --audit-level=moderate || echo "$(YELLOW)⚠️  Security warnings (non-blocking)$(NC)"
	@echo "$(YELLOW)→ Building application...$(NC)"
	@npm run build || (echo "$(RED)❌ Build failed$(NC)" && exit 1)
	@cd frontend && npm run build || (echo "$(RED)❌ Frontend build failed$(NC)" && exit 1)
	@echo "$(GREEN)✅ All quality gates passed!$(NC)"

.PHONY: ci-test
ci-test: ## 🧪 Run CI tests locally (with database)
	@echo "$(BLUE)🧪 Running CI tests locally...$(NC)"
	@docker-compose -f docker-compose.test.yml up -d
	@sleep 5
	@DATABASE_URL=postgresql://ai_user:testpass@localhost:5432/ai_service_test npm test
	@docker-compose -f docker-compose.test.yml down
	@echo "$(GREEN)✅ CI tests completed!$(NC)"

.PHONY: pr-ready
pr-ready: ## 📋 Check if ready for PR (all validations)
	@echo "$(BLUE)📋 Checking PR readiness...$(NC)"
	@$(MAKE) pre-commit
	@$(MAKE) quality-gates
	@echo ""
	@echo "$(GREEN)✅ Your code is ready for a Pull Request!$(NC)"
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Commit your changes: git add . && git commit -m 'feat: your message'"
	@echo "  2. Push to your branch: git push origin your-branch"
	@echo "  3. Create a PR on GitHub"
	@echo "  4. CI/CD will handle testing and deployment automatically"

.PHONY: dev-setup
dev-setup: ## 🏗️ Complete development environment setup
	@echo "$(BLUE)🏗️ Setting up development environment...$(NC)"
	@echo "$(YELLOW)→ Installing dependencies...$(NC)"
	@npm ci
	@cd frontend && npm ci --legacy-peer-deps
	@echo "$(YELLOW)→ Setting up environment...$(NC)"
	@test -f .env.local || cp .env.example .env.local
	@echo "$(YELLOW)→ Starting services...$(NC)"
	@$(MAKE) dev-up
	@echo "$(YELLOW)→ Running migrations...$(NC)"
	@$(MAKE) db-migrate
	@echo "$(YELLOW)→ Seeding database...$(NC)"
	@$(MAKE) dev-seed || echo "$(YELLOW)⚠️  Seeding skipped$(NC)"
	@echo ""
	@echo "$(GREEN)✅ Development environment ready!$(NC)"
	@echo ""
	@echo "$(YELLOW)Quick start:$(NC)"
	@echo "  - API: http://localhost:3001"
	@echo "  - Frontend: http://localhost:5173"
	@echo "  - Database: localhost:5432"
	@echo "  - Redis: localhost:6379"

.PHONY: onboard
onboard: ## 👋 New developer onboarding
	@echo "$(BLUE)👋 Welcome to AI Service!$(NC)"
	@echo ""
	@echo "$(YELLOW)Let's get you started...$(NC)"
	@$(MAKE) dev-setup
	@echo ""
	@echo "$(GREEN)🎉 You're all set!$(NC)"
	@echo ""
	@echo "$(YELLOW)Useful commands:$(NC)"
	@echo "  make dev         - Check development status"
	@echo "  make logs        - View logs"
	@echo "  make test        - Run tests"
	@echo "  make pr-ready    - Check if ready for PR"
	@echo "  make help        - See all commands"
	@echo ""
	@echo "$(YELLOW)Documentation:$(NC)"
	@echo "  - README.md"
	@echo "  - docs/"
	@echo "  - CLAUDE.md (AI assistant context)"

.PHONY: tdd
tdd: ## 🧪 Test-driven development mode
	@echo "$(BLUE)🧪 Starting TDD mode...$(NC)"
	@echo "$(YELLOW)Watching for test changes...$(NC)"
	@npm run test:watch

.PHONY: validate-all
validate-all: ## ✔️ Run all possible validations
	@echo "$(BLUE)✔️ Running comprehensive validation...$(NC)"
	@$(MAKE) pre-commit
	@$(MAKE) quality-gates
	@$(MAKE) security-scan
	@$(MAKE) performance-check
	@echo "$(GREEN)✅ All validations passed!$(NC)"

# =============================================================================
# 🔐 COMANDOS DE SEGURIDAD (adicionales)
# =============================================================================

.PHONY: env-check
env-check: ## 🔍 Verificar variables de entorno
	@$(MAKE) -f Makefile.security env-check

.PHONY: secrets-audit
secrets-audit: ## 🔒 Auditar todos los secrets
	@$(MAKE) -f Makefile.security secrets-audit

.PHONY: security-scan
security-scan: ## 🛡️ Ejecutar scanner de seguridad
	@$(MAKE) -f Makefile.security security-scan

.PHONY: permissions-check
permissions-check: ## 📁 Verificar permisos de archivos
	@$(MAKE) -f Makefile.security permissions-check

# =============================================================================
# 🚢 COMANDOS DE DEPLOYMENT (CI/CD)
# =============================================================================

.PHONY: prod-build-image
prod-build-image: ## 🏗️ Construir imagen Docker para producción
	@$(MAKE) -f Makefile.production prod-build-image

.PHONY: prod-deploy-image
prod-deploy-image: ## 🚀 Desplegar imagen a producción
	@$(MAKE) -f Makefile.production prod-deploy-image

.PHONY: watchtower-setup
watchtower-setup: ## 🤖 Configurar Watchtower completo
	@$(MAKE) -f Makefile.watchtower watchtower-setup

.PHONY: watchtower-logs
watchtower-logs: ## 📋 Ver logs de Watchtower
	@$(MAKE) -f Makefile.watchtower watchtower-logs

.PHONY: help
help: ## Mostrar ayuda principal
	@echo "$(BLUE)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║                    AI SERVICE - COMANDOS                      ║$(NC)"
	@echo "$(BLUE)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)Comandos principales:$(NC)"
	@echo "  $(GREEN)make prod$(NC)            - Ver estado de producción"
	@echo "  $(GREEN)make dev$(NC)             - Ver estado de desarrollo"
	@echo "  $(GREEN)make st$(NC)              - Status ultra-rápido"
	@echo "  $(GREEN)make help-all$(NC)        - Ver TODOS los comandos disponibles"
	@echo "  $(GREEN)make 911$(NC)             - 🚨 EMERGENCIA - Guía de respuesta rápida"
	@echo ""
	@echo "$(RED)🚨 Comandos de emergencia (< 30 segundos):$(NC)"
	@echo "  $(GREEN)make emergency-diagnose$(NC)     - Diagnóstico rápido del sistema"
	@echo "  $(GREEN)make emergency-rollback$(NC)     - Rollback automático al último backup"
	@echo "  $(GREEN)make prod-emergency-stop$(NC)    - DETENER TODO inmediatamente"
	@echo "  $(GREEN)make emergency-help$(NC)         - Ver ayuda de emergencia"
	@echo ""
	@echo "$(YELLOW)Comandos por categoría:$(NC)"
	@echo "  $(BLUE)make -f Makefile.production help$(NC)  - Comandos de producción"
	@echo "  $(BLUE)make -f Makefile.development help$(NC) - Comandos de desarrollo"
	@echo "  $(BLUE)make -f Makefile.multi-env help$(NC)   - Comandos multi-ambiente"
	@echo "  $(BLUE)make -f Makefile.compare help$(NC)     - Comandos de comparación"
	@echo "  $(BLUE)make -f Makefile.quick help$(NC)       - Comandos rápidos"
	@echo "  $(BLUE)make -f Makefile.security help$(NC)    - Seguridad y secrets"
	@echo "  $(BLUE)make -f Makefile.monitoring help$(NC)  - Monitoreo y métricas"
	@echo "  $(BLUE)make -f Makefile.financial-sync help$(NC) - 💰 Sincronización financiera"
	@echo ""
	@echo "$(YELLOW)Configuración:$(NC)"
	@echo "  Asegúrate de tener .make.env configurado con las credenciales"
	@echo "  (ver .make.env.example)"

.PHONY: status
status: ## Verifica el estado del servicio en producción
	@echo "$(BLUE)Verificando estado del servicio...$(NC)"
	@curl -s http://$(NAS_HOST):3003/status | jq '.'

.PHONY: status-simple
status-simple: ## Estado simple (solo status field)
	@curl -s http://$(NAS_HOST):3003/status | jq -r '.status'

.PHONY: check-db-prod
check-db-prod: ## Verifica conexión a la base de datos en producción
	@echo "$(BLUE)Verificando conexión a PostgreSQL...$(NC)"
	@$(REMOTE_EXEC) docker exec $(CONTAINER_NAME) pg_isready -U $(DB_USER) -d $(DB_NAME)

.PHONY: db-tables
db-tables: ## Lista todas las tablas en el esquema financial
	@echo "$(BLUE)Tablas en esquema financial:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "sudo docker exec $(CONTAINER_NAME) psql -U $(DB_USER) -d $(DB_NAME) -c \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'financial' ORDER BY table_name;\""

.PHONY: check-migrations
check-migrations: ## Verifica qué migraciones faltan
	@echo "$(BLUE)Verificando migraciones pendientes...$(NC)"
	@echo "$(YELLOW)Verificando tabla account_insights...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "sudo docker exec $(CONTAINER_NAME) psql -U $(DB_USER) -d $(DB_NAME) -t -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'financial' AND table_name = 'account_insights');\""
	@echo "$(YELLOW)Verificando otras tablas críticas...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "sudo docker exec $(CONTAINER_NAME) psql -U $(DB_USER) -d $(DB_NAME) -c \"SELECT COUNT(*) as tablas_financial FROM information_schema.tables WHERE table_schema = 'financial';\""

.PHONY: apply-financial-migration
apply-financial-migration: ## Aplica la migración de tablas financieras
	@echo "$(BLUE)Aplicando migración de tablas financieras...$(NC)"
	@echo "$(YELLOW)Copiando archivo SQL...$(NC)"
	@$(SCP_CMD) config/init-financial-tables.sql $(NAS_USER)@$(NAS_HOST):$(NAS_PATH)/config/
	@echo "$(YELLOW)Ejecutando migración...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "sudo docker exec -i $(CONTAINER_NAME) psql -U $(DB_USER) -d $(DB_NAME) < $(NAS_PATH)/config/init-financial-tables.sql"
	@echo "$(GREEN)✓ Migración aplicada$(NC)"
	@$(MAKE) verify-migration

.PHONY: verify-migration
verify-migration: ## Verifica que la migración se aplicó correctamente
	@echo "$(BLUE)Verificando migración...$(NC)"
	@echo -n "Tabla account_insights: "
	@if $(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "sudo docker exec $(CONTAINER_NAME) psql -U $(DB_USER) -d $(DB_NAME) -t -c \"SELECT EXISTS (SELECT FROM financial.account_insights);\"" | grep -q 't'; then \
		echo "$(GREEN)✓ Existe$(NC)"; \
	else \
		echo "$(RED)✗ No existe$(NC)"; \
		exit 1; \
	fi
	@echo -n "Estado del servicio: "
	@STATUS=$$(curl -s http://$(NAS_HOST):3003/status | jq -r '.status'); \
	if [ "$$STATUS" = "healthy" ]; then \
		echo "$(GREEN)✓ $$STATUS$(NC)"; \
	else \
		echo "$(YELLOW)⚠ $$STATUS$(NC)"; \
	fi

.PHONY: db-shell
db-shell: ## Abre una shell psql en la base de datos
	@echo "$(BLUE)Conectando a PostgreSQL...$(NC)"
	@$(SSH_CMD) -t $(NAS_USER)@$(NAS_HOST) "sudo docker exec -it $(CONTAINER_NAME) psql -U $(DB_USER) -d $(DB_NAME)"

.PHONY: logs
logs: ## Muestra los logs del servicio AI
	@echo "$(BLUE)Logs del servicio AI (últimas 50 líneas):$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "sudo docker logs --tail 50 -f ai-service"

.PHONY: logs-postgres
logs-postgres: ## Muestra los logs de PostgreSQL
	@echo "$(BLUE)Logs de PostgreSQL (últimas 50 líneas):$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "sudo docker logs --tail 50 -f $(CONTAINER_NAME)"

.PHONY: restart-service
restart-service: ## Reinicia el servicio AI
	@echo "$(YELLOW)Reiniciando servicio AI...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker restart ai-service"
	@sleep 5
	@$(MAKE) status-simple

.PHONY: restart-postgres
restart-postgres: ## Reinicia PostgreSQL
	@echo "$(YELLOW)Reiniciando PostgreSQL...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker restart ai-postgres"
	@sleep 3
	@echo "$(GREEN)✓ PostgreSQL reiniciado$(NC)"

.PHONY: restart-all
restart-all: ## Reinicia todos los servicios
	@echo "$(YELLOW)Reiniciando todos los servicios...$(NC)"
	@$(MAKE) restart-postgres
	@sleep 2
	@$(MAKE) restart-service
	@echo "$(GREEN)✓ Todos los servicios reiniciados$(NC)"

.PHONY: fix-postgres-permissions
fix-postgres-permissions: ## Arregla permisos de PostgreSQL
	@echo "$(YELLOW)Arreglando permisos de PostgreSQL...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker stop ai-postgres"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S chown -R 999:999 $(NAS_PATH)/postgres"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S chmod -R 700 $(NAS_PATH)/postgres"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker start ai-postgres"
	@sleep 5
	@echo "$(GREEN)✓ Permisos corregidos$(NC)"
	@$(MAKE) restart-service

.PHONY: fix-frontend-serving
fix-frontend-serving: ## Arregla el servicio del frontend copiando al lugar correcto
	@echo "$(BLUE)=== ARREGLANDO SERVICIO DE FRONTEND ===$(NC)"
	@echo "$(YELLOW)📦 Compilando frontend...$(NC)"
	@cd frontend && npm run build
	@echo "$(YELLOW)🔄 Limpiando directorios en producción...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S rm -rf $(NAS_PATH)/frontend/dist/*"
	@echo "$(YELLOW)📤 Copiando frontend compilado...$(NC)"
	@tar -czf /tmp/frontend-complete.tar.gz -C frontend/dist .
	@$(SCP_CMD) /tmp/frontend-complete.tar.gz $(NAS_USER)@$(NAS_HOST):/tmp/
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH)/frontend/dist && \
		echo '$(SUDO_PASS)' | sudo -S tar -xzf /tmp/frontend-complete.tar.gz && \
		echo '$(SUDO_PASS)' | sudo -S chown -R $(NAS_USER):users . && \
		echo '$(SUDO_PASS)' | sudo -S rm /tmp/frontend-complete.tar.gz"
	@rm /tmp/frontend-complete.tar.gz
	@echo "$(GREEN)✓ Frontend actualizado en el volumen montado$(NC)"
	@echo "$(BLUE)Verificando actualización...$(NC)"
	@$(MAKE) verify-frontend-deploy

.PHONY: fix-missing-tables
fix-missing-tables: ## Crea tablas faltantes en la base de datos
	@echo "$(YELLOW)🔧 Creando tabla financial.sync_logs...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker exec $(CONTAINER_NAME) psql -U $(DB_USER) -d $(DB_NAME) -c \"CREATE TABLE IF NOT EXISTS financial.sync_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sync_type VARCHAR(50), status VARCHAR(50), started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMP, error TEXT, metadata JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);\""
	@echo "$(GREEN)✓ Tabla creada$(NC)"

.PHONY: fix-all
fix-all: ## Arregla todos los problemas conocidos
	@echo "$(BLUE)=== ARREGLANDO TODOS LOS PROBLEMAS ===$(NC)"
	@$(MAKE) fix-missing-tables
	@$(MAKE) fix-frontend-serving
	@echo "$(GREEN)=== TODOS LOS PROBLEMAS ARREGLADOS ===$(NC)"

.PHONY: force-frontend-update
force-frontend-update: ## Fuerza actualización completa del frontend con limpieza de caché
	@echo "$(BLUE)=== ACTUALIZACIÓN FORZADA DE FRONTEND ===$(NC)"
	@echo "$(YELLOW)📦 Compilando frontend con timestamp...$(NC)"
	@cd frontend && npm run build
	@echo "$(YELLOW)🧹 Limpiando COMPLETAMENTE el directorio de producción...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S rm -rf $(NAS_PATH)/frontend/dist"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S mkdir -p $(NAS_PATH)/frontend/dist"
	@echo "$(YELLOW)📤 Copiando frontend nuevo...$(NC)"
	@tar -czf /tmp/frontend-force.tar.gz -C frontend dist
	@$(SCP_CMD) /tmp/frontend-force.tar.gz $(NAS_USER)@$(NAS_HOST):/tmp/
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH)/frontend && \
		echo '$(SUDO_PASS)' | sudo -S tar -xzf /tmp/frontend-force.tar.gz && \
		echo '$(SUDO_PASS)' | sudo -S chown -R 1001:1001 dist && \
		echo '$(SUDO_PASS)' | sudo -S chmod -R 755 dist && \
		echo '$(SUDO_PASS)' | sudo -S rm /tmp/frontend-force.tar.gz"
	@rm /tmp/frontend-force.tar.gz
	@echo "$(YELLOW)🔄 Reiniciando servicio para limpiar caché...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker restart ai-service"
	@sleep 5
	@echo "$(GREEN)✅ Frontend actualizado forzosamente$(NC)"
	@echo "$(BLUE)📋 Verificando actualización...$(NC)"
	@$(MAKE) verify-html-update

.PHONY: verify-html-update
verify-html-update: ## Verifica que el HTML apunta a los archivos JS correctos
	@echo "$(BLUE)Verificando HTML y assets...$(NC)"
	@echo -n "Archivo JS en HTML: "
	@curl -s http://$(NAS_HOST):3003/ | grep -o 'src="/assets/[^"]*\.js"' | head -1 || echo "NO ENCONTRADO"
	@echo -n "Archivos JS en servidor: "
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "ls $(NAS_PATH)/frontend/dist/assets/*.js 2>/dev/null" || echo "NO ENCONTRADO"
	@echo -n "Contiene código actualizado: "
	@curl -s http://$(NAS_HOST):3003/ | grep -o 'src="/assets/[^"]*\.js"' | head -1 | xargs -I {} curl -s http://$(NAS_HOST):3003{} | grep -c "Iniciando setup BBVA" || echo "NO"

.PHONY: diagnose-frontend
diagnose-frontend: ## Diagnostica problemas con el frontend
	@echo "$(BLUE)=== DIAGNÓSTICO DE FRONTEND ===$(NC)"
	@echo "$(YELLOW)1. HTML servido:$(NC)"
	@curl -s http://$(NAS_HOST):3003/ | grep -E '(src=|href=)' | grep -E '\.(js|css)' | head -5
	@echo ""
	@echo "$(YELLOW)2. Archivos en el servidor:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "ls -la $(NAS_PATH)/frontend/dist/assets/ 2>/dev/null | head -10" || echo "Error accediendo"
	@echo ""
	@echo "$(YELLOW)3. Archivos en el contenedor:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker exec ai-service ls -la /app/public/assets/ 2>/dev/null | head -10" || echo "Error accediendo"
	@echo ""
	@echo "$(YELLOW)4. Headers HTTP:$(NC)"
	@curl -sI http://$(NAS_HOST):3003/ | grep -E '(Cache-Control|ETag|Last-Modified)'

.PHONY: verify-frontend-deploy
verify-frontend-deploy: ## Verifica que el frontend se desplegó correctamente
	@echo "$(BLUE)Verificando frontend en producción...$(NC)"
	@echo -n "Archivos JS en prod: "
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "ls -la $(NAS_PATH)/frontend/dist/assets/*.js 2>/dev/null | wc -l || echo 0"
	@echo -n "Contiene consentUrl: "
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "grep -c 'consentUrl' $(NAS_PATH)/frontend/dist/assets/*.js 2>/dev/null || echo 'NO ENCONTRADO'"
	@echo -n "Contiene logs debug: "
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "grep -c 'Iniciando setup BBVA' $(NAS_PATH)/frontend/dist/assets/*.js 2>/dev/null || echo 'NO'"
	@echo "Archivos en dist:"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "ls -la $(NAS_PATH)/frontend/dist/ 2>/dev/null | head -10"

.PHONY: update-env
update-env: ## Actualiza el archivo .env.production en el NAS
	@echo "$(BLUE)Actualizando .env.production...$(NC)"
	@if [ -f .env.production ]; then \
		$(SCP_CMD) .env.production $(NAS_USER)@$(NAS_HOST):$(NAS_PATH)/.env.production; \
		echo "$(GREEN)✓ Archivo actualizado$(NC)"; \
	else \
		echo "$(RED)✗ No se encuentra .env.production$(NC)"; \
		exit 1; \
	fi

.PHONY: deploy-full
deploy-full: ## Build y deploy completo con Docker
	@echo "$(BLUE)=== BUILD Y DEPLOY COMPLETO ===$(NC)"
	@echo "$(YELLOW)🏗️ Construyendo imagen Docker...$(NC)"
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	docker build -t ai-service:$$TIMESTAMP -t ai-service:latest .
	@echo "$(YELLOW)📦 Guardando imagen...$(NC)"
	@docker save ai-service:latest | gzip > /tmp/ai-service-latest.tar.gz
	@echo "$(YELLOW)📤 Subiendo imagen al NAS...$(NC)"
	@$(SCP_CMD) /tmp/ai-service-latest.tar.gz $(NAS_USER)@$(NAS_HOST):/tmp/
	@echo "$(YELLOW)🔄 Actualizando en producción...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker load < /tmp/ai-service-latest.tar.gz && \
		echo '$(SUDO_PASS)' | sudo -S sed -i 's/image: ai-service:.*/image: ai-service:latest/' docker-compose.production.yml && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker-compose -f docker-compose.production.yml up -d ai-service && \
		echo '$(SUDO_PASS)' | sudo -S rm /tmp/ai-service-latest.tar.gz"
	@rm /tmp/ai-service-latest.tar.gz
	@echo "$(GREEN)=== DEPLOY COMPLETO ===$(NC)"
	@sleep 10
	@$(MAKE) status

.PHONY: deploy-frontend
deploy-frontend: ## Deploy solo del frontend (usa el volumen montado)
	@echo "$(BLUE)=== DEPLOY RÁPIDO DE FRONTEND ===$(NC)"
	@echo "$(YELLOW)📦 Compilando frontend...$(NC)"
	@cd frontend && npm run build
	@echo "$(YELLOW)📦 Sincronizando frontend con producción...$(NC)"
	@tar -czf /tmp/frontend-dist.tar.gz -C frontend/dist .
	@$(SCP_CMD) /tmp/frontend-dist.tar.gz $(NAS_USER)@$(NAS_HOST):/tmp/
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH)/frontend && \
		echo '$(SUDO_PASS)' | sudo -S rm -rf dist && \
		echo '$(SUDO_PASS)' | sudo -S mkdir -p dist && \
		echo '$(SUDO_PASS)' | sudo -S tar -xzf /tmp/frontend-dist.tar.gz -C dist && \
		echo '$(SUDO_PASS)' | sudo -S chown -R $(NAS_USER):users dist && \
		echo '$(SUDO_PASS)' | sudo -S rm /tmp/frontend-dist.tar.gz"
	@rm /tmp/frontend-dist.tar.gz
	@echo "$(GREEN)✓ Frontend actualizado$(NC)"
	@echo "$(BLUE)Frontend se sirve desde el volumen montado, no requiere reinicio$(NC)"
	@$(MAKE) verify-frontend-deploy

.PHONY: deploy-frontend-clean
deploy-frontend-clean: ## Deploy frontend con limpieza completa de caché
	@echo "$(BLUE)=== DEPLOY LIMPIO DE FRONTEND ===$(NC)"
	@echo "$(YELLOW)📦 Compilando frontend...$(NC)"
	@cd frontend && npm run build
	@echo "$(YELLOW)🧹 Limpiando versión anterior...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH)/frontend && \
		echo '$(SUDO_PASS)' | sudo -S rm -rf dist.old && \
		echo '$(SUDO_PASS)' | sudo -S mv dist dist.old 2>/dev/null || true && \
		echo '$(SUDO_PASS)' | sudo -S mkdir -p dist"
	@echo "$(YELLOW)📤 Subiendo nueva versión...$(NC)"
	@tar -czf /tmp/frontend-dist.tar.gz -C frontend/dist .
	@$(SCP_CMD) /tmp/frontend-dist.tar.gz $(NAS_USER)@$(NAS_HOST):/tmp/
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH)/frontend && \
		echo '$(SUDO_PASS)' | sudo -S tar -xzf /tmp/frontend-dist.tar.gz -C dist && \
		echo '$(SUDO_PASS)' | sudo -S chown -R $(NAS_USER):users dist && \
		echo '$(SUDO_PASS)' | sudo -S rm /tmp/frontend-dist.tar.gz && \
		echo '$(SUDO_PASS)' | sudo -S rm -rf dist.old"
	@rm /tmp/frontend-dist.tar.gz
	@echo "$(YELLOW)🔄 Reiniciando servicio para limpiar caché interno...$(NC)"
	@$(MAKE) restart-service
	@echo "$(GREEN)✓ Frontend actualizado y caché limpiado$(NC)"
	@echo "$(YELLOW)⚠️  Si el navegador sigue mostrando versión vieja:$(NC)"
	@echo "  1. Abre DevTools (F12)"
	@echo "  2. Click derecho en botón recargar"
	@echo "  3. Selecciona 'Vaciar caché y volver a cargar'"
	@$(MAKE) verify-frontend-deploy

# Duplicates removed - these targets are already defined earlier in the file

.PHONY: deploy
deploy: ## Deploy completo con backup automático (migración + restart)
	@echo "$(BLUE)=== INICIANDO DEPLOYMENT CON BACKUP AUTOMÁTICO ===$(NC)"
	@echo "$(YELLOW)📸 Creando backup pre-deploy...$(NC)"
	@./scripts/emergency/pre-deploy-backup.sh auto
	@echo "$(BLUE)🔍 Verificando estado actual...$(NC)"
	@$(MAKE) check-db
	@echo "$(BLUE)📝 Aplicando migraciones...$(NC)"
	@$(MAKE) apply-financial-migration
	@echo "$(BLUE)🔄 Reiniciando servicios...$(NC)"

.PHONY: deploy-force
deploy-force: ## 🚀 Deploy forzando recreación de contenedores
	@echo "$(BLUE)=== DEPLOYMENT FORZADO CON RECREACIÓN ===$(NC)"
	@$(MAKE) -f Makefile.production prod-update-config
	@$(MAKE) -f Makefile.production prod-force-recreate
	@$(MAKE) restart-service
	@echo "$(GREEN)=== DEPLOYMENT COMPLETADO ===$(NC)"
	@echo "$(YELLOW)💡 En caso de problemas: make emergency-rollback$(NC)"
	@$(MAKE) status

.PHONY: ssh-copy-schema
ssh-copy-schema: ## Copia schema completo via SSH
	@echo "$(BLUE)Copiando schema completo al NAS...$(NC)"
	@$(SCP_CMD) scripts/complete-production-schema.sql $(NAS_USER)@$(NAS_HOST):$(NAS_PATH)/config/
	@$(SCP_CMD) config/init-db-production-clean.sql $(NAS_USER)@$(NAS_HOST):$(NAS_PATH)/config/
	@echo "$(GREEN)✓ Schema copiado$(NC)"

.PHONY: ssh-copy-all
ssh-copy-all: ## Copia todos los archivos SQL via SSH
	@echo "$(BLUE)Copiando todos los archivos SQL...$(NC)"
	@$(SCP_CMD) config/*.sql $(NAS_USER)@$(NAS_HOST):$(NAS_PATH)/config/
	@$(SCP_CMD) scripts/*.sql $(NAS_USER)@$(NAS_HOST):$(NAS_PATH)/config/ 2>/dev/null || true
	@echo "$(GREEN)✓ Archivos copiados$(NC)"

.PHONY: ssh-restart
ssh-restart: ## Reinicia ai-service via SSH
	@echo "$(YELLOW)Reiniciando ai-service...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S docker restart ai-service"
	@echo "$(GREEN)✓ Servicio reiniciado$(NC)"
	@sleep 5
	@$(MAKE) status-simple

.PHONY: ssh-reset-db
ssh-reset-db: ssh-copy-schema ## Reset completo de BD via SSH
	@echo "$(RED)⚠️  ESTO ELIMINARÁ TODOS LOS DATOS$(NC)"
	@echo "$(YELLOW)Presiona Ctrl+C para cancelar o Enter para continuar...$(NC)"
	@read confirm
	@echo "$(BLUE)1. Deteniendo servicios...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S docker-compose -f $(NAS_PATH)/docker-compose.production.yml down"
	@echo "$(BLUE)2. Limpiando datos de PostgreSQL...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S rm -rf $(NAS_PATH)/postgres-data/*"
	@echo "$(BLUE)3. Iniciando servicios...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S docker-compose -f $(NAS_PATH)/docker-compose.production.yml up -d"
	@echo "$(GREEN)✓ Base de datos reseteada$(NC)"
	@echo "$(YELLOW)Esperando 30 segundos para que los servicios inicien...$(NC)"
	@sleep 30
	@$(MAKE) status

.PHONY: ssh-apply-sql
ssh-apply-sql: ## Aplica un archivo SQL específico (uso: make ssh-apply-sql FILE=config/fix.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)Error: Especifica el archivo con FILE=ruta/archivo.sql$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Copiando $(FILE) al NAS...$(NC)"
	@$(SCP_CMD) $(FILE) $(NAS_USER)@$(NAS_HOST):$(NAS_PATH)/config/
	@echo "$(BLUE)Aplicando SQL...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S docker exec -i $(CONTAINER_NAME) psql -U $(DB_USER) -d $(DB_NAME) < $(NAS_PATH)/config/$$(basename $(FILE))"
	@echo "$(GREEN)✓ SQL aplicado$(NC)"

.PHONY: ssh-logs
ssh-logs: ## Ver logs de ai-service via SSH
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S docker logs --tail 50 -f ai-service"

.PHONY: ssh-logs-postgres
ssh-logs-postgres: ## Ver logs de PostgreSQL via SSH
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S docker logs --tail 50 -f $(CONTAINER_NAME)"

.PHONY: ssh-ps
ssh-ps: ## Ver contenedores corriendo via SSH
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S docker ps"

.PHONY: quick-fix
quick-fix: ## Solución rápida para financial.account_insights
	@echo "$(YELLOW)Aplicando fix rápido...$(NC)"
	@cat config/init-financial-tables.sql | $(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "sudo docker exec -i $(CONTAINER_NAME) psql -U $(DB_USER) -d $(DB_NAME)"
	@$(MAKE) verify-migration

.PHONY: backup-db
backup-db: ## Hace backup de la base de datos
	@echo "$(BLUE)Creando backup de la base de datos...$(NC)"
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	ssh $(NAS_USER)@$(NAS_HOST) "sudo docker exec $(CONTAINER_NAME) pg_dump -U $(DB_USER) -d $(DB_NAME) | gzip > $(NAS_PATH)/backups/backup_$$TIMESTAMP.sql.gz"; \
	echo "$(GREEN)✓ Backup creado: backup_$$TIMESTAMP.sql.gz$(NC)"

.PHONY: test-connection
test-connection: ## Prueba la conexión SSH al NAS
	@echo "$(BLUE)Probando conexión al NAS...$(NC)"
	@if $(SSH_CMD) -o ConnectTimeout=5 $(NAS_USER)@$(NAS_HOST) "echo 'OK'" > /dev/null 2>&1; then \
		echo "$(GREEN)✓ Conexión exitosa$(NC)"; \
	else \
		echo "$(RED)✗ No se puede conectar al NAS$(NC)"; \
		exit 1; \
	fi

.PHONY: dashboard-check
dashboard-check: ## Verifica el dashboard financiero
	@echo "$(BLUE)Verificando dashboard financiero...$(NC)"
	@RESPONSE=$$(curl -s http://$(NAS_HOST):3003/api/financial/dashboard/overview); \
	if echo "$$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then \
		echo "$(RED)✗ Dashboard con errores:$(NC)"; \
		echo "$$RESPONSE" | jq '.'; \
	else \
		echo "$(GREEN)✓ Dashboard funcionando correctamente$(NC)"; \
		echo "$$RESPONSE" | jq '.'; \
	fi

# Targets de desarrollo
.PHONY: dev-status-old2
dev-status-old2: ## Estado del desarrollo local
	@curl -s http://localhost:3000/status | jq '.'

.PHONY: dev-migrate
dev-migrate: ## Aplica migraciones en desarrollo local
	@echo "$(BLUE)Aplicando migraciones en desarrollo...$(NC)"
	@docker exec -i ai-service-postgres-1 psql -U postgres -d ai_service < config/init-financial-tables.sql

# ==============================================================================
# COMANDOS DE SALUD Y VERSIÓN EN PRODUCCIÓN
# ==============================================================================

.PHONY: prod-health-check
prod-health-check: ## 🏥 Verificación completa de salud
	@echo "$(BLUE)🏥 Verificación de salud del sistema...$(NC)"
	@echo "$(YELLOW)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(GREEN)📊 Estado general:$(NC)"
	@curl -s http://$(NAS_HOST):3001/status | python3 -m json.tool 2>/dev/null || curl -s http://$(NAS_HOST):3001/status
	@echo ""
	@echo "$(GREEN)🔌 Health endpoint:$(NC)"
	@curl -s http://$(NAS_HOST):3001/health | python3 -m json.tool 2>/dev/null || curl -s http://$(NAS_HOST):3001/health
	@echo ""
	@echo "$(GREEN)🧠 Neural status:$(NC)"
	@curl -s http://$(NAS_HOST):3001/neural | python3 -m json.tool 2>/dev/null || curl -s http://$(NAS_HOST):3001/neural

.PHONY: prod-version-check
prod-version-check: ## 🏷️ Verificar versión e imagen
	@echo "$(BLUE)🏷️ Información de versión...$(NC)"
	@echo "$(YELLOW)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(GREEN)API Info:$(NC)"
	@curl -s http://$(NAS_HOST):3001/api/info | python3 -m json.tool 2>/dev/null || curl -s http://$(NAS_HOST):3001/api/info
	@echo ""
	@echo "$(GREEN)Docker Image:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker inspect ai-service --format='Image: {{.Config.Image}}\nCreated: {{.Created}}\nID: {{.Image}}' 2>/dev/null" || echo "Error obteniendo info de imagen"

.PHONY: prod-endpoints-check
prod-endpoints-check: ## 🌐 Listar endpoints disponibles
	@echo "$(BLUE)🌐 Endpoints disponibles...$(NC)"
	@echo "$(YELLOW)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@curl -s -X GET http://$(NAS_HOST):3001/api/notfound 2>&1 | \
		grep -o '"available_endpoints":\[[^]]*\]' | \
		sed 's/"available_endpoints":\[//' | \
		sed 's/\]//' | \
		sed 's/,/\n/g' | \
		sed 's/"//g' | \
		sort

.PHONY: prod-image-update
prod-image-update: ## 🔄 Actualizar imagen a la más reciente
	@echo "$(YELLOW)🔄 Actualizando imagen de Docker...$(NC)"
	@echo "$(BLUE)Verificando última imagen en GitHub...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker pull ghcr.io/christianlb/ai-service-api:latest"
	@echo "$(GREEN)✅ Imagen actualizada$(NC)"
	@echo "$(BLUE)Recreando contenedor con nueva imagen...$(NC)"
	@$(MAKE) prod-force-recreate

# ==============================================================================
# COMANDOS DE WATCHTOWER EN PRODUCCIÓN
# ==============================================================================

.PHONY: prod-watchtower-fix
prod-watchtower-fix: ## 🔧 Arreglar autenticación de Watchtower
	@echo "$(YELLOW)🔧 Arreglando Watchtower con autenticación correcta...$(NC)"
	@echo "$(BLUE)1. Deteniendo Watchtower actual...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker stop ai-watchtower 2>/dev/null || true"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker rm ai-watchtower 2>/dev/null || true"
	@echo "$(BLUE)2. Creando directorio de config si no existe...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "mkdir -p /volume1/docker/ai-service/config/watchtower"
	@echo "$(BLUE)3. Creando config.json con token actualizado...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		if [ -f .env ] && grep -q GHCR_TOKEN .env; then \
			TOKEN=\$$(grep GHCR_TOKEN .env | cut -d'=' -f2 | tr -d '\"' | tr -d \"'\"); \
			AUTH=\$$(echo -n \"christianlb:\$$TOKEN\" | base64); \
			echo '{\"auths\":{\"ghcr.io\":{\"auth\":\"'\$$AUTH'\"}}}' > config/watchtower/config.json; \
			chmod 600 config/watchtower/config.json; \
			echo '$(GREEN)✅ Config creado con token de .env$(NC)'; \
		else \
			echo '$(RED)❌ No se encontró GHCR_TOKEN en .env$(NC)'; \
			exit 1; \
		fi"
	@echo "$(BLUE)4. Iniciando Watchtower con config correcta...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker run -d \
			--name ai-watchtower \
			--restart unless-stopped \
			-e WATCHTOWER_CLEANUP=true \
			-e WATCHTOWER_POLL_INTERVAL=300 \
			-e WATCHTOWER_INCLUDE_RESTARTING=false \
			-e DOCKER_CONFIG=/config \
			-v /var/run/docker.sock:/var/run/docker.sock \
			-v /volume1/docker/ai-service/config/watchtower:/config:ro \
			containrrr/watchtower:latest \
			ai-service ai-service-frontend"
	@echo "$(GREEN)✅ Watchtower reiniciado con autenticación$(NC)"

.PHONY: prod-watchtower-test
prod-watchtower-test: ## 🧪 Probar que Watchtower puede autenticarse
	@echo "$(BLUE)🧪 Probando autenticación de Watchtower...$(NC)"
	@echo "$(YELLOW)Forzando chequeo inmediato...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker exec ai-watchtower /watchtower --run-once ai-service 2>&1 | tail -20"

.PHONY: prod-watchtower-status
prod-watchtower-status: ## 📊 Ver estado y logs de Watchtower
	@echo "$(BLUE)📊 Estado de Watchtower:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker ps | grep watchtower || echo '$(RED)❌ Watchtower no está corriendo$(NC)'"
	@echo ""
	@echo "$(BLUE)📋 Últimos logs:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker logs ai-watchtower --tail 10 2>&1"

# ==============================================================================
# COMANDOS LOCALES (usando ~/ai-service-prod montado)
# ==============================================================================

.PHONY: local-copy-sql
local-copy-sql: ## Copia archivos SQL al NAS via montaje local
	@echo "$(BLUE)Copiando archivos SQL a $(LOCAL_NAS_PATH)/config...$(NC)"
	@mkdir -p $(LOCAL_NAS_PATH)/config
	@cp -v config/*.sql $(LOCAL_NAS_PATH)/config/
	@echo "$(GREEN)✓ Archivos copiados$(NC)"

.PHONY: local-copy-schema
local-copy-schema: ## Copia el schema completo de producción
	@echo "$(BLUE)Copiando schema de producción...$(NC)"
	@cp -v scripts/complete-production-schema.sql $(LOCAL_NAS_PATH)/config/
	@cp -v config/init-db-production-clean.sql $(LOCAL_NAS_PATH)/config/
	@echo "$(GREEN)✓ Schema copiado$(NC)"

.PHONY: local-list
local-list: ## Lista archivos en el NAS local
	@echo "$(BLUE)Archivos en $(LOCAL_NAS_PATH):$(NC)"
	@ls -la $(LOCAL_NAS_PATH)/
	@echo ""
	@echo "$(BLUE)Archivos SQL:$(NC)"
	@ls -la $(LOCAL_NAS_PATH)/config/*.sql 2>/dev/null || echo "No hay archivos SQL"

.PHONY: local-backup-create
local-backup-create: ## Crea directorio de backups si no existe
	@echo "$(BLUE)Creando directorio de backups...$(NC)"
	@mkdir -p $(LOCAL_NAS_PATH)/backups
	@echo "$(GREEN)✓ Directorio creado$(NC)"

# ==============================================================================
# COMANDOS ADICIONALES DE PRODUCCIÓN
# ==============================================================================

.PHONY: prod-inspect-backend
prod-inspect-backend: ## 🔍 Inspeccionar configuración del backend
	@echo "$(BLUE)🔍 Inspeccionando configuración del backend...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker inspect ai-service | jq '.[0].Config.Env, .[0].HostConfig.Memory' 2>/dev/null || \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker inspect ai-service | grep -E '(Memory|Env)' | head -50"

.PHONY: prod-test-login
prod-test-login: ## 🔐 Probar endpoint de login
	@echo "$(BLUE)🔐 Probando login en producción...$(NC)"
	@curl -X POST http://$(NAS_HOST):3001/api/auth/login \
		-H "Content-Type: application/json" \
		-d '{"email":"admin@ai-service.local","password":"admin123"}' \
		-w "\n$(GREEN)Status: %{http_code}$(NC)\n" -s | jq . 2>/dev/null || \
	(curl -X POST http://$(NAS_HOST):3001/api/auth/login \
		-H "Content-Type: application/json" \
		-d '{"email":"admin@ai-service.local","password":"admin123"}' \
		-w "\n$(GREEN)Status: %{http_code}$(NC)\n" -s || echo "$(RED)❌ Error al conectar$(NC)")

.PHONY: prod-force-recreate
prod-force-recreate: ## 🔄 Forzar recreación de contenedores con nueva config
	@echo "$(YELLOW)⚠️  Recreando contenedores en producción...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker-compose stop ai-service && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker-compose rm -f ai-service && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker-compose up -d ai-service"
	@echo "$(GREEN)✅ Esperando inicio del servicio...$(NC)"
	@sleep 10
	@$(MAKE) prod-status

.PHONY: prod-update-compose
prod-update-compose: ## 📤 Actualizar docker-compose en producción
	@echo "$(BLUE)📤 Actualizando docker-compose.yml en producción...$(NC)"
	@scp docker-compose.nas.yml $(NAS_USER)@$(NAS_HOST):$(NAS_PATH)/docker-compose.yml
	@echo "$(GREEN)✅ Archivo actualizado$(NC)"

.PHONY: prod-check-images
prod-check-images: ## 🖼️ Verificar imágenes de Docker
	@echo "$(BLUE)🖼️ Imágenes disponibles:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker images | grep -E '(ai-service|christianlb)' | head -10"

.PHONY: prod-container-stats
prod-container-stats: ## 📊 Ver estadísticas de contenedores
	@echo "$(BLUE)📊 Estadísticas de contenedores:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker stats --no-stream ai-service ai-service-frontend ai-postgres ai-redis"

.PHONY: prod-exec-backend
prod-exec-backend: ## 🐚 Shell interactivo en el backend
	@echo "$(BLUE)🐚 Conectando al contenedor backend...$(NC)"
	@$(SSH_CMD) -t $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker exec -it ai-service sh"

.PHONY: prod-db-check-auth
prod-db-check-auth: ## 🗄️ Verificar tablas de autenticación
	@echo "$(BLUE)🗄️ Verificando tablas de autenticación...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c \
		\"SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE '%user%' OR tablename LIKE '%auth%');\""

.PHONY: prod-logs-error
prod-logs-error: ## 🚨 Ver solo logs de error
	@echo "$(RED)🚨 Logs de error del backend:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker logs ai-service 2>&1 | grep -E '(error|Error|ERROR|failed|Failed)' | tail -30"

# ==============================================================================
# COMANDOS DE BASE DE DATOS EN PRODUCCIÓN
# ==============================================================================

.PHONY: prod-db-compare-tables
prod-db-compare-tables: ## 🔍 Comparar tablas entre desarrollo y producción
	@echo "$(BLUE)🔍 Comparando tablas dev vs prod...$(NC)"
	@echo "$(YELLOW)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(GREEN)📋 Tablas en desarrollo:$(NC)"
	@docker exec ai-service-postgres psql -U ai_user -d ai_service -t -c \
		"SELECT schemaname || '.' || tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY 1;" > /tmp/tables-dev.txt
	@cat /tmp/tables-dev.txt
	@echo ""
	@echo "$(BLUE)📋 Tablas en producción:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -t -c \
		\"SELECT schemaname || '.' || tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY 1;\"" > /tmp/tables-prod.txt
	@cat /tmp/tables-prod.txt
	@echo ""
	@echo "$(YELLOW)📊 Diferencias:$(NC)"
	@echo "$(GREEN)Solo en desarrollo:$(NC)"
	@sort /tmp/tables-dev.txt > /tmp/tables-dev-sorted.txt
	@sort /tmp/tables-prod.txt > /tmp/tables-prod-sorted.txt
	@comm -23 /tmp/tables-dev-sorted.txt /tmp/tables-prod-sorted.txt | sed 's/^/  + /'
	@echo "$(RED)Solo en producción:$(NC)"
	@comm -13 /tmp/tables-dev-sorted.txt /tmp/tables-prod-sorted.txt | sed 's/^/  - /'
	@rm -f /tmp/tables-dev.txt /tmp/tables-prod.txt /tmp/tables-dev-sorted.txt /tmp/tables-prod-sorted.txt

.PHONY: prod-db-sync-schema
prod-db-sync-schema: ## 🔄 Sincronizar schema faltante de dev a prod
	@echo "$(YELLOW)🔄 Sincronizando schema a producción...$(NC)"
	@echo "$(RED)⚠️  Esto agregará tablas/columnas faltantes en producción$(NC)"
	@read -p "¿Continuar? (s/N): " confirm; \
	if [ "$$confirm" = "s" ]; then \
		echo "$(BLUE)Creando tabla integration_configs si no existe...$(NC)"; \
		$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
			echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c \
			\"CREATE TABLE IF NOT EXISTS financial.integration_configs ( \
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(), \
				type VARCHAR(50) NOT NULL, \
				key VARCHAR(100) NOT NULL, \
				config JSONB NOT NULL, \
				is_active BOOLEAN DEFAULT true, \
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
				UNIQUE(type, key) \
			);\"" && \
		echo "$(GREEN)✅ Tabla integration_configs creada/verificada$(NC)"; \
	else \
		echo "$(YELLOW)Cancelado$(NC)"; \
	fi

.PHONY: prod-db-cleanup
prod-db-cleanup: ## 🧹 Limpiar tablas de test en producción
	@echo "$(YELLOW)🧹 Limpiando tablas de test en producción...$(NC)"
	@echo "$(RED)⚠️  Esto eliminará: financial.test_table, financial.invoices_new$(NC)"
	@read -p "¿Continuar? (s/N): " confirm; \
	if [ "$$confirm" = "s" ]; then \
		echo "$(BLUE)Eliminando tablas de test...$(NC)"; \
		$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
			echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c \
			\"DROP TABLE IF EXISTS financial.test_table CASCADE; \
			DROP TABLE IF EXISTS financial.invoices_new CASCADE;\"" && \
		echo "$(GREEN)✅ Tablas de test eliminadas$(NC)"; \
	else \
		echo "$(YELLOW)Cancelado$(NC)"; \
	fi

.PHONY: prod-db-verify
prod-db-verify: ## ✅ Verificar integridad del schema
	@echo "$(BLUE)✅ Verificando integridad del schema...$(NC)"
	@echo "$(YELLOW)Tablas críticas:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c \
		\"SELECT \
			CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='financial' AND tablename='accounts') THEN '✅' ELSE '❌' END || ' financial.accounts', \
			CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='financial' AND tablename='transactions') THEN '✅' ELSE '❌' END || ' financial.transactions', \
			CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='financial' AND tablename='integration_configs') THEN '✅' ELSE '❌' END || ' financial.integration_configs', \
			CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='users') THEN '✅' ELSE '❌' END || ' public.users' \
		;\""

# ==============================================================================
# COMANDOS DE AUTENTICACIÓN EN PRODUCCIÓN
# ==============================================================================

.PHONY: prod-auth-create-admin
prod-auth-create-admin: ## 👤 Crear/resetear admin (admin@ai-service.local / admin123)
	@$(MAKE) -f Makefile.production prod-auth-create-admin

.PHONY: prod-auth-list-users  
prod-auth-list-users: ## 📋 Listar todos los usuarios en producción
	@$(MAKE) -f Makefile.production prod-auth-list-users

.PHONY: prod-auth-reset-attempts
prod-auth-reset-attempts: ## 🔓 Limpiar todos los intentos de login
	@$(MAKE) -f Makefile.production prod-auth-reset-attempts

.PHONY: prod-auth-check-attempts
prod-auth-check-attempts: ## 🔍 Ver intentos recientes de login
	@$(MAKE) -f Makefile.production prod-auth-check-attempts

.PHONY: prod-auth-reset-password
prod-auth-reset-password: ## 🔑 Resetear contraseña de usuario (interactivo)
	@$(MAKE) -f Makefile.production prod-auth-reset-password

.PHONY: prod-auth-check-tables
prod-auth-check-tables: ## 🗄️ Verificar si existen las tablas de autenticación
	@$(MAKE) -f Makefile.production prod-auth-check-tables

.PHONY: prod-auth-create-user
prod-auth-create-user: ## 👤 Crear nuevo usuario en producción
	@echo "$(BLUE)👤 Crear nuevo usuario en producción$(NC)"
	@read -p "Email: " email; \
	read -p "Nombre completo: " name; \
	read -s -p "Contraseña: " password; \
	echo; \
	read -p "Rol (admin/user) [user]: " role; \
	role=$${role:-user}; \
	if [ -z "$$email" ] || [ -z "$$password" ]; then \
		echo "$(RED)❌ Email y contraseña son requeridos$(NC)"; \
		exit 1; \
	fi; \
	HASH=$$(docker run --rm node:20-alpine sh -c "npm install bcrypt >/dev/null 2>&1 && node -e \"const bcrypt = require('bcrypt'); bcrypt.hash('$$password', 10).then(h => console.log(h))\"" 2>/dev/null | tail -1); \
	if [ -z "$$HASH" ]; then \
		echo "$(RED)❌ Error generando hash de contraseña$(NC)"; \
		exit 1; \
	fi; \
	$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker exec ai-postgres psql -U ai_user -d ai_service -c \
		\"INSERT INTO users (email, password_hash, full_name, role) VALUES ('$$email', '$$HASH', '$$name', '$$role') RETURNING email;\"" && \
	echo "$(GREEN)✅ Usuario creado: $$email$(NC)" || \
	echo "$(RED)❌ Error al crear usuario (puede que ya exista)$(NC)"

.PHONY: local-reset-db
local-reset-db: local-copy-schema ## Prepara archivos para reset de BD (ejecutar comandos en el NAS)
	@echo "$(YELLOW)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(YELLOW)Archivos copiados. Ahora en el NAS ejecuta:$(NC)"
	@echo ""
	@echo "$(GREEN)# 1. Detener servicios$(NC)"
	@echo "cd $(NAS_PATH)"
	@echo "sudo docker-compose -f docker-compose.production.yml down"
	@echo ""
	@echo "$(GREEN)# 2. Limpiar datos de PostgreSQL$(NC)"
	@echo "sudo rm -rf $(NAS_PATH)/postgres-data/*"
	@echo ""
	@echo "$(GREEN)# 3. Actualizar docker-compose.production.yml para incluir:$(NC)"
	@echo "postgres:"
	@echo "  volumes:"
	@echo "    - $(NAS_PATH)/config/init-db-production-clean.sql:/docker-entrypoint-initdb.d/01-init.sql:ro"
	@echo "    - $(NAS_PATH)/config/complete-production-schema.sql:/docker-entrypoint-initdb.d/02-schema.sql:ro"
	@echo ""
	@echo "$(GREEN)# 4. Iniciar servicios$(NC)"
	@echo "sudo docker-compose -f docker-compose.production.yml up -d"
	@echo "$(YELLOW)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"

.PHONY: local-compose-backup
local-compose-backup: ## Hace backup del docker-compose actual
	@echo "$(BLUE)Haciendo backup de docker-compose...$(NC)"
	@cp -v $(LOCAL_NAS_PATH)/docker-compose.production.yml $(LOCAL_NAS_PATH)/docker-compose.production.yml.bak
	@echo "$(GREEN)✓ Backup creado$(NC)"

.PHONY: local-compose-update
local-compose-update: ## Actualiza docker-compose con el de desarrollo
	@echo "$(BLUE)Actualizando docker-compose...$(NC)"
	@cp -v docker-compose.production.yml $(LOCAL_NAS_PATH)/
	@echo "$(GREEN)✓ docker-compose actualizado$(NC)"

# =============================================================================
# 🚀 COMANDOS DE INICIO RÁPIDO
# =============================================================================

.PHONY: setup
setup: ## Configurar ambiente inicial
	@echo "$(BLUE)🔧 Configurando ambiente...$(NC)"
	@if [ ! -f .make.env ]; then \
		echo "$(YELLOW)Creando .make.env desde template...$(NC)"; \
		cp .make.env.example .make.env; \
		echo "$(RED)⚠️  Edita .make.env con tus credenciales$(NC)"; \
	else \
		echo "$(GREEN)✓ .make.env ya existe$(NC)"; \
	fi
	@echo "$(GREEN)✓ Setup completado$(NC)"

.PHONY: init
init: setup ## Inicializar proyecto completo
	@$(MAKE) dev-install -f Makefile.development
	@$(MAKE) dev-up -f Makefile.development
	@echo "$(GREEN)✓ Proyecto inicializado$(NC)"

# Target por defecto
.DEFAULT_GOAL := help
.PHONY: prod-update
prod-update: ## 🚀 Actualizar producción manualmente (pull latest image)
	@echo "$$(tput setaf 3)🚀 Actualizando producción con última imagen...$$(tput sgr0)"
	@sshpass -e ssh -o StrictHostKeyChecking=no k2600x@192.168.1.11 "cd /volume1/docker/ai-service && echo '${SSHPASS}' | sudo -S /usr/local/bin/docker pull ghcr.io/christianlb/ai-service:latest && echo '${SSHPASS}' | sudo -S /usr/local/bin/docker-compose up -d ai-service && echo '✅ Update completado!'"

.PHONY: prod-restart
prod-restart: ## 🔄 Reiniciar servicio de producción
	@echo "$(BLUE)🔄 Reiniciando servicio en producción...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker-compose restart ai-service"
	@echo "$(GREEN)✓ Servicio reiniciado$(NC)"
	@sleep 5
	@$(MAKE) prod-status

.PHONY: prod-pull
prod-pull: ## 📥 Pull de última imagen desde ghcr.io
	@echo "$(BLUE)📥 Descargando última imagen desde ghcr.io...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker pull ghcr.io/christianlb/ai-service:latest"
	@echo "$(GREEN)✓ Imagen actualizada$(NC)"

.PHONY: prod-pull-frontend
prod-pull-frontend: ## 📥 Pull de imagen frontend desde ghcr.io
	@echo "$(BLUE)📥 Descargando imagen frontend desde ghcr.io...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker pull ghcr.io/christianlb/ai-service-frontend:latest"
	@echo "$(GREEN)✓ Imagen frontend actualizada$(NC)"

.PHONY: prod-memory-check
prod-memory-check: ## 📊 Verificar uso de memoria del servicio
	@echo "$(BLUE)📊 Verificando uso de memoria...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker stats --no-stream ai-service && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker exec ai-service ps aux --sort=-%mem | head -10"

.PHONY: prod-docker-compose
prod-docker-compose: ## 📝 Ver/editar docker-compose de producción
	@echo "$(BLUE)📝 Contenido de docker-compose.yml en producción:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		cat docker-compose.yml"

.PHONY: prod-sync-compose
prod-sync-compose: ## 📤 Sincronizar docker-compose.nas.yml con producción
	@./scripts/sync-compose-to-prod.sh

.PHONY: prod-recreate
prod-recreate: ## 🔄 Recrear contenedor con nueva configuración
	@echo "$(BLUE)🔄 Recreando contenedor con nueva configuración...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker-compose stop ai-service && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker-compose rm -f ai-service && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker-compose up -d ai-service"
	@echo "$(GREEN)✓ Contenedor recreado$(NC)"
	@sleep 10
	@$(MAKE) prod-status

.PHONY: prod-up
prod-up: ## 🚀 Levantar todos los servicios en producción
	@echo "$(BLUE)🚀 Levantando todos los servicios...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker-compose up -d"
	@echo "$(GREEN)✓ Todos los servicios levantados$(NC)"
	@sleep 10
	@$(MAKE) prod-status

.PHONY: prod-logs-frontend
prod-logs-frontend: ## 📋 Ver logs del servicio Frontend
	@echo "$(BLUE)📋 Logs del servicio Frontend...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "cd $(NAS_PATH) && \
		echo '$(SUDO_PASS)' | sudo -S /usr/local/bin/docker logs ai-service-frontend --tail 30"
-include Makefile.watchtower

# =============================================================================
# 🤖 AUTOMATED DEVELOPMENT STACK COMMANDS
# =============================================================================

.PHONY: db-generate
db-generate: ## 🔄 Generate Prisma client and Zod schemas
	@echo "$(BLUE)🔄 Generating Prisma client and schemas...$(NC)"
	@npm run db:generate
	@echo "$(GREEN)✓ Schemas generated$(NC)"

.PHONY: db-push
db-push: ## 📤 Push schema changes to database (dev only)
	@echo "$(BLUE)📤 Pushing schema to database...$(NC)"
	@npm run db:push
	@echo "$(GREEN)✓ Schema pushed$(NC)"

.PHONY: db-migrate
db-migrate: ## 🗃️ Run Prisma migrations
	@echo "$(BLUE)🗃️ Running database migrations...$(NC)"
	@npm run db:migrate
	@echo "$(GREEN)✓ Migrations complete$(NC)"

.PHONY: db-migrate-deploy
db-migrate-deploy: ## 📤 Deploy migrations to production (apply only)
	@echo "$(BLUE)📤 Deploying migrations to production...$(NC)"
	@npx prisma migrate deploy
	@echo "$(GREEN)✓ Migrations deployed$(NC)"

.PHONY: db-migrate-status
db-migrate-status: ## 📊 Check migration status
	@echo "$(BLUE)📊 Checking migration status...$(NC)"
	@npx prisma migrate status

.PHONY: db-migrate-create
db-migrate-create: ## ✨ Create new migration (NAME required)
	@if [ -z "$(NAME)" ]; then \
		echo "$(RED)Error: NAME is required. Usage: make db-migrate-create NAME=add_new_table$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)✨ Creating new migration: $(NAME)...$(NC)"
	@npx prisma migrate dev --create-only --name $(NAME)
	@echo "$(GREEN)✓ Migration created$(NC)"

.PHONY: db-studio
db-studio: ## 🎨 Open Prisma Studio
	@echo "$(BLUE)🎨 Opening Prisma Studio...$(NC)"
	@npm run db:studio

.PHONY: db-seed
db-seed: ## 🌱 Seed the database with test data
	@echo "$(BLUE)🌱 Seeding database...$(NC)"
	@npm run db:seed
	@echo "$(GREEN)✓ Database seeded$(NC)"

.PHONY: db-backup
db-backup: ## 📦 Create database backup
	@echo "$(BLUE)📦 Creating database backup...$(NC)"
	@mkdir -p backups
	@docker exec ai-service-postgres pg_dump -U $(DB_USER) $(DB_NAME) > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Backup created in backups/ directory$(NC)"

.PHONY: db-restore
db-restore: ## 📥 Restore database from backup (BACKUP_FILE required)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Error: BACKUP_FILE is required. Usage: make db-restore BACKUP_FILE=backups/backup_20250121_120000.sql$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)⚠️  WARNING: This will restore the database from $(BACKUP_FILE)$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to cancel, or Enter to continue...$(NC)"
	@read confirm
	@echo "$(BLUE)📥 Restoring database...$(NC)"
	@docker exec -i ai-service-postgres psql -U $(DB_USER) $(DB_NAME) < $(BACKUP_FILE)
	@echo "$(GREEN)✅ Database restored from $(BACKUP_FILE)$(NC)"

.PHONY: gen-crud
gen-crud: ## 🏗️ Generate complete CRUD for a model
	@echo "$(BLUE)🏗️ Generating CRUD...$(NC)"
	@npm run generate:crud
	@echo "$(GREEN)✓ CRUD generated$(NC)"

.PHONY: gen-service
gen-service: ## 🔧 Generate a service
	@echo "$(BLUE)🔧 Generating service...$(NC)"
	@npm run generate:service
	@echo "$(GREEN)✓ Service generated$(NC)"

.PHONY: gen-hook
gen-hook: ## 🪝 Generate a React hook
	@echo "$(BLUE)🪝 Generating hook...$(NC)"
	@npm run generate:hook
	@echo "$(GREEN)✓ Hook generated$(NC)"

.PHONY: gen-component
gen-component: ## 🧩 Generate a React component
	@echo "$(BLUE)🧩 Generating component...$(NC)"
	@npm run generate -- component
	@echo "$(GREEN)✓ Component generated$(NC)"

.PHONY: gen-module
gen-module: ## 📦 Generate a complete module
	@echo "$(BLUE)📦 Generating module...$(NC)"
	@npm run generate -- module
	@echo "$(GREEN)✓ Module generated$(NC)"

.PHONY: crud
crud: gen-crud db-generate ## 🚀 Generate CRUD and update schemas
	@echo "$(GREEN)✓ CRUD and schemas updated$(NC)"

.PHONY: gen-crud-auto
gen-crud-auto: ## 🔄 Generate CRUD automatically from Prisma model
	@if [ -z "$(MODEL)" ]; then \
		echo "$(RED)❌ Error: MODEL parameter is required$(NC)"; \
		echo "Usage: make gen-crud-auto MODEL=YourModel [SCHEMA=schema]"; \
		exit 1; \
	fi
	@npm run generate:crud:auto $(MODEL) $(if $(SCHEMA),-- --schema $(SCHEMA))

.PHONY: regen-trading-services
regen-trading-services: ## 🔧 Regenerate trading services with fixed templates
	@echo "$(YELLOW)🗑️ Removing problematic trading service files...$(NC)"
	@# Backend files
	@rm -f src/types/alert.types.ts src/services/alert.service.ts src/routes/alert.ts
	@rm -f src/types/position.types.ts src/services/position.service.ts src/routes/position.ts
	@rm -f src/types/strategy.types.ts src/services/strategy.service.ts src/routes/strategy.ts
	@rm -f src/types/trade.types.ts src/services/trade.service.ts src/routes/trade.ts
	@# Frontend files
	@rm -f frontend/src/types/alert.types.ts frontend/src/services/alert.service.ts
	@rm -f frontend/src/types/position.types.ts frontend/src/services/position.service.ts
	@rm -f frontend/src/types/strategy.types.ts frontend/src/services/strategy.service.ts
	@rm -f frontend/src/types/trade.types.ts frontend/src/services/trade.service.ts
	@echo "$(BLUE)🔨 Regenerating services with corrected templates...$(NC)"
	@npm run generate:crud:auto Alert -- --skip-validation --features types,service,api || true
	@npm run generate:crud:auto Position -- --schema trading --skip-validation --features types,service,api || true
	@npm run generate:crud:auto Strategy -- --schema trading --skip-validation --features types,service,api || true
	@npm run generate:crud:auto Trade -- --schema trading --skip-validation --features types,service,api || true
	@echo "$(GREEN)✅ Services regenerated. Run 'make build-backend' to check for errors.$(NC)"

.PHONY: fix-build-errors
fix-build-errors: regen-trading-services ## 🛠️ Fix TypeScript build errors
	@echo "$(BLUE)🔧 Fixing build errors...$(NC)"
	@make build-backend

.PHONY: build-backend
build-backend: ## 🏭 Build backend TypeScript code
	@echo "$(BLUE)🏭 Building backend...$(NC)"
	@npm run build:backend || echo "$(RED)❌ Build failed with errors$(NC)"

.PHONY: build-backend-ignore-errors
build-backend-ignore-errors: ## 🏭 Build backend ignoring TypeScript errors
	@echo "$(YELLOW)⚠️ Building backend with --noEmitOnError false...$(NC)"
	@npm run build:backend:nocheck
	@echo "$(GREEN)✅ Build completed (with possible type errors)$(NC)"

.PHONY: setup-dev-stack
setup-dev-stack: ## 🏗️ Complete setup of automated development stack
	@echo "$(BLUE)🏗️ Setting up automated development stack...$(NC)"
	@npm install
	@npm run db:generate
	@npm run db:push
	@npm run db:seed
	@echo "$(GREEN)✓ Development stack ready\!$(NC)"
	@echo "$(YELLOW)Run 'make gen-crud' to generate your first CRUD$(NC)"

.PHONY: validate-deploy
validate-deploy: ## ✅ Validate code before deployment
	@echo "$(BLUE)✅ Validating code...$(NC)"
	@npm run lint || true
	@npm run typecheck
	@npm test
	@echo "$(GREEN)✓ Validation complete$(NC)"

# =============================================================================
# 🔌 MCP LOCAL SERVER COMMANDS
# =============================================================================

.PHONY: mcp-setup
mcp-setup: ## 🔌 Complete MCP local server setup
	@echo "$(BLUE)🔌 Setting up MCP local server...$(NC)"
	@cd mcp-local && $(MAKE) quick-setup
	@echo "$(GREEN)✓ MCP local server ready!$(NC)"
	@echo "$(YELLOW)💡 Next: Restart Claude Code to load the configuration$(NC)"

.PHONY: mcp-start
mcp-start: ## 🚀 Start MCP local server
	@echo "$(BLUE)🚀 Starting MCP local server...$(NC)"
	@cd mcp-local && $(MAKE) start

.PHONY: mcp-dev
mcp-dev: ## 🔧 Start MCP server in development mode
	@echo "$(BLUE)🔧 Starting MCP server in development mode...$(NC)"
	@cd mcp-local && $(MAKE) dev

.PHONY: mcp-test
mcp-test: ## 🧪 Test MCP local server
	@echo "$(BLUE)🧪 Testing MCP local server...$(NC)"
	@cd mcp-local && $(MAKE) test

.PHONY: mcp-validate
mcp-validate: ## ✅ Validate MCP server setup
	@cd mcp-local && ./scripts/validate-setup.sh

.PHONY: mcp-config
mcp-config: ## ⚙️ Install Claude Code configuration
	@echo "$(BLUE)⚙️ Installing Claude Code configuration...$(NC)"
	@cd mcp-local && $(MAKE) claude-config

.PHONY: mcp-status
mcp-status: ## 📊 Check MCP server status
	@echo "$(BLUE)📊 MCP Server Status:$(NC)"
	@echo "$(YELLOW)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(GREEN)🌐 MCP Bridge (Production):$(NC)"
	@curl -s http://localhost:8380/health >/dev/null 2>&1 && echo "  ✅ Running (localhost:8380)" || echo "  ❌ Not running"
	@echo "$(GREEN)📁 Local MCP Server Files:$(NC)"
	@[ -f mcp-local/dist/server.js ] && echo "  ✅ Built (mcp-local/dist/server.js)" || echo "  ❌ Not built"
	@[ -f mcp-local/.env ] && echo "  ✅ Configured (mcp-local/.env)" || echo "  ❌ Not configured"
	@echo "$(GREEN)🤖 Claude Code Config:$(NC)"
	@[ -f ~/.config/claude/claude_desktop_config.json ] && echo "  ✅ Installed (~/.config/claude/)" || echo "  ❌ Not installed"

.PHONY: mcp-logs
mcp-logs: ## 📋 View MCP server logs (development mode)
	@echo "$(BLUE)📋 MCP Server Logs:$(NC)"
	@echo "$(YELLOW)💡 Start with 'make mcp-dev' to see real-time logs$(NC)"

.PHONY: mcp-clean
mcp-clean: ## 🧹 Clean MCP server build artifacts
	@echo "$(BLUE)🧹 Cleaning MCP server...$(NC)"
	@cd mcp-local && $(MAKE) clean
	@echo "$(GREEN)✓ MCP server cleaned$(NC)"

.PHONY: mcp-help
mcp-help: ## ❓ Show MCP local server help
	@echo "$(BLUE)🔌 MCP Local Server Commands:$(NC)"
	@echo "$(YELLOW)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(GREEN)Setup & Configuration:$(NC)"
	@echo "  make mcp-setup      - Complete setup (first time)"
	@echo "  make mcp-config     - Install Claude Code config"
	@echo "  make mcp-validate   - Validate setup"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make mcp-start      - Start MCP server"
	@echo "  make mcp-dev        - Development mode with auto-reload"
	@echo "  make mcp-test       - Run tests"
	@echo ""
	@echo "$(GREEN)Monitoring:$(NC)"
	@echo "  make mcp-status     - Check server status"
	@echo "  make mcp-logs       - View logs"
	@echo ""
	@echo "$(GREEN)Maintenance:$(NC)"
	@echo "  make mcp-clean      - Clean build artifacts"
	@echo ""
	@echo "$(YELLOW)📖 Documentation: mcp-local/README.md$(NC)"
	@echo "$(YELLOW)🎯 Usage in Claude Code: 'Show me financial summary for last month'$(NC)"

