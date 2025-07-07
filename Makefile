# AI Service Makefile - Comandos optimizados para desarrollo eficiente
.PHONY: help dev prod test build clean setup lint typecheck validate

# Colores para output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m

help: ## Mostrar esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "${GREEN}%-20s${NC} %s\n", $$1, $$2}'

# === DESARROLLO RÁPIDO ===
dev: ## Iniciar desarrollo completo (backend + frontend)
	@echo "${YELLOW}🚀 Iniciando desarrollo completo...${NC}"
	npm run dev:full

dev-backend: ## Solo backend en modo desarrollo
	npm run dev

dev-frontend: ## Solo frontend en modo desarrollo
	npm run dev:frontend

# === DOCKER COMMANDS ===
up: ## Levantar todos los servicios Docker
	docker compose up -d
	@echo "${GREEN}✅ Servicios levantados. Verificando salud...${NC}"
	@sleep 5
	@make health

down: ## Detener servicios Docker
	docker compose down

rebuild: ## Reconstruir contenedores sin cache
	docker compose build --no-cache
	docker compose up -d

logs: ## Ver logs de todos los servicios
	docker compose logs -f

logs-ai: ## Ver solo logs del servicio AI
	docker compose logs -f ai-service

# === TESTING ===
test: ## Ejecutar todos los tests
	npm test

test-watch: ## Tests en modo watch
	npm run test:watch

test-coverage: ## Tests con cobertura
	npm run test:coverage

# === VALIDACIÓN Y CALIDAD ===
validate: ## Validar todo (tipos, tests, esquemas)
	@echo "${YELLOW}🔍 Validando proyecto...${NC}"
	@make typecheck
	@make validate-schema
	@echo "${GREEN}✅ Validación completa${NC}"

typecheck: ## Verificar tipos TypeScript
	npm run typecheck

validate-schema: ## Validar esquemas de datos
	npm run validate:schema

lint: ## Ejecutar linter (cuando esté configurado)
	npm run lint

# === BUILD Y DEPLOY ===
build: ## Construir para producción
	npm run build

predeploy: ## Preparar para deployment
	npm run predeploy

deploy-check: ## Verificar si está listo para deploy
	npm run deploy:check

deploy-prod: ## Deploy manual a producción (emergencia)
	@echo "${RED}⚠️ DEPLOY MANUAL A PRODUCCIÓN${NC}"
	@echo "${YELLOW}Normalmente el deploy es automático via GitHub Actions${NC}"
	@echo "${YELLOW}¿Continuar con deploy manual? (escribe 'DEPLOY' para confirmar)${NC}"
	@read confirmation && [ "$$confirmation" = "DEPLOY" ] || (echo "Cancelado" && exit 1)
	./scripts/claude-deploy-manager.sh prod

deploy-dev: ## Deploy a desarrollo
	./scripts/claude-deploy-manager.sh dev

switch-to-ghcr: ## Cambiar a usar imagen de GHCR (redespliegue final)
	@echo "${RED}⚠️ CAMBIO A IMAGEN DE GHCR${NC}"
	@echo "${YELLOW}Esto cambiará tu stack para usar ghcr.io/k2600x/ai-service:latest${NC}"
	@echo "${YELLOW}Y activará Watchtower para auto-updates${NC}"
	@echo "${YELLOW}¿Continuar? (escribe 'SWITCH' para confirmar)${NC}"
	@read confirmation && [ "$$confirmation" = "SWITCH" ] || (echo "Cancelado" && exit 1)
	@echo "${YELLOW}🔄 Pulling latest image from GHCR...${NC}"
	docker pull ghcr.io/k2600x/ai-service:latest
	@echo "${YELLOW}🔄 Restarting stack with Watchtower...${NC}"
	docker compose down
	docker compose up -d
	@echo "${GREEN}✅ Stack migrado a GHCR con Watchtower activo${NC}"
	@echo "${YELLOW}💡 Verifica los logs: make logs${NC}"

