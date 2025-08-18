# CI/CD Fix Implementation Plan

## 🚨 CRITICAL: Your CI is Completely Broken

**ALL workflows are failing**. Here's exactly what to fix and in what order.

---

## P0 - Fix RIGHT NOW (30 minutes total)

### 1. Fix E2E Workflow Cache Error (5 minutes)

**File**: `.github/workflows/e2e-tests.yml`
**Line**: 54

**Current (BROKEN)**:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: ${{ env.NODE_VERSION }}
    cache: 'pnpm' # FAILS - pnpm doesn't exist yet!

- name: Enable Corepack
  run: |
    corepack enable
    corepack prepare pnpm@10.12.1 --activate
```

**Fixed**:

```yaml
# MUST enable pnpm FIRST
- name: Enable Corepack
  run: |
    corepack enable
    corepack prepare pnpm@10.12.1 --activate

# THEN setup Node with cache
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: ${{ env.NODE_VERSION }}
    cache: 'pnpm' # Now this works!
```

### 2. Remove package-lock.json (5 minutes)

**THE BIGGEST PROBLEM**: You have BOTH package managers!

```bash
# Check what you have
ls -la | grep -E "package-lock|pnpm-lock"

# You'll see both - THIS IS BAD:
# package-lock.json (npm)
# pnpm-lock.yaml (pnpm)

# FIX IT:
rm package-lock.json
echo "package-lock.json" >> .gitignore
git add -A
git commit -m "fix: Remove package-lock.json - use pnpm exclusively"
```

### 3. Fix ALL Workflow Corepack Order (20 minutes)

**Every workflow needs this pattern**:

```yaml
steps:
  - uses: actions/checkout@v4

  # 1. ALWAYS enable pnpm FIRST
  - name: Enable Corepack
    run: |
      corepack enable
      corepack prepare pnpm@10.12.1 --activate

  # 2. THEN setup Node (with or without cache)
  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      node-version: '20'
      cache: 'pnpm' # Optional but recommended

  # 3. Now you can use pnpm
  - name: Install dependencies
    run: pnpm install --frozen-lockfile
```

**Files to fix**:

- ✅ `.github/workflows/ci.yml` - Already correct!
- ❌ `.github/workflows/e2e-tests.yml` - Line 54-59 wrong order
- ✅ `.github/workflows/ci-complete.yml` - Correct order
- ✅ `.github/workflows/ci-build.yml` - Correct order

---

## P1 - Fix TODAY (2 hours)

### 1. Fix Docker Compose Paths

**Problem**: `ci-build.yml` uses wrong paths

**Line 111-114** currently:

```yaml
- name: Start stack (dev compose)
  working-directory: infra/compose
  run: |
    docker compose -f docker-compose.dev.yml up -d --build
```

**Should be** (if file exists at that path):

```yaml
- name: Start stack (dev compose)
  run: |
    docker compose -f infra/compose/docker-compose.dev.yml up -d --build
```

**OR** (if using root compose):

```yaml
- name: Start stack
  run: |
    docker compose up -d --build
```

### 2. Remove ALL `|| true` Suppressions

**These hide real failures**:

Search for: `|| true`
Found in:

- `ci-complete.yml` lines 154, 201, 246-249, 404, 409
- `ci-build.yml` line 101

**Replace**:

```yaml
# BAD - hides failures
pnpm run typecheck || true

# GOOD - fails properly
pnpm run typecheck
```

### 3. Fix Contract Generation

**Current issue**: Contracts might not exist

Add safety check:

```yaml
- name: Generate contracts safely
  run: |
    # Check if generation script exists
    if [ -f "scripts/generate-contracts.ts" ]; then
      npx tsx scripts/generate-contracts.ts
    elif [ -f "packages/contracts/src/generate.ts" ]; then
      npx tsx packages/contracts/src/generate.ts
    else
      echo "⚠️ No contract generation script found"
      mkdir -p packages/contracts/src/generated
      echo "export {}" > packages/contracts/src/generated/index.ts
    fi
