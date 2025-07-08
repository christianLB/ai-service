# Makefile principal - AI Service
# Sistema completo de gestión de ambientes y deployment

# Cargar configuración local si existe
-include .make.env

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

.PHONY: prod
prod: ## Ver estado de producción
	@$(MAKE) -f Makefile.quick prod

.PHONY: dev
dev: ## Ver estado de desarrollo  
	@$(MAKE) -f Makefile.quick dev

.PHONY: st
st: ## Status ultra-rápido
	@$(MAKE) -f Makefile.quick st

.PHONY: 911
911: ## Guía de emergencia
	@$(MAKE) -f Makefile.quick 911

.PHONY: help-all
help-all: ## Ver TODOS los comandos
	@$(MAKE) -f Makefile.quick help-all

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
	@echo "  $(GREEN)make 911$(NC)             - Guía de emergencia"
	@echo ""
	@echo "$(YELLOW)Comandos por categoría:$(NC)"
	@echo "  $(BLUE)make -f Makefile.production help$(NC)  - Comandos de producción"
	@echo "  $(BLUE)make -f Makefile.development help$(NC) - Comandos de desarrollo"
	@echo "  $(BLUE)make -f Makefile.multi-env help$(NC)   - Comandos multi-ambiente"
	@echo "  $(BLUE)make -f Makefile.compare help$(NC)     - Comandos de comparación"
	@echo "  $(BLUE)make -f Makefile.quick help$(NC)       - Comandos rápidos"
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

.PHONY: check-db
check-db: ## Verifica conexión a la base de datos
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
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "sudo docker restart ai-service"
	@sleep 5
	@$(MAKE) status-simple

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

.PHONY: deploy
deploy: ## Deploy completo (migración + restart)
	@echo "$(BLUE)=== INICIANDO DEPLOYMENT ===$(NC)"
	@$(MAKE) check-db
	@$(MAKE) apply-financial-migration
	@$(MAKE) restart-service
	@echo "$(GREEN)=== DEPLOYMENT COMPLETADO ===$(NC)"
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