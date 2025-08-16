# AI Service - Main Makefile
# =============================================================================
# Orchestrator for all modular Makefiles
# Use 'make help' to see common commands or 'make help-all' for everything
# =============================================================================

# Load local configuration if exists
-include .make.env

# Default goal
.DEFAULT_GOAL := help

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
MAGENTA := \033[0;35m
CYAN := \033[0;36m
NC := \033[0m

# =============================================================================
# 🎯 QUICK START - Most Common Commands
# =============================================================================

.PHONY: up
up: ## Start development environment
	@$(MAKE) -f Makefile.docker dev-up

.PHONY: down
down: ## Stop development environment
	@$(MAKE) -f Makefile.docker dev-down

.PHONY: restart
restart: ## Restart development environment
	@$(MAKE) -f Makefile.docker dev-restart

.PHONY: logs
logs: ## Show development logs (live)
	@$(MAKE) -f Makefile.docker dev-logs

.PHONY: status
status: ## Show development environment status
	@$(MAKE) -f Makefile.docker dev-status

.PHONY: build
build: ## Build all services
	@$(MAKE) -f Makefile.docker build

.PHONY: test
test: ## Run all tests
	@$(MAKE) -f Makefile.testing test

.PHONY: clean
clean: ## Clean Docker resources
	@$(MAKE) -f Makefile.docker docker-clean

# =============================================================================
# 🏥 HEALTH CHECK COMMANDS (F1 - Scaffold de servicios)
# =============================================================================

.PHONY: health
health: ## Check health of all services
	@echo "$(GREEN)🏥 Checking health of all services...$(NC)"
	@echo "$(CYAN)Gateway:$(NC)"
	@curl -fsS http://localhost:3005/health/live 2>/dev/null && echo "  ✅ API Gateway is healthy" || echo "  ❌ API Gateway is down"
	@echo "$(CYAN)Services:$(NC)"
	@curl -fsS http://localhost:3001/health/live 2>/dev/null && echo "  ✅ Financial Service is healthy" || echo "  ❌ Financial Service is down"
	@curl -fsS http://localhost:3002/health/live 2>/dev/null && echo "  ✅ Trading Service is healthy" || echo "  ❌ Trading Service is down"
	@curl -fsS http://localhost:3003/health/live 2>/dev/null && echo "  ✅ Comm Service is healthy" || echo "  ❌ Comm Service is down"
	@curl -fsS http://localhost:3004/health/live 2>/dev/null && echo "  ✅ AI Core is healthy" || echo "  ❌ AI Core is down"
	@echo "$(CYAN)Workers:$(NC)"
	@curl -fsS http://localhost:3101/health/live 2>/dev/null && echo "  ✅ Financial Worker is healthy" || echo "  ❌ Financial Worker is down"
	@curl -fsS http://localhost:3102/health/live 2>/dev/null && echo "  ✅ Trading Worker is healthy" || echo "  ❌ Trading Worker is down"
	@echo "$(CYAN)Infrastructure:$(NC)"
	@docker exec ai-service-postgres pg_isready -U ai_user 2>/dev/null && echo "  ✅ PostgreSQL is healthy" || echo "  ❌ PostgreSQL is down"
	@docker exec ai-service-redis redis-cli ping 2>/dev/null | grep -q PONG && echo "  ✅ Redis is healthy" || echo "  ❌ Redis is down"

.PHONY: health-ready
health-ready: ## Check readiness of all services (with dependencies)
	@echo "$(GREEN)🏥 Checking readiness of all services...$(NC)"
	@for port in 3005 3001 3002 3003 3004 3101 3102; do \
		response=$$(curl -s http://localhost:$$port/health/ready 2>/dev/null); \
		if [ -n "$$response" ]; then \
			echo "  ✅ Service on port $$port is ready: $$response"; \
		else \
			echo "  ❌ Service on port $$port is not ready"; \
		fi; \
	done

.PHONY: health-metrics
health-metrics: ## Show metrics from all services
	@echo "$(GREEN)📊 Fetching metrics from all services...$(NC)"
	@for port in 3005 3001 3002 3003 3004 3101 3102; do \
		echo "$(CYAN)Metrics from port $$port:$(NC)"; \
		curl -s http://localhost:$$port/metrics 2>/dev/null | head -20 || echo "  ❌ No metrics available"; \
		echo ""; \
	done

.PHONY: microservices-up
microservices-up: ## Start microservices architecture (F1 completion)
	@echo "$(GREEN)🚀 Starting microservices architecture...$(NC)"
	@cd infra/compose && docker compose -f docker-compose.dev.yml up -d
	@echo "$(YELLOW)⏳ Waiting for services to be healthy...$(NC)"
	@sleep 10
	@$(MAKE) health

.PHONY: microservices-down
microservices-down: ## Stop microservices architecture
	@echo "$(RED)🛑 Stopping microservices architecture...$(NC)"
	@cd infra/compose && docker compose -f docker-compose.dev.yml down

.PHONY: microservices-logs
microservices-logs: ## Show logs from all microservices
	@cd infra/compose && docker compose -f docker-compose.dev.yml logs -f

.PHONY: f1-validate
f1-validate: ## Validate F1 (Scaffold de servicios) completion
	@echo "$(GREEN)✅ Validating F1 - Scaffold de servicios...$(NC)"
	@echo "$(CYAN)1. Checking Docker Compose startup...$(NC)"
	@cd infra/compose && docker compose -f docker-compose.dev.yml up -d
	@sleep 15
	@echo "$(CYAN)2. Checking all services respond to /health/live...$(NC)"
	@$(MAKE) health
	@echo "$(CYAN)3. Checking service dependencies...$(NC)"
	@cd infra/compose && docker compose -f docker-compose.dev.yml ps
	@echo "$(GREEN)✅ F1 Validation Complete!$(NC)"

# =============================================================================
# 🗄️ DATABASE SHORTCUTS
# =============================================================================

.PHONY: db-shell
db-shell: ## Open PostgreSQL shell
	@$(MAKE) -f Makefile.database db-shell

.PHONY: db-studio
db-studio: ## Open Prisma Studio (visual DB browser)
	@$(MAKE) -f Makefile.database db-studio

.PHONY: db-migrate
db-migrate: ## Apply pending migrations
	@$(MAKE) -f Makefile.database db-migrate

.PHONY: db-migrate-status
db-migrate-status: ## Check migration status
	@$(MAKE) -f Makefile.database db-migrate-status

.PHONY: db-migrate-create
db-migrate-create: ## Create new migration (use: make db-migrate-create NAME=description)
	@$(MAKE) -f Makefile.database db-migrate-create NAME=$(NAME)

.PHONY: db-backup
db-backup: ## Create database backup
	@$(MAKE) -f Makefile.database db-backup

.PHONY: db-restore
db-restore: ## Restore database from backup
	@$(MAKE) -f Makefile.database db-restore FILE=$(FILE)

# =============================================================================
# 🎨 FRONTEND SHORTCUTS
# =============================================================================

.PHONY: frontend-dev
frontend-dev: ## Start frontend development server
	@$(MAKE) -f Makefile.frontend frontend-dev

.PHONY: frontend-build
frontend-build: ## Build frontend for production
	@$(MAKE) -f Makefile.frontend frontend-build

.PHONY: frontend-test
frontend-test: ## Run frontend tests
	@$(MAKE) -f Makefile.frontend frontend-test

.PHONY: frontend-deploy
frontend-deploy: ## Deploy frontend to production
	@$(MAKE) -f Makefile.frontend frontend-deploy

# =============================================================================
# 🧪 TESTING SHORTCUTS
# =============================================================================

.PHONY: test-unit
test-unit: ## Run unit tests
	@$(MAKE) -f Makefile.testing test-unit

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	@$(MAKE) -f Makefile.testing test-e2e

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	@$(MAKE) -f Makefile.testing test-coverage

.PHONY: lint
lint: ## Run ESLint
	@$(MAKE) -f Makefile.testing lint

.PHONY: typecheck
typecheck: ## Run TypeScript type checking
	@$(MAKE) -f Makefile.testing typecheck

# =============================================================================
# 🚀 PRODUCTION SHORTCUTS
# =============================================================================

.PHONY: prod-deploy
prod-deploy: ## Deploy to production
	@$(MAKE) -f Makefile.production deploy

.PHONY: prod-status
prod-status: ## Check production status
	@$(MAKE) -f Makefile.production status

.PHONY: prod-logs
prod-logs: ## Show production logs
	@$(MAKE) -f Makefile.production logs

.PHONY: prod-backup
prod-backup: ## Backup production database
	@$(MAKE) -f Makefile.production backup

.PHONY: prod-health
prod-health: ## Check production health
	@$(MAKE) -f Makefile.production health

# =============================================================================
# 🔄 PRODUCTION MIGRATION SHORTCUTS
# =============================================================================

.PHONY: prod-migrate-status
prod-migrate-status: ## Check Prisma migration status in production
	@$(MAKE) -f Makefile.production prod-migrate-status

.PHONY: prod-migrate-deploy
prod-migrate-deploy: ## Apply pending Prisma migrations to production (SAFE)
	@$(MAKE) -f Makefile.production prod-migrate-deploy

.PHONY: prod-migrate-reset
prod-migrate-reset: ## DANGER: Reset database and apply all migrations
	@$(MAKE) -f Makefile.production prod-migrate-reset

# =============================================================================
# 🚨 PRODUCTION RECOVERY
# =============================================================================

.PHONY: prod-recovery
prod-recovery: ## Run complete production recovery (fixes bad gateway, migrations, etc)
	@echo "Starting comprehensive production recovery..."
	@./scripts/production-recovery.sh

.PHONY: prod-emergency-schema
prod-emergency-schema: ## Apply emergency schema if migrations fail
	@echo "Applying emergency schema to production..."
	@./scripts/apply-emergency-schema.sh

.PHONY: prod-diagnose
prod-diagnose: ## Diagnose production issues
	@echo "Running production diagnostics..."
	@./scripts/diagnose-production.sh

# =============================================================================
# 👤 PRODUCTION ADMIN SHORTCUTS
# =============================================================================

.PHONY: prod-create-admin
prod-create-admin: ## Create admin user in production
	@$(MAKE) -f Makefile.prod-admin prod-create-admin

.PHONY: prod-reset-password
prod-reset-password: ## Reset user password in production
	@$(MAKE) -f Makefile.prod-admin prod-reset-password

.PHONY: prod-change-db-password
prod-change-db-password: ## Change database password in production
	@$(MAKE) -f Makefile.prod-admin prod-change-db-password

.PHONY: prod-set-api-keys
prod-set-api-keys: ## Set API keys in production
	@$(MAKE) -f Makefile.prod-admin prod-set-api-keys

.PHONY: prod-backup-full
prod-backup-full: ## Full backup of production
	@$(MAKE) -f Makefile.prod-admin prod-backup-full

.PHONY: prod-health-check
prod-health-check: ## Comprehensive health check
	@$(MAKE) -f Makefile.prod-admin prod-health-check

.PHONY: prod-list-users
prod-list-users: ## List all users in production
	@$(MAKE) -f Makefile.prod-admin prod-list-users

.PHONY: prod-create-admin-simple
prod-create-admin-simple: ## Create admin user (simple version)
	@$(MAKE) -f Makefile.prod-admin prod-create-admin-simple

.PHONY: prod-optimize-db
prod-optimize-db: ## Optimize production database
	@$(MAKE) -f Makefile.prod-admin prod-optimize-db

.PHONY: prod-list-backups
prod-list-backups: ## List available backups
	@$(MAKE) -f Makefile.prod-admin prod-list-backups

.PHONY: prod-logs-tail
prod-logs-tail: ## Tail production logs
	@$(MAKE) -f Makefile.prod-admin prod-logs-tail

.PHONY: prod-clean-logs
prod-clean-logs: ## Clean old logs
	@$(MAKE) -f Makefile.prod-admin prod-clean-logs

# =============================================================================
# 🔍 TROUBLESHOOTING SHORTCUTS
# =============================================================================

.PHONY: diagnose
diagnose: ## Run system diagnostics
	@$(MAKE) -f Makefile.troubleshooting diagnose

.PHONY: fix-all
fix-all: ## Fix all known issues
	@$(MAKE) -f Makefile.troubleshooting fix-all

.PHONY: health
health: ## Complete health check
	@$(MAKE) -f Makefile.troubleshooting health

.PHONY: emergency-restart
emergency-restart: ## Emergency restart all services
	@$(MAKE) -f Makefile.troubleshooting emergency-restart

# =============================================================================
# 🔐 AUTHENTICATION SHORTCUTS
# =============================================================================

.PHONY: auth-token
auth-token: ## Get development auth token
	@$(MAKE) -f Makefile.auth get-token

.PHONY: prod-login  
prod-login: ## Login to production and get auth token
	@$(MAKE) -f Makefile.prod-admin prod-login

.PHONY: prod-token
prod-token: ## Get production auth token quickly
	@$(MAKE) -f Makefile.prod-admin prod-token

.PHONY: auth-test
auth-test: ## Test authentication
	@$(MAKE) -f Makefile.auth test

# =============================================================================
# 💰 FINANCIAL MODULE SHORTCUTS
# =============================================================================

.PHONY: financial-sync
financial-sync: ## Sync financial data from production
	@$(MAKE) -f Makefile.financial-sync financial-sync-down

.PHONY: financial-backup
financial-backup: ## Backup financial data
	@$(MAKE) -f Makefile.financial-sync financial-backup-prod

# =============================================================================
# 🔌 GATEWAY SHORTCUTS (DEV)
# =============================================================================

.PHONY: dev-build-gateway
dev-build-gateway: ## Build api-gateway image (no cache)
	@$(MAKE) -f Makefile.docker dev-build-gateway

.PHONY: dev-up-gateway
dev-up-gateway: ## Recreate api-gateway container
	@$(MAKE) -f Makefile.docker dev-up-gateway

.PHONY: dev-logs-gateway
dev-logs-gateway: ## Tail api-gateway logs
	@$(MAKE) -f Makefile.docker dev-logs-gateway

.PHONY: dev-exec-gateway
dev-exec-gateway: ## Exec into api-gateway container
	@$(MAKE) -f Makefile.docker dev-exec-gateway

.PHONY: dev-ready-gateway
dev-ready-gateway: ## Wait for api-gateway readiness
	@$(MAKE) -f Makefile.docker dev-ready-gateway

# =============================================================================
# 💸 FINANCIAL-SVC SHORTCUTS (DEV)
# =============================================================================

.PHONY: dev-build-financial
dev-build-financial: ## Build financial-svc image (no cache)
	@$(MAKE) -f Makefile.docker dev-build-financial

.PHONY: dev-up-financial
dev-up-financial: ## Recreate financial-svc container
	@$(MAKE) -f Makefile.docker dev-up-financial

.PHONY: dev-logs-financial
dev-logs-financial: ## Tail financial-svc logs
	@$(MAKE) -f Makefile.docker dev-logs-financial

.PHONY: dev-exec-financial
dev-exec-financial: ## Exec into financial-svc container
	@$(MAKE) -f Makefile.docker dev-exec-financial

.PHONY: dev-ready-financial
dev-ready-financial: ## Wait for financial-svc readiness
	@$(MAKE) -f Makefile.docker dev-ready-financial

# =============================================================================
# 🌐 MCP BRIDGE SHORTCUTS
# =============================================================================

.PHONY: mcp-status
mcp-status: ## Check MCP bridge status
	@$(MAKE) -f Makefile.mcp status

.PHONY: mcp-deploy
mcp-deploy: ## Deploy MCP bridge
	@$(MAKE) -f Makefile.mcp deploy

# =============================================================================
# 📊 MONITORING SHORTCUTS
# =============================================================================

.PHONY: monitor
monitor: ## Start monitoring dashboard
	@$(MAKE) -f Makefile.monitoring dashboard

.PHONY: metrics
metrics: ## Show system metrics
	@$(MAKE) -f Makefile.monitoring metrics

# =============================================================================
# 📦 QUEUE MANAGEMENT SHORTCUTS
# =============================================================================

.PHONY: queue-start
queue-start: ## Start queue workers and Bull Board dashboard
	@echo "🚀 Starting queue system..."
	@cd infra/compose && docker-compose -f docker-compose.dev.yml up -d redis worker-financial worker-trading bull-board
	@echo "📊 Bull Board dashboard available at: http://localhost:3200/admin/queues"

.PHONY: queue-stop
queue-stop: ## Stop queue workers and dashboard
	@echo "⏹️ Stopping queue system..."
	@cd infra/compose && docker-compose -f docker-compose.dev.yml stop worker-financial worker-trading bull-board

.PHONY: queue-restart
queue-restart: ## Restart queue system
	@echo "🔄 Restarting queue system..."
	@$(MAKE) queue-stop
	@$(MAKE) queue-start

.PHONY: queue-logs
queue-logs: ## Show queue worker logs
	@echo "📋 Queue worker logs..."
	@cd infra/compose && docker-compose -f docker-compose.dev.yml logs -f worker-financial worker-trading

.PHONY: queue-dashboard
queue-dashboard: ## Open Bull Board dashboard in browser
	@echo "📊 Opening Bull Board dashboard..."
	@echo "Dashboard URL: http://localhost:3200/admin/queues"
	@echo "Default credentials: admin / admin123"
	@open http://localhost:3200/admin/queues 2>/dev/null || xdg-open http://localhost:3200/admin/queues 2>/dev/null || echo "Please open http://localhost:3200/admin/queues in your browser"

.PHONY: queue-health
queue-health: ## Check queue system health
	@echo "🏥 Checking queue system health..."
	@echo -n "Redis: " && docker exec $$(docker ps -qf "name=redis") redis-cli ping 2>/dev/null && echo "✅" || echo "❌ Not responding"
	@echo -n "Worker Financial: " && curl -sf http://localhost:3101/health/ready >/dev/null && echo "✅" || echo "❌ Not healthy"
	@echo -n "Worker Trading: " && curl -sf http://localhost:3102/health/ready >/dev/null && echo "✅" || echo "❌ Not healthy"
	@echo -n "Bull Board: " && curl -sf http://localhost:3200/health >/dev/null && echo "✅" || echo "❌ Not healthy"

.PHONY: queue-flush
queue-flush: ## Flush all Redis queues (DANGEROUS!)
	@echo "⚠️ WARNING: This will delete all queue data!"
	@read -p "Are you sure? Type 'yes' to confirm: " confirm && [ "$$confirm" = "yes" ] && \
		docker exec $$(docker ps -qf "name=redis") redis-cli FLUSHDB && \
		echo "✅ All queues flushed" || echo "❌ Operation cancelled"

.PHONY: redis-cli
redis-cli: ## Connect to Redis CLI
	@echo "🔧 Connecting to Redis CLI..."
	@docker exec -it $$(docker ps -qf "name=redis") redis-cli

# =============================================================================
# 🛡️ SECURITY SHORTCUTS
# =============================================================================

.PHONY: security-scan
security-scan: ## Run security scan
	@$(MAKE) -f Makefile.security scan

.PHONY: security-audit
security-audit: ## Run security audit
	@$(MAKE) -f Makefile.security audit

# =============================================================================
# 📚 HELP SYSTEM
# =============================================================================

.PHONY: help
help: ## Show common commands (this menu)
	@echo "$(BLUE)AI Service - Common Commands$(NC)"
	@echo "$(CYAN)=================================$(NC)"
	@echo ""
	@echo "$(YELLOW)Quick Start:$(NC)"
	@grep -h "^[a-z][a-z\-]*:.*##" $(MAKEFILE_LIST) | grep -E "^(up|down|restart|logs|status|build):" | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Database:$(NC)"
	@grep -h "^db-[a-z\-]*:.*##" $(MAKEFILE_LIST) | head -5 | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Testing:$(NC)"
	@grep -h "^test[a-z\-]*:.*##\|^lint:.*##\|^typecheck:.*##" $(MAKEFILE_LIST) | head -5 | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Production:$(NC)"
	@grep -h "^prod-[a-z\-]*:.*##" $(MAKEFILE_LIST) | head -5 | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(CYAN)For more commands:$(NC)"
	@echo "  $(GREEN)make help-dev$(NC)        Development commands"
	@echo "  $(GREEN)make help-prod$(NC)       Production commands"
	@echo "  $(GREEN)make help-db$(NC)         Database commands"
	@echo "  $(GREEN)make help-test$(NC)       Testing commands"
	@echo "  $(GREEN)make help-all$(NC)        ALL available commands"

.PHONY: help-dev
help-dev: ## Show all development commands
	@echo "$(BLUE)Development Commands$(NC)"
	@echo "$(CYAN)=================================$(NC)"
	@$(MAKE) -f Makefile.docker help
	@echo ""
	@$(MAKE) -f Makefile.frontend help

.PHONY: help-prod
help-prod: ## Show all production commands
	@echo "$(BLUE)Production Commands$(NC)"
	@echo "$(CYAN)=================================$(NC)"
	@$(MAKE) -f Makefile.production help
	@echo ""
	@$(MAKE) -f Makefile.nas help
	@echo ""
	@$(MAKE) -f Makefile.prod-admin help

.PHONY: help-db
help-db: ## Show all database commands
	@echo "$(BLUE)Database Commands$(NC)"
	@echo "$(CYAN)=================================$(NC)"
	@$(MAKE) -f Makefile.database help
	@echo ""
	@$(MAKE) -f Makefile.migrations help

.PHONY: help-test
help-test: ## Show all testing commands
	@echo "$(BLUE)Testing Commands$(NC)"
	@echo "$(CYAN)=================================$(NC)"
	@$(MAKE) -f Makefile.testing help

.PHONY: help-all
help-all: ## Show ALL available commands
	@echo "$(BLUE)ALL Available Commands$(NC)"
	@echo "$(CYAN)=================================$(NC)"
	@echo ""
	@echo "$(YELLOW)Main Commands:$(NC)"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' Makefile | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Database Operations:$(NC)"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' Makefile.database 2>/dev/null | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-25s$(NC) %s\n", $$1, $$2}' | head -10
	@echo "  $(CYAN)... and more in Makefile.database$(NC)"
	@echo ""
	@echo "$(YELLOW)Docker Operations:$(NC)"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' Makefile.docker 2>/dev/null | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-25s$(NC) %s\n", $$1, $$2}' | head -10
	@echo "  $(CYAN)... and more in Makefile.docker$(NC)"
	@echo ""
	@echo "$(YELLOW)Other Modules:$(NC)"
	@echo "  $(CYAN)Makefile.frontend$(NC)        - Frontend operations"
	@echo "  $(CYAN)Makefile.testing$(NC)         - Testing operations"
	@echo "  $(CYAN)Makefile.nas$(NC)             - NAS/Remote operations"
	@echo "  $(CYAN)Makefile.troubleshooting$(NC) - Diagnostic & fixes"
	@echo "  $(CYAN)Makefile.production$(NC)      - Production operations"
	@echo "  $(CYAN)Makefile.auth$(NC)            - Authentication"
	@echo "  $(CYAN)Makefile.financial-sync$(NC)  - Financial data sync"
	@echo "  $(CYAN)Makefile.monitoring$(NC)      - Monitoring & metrics"
	@echo "  $(CYAN)Makefile.security$(NC)        - Security operations"

# =============================================================================
# 🚀 CI/CD COMMANDS
# =============================================================================

.PHONY: ci-validate
ci-validate: ## Validate CI configuration
	@echo "$(CYAN)Validating CI/CD configuration...$(NC)"
	@echo "✓ Checking workflow files..."
	@ls -la .github/workflows/*.yml 2>/dev/null || echo "❌ No workflow files found"
	@echo "✓ Checking docker compose files..."
	@ls -la docker-compose*.yml 2>/dev/null | wc -l | xargs -I {} echo "Found {} compose files"
	@echo "✓ Checking environment parity..."
	@diff -q docker-compose.production.yml docker-compose.nas.yml > /dev/null && echo "✅ Production and NAS are in sync" || echo "⚠️ Production and NAS configs differ"

.PHONY: ci-local
ci-local: ## Run CI checks locally
	@echo "$(CYAN)Running CI checks locally...$(NC)"
	@echo "→ Contract validation..."
	@npm run contracts:validate || true
	@echo "→ TypeScript check..."
	@npm run typecheck || true
	@echo "→ Linting..."
	@npm run lint || true
	@echo "→ Building..."
	@npm run build || true
	@echo "$(GREEN)✅ Local CI checks complete$(NC)"

.PHONY: ci-contracts
ci-contracts: ## Generate and validate contracts
	@echo "$(CYAN)Generating contracts...$(NC)"
	npm run contracts:generate
	npm run contracts:build
	@echo "$(CYAN)Checking for drift...$(NC)"
	@git diff --exit-code packages/contracts/src/generated && echo "$(GREEN)✅ No contract drift$(NC)" || echo "$(RED)❌ Contract drift detected! Run 'make ci-contracts' and commit changes$(NC)"

.PHONY: ci-quality
ci-quality: ## Run quality checks (lint, typecheck, test)
	@echo "$(CYAN)Running quality checks...$(NC)"
	@echo "→ Linting backend..."
	npm run lint || true
	@echo "→ Linting frontend..."
	cd frontend && npm run lint || true
	@echo "→ TypeScript backend..."
	npm run typecheck
	@echo "→ TypeScript frontend..."
	cd frontend && npm run typecheck
	@echo "$(GREEN)✅ Quality checks complete$(NC)"

.PHONY: ci-test
ci-test: ## Run all tests with CI configuration
	@echo "$(CYAN)Running tests in CI mode...$(NC)"
	npm run test:ci

.PHONY: ci-build-all
ci-build-all: ## Build all services and packages
	@echo "$(CYAN)Building all services...$(NC)"
	@echo "→ Generating Prisma client..."
	npm run db:generate
	@echo "→ Building packages..."
	pnpm -r --filter "./packages/*" build || true
	@echo "→ Building backend..."
	npm run build
	@echo "→ Building frontend..."
	cd frontend && npm run build
	@echo "$(GREEN)✅ All builds complete$(NC)"

.PHONY: ci-docker-build
ci-docker-build: ## Build all Docker images
	@echo "$(CYAN)Building Docker images...$(NC)"
	@for service in api-gateway financial-svc trading-svc comm-svc ai-core worker-financial worker-trading; do \
		echo "→ Building $$service..."; \
		docker build -t ai-service-$$service:ci-test -f apps/$$service/Dockerfile . || true; \
	done
	@echo "$(GREEN)✅ Docker builds complete$(NC)"

.PHONY: ci-workflow-test
ci-workflow-test: ## Test GitHub Actions workflow locally (requires act)
	@command -v act >/dev/null 2>&1 || { echo "$(RED)❌ 'act' is not installed. Install from: https://github.com/nektos/act$(NC)"; exit 1; }
	@echo "$(CYAN)Testing CI workflow locally with act...$(NC)"
	act -W .github/workflows/ci-complete.yml -j quality-gate

.PHONY: ci-status
ci-status: ## Show CI/CD status and recent runs
	@echo "$(CYAN)CI/CD Status$(NC)"
	@echo "$(CYAN)=================================$(NC)"
	@echo "Workflow files:"
	@ls -la .github/workflows/*.yml 2>/dev/null | awk '{print "  " $$9}' || echo "  No workflows found"
	@echo ""
	@echo "Recent commits:"
	@git log --oneline -5
	@echo ""
	@echo "Branch status:"
	@git status --short --branch

# =============================================================================
# 🚨 EMERGENCY SHORTCUTS
# =============================================================================

.PHONY: 911
911: ## Emergency help and recovery
	@echo "$(RED)🚨 EMERGENCY HELP$(NC)"
	@echo "$(CYAN)=================================$(NC)"
	@echo ""
	@echo "$(YELLOW)If services are down:$(NC)"
	@echo "  $(GREEN)make emergency-restart$(NC)   - Force restart everything"
	@echo "  $(GREEN)make diagnose$(NC)            - Run diagnostics"
	@echo "  $(GREEN)make fix-all$(NC)             - Apply all fixes"
	@echo ""
	@echo "$(YELLOW)If database is corrupted:$(NC)"
	@echo "  $(GREEN)make db-backup$(NC)           - Create backup first!"
	@echo "  $(GREEN)make db-restore FILE=...$(NC) - Restore from backup"
	@echo ""
	@echo "$(YELLOW)If frontend won't build:$(NC)"
	@echo "  $(GREEN)make frontend-clean$(NC)      - Clean and rebuild"
	@echo "  $(GREEN)make fix-frontend$(NC)        - Auto-fix issues"
	@echo ""
	@echo "$(YELLOW)Check logs:$(NC)"
	@echo "  $(GREEN)make logs$(NC)                - All logs"
	@echo "  $(GREEN)make debug-logs$(NC)          - Debug info"

# =============================================================================
# 🎯 DEFAULT TARGET
# =============================================================================

.DEFAULT: help