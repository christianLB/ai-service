# AI Service MCP Local Server

Local MCP (Model Context Protocol) server for integrating AI Service with Claude Code desktop application.

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

### Financial Tools
- `get_financial_summary` - Get financial summary for a period
- `get_account_balance` - Get current account balance
- `get_transactions` - List transactions with filters
- `analyze_expenses` - Analyze expenses by category
- `create_invoice` - Create a new invoice

### Document Tools
- `search_documents` - Search documents semantically
- `analyze_document` - Analyze document with AI

### System Tools
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

In Claude Code, you can use the tools directly:

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

## 📄 License

Part of AI Service project.