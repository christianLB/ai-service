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