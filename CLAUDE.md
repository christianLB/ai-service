# AI Service - Project Context for Claude Code

Este documento proporciona contexto esencial para Claude Code. Se carga automáticamente al inicio de cada sesión.

## 🏗️ Project Structure

```
/src
  /services              # Business logic (30+ services)
    /financial          # Banking, clients, invoices (Prisma-based)
      client-prisma.service.ts    # Client management with Prisma
      invoice-*.service.ts        # Invoice generation system
      gocardless.service.ts       # Bank integration
    /trading            # Crypto trading strategies
      trading-brain.service.ts    # AI-powered trading decisions
      market-data.service.ts      # Real-time market data
    /document-intelligence  # PDF/DOCX analysis
      openai-analysis.service.ts  # Document AI processing
    /auth               # Authentication system
      auth.service.ts             # JWT-based auth
  /routes               # API endpoints
    financial.ts        # Financial endpoints
    dashboard.ts        # Dashboard metrics
    trading.ts          # Trading endpoints
  /types                # TypeScript interfaces
/frontend              # React dashboard
  /src/pages           # Main UI pages
    Dashboard.tsx      # Financial dashboard
    Clients.tsx        # Client management
    Invoices.tsx       # Invoice management
/prisma
  schema.prisma        # Database schema (multi-schema: financial, public)
  /migrations          # Prisma migrations
/scripts               # Automation & utilities
  generate-crud.mjs    # Automated CRUD generation
/docs                  # Technical documentation

## 🛠️ Tech Stack

- **Backend**: Node.js 20, Express 4.19, TypeScript 5.8
- **Database**: PostgreSQL 15 + Prisma ORM 6.12 (multi-schema support)
- **Frontend**: React 18, Vite, TanStack Query, Tailwind CSS
- **Queue**: Bull + Redis for job processing
- **AI**: OpenAI API for categorization and analysis
- **Deployment**: Docker + Synology NAS
- **Testing**: Jest, Supertest
- **Trading**: Binance/Coinbase APIs, InfluxDB, Qdrant
- **Code Generation**: Plop + Handlebars (automated CRUD with validation)

## 🎯 Core Features

1. **Financial Module**: 
   - GoCardless integration for real banking data
   - AI-powered transaction categorization (90%+ accuracy)
   - Client & Invoice management (Prisma-based)
   - Multi-currency support (EUR primary)

2. **Trading Module**: 
   - Multi-exchange support (Binance, Coinbase)
   - AI trading strategies with backtesting
   - Risk management system
   - Real-time market data with InfluxDB

3. **Document Intelligence**: 
   - Multi-format ingestion (PDF, DOCX, TXT)
   - Semantic search with embeddings
   - Q&A system via Telegram bot

4. **MCP Bridge**: 
   - URL: https://mcp.anaxi.net
   - 25 AI tools exposed via REST API
   - Financial, Document, and System tools

## 🔑 Key Development Workflows

### ⚡ Quick Commands
```bash
# Development
make dev-up              # Start development environment
make dev-status          # Check container health
make dev-logs            # View logs
make db-studio           # Open Prisma Studio (visual DB)

# Database
make db-backup           # Backup before changes!
make db-migrate          # Apply pending migrations
make db-migrate-status   # Check migration status
make db-migrate-create NAME=description  # Create new migration

# Code Generation (Automated with Validation)
npm run generate:crud:auto ModelName     # Generate complete CRUD
npm run generate:crud:auto ModelName --schema trading  # With specific schema
npm run generate:crud:auto ModelName --features list,api  # Specific features

# IMPORTANT: Model must exist in prisma/schema.prisma first!
# The generator now validates and provides helpful error messages
```

### 🚀 Adding New Features

1. **For new database models (Correct Order)**:
   ```bash
   # 1. FIRST: Add model to prisma/schema.prisma
   # 2. Generate Prisma types
   npm run db:generate
   # 3. Create migration
   make db-migrate-create NAME=add_your_model
   make db-migrate
   # 4. THEN: Generate CRUD (with validation)
   npm run generate:crud:auto YourModel
   ```

2. **For API endpoints**:
   - Services go in: `src/services/[module]/`
   - Routes go in: `src/routes/[module].ts`
   - Types go in: `src/types/[module]/`

3. **For frontend features**:
   - Pages: `frontend/src/pages/`
   - Components: `frontend/src/components/`
   - Hooks: `frontend/src/hooks/`

## 🚨 Current Issues & Priorities

- [ ] Some tables missing from recent migrations (sync_logs, integration_configs)
- [ ] High memory usage in containers (>90%)
- [ ] Migration from SQL to Prisma ~70% complete
- [x] Client update functionality fixed with Prisma service
- [x] Docker init scripts removed (using Prisma migrations only)

## 📍 Quick Navigation Bookmarks

- **Database Schema**: `prisma/schema.prisma`
- **Client Service**: `src/services/financial/client-prisma.service.ts`
- **Dashboard API**: `src/routes/dashboard.ts`
- **Frontend Dashboard**: `frontend/src/pages/Dashboard.tsx`
- **Make Commands**: `Makefile` (main), `Makefile.*` (modules)
- **Environment Config**: `.env.local` (create from `.env.example`)

## 🔒 Critical Safety Rules

### NEVER execute these commands:
- `docker-compose down -v` → **DESTROYS ALL DATA**
- `DROP SCHEMA/TABLE` → Permanent data loss
- `prisma db push --force-reset` → Recreates schema from scratch
- Direct SQL without backup → Use migrations instead

### ALWAYS follow these practices:
- Use `make` commands exclusively (no direct docker/npm/prisma)
- Run `make db-backup` before schema changes
- Use `make db-migrate` instead of `prisma db push`
- Check with `make db-migrate-status` before applying
- Use automated CRUD generation for consistency

## 🧪 Testing Shortcuts

```bash
# Get auth token for API testing
TOKEN=$(make auth-token 2>/dev/null | grep -oP 'Token: \K.*')

