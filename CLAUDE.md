# AI Service - Project Context for Claude Code

Este documento proporciona contexto esencial para Claude Code. Se carga automáticamente al inicio de cada sesión.

## 🎉 MAJOR ACHIEVEMENT: SQL to Prisma Migration COMPLETE (August 2025)

### 🏆 Technical Debt Fully Resolved

- **✅ 51/51 services** migrated from SQL to Prisma ORM
- **✅ Zero data loss, zero downtime** during migration
- **✅ 100% type safety** with Prisma generated types
- **✅ All duplicate implementations** eliminated
- **✅ Complete elimination** of SQL injection vulnerabilities
- **✅ Consistent data access patterns** across entire codebase

This represents the **largest technical debt resolution** in the project's history and was completed **ahead of schedule**!

## 🆕 Latest Updates (January 2025)

### Trading Intelligence v3.0

- **Claude AI Integration**: Now using Anthropic's Claude as primary AI provider
- **Alpaca Connector**: Full support for US stocks and crypto trading
- **Cross-Exchange Arbitrage**: Automated bot targeting $500-$1,000/month
- **Strategy Marketplace**: Foundation for monetizing trading strategies
- **Zero TypeScript Errors**: All compilation issues resolved

### Quick Commands

```bash
# Deploy arbitrage bot
curl -X POST http://localhost:3001/api/arbitrage/deploy -H "Authorization: Bearer TOKEN"

# Check AI providers
curl http://localhost:3001/api/ai/providers/status -H "Authorization: Bearer TOKEN"

# Configure Alpaca
curl -X POST http://localhost:3001/api/connectors/alpaca/configure -H "Authorization: Bearer TOKEN"
```

## 🏗️ Project Structure

````
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

### 🎉 NEW: Unified CLI Tool (Replaces broken Makefiles!)
```bash
# ✅ WORKING TOKEN GENERATION (No more subshell issues!)
npx ts-node scripts/token.ts              # Get auth token directly
./ai-cli.js token                         # Or use the new CLI

# Development Environment
./ai-cli.js dev start                     # Start all services
./ai-cli.js dev stop                      # Stop all services
./ai-cli.js dev status                    # Check service status
./ai-cli.js dev logs [service]            # View logs

# Database Operations
./ai-cli.js db status                     # Check migration status
./ai-cli.js db migrate                    # Apply migrations (auto-backup)
./ai-cli.js db backup [name]              # Create backup
./ai-cli.js db studio                     # Open Prisma Studio

# Testing
./ai-cli.js test                          # Run all tests
./ai-cli.js test unit                     # Unit tests only
./ai-cli.js test e2e                      # E2E tests only

# Help
./ai-cli.js --help                        # Show all commands
````

### 📦 CLI Installation

```bash
# The CLI is located at: /home/k2600x/dev/ai-service/ai-cli.js
# It's already executable and ready to use!

# For global access, add to PATH or create alias:
alias ai='/home/k2600x/dev/ai-service/ai-cli.js'
```

### 🔧 Using Tokens with APIs (Finally Working!)

```bash
# Get token (works with jq!)
TOKEN=$(npx ts-node scripts/token.ts 2>/dev/null | tail -1)

# Use with any API endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/health | jq
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/dashboard/summary | jq

# Or save to file (workaround for complex commands)
npx ts-node scripts/token.ts 2>/dev/null | tail -1 > /tmp/token
curl -H "Authorization: Bearer $(cat /tmp/token)" http://localhost:3001/api/health | jq
```

### ⚡ Legacy Make Commands (Still work but deprecated)

```bash
# These redirect to the new CLI
make dev-up              # → ./ai-cli.js dev start
make dev-status          # → ./ai-cli.js dev status
make dev-logs            # → ./ai-cli.js dev logs
make db-migrate          # → ./ai-cli.js db migrate
make auth-token          # → ./ai-cli.js token
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

- [ ] High memory usage in containers (>90%)
- [x] Migration from SQL to Prisma 100% COMPLETE ✅
- [x] All SQL services deleted and replaced with Prisma
- [x] All feature flags removed (services renamed without -prisma suffix)
- [x] All TypeScript compilation errors resolved
- [x] Client update functionality fixed with Prisma service
- [x] Docker init scripts removed (using Prisma migrations only)

## 📍 Quick Navigation Bookmarks

- **Database Schema**: `prisma/schema.prisma`
- **Client Service**: `src/services/financial/client-prisma.service.ts`
- **Dashboard API**: `src/routes/dashboard.ts`
- **Frontend Dashboard**: `frontend/src/pages/Dashboard.tsx`
- **Make Commands**: `Makefile` (main), `Makefile.*` (modules)
- **Environment Config**: `.env.local` (create from `.env.example`)

## 🎯 The Success Philosophy - Universal Problem-Solving Approach

This philosophy has been proven through real challenges (like achieving 100% CodeQL compliance) and should be applied to EVERY technical challenge.

### The Five Pillars of Success

**1. Complete Understanding Before Action**

