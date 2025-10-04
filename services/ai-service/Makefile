.PHONY: help install dev build test clean docker-up docker-down docker-logs evals cost

# Default target
help:
	@echo "Available commands:"
	@echo "  make install      - Install dependencies"
	@echo "  make dev         - Run in development mode"
	@echo "  make build       - Build the TypeScript code"
	@echo "  make test        - Run tests"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make docker-up   - Start Docker services"
	@echo "  make docker-down - Stop Docker services"
	@echo "  make docker-logs - View Docker logs"
	@echo "  make evals       - Run evaluation tests"
	@echo "  make cost        - Show monthly cost report"

# Install dependencies
install:
	npm install

# Development mode
dev:
	npm run dev

# Build TypeScript
build:
	npm run build

# Run tests
test:
	npm test

# Run tests with coverage
test-coverage:
	npm run test:coverage

# Clean build artifacts
clean:
	rm -rf dist coverage node_modules

# Docker commands
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f ai-service

docker-build:
	docker-compose build ai-service

# Run evaluations
evals:
	npm run evals

# Show cost report
cost:
	npm run cost

# Lint code
lint:
	npm run lint

# Type check
typecheck:
	npm run typecheck

# Full check (lint + typecheck + test)
check: lint typecheck test

# Install Ollama models
ollama-pull:
	docker exec -it $$(docker-compose ps -q ollama) ollama pull llama3.1:8b
	docker exec -it $$(docker-compose ps -q ollama) ollama pull mistral:7b
	docker exec -it $$(docker-compose ps -q ollama) ollama pull nomic-embed-text