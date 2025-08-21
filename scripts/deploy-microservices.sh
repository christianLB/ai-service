#!/bin/bash

# Microservices Deployment Script
# ================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a service is healthy
check_service_health() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=0
    
    print_status "Checking health of $service on port $port..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "http://localhost:$port/health" > /dev/null 2>&1; then
            print_success "$service is healthy!"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    print_error "$service failed to become healthy after $max_attempts attempts"
    return 1
}

# Main deployment function
deploy() {
    print_status "Starting Microservices Deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Step 1: Check if .env.microservices exists
    if [ ! -f ".env.microservices" ]; then
        print_error ".env.microservices not found! Please create it from .env.microservices.example"
        exit 1
    fi
    
    # Step 2: Copy environment file
    print_status "Loading environment configuration..."
    cp .env.microservices .env
    
    # Step 3: Stop existing services
    print_status "Stopping existing services..."
    docker-compose -f docker-compose.microservices.yml down || true
    
    # Step 4: Build services
    print_status "Building microservices..."
    docker-compose -f docker-compose.microservices.yml build --parallel
    
    # Step 5: Start infrastructure services
    print_status "Starting infrastructure services (PostgreSQL, Redis)..."
    docker-compose -f docker-compose.microservices.yml up -d postgres redis
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Step 6: Initialize database schemas
    print_status "Initializing database schemas..."
    docker-compose -f docker-compose.microservices.yml exec -T postgres psql -U ai_user -d ai_service < scripts/init-schemas.sql || true
    
    # Step 7: Start API Gateway
    print_status "Starting API Gateway..."
    docker-compose -f docker-compose.microservices.yml up -d api-gateway
    
    # Step 8: Start microservices
    print_status "Starting microservices..."
    docker-compose -f docker-compose.microservices.yml up -d financial-svc ai-svc trading-svc comm-svc
    
    # Step 9: Start worker services
    print_status "Starting worker services..."
    docker-compose -f docker-compose.microservices.yml up -d worker-financial worker-trading
    
    # Step 10: Start frontend
    print_status "Starting frontend application..."
    docker-compose -f docker-compose.microservices.yml up -d frontend
    
    # Step 11: Health checks
    print_status "Performing health checks..."
    
    sleep 5
    
    check_service_health "API Gateway" 3010
    check_service_health "Financial Service" 3002
    check_service_health "AI Service" 3003
    check_service_health "Trading Service" 3004
    check_service_health "Communication Service" 3005
    check_service_health "Frontend" 3000
    
    # Step 12: Display status
    print_success "Microservices deployment complete!"
    
    echo ""
    print_status "Service URLs:"
    echo "  - Frontend:              http://localhost:3000"
    echo "  - API Gateway:           http://localhost:3010"
    echo "  - Financial Service:     http://localhost:3002"
    echo "  - AI Service:            http://localhost:3003"
    echo "  - Trading Service:       http://localhost:3004"
    echo "  - Communication Service: http://localhost:3005"
    echo "  - PostgreSQL:            localhost:5434"
    echo "  - Redis:                 localhost:6380"
    
    echo ""
    print_status "Useful commands:"
    echo "  - View logs:     docker-compose -f docker-compose.microservices.yml logs -f [service]"
    echo "  - Stop services: docker-compose -f docker-compose.microservices.yml down"
    echo "  - Restart:       docker-compose -f docker-compose.microservices.yml restart [service]"
    echo "  - Status:        docker-compose -f docker-compose.microservices.yml ps"
}

# Function to stop all services
stop_services() {
    print_status "Stopping all microservices..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.microservices.yml down
    print_success "All services stopped"
}

# Function to view logs
view_logs() {
    local service=$1
    cd "$PROJECT_ROOT"
    
    if [ -z "$service" ]; then
        docker-compose -f docker-compose.microservices.yml logs -f
    else
        docker-compose -f docker-compose.microservices.yml logs -f "$service"
    fi
}

# Function to check status
check_status() {
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.microservices.yml ps
}

# Parse command line arguments
case "$1" in
    start|deploy)
        deploy
        ;;
    stop)
        stop_services
        ;;
    logs)
        view_logs "$2"
        ;;
    status)
        check_status
        ;;
    restart)
        stop_services
        sleep 2
        deploy
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs [service]|status}"
        echo ""
        echo "Commands:"
        echo "  start/deploy  - Build and deploy all microservices"
        echo "  stop          - Stop all services"
        echo "  restart       - Restart all services"
        echo "  logs [service] - View logs (all services or specific)"
        echo "  status        - Show service status"
        exit 1
        ;;
esac