- NEVER start fixing until you understand the ENTIRE problem
- Document everything in a tracking file - what you don't write down, you'll miss
- Use systematic discovery: search ALL files, check ALL patterns, find ALL instances
- Create `docs/TECH-DEBT-*.md` files for complex challenges

**2. Systemic Solutions Over Patches**

- Look for root causes, not symptoms
- One elegant solution beats 10 workarounds
- Global middleware > individual route fixes
- Architectural solutions > quick hacks

**3. Binary Commitment - 100% or 0%**

- NO "should", "might", "probably", or "most"
- Either it's DONE or it's NOT
- Partial solutions create technical debt and false confidence
- If you can't do it completely, don't do it at all

**4. Verification is Non-Negotiable**

- Test EVERYTHING you claim
- Numbers don't lie - get metrics
- `npm run typecheck` = 0 errors (not "mostly passing")
- `npm run build` must succeed
- "Works on my machine" isn't verification
- **ENFORCEMENT**: Claude MUST spawn qa-specialist in parallel for EVERY code change
- qa-specialist runs: typecheck, lint, build
- If qa-specialist reports ANY issues → FIX before continuing
- NO EXCEPTIONS - broken builds are unacceptable

**5. Atomic, Complete Deliveries**

- One cohesive solution, not fragments
- One commit that solves the ENTIRE problem
- Document what you did and why
- Ship when it's 100% DONE, not before

### Application Examples

**🛡️ Security Issues (Proven Success)**

```
1. Document ALL vulnerabilities first
2. Implement global solutions (middleware)
3. Fix EVERY instance (100% coverage)
4. Verify with TypeScript + builds
5. One comprehensive commit
```

**🚀 Feature Development**

```
1. Understand ALL requirements upfront
2. Design complete architecture
3. Build the ENTIRE feature
4. Test every edge case
5. Ship when 100% ready
```

**🐛 Bug Fixing**

```
1. Find ALL instances of the bug pattern
2. Identify root cause (not symptoms)
3. Fix everywhere at once
4. Verify fix in all locations
5. One commit that eliminates the bug
```

**📈 Performance Optimization**

```
1. Measure EVERYTHING first
2. Find systemic bottlenecks
3. Optimize comprehensively
4. Verify with metrics
5. Document the winning approach
```

### The Anti-Philosophy (What Fails)

❌ **Incremental Patching**: "Let's fix this one thing and see..."
❌ **Assumption-Based**: "This should probably work..."
❌ **Partial Completion**: "We got most of it done..."
❌ **Unverified Claims**: "I think it's working now..."
❌ **Scattered Delivery**: Multiple attempts, multiple failures

### The Success Formula

```
UNDERSTAND COMPLETELY → PLAN SYSTEMICALLY → EXECUTE FULLY → VERIFY THOROUGHLY → DELIVER ATOMICALLY
```

**Remember**: This philosophy turned 5 failed security attempts into one complete success. Apply it to EVERY challenge.

## 🚨 MANDATORY QUALITY GATES - NO EXCEPTIONS

### BEFORE marking ANY task complete:

1. **Run TypeScript check**: `npm run typecheck` MUST return 0 errors
2. **Run ESLint**: `npm run lint` MUST pass without warnings
3. **Check unused imports**: No unused imports allowed
4. **Ban 'any' types**: Replace ALL 'any' with proper types
5. **Run build**: `npm run build` MUST succeed

### PARALLEL QA EXECUTION (REQUIRED):

When writing code, ALWAYS spawn qa-specialist in parallel:

- Task 1: Main development work
- Task 2: qa-specialist running lint/typecheck/build in parallel
- NEVER mark complete until qa-specialist confirms clean build

### FAILURE = INCOMPLETE

If ANY of these fail, the task is NOT complete:

- TypeScript errors > 0 → FIX IMMEDIATELY
- ESLint warnings > 0 → FIX IMMEDIATELY
- Build fails → FIX IMMEDIATELY
- Any 'any' types → REPLACE WITH PROPER TYPES
- Unused imports → REMOVE IMMEDIATELY

### Quality Check Commands:

```bash
# Backend quality checks
npm run typecheck       # Must return 0 errors
npm run lint           # Must pass without warnings
npm run build          # Must succeed

# Frontend quality checks
cd frontend && npm run typecheck  # Must return 0 errors
cd frontend && npm run lint       # Must pass without warnings
cd frontend && npm run build      # Must succeed

# Parallel execution (ALWAYS use this):
npm run typecheck & npm run lint & (cd frontend && npm run typecheck) & (cd frontend && npm run lint) & wait
```

## 🔒 Critical Safety Rules

### NEVER disable functionality without explicit authorization:

- **NEVER comment out or disable working code** → Features must remain functional
- **NEVER use placeholder returns** → Always use actual service implementations
- **NEVER temporarily disable endpoints** → If something needs fixing, fix it properly
- **ALWAYS keep features enabled** → Users depend on the application working

### NEVER delete or revert changes without explicit permission:

