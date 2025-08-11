# Immediate Action Plan: Contract-First Migration
*Created: 2025-08-09*

## 🚨 STOP: Critical Issues to Fix First

### 1. TypeScript Build is BROKEN (2-4 hours)
**The application cannot be deployed until these are fixed.**

#### Trading Service Errors (30+ errors)
```bash
# Add missing fields to Prisma schema
# File: prisma/schema.prisma

model Trade {
  pnl         Decimal?  # ADD THIS LINE
  # ... other fields
}

model Position {
  unrealizedPnl  Decimal  @default(0)  # ADD THIS LINE
  realizedPnl    Decimal  @default(0)  # ADD THIS LINE
  # ... other fields
}
```

#### Fix Import Errors
```bash
# Run this to fix all trading service imports
find src/services/trading -name "*.ts" -exec sed -i \
  's/import.*types\/trading/import { Trade, Position } from "@prisma\/client"/g' {} \;
```

#### Contract Package Fix
```typescript
// packages/contracts/src/index.ts
export const apiContract = c.router({
  financial: financialContract,
  dashboard: dashboardContract,
});
```

### 2. Choose ONE Entry Point (30 minutes)
**Delete the confusion - pick one and stick with it**

```bash
# Keep only index.contract-first.ts
mv src/index.contract-first.ts src/index.ts
rm src/index.stable.ts
rm src/index.old.ts  # if exists

# Update package.json
"scripts": {
  "dev": "ts-node-dev --respawn src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js"
}
```

### 3. Dashboard Endpoints MISSING (1-2 days)
**Frontend is actively calling these - they return 404!**

Missing endpoints that frontend needs NOW:
- `/api/dashboard/revenue-trend`
- `/api/dashboard/expense-breakdown`
- `/api/dashboard/cash-flow`
- `/api/dashboard/client-metrics`
- `/api/dashboard/recent-transactions`
- `/api/dashboard/pending-invoices`
- `/api/dashboard/overdue-invoices`
- `/api/dashboard/system-status`
- `/api/dashboard/api-health`

## ✅ Step-by-Step Fix Process

### Day 1: Make it Build (Morning)
```bash
# 1. Backup database
make db-backup

# 2. Fix Prisma schema (add missing fields)
vim prisma/schema.prisma  # Add pnl, unrealizedPnl, realizedPnl

# 3. Create and run migration
make db-migrate-create NAME=fix_trading_schema
make db-migrate

# 4. Fix TypeScript imports
find src/services/trading -name "*.ts" -exec sed -i \
  's/import.*types\/trading/import { Trade, Position } from "@prisma\/client"/g' {} \;

# 5. Verify build works
npm run typecheck  # Should be 0 errors
npm run build      # Should succeed
```

### Day 1: Clean Architecture (Afternoon)
```bash
# 1. Consolidate entry points
mv src/index.contract-first.ts src/index.ts
rm src/index.stable.ts

# 2. Update package.json scripts
npm run dev  # Should start with contract-first

# 3. Test frontend still works
cd frontend
npm run dev  # Check dashboard loads
```

### Day 2: Dashboard Migration (Critical)
```typescript
// src/routes/dashboard-contract.ts
import { OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';

const dashboardRoutes = new OpenAPIHono();

// Add all 9 missing endpoints
// Copy logic from existing dashboard.service.ts
```

### Day 3: Testing & Validation
```bash
# 1. Test all endpoints
npm run test:e2e

# 2. Verify frontend works
cd frontend && npm run dev
# Navigate through all pages

# 3. Performance check
npm run test:performance

# 4. Security scan
npm audit
```

## 📋 Checklist for Production Ready

### Must Have (P0)
- [ ] TypeScript builds without errors
- [ ] All dashboard endpoints working
- [ ] Frontend can load financial data
- [ ] Database migrations applied
- [ ] Docker builds successfully

### Should Have (P1)
- [ ] Trading endpoints migrated
- [ ] GoCardless integration working
- [ ] Performance < 200ms
- [ ] Error handling improved

### Nice to Have (P2)
- [ ] Complete API documentation
- [ ] All tests passing
- [ ] Monitoring setup
- [ ] Deployment automation

## 🔥 Emergency Rollback Plan

If things go wrong:
```bash
# 1. Restore database
make db-restore

# 2. Revert to last working commit
git checkout HEAD~1

# 3. Use old entry point temporarily
npm run dev:stable

# 4. Notify team
echo "Rollback completed - investigating issues"
```

## 📞 Escalation Path

1. **Build Issues**: Check TypeScript errors, fix imports
2. **Runtime Errors**: Check logs, verify database schema
3. **Frontend Issues**: Check network tab, API responses
4. **Data Issues**: Verify migrations, check Prisma schema

## 🎯 Success Criteria

You know you're done when:
1. ✅ `npm run build` succeeds with 0 errors
2. ✅ Frontend dashboard shows financial data
3. ✅ All API endpoints return 200 (not 404)
4. ✅ Docker image builds and runs
5. ✅ Can create invoices and transactions

## ⏰ Timeline

- **Day 1**: Fix build, clean architecture (8 hours)
- **Day 2**: Migrate dashboard endpoints (8 hours)
- **Day 3**: Testing and validation (4 hours)
- **Day 4**: Deploy to staging (2 hours)
- **Day 5**: Monitor and fix issues (ongoing)

## 🚀 Next Steps After This

Once the immediate issues are fixed:
1. Complete financial endpoint migration
2. Fix trading module completely
3. Add comprehensive tests
4. Setup monitoring
5. Document everything

---

**Remember**: Don't try to fix everything at once. Focus on making it work, then make it better.