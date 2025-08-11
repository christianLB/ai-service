# Makefile.nas - NAS/Remote operations module
# =============================================================================
# Synology NAS and remote server management operations
# =============================================================================

# Load configuration
-include .make.env

# Variables
NAS_HOST ?= 192.168.1.11
NAS_USER ?= admin
NAS_PATH ?= /volume1/docker/ai-service
LOCAL_NAS_PATH ?= ~/ai-service-prod
CONTAINER_NAME ?= ai-postgres
SERVICE_NAME ?= ai-service

# SSH configuration
ifdef SSHPASS
    SSH_CMD := sshpass -e ssh
    SCP_CMD := sshpass -e scp
    RSYNC_CMD := sshpass -e rsync
else
    SSH_CMD := ssh
    SCP_CMD := scp
    RSYNC_CMD := rsync
endif

# Remote execution helper
REMOTE_EXEC := ./scripts/remote-exec.sh

# Colors
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
MAGENTA := \033[0;35m
CYAN := \033[0;36m
NC := \033[0m

# =============================================================================
# 🔌 CONNECTION & STATUS
# =============================================================================

.PHONY: nas-test
nas-test: ## Test SSH connection to NAS
	@echo "$(BLUE)Testing NAS connection...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "echo 'Connection successful'" && \
		echo "$(GREEN)✓ Connected to NAS$(NC)" || \
		echo "$(RED)✗ Connection failed$(NC)"

.PHONY: nas-status
nas-status: ## Show NAS service status
	@echo "$(BLUE)NAS Service Status:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

.PHONY: nas-info
nas-info: ## Show NAS system information
	@echo "$(BLUE)NAS System Information:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		echo 'Hostname:' && hostname && \
		echo '' && \
		echo 'System:' && uname -a && \
		echo '' && \
		echo 'Disk Usage:' && df -h $(NAS_PATH) && \
		echo '' && \
		echo 'Memory:' && free -h && \
		echo '' && \
		echo 'Docker Version:' && docker version --format '{{.Server.Version}}'"

# =============================================================================
# 📤 DEPLOYMENT
# =============================================================================

.PHONY: nas-deploy
nas-deploy: ## Deploy to NAS
	@echo "$(BLUE)Deploying to NAS...$(NC)"
	@echo "$(YELLOW)Building images...$(NC)"
	@docker-compose build
	@echo "$(YELLOW)Syncing files to NAS...$(NC)"
	@$(RSYNC_CMD) -avz --exclude node_modules --exclude .git \
		./ $(NAS_USER)@$(NAS_HOST):$(NAS_PATH)/
	@echo "$(YELLOW)Starting services on NAS...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		cd $(NAS_PATH) && \
		docker-compose -f docker-compose.production.yml up -d"
	@echo "$(GREEN)✓ Deployed to NAS$(NC)"

.PHONY: nas-deploy-api
nas-deploy-api: ## Deploy API only to NAS
	@echo "$(BLUE)Deploying API to NAS...$(NC)"
	@echo "$(YELLOW)Building API image...$(NC)"
	@docker build -f Dockerfile.api -t ai-service-api:latest .
	@echo "$(YELLOW)Saving and transferring image...$(NC)"
	@docker save ai-service-api:latest | gzip | \
		$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "docker load"
	@echo "$(YELLOW)Restarting API service...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "docker restart $(SERVICE_NAME)-api"
	@echo "$(GREEN)✓ API deployed to NAS$(NC)"

.PHONY: nas-deploy-frontend
nas-deploy-frontend: ## Deploy frontend only to NAS
	@echo "$(BLUE)Deploying frontend to NAS...$(NC)"
	@echo "$(YELLOW)Building frontend...$(NC)"
	@cd frontend && npm run build
	@echo "$(YELLOW)Syncing frontend files...$(NC)"
	@$(RSYNC_CMD) -avz --delete \
		frontend/dist/ $(NAS_USER)@$(NAS_HOST):$(NAS_PATH)/frontend/dist/
	@echo "$(YELLOW)Setting permissions...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		sudo chown -R 1001:1001 $(NAS_PATH)/frontend/dist && \
		sudo chmod -R 755 $(NAS_PATH)/frontend/dist"
	@echo "$(GREEN)✓ Frontend deployed to NAS$(NC)"

# =============================================================================
# 🔄 SYNC OPERATIONS
# =============================================================================

.PHONY: nas-sync-up
nas-sync-up: ## Sync local files to NAS
	@echo "$(BLUE)Syncing files to NAS...$(NC)"
	@$(RSYNC_CMD) -avz --exclude node_modules --exclude .git --exclude dist \
		--exclude coverage --exclude .env \
		./ $(NAS_USER)@$(NAS_HOST):$(NAS_PATH)/
	@echo "$(GREEN)✓ Files synced to NAS$(NC)"

.PHONY: nas-sync-down
nas-sync-down: ## Sync NAS files to local
	@echo "$(BLUE)Syncing files from NAS...$(NC)"
	@mkdir -p $(LOCAL_NAS_PATH)
	@$(RSYNC_CMD) -avz --exclude node_modules --exclude postgres \
		$(NAS_USER)@$(NAS_HOST):$(NAS_PATH)/ $(LOCAL_NAS_PATH)/
	@echo "$(GREEN)✓ Files synced from NAS$(NC)"

.PHONY: nas-sync-env
nas-sync-env: ## Sync .env file to NAS
	@echo "$(YELLOW)⚠️  Syncing sensitive .env file$(NC)"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@$(SCP_CMD) .env.production $(NAS_USER)@$(NAS_HOST):$(NAS_PATH)/.env
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "chmod 600 $(NAS_PATH)/.env"
	@echo "$(GREEN)✓ Environment file synced$(NC)"

# =============================================================================
# 📋 LOGS & MONITORING
# =============================================================================

.PHONY: nas-logs
nas-logs: ## Show NAS service logs
	@echo "$(BLUE)NAS Service Logs:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "docker logs --tail=100 -f $(SERVICE_NAME)"

.PHONY: nas-logs-api
nas-logs-api: ## Show API logs from NAS
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "docker logs --tail=100 -f $(SERVICE_NAME)-api"

.PHONY: nas-logs-db
nas-logs-db: ## Show database logs from NAS
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "docker logs --tail=100 -f $(CONTAINER_NAME)"

.PHONY: nas-monitor
nas-monitor: ## Monitor NAS resources
	@echo "$(BLUE)Monitoring NAS Resources:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		while true; do \
			clear; \
			echo '=== Docker Stats ==='; \
			docker stats --no-stream; \
			echo ''; \
			echo '=== Disk Usage ==='; \
			df -h $(NAS_PATH); \
			echo ''; \
			echo '=== Memory Usage ==='; \
			free -h; \
			sleep 5; \
		done"

# =============================================================================
# 🛠️ MAINTENANCE
# =============================================================================

.PHONY: nas-restart
nas-restart: ## Restart all NAS services
	@echo "$(YELLOW)Restarting NAS services...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		cd $(NAS_PATH) && \
		docker-compose -f docker-compose.production.yml restart"
	@echo "$(GREEN)✓ Services restarted$(NC)"

.PHONY: nas-stop
nas-stop: ## Stop all NAS services
	@echo "$(YELLOW)Stopping NAS services...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		cd $(NAS_PATH) && \
		docker-compose -f docker-compose.production.yml stop"
	@echo "$(GREEN)✓ Services stopped$(NC)"

.PHONY: nas-start
nas-start: ## Start all NAS services
	@echo "$(BLUE)Starting NAS services...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		cd $(NAS_PATH) && \
		docker-compose -f docker-compose.production.yml start"
	@echo "$(GREEN)✓ Services started$(NC)"

.PHONY: nas-clean
nas-clean: ## Clean NAS Docker resources
	@echo "$(YELLOW)Cleaning NAS Docker resources...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		docker system prune -f && \
		docker volume prune -f"
	@echo "$(GREEN)✓ NAS cleaned$(NC)"

# =============================================================================
# 💾 BACKUP
# =============================================================================

.PHONY: nas-backup
nas-backup: ## Create NAS backup
	@echo "$(BLUE)Creating NAS backup...$(NC)"
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		cd $(NAS_PATH) && \
		tar -czf backup_$$TIMESTAMP.tar.gz \
			--exclude='node_modules' \
			--exclude='postgres' \
			--exclude='*.log' \
			--exclude='dist' \
			.env docker-compose.* src/ frontend/src/ scripts/ && \
		echo 'Backup created: backup_$$TIMESTAMP.tar.gz'"
	@echo "$(GREEN)✓ Backup created$(NC)"

.PHONY: nas-backup-db
nas-backup-db: ## Backup NAS database
	@echo "$(BLUE)Backing up NAS database...$(NC)"
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
	$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		docker exec $(CONTAINER_NAME) pg_dump -U ai_user -d ai_service \
			> $(NAS_PATH)/backups/db_backup_$$TIMESTAMP.sql"
	@echo "$(GREEN)✓ Database backed up$(NC)"

.PHONY: nas-backup-download
nas-backup-download: ## Download latest NAS backup
	@echo "$(BLUE)Downloading latest backup...$(NC)"
	@LATEST=$$($(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "ls -t $(NAS_PATH)/backup_*.tar.gz | head -1"); \
	if [ -n "$$LATEST" ]; then \
		$(SCP_CMD) $(NAS_USER)@$(NAS_HOST):$$LATEST ./backups/; \
		echo "$(GREEN)✓ Downloaded: $$(basename $$LATEST)$(NC)"; \
	else \
		echo "$(YELLOW)No backups found$(NC)"; \
	fi

# =============================================================================
# 🔐 SECURITY
# =============================================================================

.PHONY: nas-ssh-setup
nas-ssh-setup: ## Setup SSH key authentication
	@echo "$(BLUE)Setting up SSH key authentication...$(NC)"
	@ssh-copy-id $(NAS_USER)@$(NAS_HOST)
	@echo "$(GREEN)✓ SSH key configured$(NC)"

.PHONY: nas-permissions
nas-permissions: ## Fix NAS file permissions
	@echo "$(BLUE)Fixing NAS permissions...$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		sudo chown -R $(NAS_USER):users $(NAS_PATH) && \
		sudo chmod -R 755 $(NAS_PATH) && \
		sudo chmod 600 $(NAS_PATH)/.env*"
	@echo "$(GREEN)✓ Permissions fixed$(NC)"

.PHONY: nas-firewall-status
nas-firewall-status: ## Check NAS firewall status
	@echo "$(BLUE)NAS Firewall Status:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		sudo iptables -L -n | grep -E '3001|3003|5432' || echo 'No rules found'"

# =============================================================================
# 🔍 DIAGNOSTICS
# =============================================================================

.PHONY: nas-diagnose
nas-diagnose: ## Run NAS diagnostics
	@echo "$(BLUE)Running NAS diagnostics...$(NC)"
	@echo "$(CYAN)Connection:$(NC)"
	@$(MAKE) -f Makefile.nas nas-test
	@echo ""
	@echo "$(CYAN)Services:$(NC)"
	@$(MAKE) -f Makefile.nas nas-status
	@echo ""
	@echo "$(CYAN)Resources:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		echo 'CPU:' && top -bn1 | head -5 && \
		echo '' && \
		echo 'Memory:' && free -h && \
		echo '' && \
		echo 'Disk:' && df -h $(NAS_PATH)"

.PHONY: nas-health
nas-health: ## Check NAS service health
	@echo "$(BLUE)NAS Health Check:$(NC)"
	@$(SSH_CMD) $(NAS_USER)@$(NAS_HOST) "\
		echo -n 'API Health: ' && \
		curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health | \
			grep -q '200' && echo '$(GREEN)✓ Healthy$(NC)' || echo '$(RED)✗ Unhealthy$(NC)' && \
		echo -n 'Frontend: ' && \
		curl -s -o /dev/null -w '%{http_code}' http://localhost:3003 | \
			grep -q '200' && echo '$(GREEN)✓ Accessible$(NC)' || echo '$(RED)✗ Inaccessible$(NC)' && \
		echo -n 'Database: ' && \
		docker exec $(CONTAINER_NAME) pg_isready -U ai_user > /dev/null 2>&1 && \
			echo '$(GREEN)✓ Ready$(NC)' || echo '$(RED)✗ Not ready$(NC)'"

# =============================================================================
# 📘 HELP
# =============================================================================

.PHONY: help
help: ## Show this help message
	@echo "$(BLUE)NAS/Remote Operations Commands:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}' | \
		sort