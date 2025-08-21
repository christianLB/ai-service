# Production Deployment CLI Command

## 🚀 NEW: AI CLI Production Deployment Command

A comprehensive production deployment command has been added to the AI CLI that automates the entire deployment process from PRODUCTION_DEPLOYMENT.md.

## Installation

The command is already available in the AI CLI at `/home/k2600x/dev/ai-service/ai-cli.js`

## Usage

### Interactive Mode (Recommended)

```bash
./ai-cli.js prod deploy
```

This will:

1. Check for .env.production (offer to create from .env.local if missing)
2. Ask you to choose between Docker or Manual deployment
3. Guide you through the entire deployment process

### Docker Deployment

```bash
./ai-cli.js prod deploy docker
```

Automatically:

- Builds all applications
- Creates docker-compose.production.yml if needed
- Runs database migrations
- Starts all services in Docker containers
- Creates admin user
- Performs health checks

### Manual Deployment

```bash
./ai-cli.js prod deploy manual
```

Provides:

- Build commands for all services
- Database migration management
- Step-by-step manual deployment instructions
- Service start commands with proper environment variables
- Health check verification

## Features

### ✅ Comprehensive Deployment Steps

1. **Environment Check**
   - Verifies .env.production exists
   - Lists required environment variables
   - Offers to create from .env.local

2. **Application Building**
   - Main application (TypeScript compilation)
   - Auth microservice
   - Financial microservice
   - Frontend (Vite build)

3. **Database Management**
   - Checks migration status
   - Prompts to deploy pending migrations
   - Uses Prisma for safe schema updates

4. **Service Deployment**
   - Docker mode: Creates and starts containers
   - Manual mode: Provides exact commands to run

5. **Admin User Creation**
   - Optionally creates admin@ai-service.local
   - Sets default password (admin123)
   - Prompts to change after first login

6. **Health Verification**
   - Checks all service endpoints
   - Reports health status
   - Confirms deployment success

## Example Output

```
╔════════════════════════════════════════════════╗
║       🚀 PRODUCTION DEPLOYMENT WIZARD          ║
╚════════════════════════════════════════════════╝

📋 Checking prerequisites...
✅ .env.production found

🔧 Deployment type: DOCKER

📦 Step 1: Building applications...
   Building main application...
   Building auth service...
   Building financial service...
   Building frontend...
✅ Build complete

🗄️ Step 2: Database migrations...
   Checking migration status...
   ✅ Database is up to date

🐳 Step 3: Docker deployment...
   Starting Docker containers...
✅ Docker deployment complete

👤 Step 4: Admin user setup...
✅ Admin user created
   Email: admin@ai-service.local
   Password: admin123
   ⚠️  Please change the password after first login!

🏥 Step 5: Health checks...
   ✅ Auth: HEALTHY
   ✅ Financial: HEALTHY
   ✅ Monolith: HEALTHY

╔════════════════════════════════════════════════╗
║        🎉 DEPLOYMENT COMPLETE!                 ║
╠════════════════════════════════════════════════╣
║ Services Running:                              ║
║   • Auth Service:     http://localhost:3004   ║
║   • Financial Service: http://localhost:3002  ║
║   • Monolith API:     http://localhost:3001   ║
║   • Frontend:         http://localhost:3000   ║
║                                                ║
║ Next Steps:                                    ║
║   1. Configure nginx for production domain    ║
║   2. Set up SSL certificates                  ║
║   3. Configure firewall rules                 ║
║   4. Set up monitoring and backups            ║
╚════════════════════════════════════════════════╝
```

## Related Commands

After deployment, use these commands to manage production:

```bash
# Check production status
./ai-cli.js prod status

# View health report
./ai-cli.js prod health

# View logs
./ai-cli.js prod logs
./ai-cli.js prod logs auth-service

# Create backup
./ai-cli.js prod backup

# Manage admin users
./ai-cli.js prod admin create
./ai-cli.js prod admin list

# Check migrations
./ai-cli.js prod migrate status
./ai-cli.js prod migrate deploy
```

## Docker Compose Production File

The command automatically creates `docker-compose.production.yml` with:

- PostgreSQL 15 with persistent volume
- Redis with password authentication
- Auth Service (port 3004)
- Financial Service (port 3002)
- Monolith API (port 3001)
- Frontend (port 80)
- Proper service dependencies
- Restart policies
- Environment variable injection

## Security Considerations

The deployment command enforces:

- Strong JWT_SECRET requirement (32+ chars)
- Database password configuration
- Redis password protection
- HTTPS recommendations
- Firewall configuration reminders
- Admin password change prompt

## Troubleshooting

If deployment fails:

1. Check prerequisites:

   ```bash
   ls -la .env.production
   docker --version
   node --version
   ```

2. Verify database:

   ```bash
   ./ai-cli.js db status
   ```

3. Check service logs:

   ```bash
   ./ai-cli.js prod logs
   ```

4. Test health endpoints:
   ```bash
   curl http://localhost:3004/health
   curl http://localhost:3002/health
   curl http://localhost:3001/health
   ```

## Benefits

- **One Command**: Complete deployment with a single command
- **Interactive**: Guides through choices when needed
- **Safe**: Prompts before destructive operations
- **Complete**: Handles everything from build to health checks
- **Flexible**: Supports both Docker and manual deployment
- **Documented**: Clear output and instructions at each step
- **Reusable**: Can be run multiple times safely

## Testing

The deployment command has been tested with:

- Fresh installations
- Existing deployments
- Missing prerequisites
- Database migrations
- Health check verification

To test without actually deploying:

```bash
./test-deploy.sh  # Dry run test script
```

## Summary

The `ai prod deploy` command replaces multiple manual steps with an automated, guided deployment process that ensures:

- All services are properly built
- Database is migrated
- Services are started in correct order
- Health is verified
- Admin access is configured

This makes production deployment as simple as:

```bash
./ai-cli.js prod deploy
```