switch-to-ghcr-remote: ## Cambiar a GHCR remotamente (SSH key-based, SECURE)
	@echo "${BLUE}🔐 Executing secure remote deployment...${NC}"
	./scripts/secure-deploy-remote.sh

# === SETUP Y MANTENIMIENTO ===
setup: ## Setup inicial del proyecto
	@echo "${YELLOW}🛠️ Configurando proyecto...${NC}"
	npm install
	npm run install:frontend
	./scripts/setup-production.sh
	@echo "${GREEN}✅ Setup completo${NC}"

clean: ## Limpiar archivos generados
	rm -rf dist node_modules frontend/node_modules coverage
	find . -name "*.log" -type f -delete

reset-db: ## Resetear base de datos (CUIDADO!)
	@echo "${RED}⚠️ Esto borrará todos los datos. Presiona Ctrl+C para cancelar...${NC}"
	@sleep 3
	docker compose down -v
	docker compose up -d postgres
	@sleep 5
	docker compose exec postgres psql -U ai_user -d ai_service -f /docker-entrypoint-initdb.d/init-db.sql

# === MONITOREO ===
health: ## Verificar salud de servicios
	@echo "${YELLOW}🏥 Verificando salud de servicios...${NC}"
	@curl -s http://localhost:3000/status || echo "${RED}❌ AI Service no responde${NC}"
	@curl -s http://localhost:5678/healthz || echo "${RED}❌ n8n no responde${NC}"
	@curl -s http://localhost:9090/-/healthy || echo "${RED}❌ Prometheus no responde${NC}"
	@echo "${GREEN}✅ Verificación completa${NC}"

status: ## Estado rápido del sistema
	@docker compose ps
	@echo "\n${YELLOW}📊 Uso de recursos:${NC}"
	@docker stats --no-stream

# === UTILIDADES ===
shell: ## Entrar al contenedor del servicio AI
	docker compose exec ai-service /bin/bash

shell-db: ## Entrar a PostgreSQL
	docker compose exec postgres psql -U ai_user -d ai_service

redis-cli: ## Acceder a Redis CLI
	docker compose exec redis redis-cli -a redis_secure_password_2025

# === DATABASE MANAGEMENT ===
migrate-financial: ## Crear schema financiero (requiere ENV=development|production)
	@if [ -z "$(ENV)" ]; then echo "${RED}Error: Especifica ENV=development o ENV=production${NC}"; exit 1; fi
	@echo "${YELLOW}🏦 Ejecutando migración financiera en $(ENV)...${NC}"
	./scripts/setup-financial-db.sh

migrate-financial-prod: ## Crear schema financiero en PRODUCCIÓN (requiere confirmación)
	@echo "${RED}⚠️ MIGRACIÓN A PRODUCCIÓN - Esto afectará la base de datos en vivo${NC}"
	@echo "${YELLOW}¿Estás seguro? (escribe 'MIGRATE' para confirmar)${NC}"
	@read confirmation && [ "$$confirmation" = "MIGRATE" ] || (echo "Cancelado" && exit 1)
	ENV=production make migrate-financial

test-financial: ## Probar configuración financiera
	./scripts/test-financial-setup.sh

security-audit: ## Verificar que no hay credenciales expuestas
	./scripts/security-audit.sh

# === DOCUMENTOS ===
ingest: ## Ingestar documento (requiere FILE=path/to/file)
	@if [ -z "$(FILE)" ]; then echo "${RED}Error: Especifica FILE=path/to/document${NC}"; exit 1; fi
	./scripts/ingest-document.sh $(FILE)

# === TELEGRAM ===
telegram-test: ## Probar bot de Telegram
	./scripts/test-telegram.sh

# === ATAJOS COMUNES ===
d: dev ## Alias para dev
t: test ## Alias para test
u: up ## Alias para up
l: logs-ai ## Alias para logs del servicio AI