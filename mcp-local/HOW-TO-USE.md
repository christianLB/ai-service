# How to Use: Enhanced MCP Dev Server with Make Commands

Complete guide for using the enhanced MCP Local Server with integrated Make command support for seamless AI Service development.

## 🚀 Quick Start

### 1. Setup & Installation

```bash
# Navigate to MCP local directory
cd /path/to/ai-service/mcp-local

# Quick setup (first time)
make quick-setup

# Configure environment
cp .env.example .env
# Edit .env with your AI Service URL and auth token

# Build and start
make build
make start
```

### 2. Configure Claude Code

The MCP server integrates directly with Claude Code. Configuration options:

**Option A: Automatic Configuration**
```bash
make claude-config
```

**Option B: Manual Configuration**
Add to your Claude Code config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ai-service-dev": {
      "command": "node",
      "args": ["/absolute/path/to/ai-service/mcp-local/dist/server.js"],
      "env": {
        "AI_SERVICE_URL": "http://localhost:3001",
        "AI_SERVICE_AUTH_TOKEN": "your-token-here"
      }
    }
  }
}
```

### 3. Restart Claude Code
After configuration, restart Claude Code to load the new MCP server.

---

## 📋 Available Tools

### 🔧 Development Tools

#### `execute_make_command`
Execute any Make command with built-in safety validation.

**Usage in Claude Code:**
```
Start the development environment
```
→ Executes: `make dev-up`

```
Run database migrations safely
```
→ Executes: `make db-migrate` (with automatic backup)

```
Execute make target: db-migrate-create with NAME="add_user_preferences"
```
→ Executes: `make db-migrate-create NAME="add_user_preferences"`

**Advanced Usage:**
```
Execute the trading-up command with confirmation
```
→ Executes: `make trading-up` (validates prerequisites first)

#### `list_make_targets`
Discover available Make commands by category.

**Usage in Claude Code:**
```
What development commands are available?
```
→ Lists all `development` category commands

```
Show me all database-related Make targets
```
→ Lists all `database` category commands

**Categories:**
- `development` - dev-up, dev-down, dev-refresh, dev-status
- `database` - db-migrate, db-backup, db-migrate-status
- `testing` - test commands, lint, typecheck
- `quality` - build, validation commands
- `financial` - financial-sync, financial-validate
- `trading` - trading-up, trading-status
- `mcp` - mcp-deploy, mcp-status, mcp-tools
- `deployment` - production deployment commands

#### `make_command_help`
Get detailed help for any Make command.

**Usage in Claude Code:**
```
How do I use the db-migrate command?
```
→ Shows description, usage, safety level, and prerequisites

```
What does the financial-sync command do?
```
→ Detailed explanation of the financial synchronization process

#### `validate_make_prerequisites`
Check if all prerequisites are met before running a command.

**Usage in Claude Code:**
```
Can I run trading commands right now?
```
→ Checks API keys, service status, configurations

```
Validate prerequisites for database migration
```
→ Checks service status, database connectivity, backup status

#### `make_command_status`
Monitor service health and operational status.

**Usage in Claude Code:**
```
Check the status of all services
```
→ Reports on development, database, MCP, and trading services

```
Is the development environment running?
```
→ Specific status check for dev services

---

## 💬 Natural Language Examples

### Development Workflow

**Starting Development:**
```
User: I want to start working on the project
Claude: I'll start the development environment for you.
→ Executes: make dev-up
→ Then: make dev-status (to confirm everything is running)
```

**Making Database Changes:**
```
User: I need to create a new migration for user preferences
Claude: I'll create a new database migration with automatic backup.
→ Executes: make db-backup (safety first)
→ Then: make db-migrate-create NAME="add_user_preferences"
→ Confirms: Migration file created at prisma/migrations/...
```

**Checking Project Health:**
```
User: Is everything running correctly?
Claude: Let me check the status of all services.
→ Executes: make_command_status with service="all"
→ Reports: Development ✅, Database ✅, MCP ✅, Trading ⚠️ (API keys needed)
```

### Financial Operations

**Syncing Financial Data:**
```
User: Update the financial data from production
Claude: I'll sync the financial data safely.
→ Validates: Prerequisites for financial-sync
→ Executes: make financial-sync
→ Confirms: Data synchronized successfully
```

**Invoice Management:**
```
User: I need to work with invoices, what's available?
Claude: Let me show you the available financial commands.
→ Executes: list_make_targets with category="financial"
→ Shows: financial-sync, financial-validate, financial-backup
```

### Trading Operations

**Setting up Trading:**
```
User: Help me set up the trading environment
Claude: I'll check prerequisites and set up trading.
→ Validates: Trading API keys, service requirements
→ Executes: make trading-setup
→ Then: make trading-status (to confirm setup)
```

### Quality & Testing

**Running Tests:**
```
User: Run all tests and quality checks
Claude: I'll run the complete test suite with quality validation.
→ Executes: make test
→ Then: make typecheck
→ Then: make lint
→ Reports: All checks passed ✅
```

---

## 🛡️ Safety Features

### Built-in Safety Validation

The MCP server integrates with your `.clauderc` safety rules:

**Blocked Commands:**
- `docker-compose down -v` (data destruction)
- `DROP SCHEMA/TABLE` (permanent data loss)
- `prisma db push --force-reset` (schema reset)

**Confirmation Required:**
- `prisma migrate reset`
- `docker system prune`
- Production deployment commands

**Automatic Safeguards:**
- Database backup before migrations
- Service health checks before operations
- Prerequisites validation
- Environment verification

### Safety Levels

**🟢 Safe Commands:**
- `dev-status`, `dev-logs`
- `list_make_targets`, `make_command_help`
- Read-only operations

**🟡 Warning Commands:**
- `db-migrate`, `deploy` commands
- Require prerequisites validation
- Automatic backup creation

**🔴 Dangerous Commands:**
- Require explicit confirmation
- Multiple validation steps
- Rollback capability

---

## 🔧 Advanced Usage

### Custom Arguments

```
User: Create a migration called "add_api_keys" for the trading schema
Claude: I'll create a new migration with the specified name.
→ Executes: make db-migrate-create NAME="add_api_keys"
```

### Environment-Specific Commands

```
User: Deploy to production with validation
Claude: I'll run the production deployment with full validation.
→ Validates: All prerequisites, tests, build status
→ Executes: make deploy-production (with confirmation)
```

### Workflow Combinations

```
User: Set up a complete development session
Claude: I'll prepare your complete development environment.
→ Sequence:
  1. make dev-up (start services)
  2. make dev-status (verify health)
  3. make db-migrate-status (check migrations)
  4. make check-db (verify database)
