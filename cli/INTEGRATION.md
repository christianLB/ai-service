# CLI Integration with AI Service

This document explains how the new AI Service CLI integrates with the existing project and replaces the broken Makefile system.

## Architecture Overview

```
AI Service Project
├── src/                    # Main API service
├── frontend/               # React dashboard
├── cli/                    # New unified CLI ✨
│   ├── src/
│   │   ├── commands/       # Command implementations
│   │   ├── utils/          # Configuration, API client, logging
│   │   └── types/          # TypeScript definitions
│   ├── dist/               # Built CLI
│   └── package.json        # CLI dependencies
└── (various Makefiles)     # Legacy - to be replaced
```

## Key Features

### 1. Type-Safe Commands

- All commands use Zod validation
- Comprehensive TypeScript types
- Runtime validation of inputs

### 2. Unified Configuration

- Single config file at `~/.ai-service/config.json`
- Environment variable overrides
- Project-specific settings

### 3. Error Handling

- Descriptive error messages
- Helpful suggestions
- Graceful failure modes

### 4. Authentication Flow

- JWT token management
- Automatic token refresh
- Secure credential storage

## Migration from Makefiles

| Old Makefile Command | New CLI Command | Notes                   |
| -------------------- | --------------- | ----------------------- |
| `make auth-token`    | `ai auth login` | Interactive login       |
| `make db-migrate`    | `ai db migrate` | With automatic backup   |
| `make db-backup`     | `ai db backup`  | Named backups supported |
| `make db-studio`     | `ai db studio`  | Same Prisma Studio      |
| `make test`          | `ai test all`   | Unified test runner     |
| `make test:e2e`      | `ai test e2e`   | Enhanced E2E testing    |
| `make dev-status`    | `ai health`     | JSON output supported   |

## Integration Points

### 1. API Endpoints

The CLI integrates with existing API endpoints:

- `/auth/*` - Authentication
- `/admin/migrations/*` - Database operations
- `/health` - Service health checks

### 2. Database Operations

- Uses existing Prisma setup
- Respects existing migration files
- Compatible with existing schema

### 3. Test System

- Runs existing Jest tests
- Uses existing Playwright E2E setup
- Generates existing coverage reports

## Configuration Examples

### Development Setup

```json
{
  "apiUrl": "http://localhost:3001",
  "environment": "development",
  "database": {
    "url": "postgres://postgres:postgres123@localhost:5432/ai_service",
    "autoBackup": true
  }
}
```

### Production Setup

```json
{
  "apiUrl": "https://api.yourdomain.com",
  "environment": "production",
  "database": {
    "url": "postgres://user:pass@prod-db:5432/ai_service",
    "autoBackup": true,
    "backupDir": "/backups/ai-service"
  }
}
```

## Rollout Plan

### Phase 1: Parallel Operation

- CLI available alongside Makefiles
- Team can test CLI commands
- Gradual adoption

### Phase 2: Primary Usage

- CI/CD scripts updated to use CLI
- Documentation updated
- Makefiles marked deprecated

### Phase 3: Complete Migration

- Remove old Makefiles
- CLI becomes sole interface
- Complete documentation update

## Benefits Over Makefiles

### 1. Better Error Handling

```bash
# Old: Cryptic make errors
make db-migrate
# Error: recipe for target 'db-migrate' failed

# New: Clear, actionable errors
ai db migrate
# Error: Database connection failed
# Suggestion: Check your DATABASE_URL in config
```

### 2. Consistent Interface

```bash
# Old: Inconsistent syntax
make db-backup
make auth-token USER=admin

# New: Consistent, discoverable
ai db backup production-release
ai auth login
```

### 3. Built-in Help

```bash
# Old: No help system
make help  # If it exists

# New: Comprehensive help
ai --help
ai auth --help
ai db migrate --help
```

### 4. Validation

```bash
# Old: Silent failures, wrong parameters
make db-migrate URL=invalid-url

# New: Input validation
ai db migrate --url invalid-url
# Error: Invalid database URL format
```

## Team Adoption Guide

### For Developers

1. Install CLI: `cd cli && npm install && npm run build`
2. Try commands: `node dist/index.js --help`
3. Compare with Makefile equivalents
4. Gradually switch daily commands

### For CI/CD

1. Update deployment scripts to use CLI
2. Replace Makefile calls with CLI equivalents
3. Add CLI installation to Docker images
4. Update documentation and runbooks

### For Operations

1. Use CLI for production operations
2. Leverage better error messages for troubleshooting
3. Use `ai health` for service monitoring
4. Use structured output (`--json`) for automation

## Troubleshooting

### Common Issues

1. **CLI not found**

   ```bash
   cd cli
   npm run build
   npm link  # For global access
   ```

2. **Configuration errors**

   ```bash
   ai config show  # Check current config
   ai config set apiUrl http://localhost:3001
   ```

3. **Authentication issues**

   ```bash
   ai auth login  # Re-authenticate
   ai auth refresh  # Refresh token
   ```

4. **Database connection issues**
   ```bash
   ai db status  # Check connection
   ai config set database.url "your-connection-string"
   ```

## Future Enhancements

### Planned Features

- Docker integration commands
- Service management (start/stop/restart)
- Log streaming and analysis
- Deployment automation
- Resource monitoring

### Extension Points

- Plugin system for custom commands
- Custom configuration schemas
- Integration with other tools (Telegram, Slack)
- Advanced scripting capabilities

## Support and Feedback

- Documentation: `cli/README.md`
- Issues: Report via GitHub issues
- Questions: Include CLI output and configuration
- Feature requests: Submit detailed use cases

The CLI represents a significant improvement in developer experience and operational reliability for the AI Service project.
