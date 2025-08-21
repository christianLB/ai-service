# Agent Orchestration Commands - OpenAPI Complete Implementation

This document contains the exact commands to execute for orchestrating the OpenAPI migration using Claude's agent system.

## Phase 1: Discovery & Analysis (Execute NOW - PARALLEL)

Open 5 terminal windows/tabs and run these simultaneously:

### Terminal 1: CRUD Analysis
```bash
/spawn-agent --type crud-specialist --task "Analyze ALL backend routes in /home/k2600x/dev/ai-service/src/routes/*.ts. Document every single GET, POST, PUT, PATCH, DELETE operation with full details including: path, method, parameters, request body schema, response schema. Output a complete CRUD operations matrix." --output /home/k2600x/dev/ai-service/frontend/docs/analysis/crud-operations.md
```

### Terminal 2: Database Mapping
```bash
/spawn-agent --type prisma-specialist --task "Analyze the Prisma schema at /home/k2600x/dev/ai-service/prisma/schema.prisma and map every model to its corresponding API endpoints in /home/k2600x/dev/ai-service/src/routes/. Document which Prisma operations (create, update, delete, findMany, etc.) are exposed through which API endpoints." --output /home/k2600x/dev/ai-service/frontend/docs/analysis/db-api-mapping.md
```

### Terminal 3: Manual Hooks Inventory
```bash
/spawn-agent --type ui-specialist --task "Create a complete inventory of ALL manual hooks in /home/k2600x/dev/ai-service/frontend/src/hooks/use-*.ts. For each hook document: 1) What API endpoints it calls, 2) Which components use it, 3) What axios methods it uses, 4) Dependencies on other hooks/services. Include usage counts and priority for migration." --output /home/k2600x/dev/ai-service/frontend/docs/analysis/manual-hooks-inventory.md
```

### Terminal 4: Test Coverage
```bash
/spawn-agent --type qa-specialist --task "Analyze all test files in /home/k2600x/dev/ai-service/frontend/src/**/__tests__/ and create a comprehensive test inventory. Document which components have tests, what they test, and which components will need new tests after migration to generated hooks. Identify critical paths that must not break." --output /home/k2600x/dev/ai-service/frontend/docs/analysis/test-inventory.md
```

### Terminal 5: Build Pipeline Analysis
```bash
/spawn-agent --type devops-specialist --task "Analyze the current build pipeline in /home/k2600x/dev/ai-service/frontend/package.json and vite configs. Document what changes are needed to integrate OpenAPI generation into the build process. Check if CI/CD pipelines need updates for the new generated code structure." --output /home/k2600x/dev/ai-service/frontend/docs/analysis/pipeline-requirements.md
```

**WAIT FOR ALL 5 AGENTS TO COMPLETE BEFORE PROCEEDING TO PHASE 2**

## Phase 2: OpenAPI Specification Completion (Execute after Phase 1 - PARALLEL)

Execute these in parallel after Phase 1 completes:

### Team 1: Financial Domain (Most Complex)
```bash
/spawn-agent --type crud-specialist --task "Complete the OpenAPI specification for financial domain. Read /home/k2600x/dev/ai-service/openapi/financial.yaml and ADD all missing CRUD operations based on /home/k2600x/dev/ai-service/src/routes/financial.ts and /home/k2600x/dev/ai-service/src/routes/financial/*.ts. Must include ALL POST, PUT, PATCH, DELETE operations with complete request/response schemas. Reference the crud-operations.md from Phase 1." --context @/home/k2600x/dev/ai-service/frontend/docs/analysis/crud-operations.md --output /home/k2600x/dev/ai-service/openapi/financial-complete.yaml
```

### Team 2: Trading Domain
```bash
/spawn-agent --type crud-specialist --task "Complete the OpenAPI specification for trading domain. Read /home/k2600x/dev/ai-service/openapi/trading.yaml and ADD all operations from trading.ts, trade.routes.ts, position.routes.ts, strategy.routes.ts. Include WebSocket operations documentation. Must have complete schemas for all trading operations." --output /home/k2600x/dev/ai-service/openapi/trading-complete.yaml
```

