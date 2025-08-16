# CI/CD Workflows Documentation

## Overview

The AI Service project uses GitHub Actions for continuous integration and deployment. The CI/CD pipeline ensures code quality, security, and reliable deployments across multiple environments.

## Workflow Files

### 1. Complete CI Pipeline (`ci-complete.yml`)

**Purpose**: Comprehensive CI pipeline for all pull requests and pushes.

**Triggers**:

- Pull requests to `main`, `develop`, `feat/**`
- Pushes to `main`, `develop`, `feat/architectural-leveling-epic`
- Manual dispatch with optional test skip

**Jobs**:

1. **Setup** 🔧
   - Configures pnpm cache
   - Installs dependencies
   - Defines service matrix for parallel jobs

2. **Contract Validation** 📜
   - Validates OpenAPI specifications
   - Generates TypeScript contracts
   - Checks for contract drift

3. **Parallel Quality Checks**:
   - **Lint** 🎨: ESLint for all 7 services
   - **TypeCheck** 📘: TypeScript validation
   - **Build** 🏗️: Builds all services and packages

4. **Tests** 🧪
   - Unit and integration tests
   - PostgreSQL and Redis services
   - Coverage reporting

5. **Docker Build** 🐳
   - Builds images for all microservices
   - Uses buildx for caching

6. **Frontend** 🎨
   - Separate frontend build and test
   - TypeScript and lint checks

7. **Quality Gate** ✅
   - Final validation
   - Critical vs non-critical job distinction
   - Summary generation

**Quality Gates**:

- Critical failures (contracts, build, tests, docker) = pipeline failure
- Non-critical failures (lint, typecheck) = warnings only

### 2. Legacy CI Pipeline (`ci.yml`)

**Purpose**: Existing CI pipeline with comprehensive testing.

**Features**:

- Contract drift detection
- Cross-workspace type checking
- Smoke tests with Docker Compose
- E2E tests with real services

### 3. Deployment Pipeline (`deploy.yml`)

**Purpose**: Production deployment via Docker registry.

**Process**:

1. Pre-deployment validation
2. Build and push to GitHub Container Registry
3. Watchtower auto-deployment
4. Health checks
5. GitHub release creation

### 4. Contract Validation (`contracts.yml`)

**Purpose**: Ensures OpenAPI specifications stay in sync.

**Features**:

- Automatic generation on main branch
- Drift detection in PRs
- Swagger UI deployment

## Environment Configuration

### Required Secrets

**GitHub Actions**:

```yaml
GITHUB_TOKEN         # Automatic, for packages
DOCKER_REGISTRY_TOKEN # For external registry
PRODUCTION_HOST      # Production server
PRODUCTION_USER      # SSH user
PRODUCTION_SSH_KEY   # SSH private key
NAS_HOST            # NAS server
NAS_USER            # SSH user
NAS_SSH_KEY         # SSH private key
SLACK_WEBHOOK       # Notifications
```

### Environment Variables

All services use comprehensive environment validation via `@ai/config`:

```bash
# Core
NODE_ENV=production
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://...
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Redis
REDIS_URL=redis://redis:6379

# Services (for gateway)
FINANCIAL_SVC_URL=http://financial-svc:3001
TRADING_SVC_URL=http://trading-svc:3002
COMM_SVC_URL=http://comm-svc:3003
AI_CORE_URL=http://ai-core:3004
```

## Docker Compose Parity

### Service Architecture

All environments use the same 7-service architecture:

```yaml
Layer 1: Infrastructure
  - postgres (PostgreSQL 16)
  - redis (Redis 7)

Layer 2: Core Services (DB-dependent)
  - financial-svc (port 3001)
  - trading-svc (port 3002)

Layer 3: Independent Services (Redis-only)
  - ai-core (port 3004)
  - comm-svc (port 3003)

Layer 4: Gateway & Workers
  - api-gateway (port 3000/3005)
  - worker-financial (port 3101)
  - worker-trading (port 3102)

Layer 5: Frontend
  - frontend (port 3030/8080)
```

### Health Check Strategy

All services implement three health endpoints:

1. **`/health/live`** - Basic liveness
2. **`/health/ready`** - Dependency checks
3. **`/metrics`** - Prometheus metrics

Docker Compose uses `condition: service_healthy` for proper startup ordering.

## Local CI Commands

Run CI checks locally using Make commands:

```bash
# Validate CI configuration
make ci-validate

# Run all CI checks locally
make ci-local

# Contract generation and validation
make ci-contracts

# Quality checks (lint, typecheck)
make ci-quality

# Run tests in CI mode
make ci-test

# Build all services
make ci-build-all

# Build Docker images
make ci-docker-build

# Show CI status
make ci-status
```

## Deployment Process

### Production Deployment

1. **Automatic** (on push to main):

   ```bash
   git push origin main
   # Triggers deploy.yml workflow
   # Builds and pushes to GHCR
   # Watchtower auto-deploys
   ```

2. **Manual** (via GitHub Actions):
   - Go to Actions tab
   - Select "Deploy to Production"
   - Click "Run workflow"
   - Optional: Check "Skip tests" for emergency

### NAS Deployment

Uses the same process but with `docker-compose.nas.yml` configuration.

## Monitoring & Rollback

### Health Monitoring

```bash
# Check service health
curl https://ai-service.anaxi.net/health/ready

# View metrics
curl https://ai-service.anaxi.net/metrics

# Check specific service
curl https://ai-service.anaxi.net/api/financial/health
```

### Rollback Process

1. **Automatic** (on deployment failure):
   - Health checks fail
   - Previous compose file restored
   - Services restarted

2. **Manual**:

   ```bash
   # SSH to server
   ssh production-server

   # Find backup
   ls -t docker-compose.yml.backup-*

   # Restore
   cp docker-compose.yml.backup-[timestamp] docker-compose.yml
   docker compose down
   docker compose up -d
   ```

## Best Practices

### 1. Branch Protection

Configure branch protection for `main`:

- Require PR reviews
- Require status checks (CI)
- Require branches to be up to date
- Include administrators

### 2. Commit Conventions

Use conventional commits:

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
test: Add tests
refactor: Refactor code
ci: Update CI/CD
```

### 3. Testing Strategy

- **Unit Tests**: Fast, isolated tests
- **Integration Tests**: Service interaction
- **E2E Tests**: Full user workflows
- **Smoke Tests**: Basic health checks

### 4. Security

- Run security audits in CI
- Use Dependabot for updates
- Rotate secrets regularly
- Never commit secrets

## Troubleshooting

### Common Issues

1. **Contract Drift**:

   ```bash
   npm run contracts:generate
   git add packages/contracts/src/generated
   git commit -m "fix: Update generated contracts"
   ```

2. **TypeScript Errors**:

   ```bash
   npm run typecheck
   # Fix errors
   npm run build
   ```

3. **Docker Build Failures**:

   ```bash
   # Clear cache
   docker system prune -af
   # Rebuild
   make ci-docker-build
   ```

4. **Deployment Failures**:
   - Check logs: `docker compose logs`
   - Verify environment variables
   - Check service dependencies
   - Review health checks

## Performance Optimization

### CI Pipeline

- **Parallel Jobs**: Services built in parallel
- **Caching**: pnpm store, Docker layers
- **Conditional Steps**: Skip unchanged services
- **Fast Fail**: Critical jobs fail fast

### Build Optimization

- **Multi-stage Dockerfiles**: Smaller images
- **Layer Caching**: Reuse unchanged layers
- **Dependency Pruning**: Production-only deps
- **Asset Optimization**: Minified frontend

## Future Improvements

### Planned Enhancements

1. **Blue-Green Deployment**: Zero-downtime deployments
2. **Canary Releases**: Gradual rollout
3. **Performance Testing**: Load testing in CI
4. **Security Scanning**: Container vulnerability scanning
5. **GitOps**: ArgoCD or Flux integration

### Monitoring Integration

- Prometheus metrics collection
- Grafana dashboards
- Alert manager integration
- Distributed tracing with OpenTelemetry

## References

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Conventional Commits](https://www.conventionalcommits.org/)