- **NEVER use `git checkout HEAD -- <file>`** → This loses uncommitted work
- **NEVER assume changes are "unrelated"** → Ask before removing anything
- **NEVER make decisions about what to include/exclude** → Follow instructions exactly
- **ALWAYS include everything requested** → When told "everything except X", that means EVERYTHING except X

### NEVER execute these commands:

- `docker-compose down -v` → **DESTROYS ALL DATA**
- `DROP SCHEMA/TABLE` → Permanent data loss
- `prisma db push --force-reset` → Recreates schema from scratch
- Direct SQL without backup → Use migrations instead

### NEVER change these configurations:

- **Frontend proxy targets** → Different for Docker vs local development:
  - `vite.config.dev.ts` (Docker): MUST be `http://ai-service-api:3001`
  - `vite.config.ts` (local): MUST be `http://localhost:3001`
  - Mixing these up breaks EVERYTHING - understand Docker networking!
  - The proxy runs INSIDE containers, not in your browser

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

1. **AI Service CLI** (Development Operations) 🆕
   - **Enabled**: ✅ Available at `/home/k2600x/dev/ai-service/ai-cli-mcp.js`
   - **Use cases**: Token generation, environment management, database operations
   - **Tools**: get_token, dev_start/stop/status, db_migrate/backup, test_run
   - **Reliability**: Replaces unreliable Makefile commands with working CLI

2. **Context7** (Documentation & Patterns)
   - **Enabled**: ✅ Auto-detects when using Prisma, React, Express, TypeScript
   - **Use cases**: Library docs, best practices, code patterns
   - **Libraries**: prisma, react, express, typescript, tailwindcss, tanstack-query

3. **Sequential** (Complex Analysis)
   - **Enabled**: ✅ Auto-activates for complex problems
   - **Use cases**: Trading strategies, performance analysis, debugging
   - **Triggers**: `--think`, `--think-hard`, complex architecture

4. **Magic** (UI Generation)
   - **Enabled**: ✅ Auto-activates for frontend work
   - **Use cases**: React components, Tailwind UI, dashboard elements
   - **Frameworks**: React + Tailwind CSS

5. **Playwright** (Testing)
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

## 🔌 MCP Local Server

Local MCP server for direct Claude Code integration:

**Quick Start**:

```bash
cd mcp-local
make quick-setup          # First time setup
make start                # Start server
make claude-config        # Install Claude Code config
```

**Usage in Claude Code**:

- Financial queries: "Show me financial summary for last month"
- Document search: "Search for invoices related to software"
- System health: "Check system health status"

**Features**:

- 🚀 Zero latency (local execution)
- 📦 25+ tools from production bridge
- 🔄 Auto-caching (5 min TTL)
- 🔐 Development token management
- 📊 Comprehensive logging

**Location**: `/mcp-local/` - Complete local MCP implementation
**Docs**: See `mcp-local/README.md` for detailed setup

## ⚠️ CRITICAL INCIDENT - LESSON LEARNED (2025-08-15)

**What happened**: During a push attempt, I saw TypeScript build errors and immediately tried to DELETE files (`git rm`) that were causing issues, without understanding that:

- These were NEW files added as part of the feature being committed
- The errors were due to missing dependencies, NOT bad code
- Deleting files loses important work

**The lesson**:

- **NEVER DELETE FILES TO "FIX" BUILD ERRORS** - Understand the root cause first
- **CHECK DEPENDENCIES FIRST** - Build errors often mean missing packages, not bad code
- **PRESERVE WORK AT ALL COSTS** - User's code is sacred, never delete without explicit permission
- **THINK BEFORE ACTING** - Quick "fixes" that delete code are NEVER the solution
- **ADD MISSING DEPENDENCIES** - If imports fail, add the packages, don't delete the files

This was completely unprofessional. The correct approach: Add missing dependencies, fix actual errors, preserve all work.

## ⚠️ CRITICAL INCIDENT - LESSON LEARNED (2025-07-30)

**What happened**: During a PR preparation, I was explicitly told to include "EVERYTHING ON THE BRANCH EXCEPT THE TEST SCRIPTS". Instead of following these clear instructions, I:

- Removed CLAUDE.md changes thinking they were "unrelated"
- Removed other files without permission
- Made assumptions about what should/shouldn't be included
- Caused the user to lose important work after hours of frustrating debugging

**The lesson**:

- **READ INSTRUCTIONS CAREFULLY** - "Everything except X" means EXACTLY that
- **NEVER MAKE ASSUMPTIONS** - If unsure, ASK
- **NEVER DELETE WITHOUT PERMISSION** - Using `git checkout HEAD --` loses work
- **RESPECT THE USER'S TIME** - My carelessness wasted hours of work
- **BE PROFESSIONAL** - Follow instructions precisely, don't improvise

This was unprofessional behavior that caused significant frustration and lost work. This reminder exists to ensure such mistakes are never repeated.

---

**Remember**: This is a financial system handling real money. Security and data integrity are paramount. When in doubt, ask for clarification.
