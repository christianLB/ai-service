# CLI and Agent Integration Guide

## Overview

This document describes how AI agents integrate with the new unified CLI system (`ai-cli.js`) and MCP (Model Context Protocol) server for reliable command execution.

## Background

The project previously relied on complex Makefiles with 938+ targets that suffered from:

- Subshell syntax errors (`$()` expansion issues)
- Complex bash pipelines that frequently broke
- Inconsistent behavior across environments
- Difficult debugging of nested command chains

The new CLI system provides:

- ✅ **Reliable token generation** that works with `jq`
- ✅ **Simple Node.js implementation** without complex dependencies
- ✅ **MCP integration** for agent tool usage
- ✅ **Backward compatibility** with existing Makefiles

## CLI Location and Access

### Direct CLI Usage

```bash
# The CLI is located at:
/home/k2600x/dev/ai-service/ai-cli.js

# Direct usage:
./ai-cli.js token               # Get auth token
./ai-cli.js dev start           # Start environment
./ai-cli.js db migrate          # Run migrations
./ai-cli.js --help              # See all commands
```

### Global Access Setup

```bash
# Add to PATH or create alias:
alias ai='/home/k2600x/dev/ai-service/ai-cli.js'

# Then use globally:
ai token
ai dev status
```

## MCP Server Integration

### Configuration Location

The MCP configuration is at: `~/.claude/mcp_config.json`

### Available MCP Tools

| Tool Name    | Description           | Parameters                           | Returns          |
| ------------ | --------------------- | ------------------------------------ | ---------------- |
| `get_token`  | Get JWT auth token    | None                                 | Token string     |
| `dev_start`  | Start dev environment | `detached: boolean`                  | Success status   |
| `dev_stop`   | Stop dev environment  | `volumes: boolean`                   | Success status   |
| `dev_status` | Check service status  | None                                 | Status info      |
| `dev_logs`   | View service logs     | `service: string`, `tail: number`    | Log output       |
| `db_status`  | Check DB status       | None                                 | Migration status |
| `db_migrate` | Run migrations        | `backup: boolean`                    | Migration result |
| `db_backup`  | Create DB backup      | `name: string`                       | Backup location  |
| `test_run`   | Run test suite        | `suite: string`, `coverage: boolean` | Test results     |

### MCP Server Wrapper

The MCP server wrapper is at: `/home/k2600x/dev/ai-service/ai-cli-mcp.js`

This wrapper:

- Translates MCP protocol requests to CLI commands
- Handles JSON request/response formatting
- Provides error handling and status reporting

## Agent Usage Guidelines

### For DevOps Specialists

```bash
# Start environment
Use MCP tool: dev_start

# Check status
Use MCP tool: dev_status

# View logs for specific service
Use MCP tool: dev_logs with parameters: { service: "financial-svc" }
```

### For Database Specialists

```bash
# Check migration status
Use MCP tool: db_status

# Run migrations with backup
Use MCP tool: db_migrate with parameters: { backup: true }

# Create named backup
Use MCP tool: db_backup with parameters: { name: "pre-feature-backup" }
```

### For QA Specialists

```bash
# Get token for API testing
Use MCP tool: get_token

# Run test suite
Use MCP tool: test_run with parameters: { suite: "unit" }

# Run with coverage
Use MCP tool: test_run with parameters: { suite: "all", coverage: true }
```

## Token Usage Examples

### Getting Tokens (Multiple Methods)

```bash
# Method 1: Direct CLI
TOKEN=$(./ai-cli.js token)

# Method 2: Via npx (fallback)
TOKEN=$(npx ts-node scripts/token.ts 2>/dev/null | tail -1)

# Method 3: Via MCP tool
Use MCP tool: get_token
```

### Using Tokens in API Calls

```bash
# With curl
TOKEN=$(./ai-cli.js token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/health | jq

# In scripts
TOKEN=$(./ai-cli.js token)
for endpoint in health ready metrics; do
  curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/$endpoint
done
```

## Migration from Makefiles

### Command Mapping

| Old Make Command  | New CLI Command          | MCP Tool     |
| ----------------- | ------------------------ | ------------ |
| `make auth-token` | `./ai-cli.js token`      | `get_token`  |
| `make dev-up`     | `./ai-cli.js dev start`  | `dev_start`  |
| `make dev-down`   | `./ai-cli.js dev stop`   | `dev_stop`   |
| `make dev-status` | `./ai-cli.js dev status` | `dev_status` |
| `make dev-logs`   | `./ai-cli.js dev logs`   | `dev_logs`   |
| `make db-migrate` | `./ai-cli.js db migrate` | `db_migrate` |
| `make db-backup`  | `./ai-cli.js db backup`  | `db_backup`  |
| `make test`       | `./ai-cli.js test`       | `test_run`   |

### Backward Compatibility

The main `Makefile` has been updated to redirect commands to the CLI:

```makefile
.PHONY: auth-token
auth-token: ## Get development auth token (NOW WORKS! Uses new CLI)
	@echo "$(GREEN)Using new CLI for reliable token generation...$(NC)"
	@./ai-cli.js token
```

## Best Practices for Agents

### 1. Prefer MCP Tools

When spawning agents, they should use MCP tools rather than shell commands:

```
# Good: Using MCP tool
Use MCP tool: db_migrate with parameters: { backup: true }

# Avoid: Direct shell command
Run: make db-migrate
```

### 2. Error Handling

The CLI provides clear error messages:

```javascript
// CLI handles errors gracefully
if (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
```

### 3. Parallel Operations

Agents can run multiple MCP tools in parallel:

```
Parallel operations:
1. Use MCP tool: dev_status
2. Use MCP tool: db_status
3. Use MCP tool: get_token
```

### 4. Context Awareness

Agents receive context about available tools through:

- Global CLAUDE.md (`~/.claude/CLAUDE.md`)
- Project CLAUDE.md (`/home/k2600x/dev/ai-service/CLAUDE.md`)
- MCP configuration (`~/.claude/mcp_config.json`)

## Troubleshooting

### Issue: Token command not working

```bash
# Solution 1: Use direct path
/home/k2600x/dev/ai-service/ai-cli.js token

# Solution 2: Check Node.js is installed
which node

# Solution 3: Use fallback method
npx ts-node scripts/token.ts 2>/dev/null | tail -1
```

### Issue: MCP tools not available

```bash
# Check MCP config exists
cat ~/.claude/mcp_config.json

# Check MCP server is executable
ls -la /home/k2600x/dev/ai-service/ai-cli-mcp.js

# Test MCP server manually
echo '{"method":"list_tools"}' | node /home/k2600x/dev/ai-service/ai-cli-mcp.js
```

### Issue: Database commands failing

```bash
# Ensure environment is running
./ai-cli.js dev status

# Check database container
docker ps | grep postgres

# Check DATABASE_URL is set
echo $DATABASE_URL
```

## Summary

The CLI and MCP integration provides agents with:

1. **Reliability**: No more subshell syntax errors
2. **Simplicity**: Clear, working commands
3. **Consistency**: Same tools for all agents
4. **Visibility**: Clear error messages and status
5. **Compatibility**: Works alongside existing Makefiles

Agents should prioritize using:

- MCP tools for operations (most reliable)
- Direct CLI commands as fallback
- Makefiles only when absolutely necessary

This integration ensures that the frustrating issues with broken Makefiles are resolved, providing a stable foundation for agent operations.
