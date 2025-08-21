# AI Service CLI

A unified, type-safe command-line interface for AI Service that replaces broken Makefiles with proper patterns and validation.

## Features

- **Type-safe commands** with Zod validation
- **Intuitive command structure** with aliases
- **Comprehensive error handling** with helpful messages
- **Configuration management** with environment overrides
- **Authentication flow** with token management
- **Database operations** with automatic backup
- **Test management** with coverage and reporting

## Installation

```bash
# Install dependencies
cd cli
npm install

# Build the CLI
npm run build

# Make it globally available (optional)
npm link
```

## Usage

### Authentication

```bash
# Login to AI Service
ai auth login
ai a l  # Short alias

# Show current user
ai auth whoami
ai a w

# Show authentication token
ai auth token
ai a t

# Refresh token
ai auth refresh
ai a r

# Logout
ai auth logout
ai a lo
```

### Database Management

```bash
# Run pending migrations
ai database migrate
ai db m

# Check migration status
ai database status
ai db s

# Rollback migration
ai database rollback [migration-id]
ai db r

# Open Prisma Studio
ai database studio
ai db st

# Create database backup
ai database backup [name]
ai db b

# Seed database
ai database seed
```

### Test Management

```bash
# Run unit tests
ai test unit
ai t u

# Run E2E tests
ai test e2e
ai t e

# Run all tests
ai test all
ai t a

# Generate coverage report
ai test coverage
ai t c

# View test reports
ai test report --e2e
ai test report --coverage
ai t r --e2e

# Clean test artifacts
ai test clean
```

### Configuration

```bash
# Show current configuration
ai config show
ai config show --json

# Set configuration values
ai config set apiUrl http://localhost:3001
ai config set environment production
ai config set logging.level debug
ai config set database.schema trading
```

### Utility Commands

```bash
# Check service health
ai health
ai health --json

# Show version information
ai version
ai version --json
```

## Global Options

All commands support these global options:

- `-v, --verbose` - Enable verbose output
- `-c, --config <path>` - Custom configuration file path
- `-e, --env <env>` - Environment override (development, production, test)
- `--no-color` - Disable colored output

## Configuration

The CLI automatically creates a configuration file at `~/.ai-service/config.json` with sensible defaults:

```json
{
  "apiUrl": "http://localhost:3001",
  "environment": "development",
  "docker": {
    "composeFile": "docker-compose.yml",
    "services": ["ai-service-api", "postgres", "redis"]
  },
  "database": {
    "url": "postgres://postgres:postgres123@localhost:5432/ai_service",
    "schema": "public",
    "backupDir": "./backups",
    "autoBackup": true
  },
  "logging": {
    "level": "info",
    "format": "pretty"
  }
}
```

Configuration can be overridden with:

- Environment variables (e.g., `AI_SERVICE_API_URL`, `DATABASE_URL`)
- Command-line options
- Custom configuration file

## Error Handling

The CLI provides comprehensive error handling with:

- **Validation errors** - Clear messages for invalid input
- **Network errors** - Helpful suggestions for connectivity issues
- **Authentication errors** - Automatic token refresh and re-login prompts
- **Database errors** - Safe rollback and backup procedures
- **Configuration errors** - Guided setup assistance

## Development

```bash
# Run in development mode
npm run dev -- auth login

# Type checking
npm run typecheck

# Run tests
npm test

# Build for production
npm run build
```

## Command Structure

The CLI follows a hierarchical command structure:

```
ai
├── auth (a)
│   ├── login (l)
│   ├── logout (lo)
│   ├── token (t)
│   ├── whoami (w)
│   └── refresh (r)
├── database (db)
│   ├── migrate (m)
│   ├── rollback (r)
│   ├── status (s)
│   ├── studio (st)
│   ├── seed
│   └── backup (b)
├── test (t)
│   ├── unit (u)
│   ├── e2e (e)
│   ├── all (a)
│   ├── coverage (c)
│   ├── report (r)
│   └── clean
├── config
│   ├── show
│   └── set
├── health
└── version
```

## Examples

### Common Workflows

**Initial Setup:**

```bash
ai auth login
ai database migrate
ai test all
```

**Development Workflow:**

```bash
ai database status
ai test unit --watch
ai auth token --raw  # For API testing
```

**Deployment Workflow:**

```bash
ai config set environment production
ai database backup production-$(date +%Y%m%d)
ai database migrate --force
ai test all
ai health
```

**Troubleshooting:**

```bash
ai config show
ai health --json
ai auth refresh
ai database rollback
```

## Comparison with Makefiles

| Task    | Old Makefile      | New CLI         |
| ------- | ----------------- | --------------- |
| Login   | `make auth-token` | `ai auth login` |
| Migrate | `make db-migrate` | `ai db migrate` |
| Tests   | `make test`       | `ai test all`   |
| Backup  | `make db-backup`  | `ai db backup`  |
| Health  | `make dev-status` | `ai health`     |

## Security

- Authentication tokens are stored securely in `~/.ai-service/credentials.json` with restricted permissions (600)
- Database URLs are masked in configuration output
- Sensitive information is excluded from JSON exports
- Failed authentication attempts are logged but not exposed

## Contributing

1. Add new commands in `src/commands/`
2. Update types in `src/types/index.ts`
3. Follow the established error handling patterns
4. Add comprehensive help text and aliases
5. Include proper validation with Zod schemas
6. Write tests for new functionality

## License

ISC
