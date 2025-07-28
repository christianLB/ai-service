# Enhanced MCP Dev Server - Corrected Setup Guide

**Working setup instructions tested on your system.**

## 🚀 Quick Setup (5 minutes)

### Step 1: Prepare MCP Server

```bash
# Navigate to MCP directory
cd /home/k2600x/dev/ai-service/mcp-local

# Install dependencies (if not already done)
npm install

# Create environment config
cp .env.example .env
# Edit .env and add your auth token if you have one
```

### Step 2: Build MCP Server

```bash
# Build TypeScript code
npm run build

# Verify build succeeded
ls -la dist/
```

**Expected output**: You should see `dist/server.js` and other compiled files.

### Step 3: Start AI Service (Required)

The MCP server needs the AI Service running to work properly:

```bash
# Go to main project directory
cd /home/k2600x/dev/ai-service

# Start development environment (may take 2-3 minutes)
make dev-up

# Wait for services to be healthy, then check status
make dev-status
```

**Expected output**: All containers should show "healthy" or "Up" status, especially `ai-service-api-dev`.

### Step 4: Test MCP Server

```bash
# Go back to MCP directory
cd /home/k2600x/dev/ai-service/mcp-local

# Test that AI Service is accessible
curl -s http://localhost:3001/api/health || echo "API not ready yet"

# If API is not ready, wait 30 seconds and try again
sleep 30
curl -s http://localhost:3001/api/health
```

### Step 5: Configure Claude Code

**Update your Claude Code configuration file**:

**Location**: 
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration**:
```json
{
  "mcpServers": {
    "ai-service-dev": {
      "command": "node",
      "args": [
        "/home/k2600x/dev/ai-service/mcp-local/dist/server.js"
      ],
      "env": {
        "AI_SERVICE_URL": "http://localhost:3001",
        "AI_SERVICE_AUTH_TOKEN": "",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Important**: Use the **absolute path** `/home/k2600x/dev/ai-service/mcp-local/dist/server.js`

### Step 6: Test Integration

1. **Restart Claude Code** completely (quit and reopen)

2. **Test basic functionality** in Claude Code:
   ```
   List available make targets
   ```

3. **Test Make command execution**:
   ```
   Check development status
   ```

4. **Test suggestions**:
   ```
   I want to work on database features
   ```

## 🐛 Troubleshooting

### MCP Server Won't Start

**Issue**: Server fails to start or tools don't appear in Claude Code.

**Solutions**:
```bash
# Check if build succeeded
cd /home/k2600x/dev/ai-service/mcp-local
ls -la dist/server.js

# If no dist/server.js, rebuild:
npm run build

# Test server manually:
node dist/server.js
# Should start and wait for input (Ctrl+C to exit)
```

### AI Service Not Accessible

**Issue**: MCP server can't connect to AI Service.

**Solutions**:
```bash
# Check if AI Service is running
cd /home/k2600x/dev/ai-service
make dev-status

# If api-dev shows "unhealthy", restart it:
docker restart ai-service-api-dev

# Wait 30 seconds, then test:
curl -s http://localhost:3001/api/health
```

### Tools Don't Appear in Claude Code

**Issue**: Claude Code doesn't show the MCP tools.

**Solutions**:
1. **Verify configuration path** is absolute
2. **Check JSON syntax** in Claude configuration file
3. **Restart Claude Code** completely
4. **Check Claude Code logs** (if available)

### Permission Errors

**Issue**: Permission denied errors when running commands.

**Solutions**:
```bash
# Make sure files are executable
chmod +x /home/k2600x/dev/ai-service/mcp-local/dist/server.js

# Check directory permissions
ls -la /home/k2600x/dev/ai-service/mcp-local/
```

## ✅ Verification Steps

### 1. MCP Server Build
```bash
cd /home/k2600x/dev/ai-service/mcp-local
npm run build
echo "Build result: $?"  # Should be 0
```

### 2. AI Service Health
```bash
curl -s http://localhost:3001/api/health | grep -q "OK" && echo "✅ AI Service healthy" || echo "❌ AI Service not responding"
```

### 3. Make Target Discovery
```bash
cd /home/k2600x/dev/ai-service
make help | head -5  # Should show make targets
```

### 4. Claude Code Integration
In Claude Code, you should see these tools available:
- `execute_make_command`
- `list_make_targets`
- `make_command_help`
- `validate_make_prerequisites`
- `make_command_status`
- `get_command_suggestions`

## 🎯 What Works Now

After following this setup:

1. **Execute Make commands through Claude Code**:
   ```
   "Start development environment" → make dev-up
   "Check system status" → make dev-status
   "Run database migrations" → make db-migrate (with backup)
   ```

2. **Get intelligent suggestions**:
   ```
   "I want to work on trading features" → Suggests trading-up, API key checks
   "Help me deploy safely" → Suggests validation workflow
   ```

3. **Safety validation**:
   - Commands are validated against `.clauderc` safety rules
   - Dangerous operations require confirmation
   - Automatic backups before destructive operations

4. **Real-time monitoring**:
   - Service health checks
   - Prerequisite validation
   - Comprehensive status reporting

## 📋 Post-Setup Usage

Once everything is working, you can use natural language in Claude Code:

- **"Start working on the project"** → Starts dev environment
- **"Show me database commands"** → Lists all DB-related make targets
- **"I need to create a migration"** → Suggests db-migrate-create with backup
- **"Check if everything is running"** → Shows comprehensive system status
- **"Help me deploy to production"** → Provides safe deployment workflow

The system learns your patterns and gets better at suggestions over time!