### Team 3: Authentication & Gateway
```bash
/spawn-agent --type crud-specialist --task "Complete auth.yaml and gateway.yaml specifications. Ensure all authentication flows are documented including login, logout, refresh, and token validation. Gateway must document all proxy routes and rate limiting." --output /home/k2600x/dev/ai-service/openapi/auth-gateway-complete.yaml
```

### Team 4: AI & Communication
```bash
/spawn-agent --type crud-specialist --task "Complete ai-core.yaml and comm.yaml specifications. Document all AI endpoints including document processing, embeddings, and Q&A. Communication must include Telegram bot operations and notification endpoints." --output /home/k2600x/dev/ai-service/openapi/ai-comm-complete.yaml
```

## Phase 3: Hook Generation & SDK Integration (Sequential)

After Phase 2 completes, run this single command:

```bash
/spawn-agent --type ui-specialist --task "
1. Create a new openapi-rq.config.ts that includes ALL completed OpenAPI specs from Phase 2
2. Run npx openapi-rq to generate hooks for all domains
3. Create SDK adapters in src/generated/sdk-adapter.ts that integrate with @ai/sdk-client
4. Configure all generated hooks to use the SDK client instead of direct fetch
5. Export all hooks from a central index file for easy importing
" --output /home/k2600x/dev/ai-service/frontend/src/generated/
```

## Phase 4: Component Migration (MASSIVE PARALLEL)

Deploy 10 agents simultaneously for component migration:

```bash
# Run all these commands in parallel
/spawn-agent --type ui-specialist --task "Migrate ClientList.tsx from use-client.ts to generated financial hooks" --file /home/k2600x/dev/ai-service/frontend/src/pages/clients/ClientList.tsx

/spawn-agent --type ui-specialist --task "Migrate ClientDetail.tsx from use-client.ts to generated financial hooks" --file /home/k2600x/dev/ai-service/frontend/src/pages/clients/ClientDetail.tsx

/spawn-agent --type ui-specialist --task "Migrate ClientForm.tsx to use generated mutation hooks" --file /home/k2600x/dev/ai-service/frontend/src/pages/clients/ClientForm.tsx

/spawn-agent --type ui-specialist --task "Migrate Dashboard.tsx to use generated query hooks for all data fetching" --file /home/k2600x/dev/ai-service/frontend/src/pages/Dashboard.tsx

/spawn-agent --type ui-specialist --task "Migrate BankAccounts.tsx from use-accounts.ts to generated hooks" --file /home/k2600x/dev/ai-service/frontend/src/pages/BankAccounts.tsx

/spawn-agent --type ui-specialist --task "Migrate TradingDashboard.tsx from manual hooks to generated trading hooks" --file /home/k2600x/dev/ai-service/frontend/src/pages/trading/TradingDashboard.tsx

/spawn-agent --type ui-specialist --task "Migrate Positions.tsx from use-position.ts to generated hooks" --file /home/k2600x/dev/ai-service/frontend/src/pages/trading/Positions.tsx

/spawn-agent --type ui-specialist --task "Migrate NotificationSettings.tsx to use generated communication hooks" --file /home/k2600x/dev/ai-service/frontend/src/pages/NotificationSettings.tsx

/spawn-agent --type ui-specialist --task "Migrate all components in src/pages/tags/ to use generated hooks" --files /home/k2600x/dev/ai-service/frontend/src/pages/tags/*.tsx

/spawn-agent --type ui-specialist --task "Migrate InvoiceList, InvoiceDetail, InvoiceForm to use generated hooks" --files /home/k2600x/dev/ai-service/frontend/src/pages/invoices/*.tsx
```

## Phase 5: Axios Removal & Cleanup (Single Agent)

```bash
/spawn-agent --type crud-specialist --task "
1. Remove ALL axios imports from every file in src/
2. Archive all manual hooks in src/hooks/use-*.ts to src/hooks/deprecated/
3. Update all service files in src/services/ to use generated hooks
4. Remove axios from package.json dependencies
5. Ensure NO axios references remain in the codebase
" --scope /home/k2600x/dev/ai-service/frontend/src/
```

