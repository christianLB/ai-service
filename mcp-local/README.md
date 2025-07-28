# AI Service Enhanced MCP Dev Server

**🚀 Enhanced MCP (Model Context Protocol) server with integrated Make command support for seamless AI Service development.**

**Now with intelligent Make command integration! No more context switching between Claude and terminal.**

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd mcp-local
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Configure Claude Code
Add the following to your Claude Code configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ai-service-local": {
      "command": "node",
      "args": [
        "/absolute/path/to/ai-service/mcp-local/dist/server.js"
      ],
      "env": {
        "AI_SERVICE_URL": "http://localhost:3001",
        "AI_SERVICE_AUTH_TOKEN": "your-dev-token-here"
      }
    }
  }
}
```

Or use the provided configuration:
```bash
# Copy the example configuration
cp config/claude_desktop_config.json ~/Library/Application\ Support/Claude/
```

### 4. Start AI Service
Make sure your AI Service is running:
```bash
cd ..
make dev-up
```

### 5. Restart Claude Code
Restart Claude Code to load the new MCP server configuration.

## 📋 Available Tools

### 🔧 Enhanced Make Command Tools (NEW!)
- `execute_make_command` - Execute Make commands with safety validation
- `list_make_targets` - Discover available Make targets by category  
- `make_command_help` - Get detailed help for Make commands
- `validate_make_prerequisites` - Check prerequisites before execution
- `make_command_status` - Monitor service health and status
- `get_command_suggestions` - Get intelligent command suggestions based on context

### 💰 Financial Tools
- `get_financial_summary` - Get financial summary for a period
- `get_account_balance` - Get current account balance
- `get_transactions` - List transactions with filters
- `analyze_expenses` - Analyze expenses by category
- `create_invoice` - Create a new invoice

### 📄 Document Tools
- `search_documents` - Search documents semantically
- `analyze_document` - Analyze document with AI

### 🔧 System Tools
- `get_system_health` - Check system health status

## 🔧 Development

### Build
```bash
npm run build
```

### Run in Development Mode
```bash
npm run dev
```

### Test
```bash
npm test
```

## 📝 Usage Examples

### 🔧 Make Command Integration (NEW!)

**Natural development workflows:**
```
Start the development environment
→ Executes: make dev-up

Check if all services are running  
→ Executes: make dev-status

Run database migrations safely
→ Executes: make db-backup && make db-migrate

What development commands are available?
→ Lists all development-category Make targets

I need help with the trading-up command
→ Shows detailed help, prerequisites, and safety info
```

**Intelligent suggestions:**
```
I want to work on trading features
→ Suggests: trading-status, trading-up, check API keys

Help me deploy safely to production  
→ Suggests: health checks, backups, validation steps
```

### 💰 Financial & Document Tools

```
Can you show me my financial summary for last month?
```

```
Search for all invoices related to "software development"
```

```
Analyze my expenses by category for this year
```

## 🔐 Authentication

The MCP server uses the same authentication as your AI Service. You can:

1. **Use a development token**: Set `AI_SERVICE_AUTH_TOKEN` in your `.env` file
2. **Get a token dynamically**: The startup script will try to get a token using `make auth-token`
3. **Use no authentication**: Leave blank for local development (some tools may not work)

## 🐛 Troubleshooting

### Server doesn't start
- Check that AI Service is running: `make dev-status`
- Verify the path in Claude Code config is absolute
- Check logs: `npm run dev`

### Tools not showing in Claude
- Restart Claude Code after configuration changes
- Check the server is listed in Claude's MCP servers
- Verify no syntax errors in configuration JSON

### Authentication errors
- Ensure AI Service is running
- Check that the auth token is valid
- Try regenerating token: `make auth-token`

## 🏗️ Architecture

```
Claude Code <--> MCP Local Server <--> AI Service
     ↓               ↓                      ↓
   stdio          Bridge              REST API
  protocol        Adapter            + Database
```

The MCP Local Server acts as a bridge between Claude Code's MCP protocol and your AI Service REST API, providing:

- **Protocol Translation**: stdio/JSON-RPC ↔ REST/HTTP
- **Authentication**: Handles AI Service auth tokens
- **Caching**: 5-minute cache for repeated queries
- **Error Handling**: Graceful fallbacks and clear error messages
- **Logging**: Debug information to stderr

## 📦 Project Structure

```
mcp-local/
├── src/
│   ├── server.ts           # Main MCP server
│   ├── config.ts           # Configuration
│   ├── adapters/
│   │   └── ai-service-bridge.ts  # AI Service connector
│   ├── types/              # TypeScript types
│   └── utils/              # Utilities
├── config/
│   └── claude_desktop_config.json  # Example Claude config
├── scripts/
│   └── start-local.sh      # Startup script
└── README.md               # This file
```

## 🔄 Updates

To update the MCP server with new tools:

1. Add tool definitions in `ai-service-bridge.ts`
2. Map tools to API endpoints
3. Rebuild: `npm run build`
4. Restart Claude Code

## 🎯 What's New in Enhanced Version

### ✨ Key Features Added

1. **Make Command Integration** - Execute all 263+ Make targets directly through Claude Code
2. **Safety Validation** - Integrated with `.clauderc` safety rules and automatic backups  
3. **Smart Suggestions** - Context-aware command recommendations based on project state
4. **Prerequisites Checking** - Validate dependencies before command execution
5. **Health Monitoring** - Real-time service status across all project components
6. **Workflow Intelligence** - Learn from usage patterns to suggest optimal command sequences

### 🛡️ Safety Features

- **Blocked Commands**: Prevents destructive operations like `docker-compose down -v`
- **Automatic Backups**: Database backup before migrations and schema changes
- **Confirmation Required**: Dangerous operations require explicit confirmation
- **Prerequisite Validation**: Checks service status, API keys, and dependencies
- **Health Monitoring**: Continuous monitoring of development, database, and trading services

### 🧠 Intelligence Features

- **Context-Aware**: Suggests commands based on current project state and user intent
- **Learning System**: Improves suggestions based on successful command patterns
- **Workflow Optimization**: Combines related commands for complex operations
- **Error Recovery**: Provides helpful next steps when commands fail

### 📊 Development Categories Supported

- **Development**: `dev-up`, `dev-down`, `dev-refresh`, `dev-status` 
- **Database**: `db-migrate`, `db-backup`, `db-migrate-status`, `check-db`
- **Testing**: `test`, `typecheck`, `lint`, `health`
- **Financial**: `financial-sync`, `financial-validate`, `financial-backup`  
- **Trading**: `trading-up`, `trading-status`, `trading-positions`
- **MCP**: `mcp-deploy`, `mcp-status`, `mcp-tools`
- **Quality**: Build validation, code quality, and deployment readiness

### 📈 Performance Benefits

- **Zero Context Switching**: Stay in Claude Code conversation for all development tasks
- **Reduced Errors**: Safety validation prevents common mistakes
- **Faster Workflows**: Intelligent suggestions reduce decision time
- **Learning Efficiency**: System learns and adapts to your development patterns

## 📚 Complete Documentation

- **Detailed Usage Guide**: See [HOW-TO-USE.md](HOW-TO-USE.md) for comprehensive examples
- **Integration Test**: Run `node test-integration.js` to verify setup
- **Configuration Guide**: Multiple setup options for different environments

## 📄 License

Part of AI Service project.