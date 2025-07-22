# MCP Local Server Makefile
# Quick commands for MCP local development

.PHONY: help install build dev start test clean config

# Default target
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

build: ## Build TypeScript
	npm run build

dev: ## Run in development mode with auto-reload
	npm run dev

start: build ## Build and start the server
	npm start

test: ## Run tests
	npm test

typecheck: ## Check TypeScript types
	npm run typecheck

clean: ## Clean build artifacts
	rm -rf dist/
	rm -rf node_modules/

# Configuration
config: ## Create .env from example
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✅ Created .env from .env.example"; \
		echo "📝 Please edit .env with your configuration"; \
	else \
		echo "⚠️  .env already exists"; \
	fi

claude-config: ## Install Claude Code configuration
	@CONFIG_DIR=""; \
	if [ -d "$$HOME/Library/Application Support/Claude" ]; then \
		CONFIG_DIR="$$HOME/Library/Application Support/Claude"; \
	elif [ -d "$$HOME/.config/Claude" ]; then \
		CONFIG_DIR="$$HOME/.config/Claude"; \
	elif [ -d "$$APPDATA/Claude" ]; then \
		CONFIG_DIR="$$APPDATA/Claude"; \
	fi; \
	if [ -n "$$CONFIG_DIR" ]; then \
		cp config/claude_desktop_config.json "$$CONFIG_DIR/"; \
		echo "✅ Claude Code configuration installed to $$CONFIG_DIR"; \
		echo "📝 Update the path in the config file to match your setup"; \
		echo "🔄 Restart Claude Code to load the new configuration"; \
	else \
		echo "❌ Could not find Claude Code configuration directory"; \
		echo "📋 Manually copy config/claude_desktop_config.json to your Claude config directory"; \
	fi

# Development helpers
auth-token: ## Get development auth token from parent AI Service
	@cd .. && make auth-token 2>/dev/null | grep -oP 'Token: \K.*' || echo "Could not get token"

check-ai-service: ## Check if AI Service is running
	@echo "🔍 Checking AI Service..."
	@if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then \
		echo "✅ AI Service is running"; \
	else \
		echo "❌ AI Service is not running"; \
		echo "💡 Start it with: cd .. && make dev-up"; \
	fi

quick-setup: config build check-ai-service ## Quick setup for first time use
	@echo "🎯 MCP Local Server setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "1. Edit .env with your configuration"
	@echo "2. Run 'make claude-config' to install Claude Code configuration"
	@echo "3. Start the server with 'make start'"
	@echo "4. Restart Claude Code"

logs: ## Show recent logs (development mode)
	@echo "💡 Start with 'make dev' to see logs in real-time"