## Phase 6: Validation & Quality Assurance (PARALLEL)

Deploy QA agents for comprehensive validation:

```bash
# Run these 4 validation agents in parallel
/spawn-agent --type qa-specialist --task "Run TypeScript compilation and fix ALL errors. Must achieve 0 TypeScript errors." --command "cd /home/k2600x/dev/ai-service/frontend && npm run typecheck"

/spawn-agent --type qa-specialist --task "Run ESLint and fix ALL warnings. Clean code with no linting issues." --command "cd /home/k2600x/dev/ai-service/frontend && npm run lint"

/spawn-agent --type qa-specialist --task "Run all unit tests and ensure 100% pass rate. Fix any broken tests." --command "cd /home/k2600x/dev/ai-service/frontend && npm test"

/spawn-agent --type qa-specialist --task "Run production build and ensure it completes successfully with no errors." --command "cd /home/k2600x/dev/ai-service/frontend && npm run build"
```

## Monitoring Script

While agents are running, monitor progress with:

```bash
watch -n 2 '
echo "=== OpenAPI Migration Progress ==="
echo "Axios imports: $(grep -r "import.*axios" /home/k2600x/dev/ai-service/frontend/src/ 2>/dev/null | wc -l)"
echo "Manual hooks: $(ls /home/k2600x/dev/ai-service/frontend/src/hooks/use-*.ts 2>/dev/null | wc -l)"
echo "Generated files: $(find /home/k2600x/dev/ai-service/frontend/src/generated -name "*.ts" 2>/dev/null | wc -l)"
echo "TypeScript errors: $(cd /home/k2600x/dev/ai-service/frontend && npm run typecheck 2>&1 | grep error | wc -l)"
'
```

## Emergency Rollback

If something goes wrong:

```bash
cd /home/k2600x/dev/ai-service/frontend

# Restore from git
git checkout HEAD -- src/
git checkout HEAD -- ../openapi/

# Reinstall axios if needed
npm install axios@^1.10.0

# Clean generated files
rm -rf src/generated/
```

## Success Criteria

The migration is complete when:
- ✅ 0 axios imports in frontend
- ✅ 0 manual hooks in src/hooks/
- ✅ All components using generated hooks
- ✅ 0 TypeScript errors
- ✅ All tests passing
- ✅ Production build successful
- ✅ Application fully functional

## Orchestration using /orchestrate command

For a fully automated approach, you can also use:

```bash
/orchestrate --goal "Complete OpenAPI specifications and implement openapi-react-query-codegen by: 1) Analyzing all backend routes and documenting CRUD operations, 2) Completing all OpenAPI specs with POST/PUT/DELETE operations, 3) Generating React Query hooks for all endpoints, 4) Migrating all components from manual to generated hooks, 5) Removing axios completely from frontend" --context @/home/k2600x/dev/ai-service/frontend/docs/OPENAPI_ORCHESTRATION_PLAN.md --parallel 10
```

Or use the new architect-led orchestration:

```bash
/architect-orchestrate --goal "Complete migration from manual API hooks to fully generated OpenAPI React Query hooks" --context @/home/k2600x/dev/ai-service/frontend/docs/ARCHITECTURAL_RECOMMENDATION_OPENAPI_RQ.md --validation strict
```

## Notes

1. **Parallel Execution**: Most phases can run in parallel. Use multiple terminal windows or tmux/screen.
2. **Dependencies**: Phase 3 depends on Phase 2. Phase 4-6 can run after Phase 3.
3. **Validation**: Always validate after each phase before proceeding.
4. **Rollback**: Keep git commits at each phase for easy rollback.
5. **Monitoring**: Use the monitoring script to track real-time progress.

## Estimated Timeline

With proper parallel execution:
- Phase 1: 30 minutes (5 agents in parallel)
- Phase 2: 45 minutes (4 agents in parallel)  
- Phase 3: 20 minutes (sequential)
- Phase 4: 60 minutes (10 agents in parallel)
- Phase 5: 15 minutes (single agent)
- Phase 6: 30 minutes (4 agents in parallel)

**Total: ~3.5 hours with maximum parallelization**

Without parallelization, this would take 12+ hours.