# Test specific endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/dashboard/client-metrics

# Quick health check
make dev-status && make check-db
```

## 🎨 Design Patterns

- **Services**: Business logic with dependency injection
- **Routes**: Thin controllers, delegate to services
- **Prisma Models**: Source of truth for data structure
- **Zod Schemas**: Runtime validation for API inputs
- **React Query**: Data fetching with caching
- **Error Handling**: Consistent error responses with status codes

## 🤖 Claude Code Configuration

### MCP Servers Configuration
Claude Code is configured with advanced MCP (Model Context Protocol) servers:

1. **Context7** (Documentation & Patterns)
   - **Enabled**: ✅ Auto-detects when using Prisma, React, Express, TypeScript
   - **Use cases**: Library docs, best practices, code patterns
   - **Libraries**: prisma, react, express, typescript, tailwindcss, tanstack-query

2. **Sequential** (Complex Analysis)
   - **Enabled**: ✅ Auto-activates for complex problems
   - **Use cases**: Trading strategies, performance analysis, debugging
   - **Triggers**: `--think`, `--think-hard`, complex architecture

3. **Magic** (UI Generation)
   - **Enabled**: ✅ Auto-activates for frontend work
   - **Use cases**: React components, Tailwind UI, dashboard elements
   - **Frameworks**: React + Tailwind CSS

4. **Playwright** (Testing)
   - **Enabled**: ❌ (Can be enabled for E2E testing)
   - **Use cases**: Automated testing, cross-browser validation

### Custom Commands
- `/db-safe` - Safe database operations with automatic backup
- `/financial-audit` - Comprehensive financial module security audit
- `/trading-optimize` - Optimize trading strategies and performance
- `/frontend-enhance` - Enhance UI components with Magic

### Performance Optimizations
- **Token compression**: Auto-enabled at 75% usage
- **Caching**: Session and MCP server results cached
- **Parallel operations**: Up to 3 concurrent operations
- **Wave mode**: Auto-activates for complex multi-file operations

## 💡 Pro Tips

1. **Extended thinking**: Use "think" in prompts for complex problems
2. **Update this file**: When patterns change, update CLAUDE.md
3. **Use # shortcut**: Press # to add instructions to CLAUDE.md
4. **Custom commands**: Check `.clauderc` for project-specific commands
5. **Logs are gold**: Always check `make dev-logs` when debugging
6. **MCP servers**: Auto-activate based on context (e.g., UI work → Magic)
7. **Safety first**: Dangerous commands are blocked or require confirmation
8. **CRUD Generation**: Models must exist in Prisma schema first - generator validates automatically

## 🆕 Recent Improvements (Jan 2025)

### Automated CRUD Generation System Enhanced
The CRUD generator now includes:

- **Pre-validation**: Checks model exists in Prisma before generating
- **Auto-detection**: Detects schema and relations from Prisma model
- **Rollback System**: Reverts files on error to keep codebase clean
- **Clear Errors**: Shows available models and suggests fixes
- **Template Fixes**: Proper Handlebars escape for JSX/TypeScript

**Documentation**:
- Complete guide: [AUTOMATED-DEVELOPMENT-STACK.md](docs/AUTOMATED-DEVELOPMENT-STACK.md)
- Issues & solutions: [AUTOMATED-DEVELOPMENT-STACK-ISSUES.md](docs/AUTOMATED-DEVELOPMENT-STACK-ISSUES.md)

## 🔍 Development Reminders

- recuerda siempre verificar make dev-refresh
- CRUD generation: Model → Prisma generate → Migration → CRUD generate

---

**Remember**: This is a financial system handling real money. Security and data integrity are paramount. When in doubt, ask for clarification.