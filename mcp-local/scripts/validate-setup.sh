#!/bin/bash

# Final validation script for MCP Local Server setup
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔍 MCP Local Server Setup Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check 1: Project structure
echo "📂 Checking project structure..."
REQUIRED_FILES=(
    "package.json"
    "src/server.ts"
    "src/config.ts"
    "src/adapters/ai-service-bridge.ts"
    "dist/server.js"
    ".env"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
        EXIT_CODE=1
    fi
done

# Check 2: Dependencies installed
echo ""
echo "📦 Checking dependencies..."
if [ -d "$PROJECT_DIR/node_modules" ]; then
    echo "  ✅ node_modules directory exists"
    
    # Check key dependencies
    KEY_DEPS=("@modelcontextprotocol/sdk" "axios" "winston" "zod")
    for dep in "${KEY_DEPS[@]}"; do
        if [ -d "$PROJECT_DIR/node_modules/$dep" ]; then
            echo "  ✅ $dep"
        else
            echo "  ❌ $dep (not installed)"
            EXIT_CODE=1
        fi
    done
else
    echo "  ❌ node_modules directory missing"
    echo "     Run: npm install"
    EXIT_CODE=1
fi

# Check 3: Build status
echo ""
echo "🔨 Checking build status..."
if [ -f "$PROJECT_DIR/dist/server.js" ]; then
    echo "  ✅ TypeScript compiled successfully"
else
    echo "  ❌ Build missing"
    echo "     Run: npm run build"
    EXIT_CODE=1
fi

# Check 4: Configuration
echo ""
echo "⚙️  Checking configuration..."
if [ -f "$PROJECT_DIR/.env" ]; then
    echo "  ✅ .env file exists"
    
    # Check key config values
    if grep -q "AI_SERVICE_URL=" "$PROJECT_DIR/.env"; then
        AI_SERVICE_URL=$(grep "AI_SERVICE_URL=" "$PROJECT_DIR/.env" | cut -d'=' -f2)
        echo "  ✅ AI_SERVICE_URL configured: $AI_SERVICE_URL"
    else
        echo "  ❌ AI_SERVICE_URL not configured"
        EXIT_CODE=1
    fi
else
    echo "  ❌ .env file missing"
    echo "     Run: cp .env.example .env"
    EXIT_CODE=1
fi

# Check 5: MCP bridge connectivity
echo ""
echo "🌐 Checking MCP bridge connectivity..."
if curl -s http://localhost:8380/health >/dev/null 2>&1; then
    echo "  ✅ MCP bridge is running (localhost:8380)"
else
    echo "  ⚠️  MCP bridge not running (localhost:8380)"
    echo "     This is optional for development"
fi

# Check 6: Claude Code configuration
echo ""
echo "🤖 Checking Claude Code configuration..."
CLAUDE_CONFIGS=(
    "$HOME/.config/claude/claude_desktop_config.json"
    "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    "$HOME/AppData/Roaming/Claude/claude_desktop_config.json"
)

CLAUDE_CONFIG_FOUND=false
for config in "${CLAUDE_CONFIGS[@]}"; do
    if [ -f "$config" ]; then
        echo "  ✅ Claude config found: $config"
        
        # Check if our server is configured
        if grep -q "ai-service-local" "$config"; then
            echo "  ✅ ai-service-local server configured"
        else
            echo "  ⚠️  ai-service-local server not configured in Claude"
        fi
        
        CLAUDE_CONFIG_FOUND=true
        break
    fi
done

if [ "$CLAUDE_CONFIG_FOUND" = false ]; then
    echo "  ⚠️  Claude Code configuration not found"
    echo "     Run: make claude-config"
fi

# Check 7: Test execution
echo ""
echo "🧪 Running quick test..."
cd "$PROJECT_DIR"

# Create test script
cat > temp-test.js << 'EOF'
const { AIServiceBridge } = require('./dist/adapters/ai-service-bridge.js');

async function quickTest() {
  const bridge = new AIServiceBridge({
    url: process.env.AI_SERVICE_URL || 'http://localhost:8380',
    timeout: 5000,
  });

  try {
    const tools = await bridge.listTools();
    console.log(`  ✅ Found ${tools.length} tools available`);
    return true;
  } catch (error) {
    console.log(`  ⚠️  Tools test failed: ${error.message}`);
    return false;
  }
}

quickTest().then(() => process.exit(0)).catch(() => process.exit(0));
EOF

node temp-test.js
rm temp-test.js

# Final summary
echo ""
echo "📋 Setup Summary"
echo "━━━━━━━━━━━━━━━"

if [ -z "$EXIT_CODE" ]; then
    echo "🎉 MCP Local Server setup is COMPLETE!"
    echo ""
    echo "Next steps:"
    echo "1. Start the server: make start"
    echo "2. Restart Claude Code to load the configuration"
    echo "3. Test in Claude Code with: 'Show me system health'"
    echo ""
    echo "Available commands:"
    echo "  make start     - Start MCP server"
    echo "  make dev       - Start in development mode"
    echo "  make test      - Run tests"
    echo "  make logs      - View logs (development mode)"
    echo ""
else
    echo "⚠️  Setup has some issues. Please resolve the items marked with ❌ above."
fi