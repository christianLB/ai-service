# Docker Compose Cleanup Summary

## Changes Made (2025-07-10)

### 1. **Cleaned Docker Compose Files**
- Deleted 4 redundant files:
  - `docker-compose.yml` (old monolithic version)
  - `docker-compose.override.yml`
  - `docker-compose.production_old.yml`
  - `docker-compose.v2.test.yml`

- Kept only 2 files:
  - `docker-compose.production.yml` - For production deployment
  - `docker-compose.dev.yml` - For local development

### 2. **Updated docker-compose.production.yml**
- Added Redis service with proper memory limits and health checks
- Updated container names to be consistent (ai-postgres, ai-redis)
- Added environment variable volume mount: `/config/.env.production:/app/.env:ro`
- Redis environment variables added to API service
- Watchtower already configured for automatic updates

### 3. **Updated docker-compose.dev.yml**
- Added Redis service for development
- Added `.env.local` volume mount for local environment variables
- Added health checks for all services
- Updated container names for consistency

### 4. **Environment Variables Structure**
- Production: `.env.production` copied to `config/.env.production`
- Development: `.env.local` mounted directly
- Both files mounted as `/app/.env` in their respective containers

### 5. **Updated Deployment Scripts**
- Modified `Makefile.production`:
  - Added `.env.production` copy to config directory
  - Added `--force-recreate` flag to docker-compose up
  - New command: `prod-force-recreate` for forcing container recreation
- Updated main `Makefile`:
  - Added `deploy-force` command for forced deployment

## Final Structure

```
/ai-service
├── docker-compose.production.yml  # Production with all services
├── docker-compose.dev.yml         # Development with hot reload
├── .env.production               # Production environment variables
├── .env.local                    # Development environment variables
└── config/
    └── .env.production          # Copy for production container mount
```

## Services in Each Environment

### Production (`docker-compose.production.yml`):
- `ai-service-api` - Backend API (port 3000 internal, 3001 external)
- `ai-service-frontend` - Frontend (port 3003 for reverse proxy)
- `ai-postgres` - PostgreSQL database
- `ai-redis` - Redis cache
- `ai-service-watchtower` - Automatic updates

### Development (`docker-compose.dev.yml`):
- `ai-service-api-dev` - Backend API with hot reload
- `ai-service-frontend-dev` - Frontend
- `ai-service-postgres` - PostgreSQL database
- `ai-service-redis` - Redis cache

## Deployment Commands

```bash
# Standard deployment with config update
make deploy

# Force recreation of all containers
make deploy-force

# Update only configuration files
make -f Makefile.production prod-update-config

# Force pull and recreate containers
make -f Makefile.production prod-force-recreate
```

## CI/CD Integration

The GitHub Actions workflow (`deploy-v2.yml`) is already configured to:
1. Build separate Docker images for API and frontend
2. Push to GitHub Container Registry
3. Watchtower automatically pulls and deploys within 5 minutes

## Notes

- Frontend runs on port 3003 externally (for reverse proxy)
- All persistent data uses Docker volumes
- Redis included with proper authentication
- Environment variables properly isolated between environments