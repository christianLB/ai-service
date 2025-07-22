#!/bin/bash

# Quick test setup script for MCP local server (without Docker)
# This script will test the MCP server against the production MCP bridge

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🧪 Quick Test Setup for MCP Local Server"
echo "This will test against the production MCP bridge at localhost:8380"

# Check if MCP bridge is running
if ! curl -s http://localhost:8380/health >/dev/null 2>&1; then
    echo "❌ MCP bridge is not running at localhost:8380"
    echo "💡 The production MCP bridge should be available for testing"
    exit 1
fi

echo "✅ MCP bridge is running at localhost:8380"

# Update .env to use the MCP bridge instead of direct AI service
cat > "$PROJECT_DIR/.env" << EOF
# AI Service Configuration (via MCP bridge)
AI_SERVICE_URL=http://localhost:8380
AI_SERVICE_AUTH_TOKEN=
AI_SERVICE_TIMEOUT=30000

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL=300

# Logging
LOG_LEVEL=info
EOF

echo "✅ Updated .env to use MCP bridge"

# Build and test
cd "$PROJECT_DIR"
echo "🔨 Building MCP server..."
npm run build

echo "🧪 Running tests..."
npm test

echo "🎯 Testing MCP server tools..."
# Create a simple test script
cat > test-mcp.js << 'EOF'
const { AIServiceBridge } = require('./dist/adapters/ai-service-bridge.js');

async function testMCP() {
  const bridge = new AIServiceBridge({
    url: 'http://localhost:8380',
    timeout: 10000,
  });

  try {
    console.log('📋 Listing tools...');
    const tools = await bridge.listTools();
    console.log(`✅ Found ${tools.length} tools`);
    
    if (tools.length > 0) {
      console.log('🔧 Available tools:');
      tools.forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });
    }
    
    console.log('\n🎯 Testing system health tool...');
    const health = await bridge.executeTool('get_system_health', {});
    console.log('✅ System health check successful');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMCP();
EOF

node test-mcp.js
rm test-mcp.js

echo ""
echo "🎉 MCP Local Server is ready!"
echo ""
echo "Next steps:"
echo "1. Install Claude Code configuration: make claude-config"
echo "2. Start the server: make start"
echo "3. Restart Claude Code to load the configuration"