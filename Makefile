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
.PHONY: dev-status
dev-status: ## Estado del desarrollo local
	@curl -s http://localhost:3000/status | jq '.'

.PHONY: dev-migrate
dev-migrate: ## Aplica migraciones en desarrollo local
	@echo "$(BLUE)Aplicando migraciones en desarrollo...$(NC)"
	@docker exec -i ai-service-postgres-1 psql -U postgres -d ai_service < config/init-financial-tables.sql

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
-include Makefile.watchtower
