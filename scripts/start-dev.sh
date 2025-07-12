#!/bin/bash

# Start Development Environment with Authentication
# This script sets up and starts the complete development environment

set -e

echo "🚀 Starting AI Service Development Environment with Authentication..."
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Use docker compose (v2) if available, otherwise docker-compose (v1)
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local not found. Creating from template...${NC}"
    cat > .env.local << 'EOF'
# Database Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=ai_service_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# Authentication Configuration
JWT_SECRET=dev-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
AUTH_BYPASS=false
ALLOW_REGISTRATION=false

# Security Configuration
BCRYPT_ROUNDS=10
SESSION_SECRET=dev-session-secret
CORS_ORIGIN=http://localhost:3000

# Application Configuration
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# Frontend Configuration
REACT_APP_API_URL=http://localhost:3001

# Optional: PgAdmin
PGADMIN_EMAIL=admin@localhost
PGADMIN_PASSWORD=admin
EOF
    echo -e "${GREEN}✅ Created .env.local with default values${NC}"
    echo -e "${YELLOW}⚠️  Please review and update .env.local with your specific settings${NC}"
fi

# Function to wait for service
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for $service to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            echo -e "${GREEN}✅ $service is ready${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service failed to start${NC}"
    return 1
}

# Stop any existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
$DOCKER_COMPOSE down

# Remove old volumes if requested
if [ "$1" == "--clean" ]; then
    echo -e "${YELLOW}🗑️  Removing old volumes...${NC}"
    $DOCKER_COMPOSE down -v
    docker volume rm ai-service_postgres_data_dev ai-service_redis_data_dev 2>/dev/null || true
fi

# Build images
echo -e "${YELLOW}🔨 Building Docker images...${NC}"
$DOCKER_COMPOSE build

# Start services
echo -e "${YELLOW}🚀 Starting services...${NC}"
$DOCKER_COMPOSE up -d

# Wait for services to be ready
wait_for_service "PostgreSQL" 5434
wait_for_service "Redis" 6379
wait_for_service "Backend API" 3001
wait_for_service "Frontend" 3000

# Show service status
echo -e "\n${GREEN}✅ All services started successfully!${NC}"
echo -e "\n📊 Service Status:"
$DOCKER_COMPOSE ps

# Create default admin user if AUTH_BYPASS is false
if [ "${AUTH_BYPASS:-false}" == "false" ] && [ "${ALLOW_REGISTRATION:-false}" == "true" ]; then
    echo -e "\n${YELLOW}👤 Creating default admin user...${NC}"
    sleep 5  # Wait for API to be fully ready
    
    curl -X POST http://localhost:3001/api/auth/register \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@localhost",
            "password": "admin123",
            "fullName": "Admin User"
        }' 2>/dev/null || echo -e "${YELLOW}⚠️  Could not create admin user (may already exist)${NC}"
fi

# Show access information
echo -e "\n${GREEN}🎉 Development environment is ready!${NC}"
echo -e "\n📌 Access Points:"
echo -e "  - Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "  - Backend API: ${GREEN}http://localhost:3001${NC}"
echo -e "  - PostgreSQL: ${GREEN}localhost:5434${NC} (user: postgres, pass: postgres)"
echo -e "  - Redis: ${GREEN}localhost:6379${NC} (pass: redis123)"
echo -e "  - PgAdmin: ${GREEN}http://localhost:5050${NC} (admin@localhost / admin)"

echo -e "\n📝 Useful Commands:"
echo -e "  - View logs: ${YELLOW}$DOCKER_COMPOSE logs -f [service]${NC}"
echo -e "  - Stop all: ${YELLOW}$DOCKER_COMPOSE down${NC}"
echo -e "  - Reset database: ${YELLOW}./scripts/start-dev.sh --clean${NC}"
echo -e "  - Run tests: ${YELLOW}npm test${NC}"
echo -e "  - Check types: ${YELLOW}npm run typecheck${NC}"

# Follow logs if requested
if [ "$2" == "--logs" ]; then
    echo -e "\n${YELLOW}📋 Following logs...${NC}"
    $DOCKER_COMPOSE logs -f
fi