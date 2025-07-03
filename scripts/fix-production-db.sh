#!/bin/bash

echo "=== Fixing Production Database ==="
echo ""

# Check if we're using docker-compose
if [ -f "docker-compose.production.yml" ] || [ -f "docker-compose.production-build.yml" ]; then
    echo "1. Applying financial schema to production database..."
    
    # Try to find the correct container name
    CONTAINER=$(docker ps --format "table {{.Names}}" | grep -E "(ai-service-db|ai-service-postgres|postgres)" | head -1)
    
    if [ -z "$CONTAINER" ]; then
        echo "Error: Could not find PostgreSQL container"
        echo "Running containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}"
        exit 1
    fi
    
    echo "Using container: $CONTAINER"
    
    # Apply financial schema
    docker exec -i $CONTAINER psql -U ai_user -d ai_service < scripts/financial-schema.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Financial schema applied successfully"
    else
        echo "❌ Failed to apply financial schema"
        exit 1
    fi
    
    echo ""
    echo "2. Verifying schema creation..."
    docker exec $CONTAINER psql -U ai_user -d ai_service -c "\dn" | grep financial
    
    echo ""
    echo "3. Checking tables in financial schema..."
    docker exec $CONTAINER psql -U ai_user -d ai_service -c "\dt financial.*"
    
else
    echo "Error: No docker-compose file found"
    exit 1
fi

echo ""
echo "=== Database Fix Complete ==="