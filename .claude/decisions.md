# Architectural Decisions Log

This document tracks important architectural decisions made in the AI Service project. Each entry explains the context, decision, rationale, and impact.

## 2025-07-21: Migration to Prisma ORM

**Context**: 
- SQL queries were becoming difficult to manage and error-prone
- No type safety between database and application code
- Manual migrations were causing inconsistencies
- The `allowedFields` pattern in services was blocking legitimate updates

**Decision**: 
Migrate all database operations from raw SQL to Prisma ORM, starting with the Financial module.

**Rationale**:
- Type safety with auto-generated TypeScript types
- Automatic migration system with rollback capability
- Better developer experience with IntelliSense
- Eliminates manual field whitelisting errors

**Impact**: 
- All new features must use Prisma models
- Legacy SQL services being phased out (~70% complete)
- Database schema is now the single source of truth
- Significantly reduced database-related bugs

---

## 2025-07-20: Automated CRUD Generation

**Context**:
- Repetitive boilerplate code for each new model
- Inconsistent patterns across different modules
- Time-consuming to add new features

**Decision**:
Implement Plop-based automated CRUD generation that creates complete feature scaffolding with a single command.

**Rationale**:
- Enforces consistent patterns across the codebase
- Reduces development time from hours to minutes
- Includes tests, types, and UI components automatically
- Integrates with Prisma for type safety

**Impact**:
- New models can be added with `make gen-crud-auto MODEL=Name`
- Standardized file structure and naming conventions
- Reduced onboarding time for new developers

---

## 2025-07-20: Remove Docker Init Scripts

**Context**:
- Docker init scripts were confusing and potentially dangerous
- Scripts only run on empty volumes but were still mounted
- Prisma migrations provide better schema management

**Decision**:
Remove all database initialization scripts from docker-compose.yml volume mounts.

**Rationale**:
- Prisma Migrate is the single source of truth for schema
- Reduces confusion about what manages the database
- Prevents accidental data loss from misunderstanding
- Simplifies the Docker setup

**Impact**:
- All schema changes must go through Prisma migrations
- Cleaner docker-compose.yml file
- Database initialization handled by Prisma on first run

---

## 2025-07-18: Multi-Schema Database Architecture

**Context**:
- Financial data needs isolation from other modules
- PostgreSQL supports multiple schemas
- Better organization for growing feature set

**Decision**:
Use PostgreSQL schemas to organize tables: `financial` for banking/money data, `public` for system data.

**Rationale**:
- Logical separation of concerns
- Easier permissions management
- Can backup/restore schemas independently
- Cleaner than prefixing table names

**Impact**:
- All Prisma models must specify `@@schema()`
- Queries can cross schemas when needed
- Migration tools must be schema-aware

---

## 2025-07-17: MCP Bridge Architecture

**Context**:
- Need to expose AI service capabilities to external tools
- Multiple internal services that could benefit from unified access
- Growing ecosystem of AI tools needing integration

**Decision**:
Implement Model Context Protocol (MCP) bridge at https://mcp.anaxi.net exposing 25 tools via REST API.

**Rationale**:
- Standard protocol for AI tool integration
- Single endpoint for all capabilities
- Better security with centralized access control
- Enables Claude Desktop and other MCP clients

**Impact**:
- All tools must implement MCP-compatible interfaces
- New tools automatically available through bridge
- Standardized error handling and authentication

---

## 2025-07-15: JWT Authentication (No Bypass)

**Context**:
- Initial development used AUTH_BYPASS for convenience
- Security vulnerability in production
- Need proper user management

**Decision**:
Remove AUTH_BYPASS completely and enforce JWT authentication on all protected endpoints.

**Rationale**:
- Security must be tested during development
- Prevents accidental deployment with bypass enabled
- Forces proper auth implementation from start

**Impact**:
- All API tests must include authentication
- Development requires `make auth-token` for testing
- No exceptions to auth requirements

---

## 2025-07-10: Monorepo Structure

**Context**:
- Frontend and backend were in separate repositories
- Deployment complexity with multiple repos
- Type sharing was difficult

**Decision**:
Combine frontend and backend into a monorepo structure.

**Rationale**:
- Shared TypeScript types between frontend/backend
- Atomic commits across full stack changes
- Simplified deployment process
- Better for small team development

**Impact**:
- Single repository to maintain
- Unified build and test processes
- Shared tooling and configurations

---

## 2025-07-01: Docker-First Development

**Context**:
- Inconsistent development environments
- "Works on my machine" problems
- Complex service dependencies

**Decision**:
All development must happen in Docker containers, no local service execution.

**Rationale**:
- Consistent environment across all developers
- Matches production environment exactly
- Easy onboarding with single command startup
- Handles all service dependencies automatically

**Impact**:
- `make dev-up` is the standard way to start development
- No local Node.js or database installation needed
- All tools wrapped in Make commands
- Some performance overhead accepted for consistency

---

## Future Decisions to Consider

1. **GraphQL vs REST**: Currently REST, but growing complexity might benefit from GraphQL
2. **Microservices Split**: Monolith works now, but trading module could be separated
3. **Event Sourcing**: For financial data audit trail requirements
4. **Kubernetes**: When scaling beyond single server deployment
5. **Observability Stack**: Proper monitoring and tracing system

---

## Decision Template

## YYYY-MM-DD: [Decision Title]

**Context**: 
[What situation led to this decision? What problems were we facing?]

**Decision**: 
[What did we decide to do?]

**Rationale**:
[Why did we make this choice? What alternatives were considered?]

**Impact**: 
[How does this change the project? What are the consequences?]