→ Reports: Development environment ready ✅
```

---

## 🐛 Troubleshooting

### Common Issues

**MCP Server Not Starting:**
```bash
# Check if AI Service is running
make check-ai-service

# Verify configuration
cat ~/.config/Claude/claude_desktop_config.json

# Check logs
make dev  # Run in development mode to see logs
```

**Commands Not Appearing in Claude:**
```bash
# Restart Claude Code after configuration changes
# Verify MCP server is listed in Claude's settings
# Check for syntax errors in configuration JSON
```

**Permission Errors:**
```bash
# Ensure paths are absolute in Claude configuration
# Check file permissions on the MCP server executable
# Verify AI Service is accessible from MCP server
```

**Authentication Issues:**
```bash
# Get a fresh auth token
make auth-token

# Update .env file with new token
# Restart MCP server
```

### Debug Mode

Run the MCP server in development mode for detailed logging:

```bash
make dev  # Shows real-time logs and debug information
```

### Health Checks

Verify everything is working:

```bash
# Check AI Service
make check-ai-service

# Check MCP server connectivity
make quick-setup

# Full system validation
make dev-status && make check-db
```

---

## 📊 Usage Patterns

### Daily Development Workflow

1. **Morning Setup:**
   ```
   Start my development environment
   → make dev-up, make dev-status
   ```

2. **Feature Development:**
   ```
   I need to add a new database table for user preferences
   → make db-backup, make db-migrate-create NAME="add_user_preferences"
   ```

3. **Testing & Quality:**
   ```
   Run all tests and check code quality
   → make test, make typecheck, make lint
   ```

4. **End of Day:**
   ```
   Check system health and stop services
   → make health, make dev-down
   ```

### Project Maintenance

**Weekly Tasks:**
```
Show me the status of all services and check for any issues
→ Comprehensive health check and maintenance report
```

**Before Deployment:**
```
Validate everything is ready for production deployment
→ Full prerequisite validation, testing, and safety checks
```

---

## 🚀 Best Practices

### Context-Aware Usage

1. **Let Claude suggest commands based on context:**
   ```
   I'm working on the trading module and need to test changes
   → Claude suggests: trading-up, trading-status, test commands
   ```

2. **Use natural language for complex workflows:**
   ```
   Help me deploy the new financial features safely
   → Claude orchestrates: backup, migration, testing, deployment
   ```

3. **Trust the safety validations:**
   ```
   The system will prevent dangerous operations and suggest safer alternatives
   ```

### Efficiency Tips

1. **Combine related operations:**
   ```
   Start development and check if migrations are needed
   → Claude runs dev-up, then checks migration status
   ```

2. **Use status checks proactively:**
   ```
   Before working on trading features, Claude can check API key configuration
   ```

3. **Leverage validation before execution:**
   ```
   Claude validates prerequisites and suggests fixes before running commands
   ```

---

## 📚 Integration with Existing Workflows

### With .clauderc Configuration

The MCP server respects all settings from your `.clauderc`:
- Safety rules and blocked commands
- Quality gates and requirements
- Custom workflows and personas
- Performance optimization settings

### With GitHub Workflows

Commands integrate with your CI/CD:
```
User: Prepare for deployment
Claude: → Runs quality checks that match your GitHub workflow requirements
```

### With Project Structure

The MCP server understands your project layout:
- Multi-schema Prisma setup
- Financial/Trading module separation
- Frontend/Backend integration
- Testing and quality standards

---

This enhanced MCP server bridges the gap between natural conversation and powerful development commands, making your AI Service project development seamless and safe while maintaining full context awareness.