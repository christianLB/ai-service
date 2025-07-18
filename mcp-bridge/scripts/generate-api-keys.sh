#!/bin/bash

# Generate secure API keys for MCP Bridge

echo "Generating secure API keys for MCP Bridge..."
echo ""

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 64)
echo "JWT_SECRET=$JWT_SECRET"
echo ""

# Generate API keys
echo "API Keys (format: name:key):"
for i in {1..3}; do
    KEY=$(openssl rand -hex 32)
    echo "api-key-$i:$KEY"
done
echo ""

echo "⚠️  Save these keys securely! They won't be shown again."
echo "Update your .env file with these values."