```

---

## P2 - This Week (4 hours)

### 1. Consolidate Workflows

**Current mess**:

- 4 different CI workflows
- 2000+ lines of YAML
- Massive duplication

**Target structure**:

```
.github/
└── workflows/
    ├── ci.yml              # Main workflow (calls reusables)
    ├── _setup.yml          # Reusable: pnpm + node setup
    ├── _build.yml          # Reusable: build logic
    ├── _test.yml           # Reusable: test logic
    └── deploy.yml          # Deployment workflow
```

**Reusable workflow example** (`_setup.yml`):

```yaml
name: Setup Environment

on:
  workflow_call:
    outputs:
      pnpm-store:
        description: 'pnpm store path'
        value: ${{ jobs.setup.outputs.pnpm-store }}

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      pnpm-store: ${{ steps.pnpm-cache.outputs.store-path }}
    steps:
      - uses: actions/checkout@v4
      - name: Enable Corepack
        run: |
          corepack enable
          corepack prepare pnpm@10.12.1 --activate
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Get pnpm store
        id: pnpm-cache
        run: echo "store-path=$(pnpm store path)" >> $GITHUB_OUTPUT
```

### 2. Fix Monorepo Build Order

**Current**: Random build order
**Needed**: Dependency-aware builds

```yaml
jobs:
  # 1. Build shared packages first
  build-packages:
    strategy:
      matrix:
        package: [config, contracts, http-utils, observability]
    steps:
      - run: pnpm --filter @ai/${{ matrix.package }} build

  # 2. Then build services
  build-services:
    needs: build-packages
    strategy:
      matrix:
        service: [api-gateway, financial-svc, trading-svc]
    steps:
      - run: pnpm --filter ${{ matrix.service }} build
```

---

## Quick Validation Commands

After each fix, validate:

```bash
# 1. Check package manager
which pnpm
pnpm --version
ls -la | grep -E "lock"  # Should ONLY show pnpm-lock.yaml

# 2. Test builds locally
pnpm install
pnpm run build

# 3. Test specific workflow locally (requires act)
act -W .github/workflows/e2e-tests.yml

# 4. Check TypeScript
pnpm run typecheck  # Should have 0 errors

# 5. Validate docker compose
docker compose -f infra/compose/docker-compose.dev.yml config
```

---

## The Hard Truth

Your CI has been broken for a while because:

1. **Package manager confusion** - Using both npm and pnpm
2. **Copy-paste workflow creation** - No one understood the full picture
3. **Error suppression** - `|| true` everywhere hiding failures
4. **No ownership** - No one maintaining CI health

**To prevent this**:

1. Assign a CI/CD owner
2. Never suppress errors
3. Pick ONE package manager
4. Document everything
5. Test workflows locally before pushing

---

## Success Checklist

### Today (P0 + P1)

- [ ] E2E workflow pnpm cache fixed
- [ ] package-lock.json deleted
- [ ] All workflows use correct corepack order
- [ ] Docker compose paths corrected
- [ ] All `|| true` removed
- [ ] Workflows actually pass

### This Week (P2)

- [ ] Workflows consolidated
- [ ] Reusable workflows created
- [ ] Build order fixed
- [ ] Documentation updated
- [ ] CI time < 10 minutes

### Next Sprint

- [ ] Monitoring added
- [ ] Caching optimized
- [ ] Tests parallelized
- [ ] Cost tracking enabled

---

## Emergency Contacts

If you get stuck:

1. **Quick fix**: Revert to last known good workflow
2. **Nuclear option**: Disable all checks temporarily (NOT RECOMMENDED)
3. **Best practice**: Fix incrementally, test each change

Remember: **A broken CI is a broken product**. Fix it now, not later.

---

_Priority: CRITICAL_
_Time to fix: 2-3 hours for P0+P1_
_Impact if not fixed: No deployments possible_
