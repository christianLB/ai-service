# F6: CI Pipeline + Environment Parity

## Overview
This document describes the environment parity requirements and implementation for F6 of the architectural leveling epic.

## Environments
We maintain **TWO** environments only:
1. **Development** (`infra/compose/docker-compose.dev.yml`)
2. **Production/NAS** (`docker-compose.nas.yml`)

## CI Pipeline Components ✅

The CI pipeline includes all required components:

1. **Lint** - ESLint checks for backend and frontend
2. **Typecheck** - TypeScript compilation checks across workspace
3. **Tests** - Unit and integration tests with proper database setup
4. **Contracts Generation** - OpenAPI contracts are generated
5. **Contract Drift Detection** - Fails CI if contracts have drifted
6. **Build** - Full build validation across all packages and apps

### Contract Drift Detection
The CI workflow includes a dedicated `contracts-check` job that:
- Generates contracts fresh (`pnpm contracts:generate`)
- Builds the contracts (`pnpm contracts:build`)
- Checks for drift (`pnpm contracts:check`)
- **Fails the CI** if any drift is detected
- Provides clear instructions for developers to fix locally

## Service Parity

All services exist in both environments with aligned configurations:

### Core Services
- ✅ postgres (database)
- ✅ redis (cache & queues)
- ✅ financial-svc
- ✅ trading-svc
- ✅ ai-core
- ✅ comm-svc
- ✅ api-gateway
- ✅ worker-financial
- ✅ worker-trading
- ✅ bull-board (queue monitoring)
- ✅ frontend

### Healthcheck Alignment
All services use consistent healthcheck configurations:
- **Test Method**: Node.js fetch-based health checks
- **Interval**: 30s (production), 5s (development)
- **Timeout**: 10s (production), 5s (development)
- **Retries**: 5 attempts
- **Start Period**: Service-specific based on initialization time

### Key Differences (By Design)

| Aspect | Development | Production |
|--------|------------|------------|
| Build | Local Dockerfile builds | Pre-built images from GHCR |
| Resources | No limits | Memory limits enforced |
| Volumes | Development paths | Production data persistence |
| Healthcheck Frequency | Fast (5s) | Conservative (30s) |
| Logging | Debug level | Info level |
| Secrets | Local .env | Production secrets |

## Validation

Run the validation script to verify F6 completion:

```bash
./scripts/validate-f6.sh
```

This script checks:
1. CI workflow has all required steps
2. Contract drift detection is configured
3. Services match between environments
4. Healthchecks are properly configured
5. No duplicate compose files exist

## Migration Path

To migrate to the aligned configuration:

1. **Backup existing NAS configuration**
   ```bash
   cp docker-compose.nas.yml docker-compose.nas.backup.yml
   ```

2. **Apply the aligned configuration**
   ```bash
   cp docker-compose.nas-aligned.yml docker-compose.nas.yml
   ```

3. **Build bull-board image for production**
   ```bash
   docker build -t ghcr.io/christianlb/ai-service-bull-board:latest -f apps/bull-board/Dockerfile .
   docker push ghcr.io/christianlb/ai-service-bull-board:latest
   ```

4. **Deploy to NAS**
   ```bash
   docker-compose -f docker-compose.nas.yml up -d
   ```

## Maintenance

- Keep both compose files in sync when adding/removing services
- Always update healthcheck configurations consistently
- Ensure CI pipeline tests match production behavior
- Document any intentional differences between environments
