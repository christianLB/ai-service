# Production Deployment Guide - AI Service on Synology NAS

> Complete guide for deploying the AI Service application to a Synology NAS with Docker, automatic updates, and encrypted API key management.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Pre-Deployment Checklist](#pre-deployment-checklist)
5. [Deployment Phases](#deployment-phases)
6. [Post-Deployment](#post-deployment)
7. [Maintenance & Operations](#maintenance--operations)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)
10. [Security Considerations](#security-considerations)

## Overview

This guide provides step-by-step instructions for deploying the AI Service application to a Synology NAS. The deployment includes:

- **Full application stack**: API, Frontend, PostgreSQL, Redis, InfluxDB, Qdrant
- **Encrypted API key management**: All external service credentials stored encrypted in database
- **Automatic updates**: Watchtower monitors GitHub Container Registry for new releases
- **Production-ready configuration**: Health checks, monitoring, backups, and security

### Key Features

- **No API keys in environment files** - All sensitive credentials managed through the Integration Service
- **Automatic container updates** - Watchtower provides continuous deployment
- **Single port exposure** - Only port 3001 needed for both API and frontend
- **Encrypted storage** - All API keys and secrets encrypted in database
- **Prisma migrations** - Database schema managed through version-controlled migrations

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                   Synology NAS (192.168.1.11)           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Docker Network (ai-service-network)    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  ┌─────────────┐  ┌──────────────┐              │  │
│  │  │ PostgreSQL  │  │    Redis     │              │  │
│  │  │   (5432)    │  │   (6379)     │              │  │
│  │  └─────────────┘  └──────────────┘              │  │
│  │                                                   │  │
│  │  ┌─────────────┐  ┌──────────────┐              │  │
│  │  │  InfluxDB   │  │   Qdrant     │              │  │
│  │  │   (8086)    │  │  (6333/6334) │              │  │
│  │  └─────────────┘  └──────────────┘              │  │
│  │                                                   │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │         AI Service API + Frontend          │  │  │
│  │  │              (Port 3001)                   │  │  │
│  │  │  - Express API Server                      │  │  │
│  │  │  - React Frontend (served statically)      │  │  │
│  │  │  - Integration Service (encrypted keys)    │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │                                                   │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │            Watchtower (Optional)           │  │  │
│  │  │    Monitors GHCR for automatic updates     │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Storage Volumes:                                       │
│  - /volume1/docker/ai-service/postgres                 │
│  - /volume1/docker/ai-service/redis                    │
│  - /volume1/docker/ai-service/documents                │
│  - /volume1/docker/ai-service/logs                     │
│  - /volume1/docker/ai-service/config                   │
│  - /volume1/docker/ai-service/backups                  │
└─────────────────────────────────────────────────────────┘
```

### Container Registry

- **Registry**: GitHub Container Registry (ghcr.io)
- **Image**: `ghcr.io/christianlb/ai-service:latest`
- **Frontend**: Served by the API container (not separate)

## Prerequisites

### Local Development Environment

- Node.js 20+
- Docker and Docker Compose
- npm/pnpm
- Git
- SSH access to NAS

### Synology NAS Requirements

- DSM 7.0+
- Docker package installed
- SSH enabled
- Sufficient storage (minimum 10GB recommended)
- Network access from development machine

### Required Credentials

- **GitHub Personal Access Token** - For pushing/pulling from GHCR
- **NAS Admin Credentials** - SSH access with sudo privileges
- **API Keys** (to be configured post-deployment):
  - OpenAI API Key
  - Claude (Anthropic) API Key
  - GoCardless Access Token and Secret ID (optional)
  - Telegram Bot Token (optional)

## Pre-Deployment Checklist

### Code Readiness

- [ ] All code committed to git
- [ ] Build passes: `npm run build`
- [ ] TypeScript check passes: `npm run typecheck`
- [ ] Tests pass: `npm test`
- [ ] No uncommitted changes: `git status`

### Configuration Files

- [ ] `.env.production` created with minimal variables
- [ ] `docker-compose.production.yml` updated
- [ ] Database schema file exists: `scripts/complete-production-schema.sql`
- [ ] Nginx configuration ready (if needed)

### NAS Preparation

- [ ] SSH access verified: `ssh k2600x@192.168.1.11`
- [ ] Docker service running on NAS
- [ ] Sufficient disk space available
- [ ] Firewall configured for port 3001

## Deployment Phases

### Phase 1: Pre-Deployment Preparation (15 minutes)

#### 1.1 Verify Build System

```bash
# Ensure everything builds cleanly
npm run build
npm run typecheck

# Run tests
npm test

# Check for build warnings
npm run lint
```

#### 1.2 Create Production Environment File

Create `.env.production` with minimal required variables:

```bash
# Essential Environment Variables Only
NODE_ENV=production
PORT=3001

# Database Configuration
POSTGRES_HOST=ai-postgres
POSTGRES_PORT=5432
POSTGRES_DB=ai_service
POSTGRES_USER=ai_user
POSTGRES_PASSWORD=aiservice2024
DATABASE_URL=postgresql://ai_user:aiservice2024@ai-postgres:5432/ai_service

# Redis Configuration
REDIS_HOST=ai-redis
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password_here

# Security Keys
JWT_SECRET=your_minimum_32_character_secure_secret_here
INTEGRATION_CONFIG_KEY=your_32_character_encryption_key_here

# Note: All API keys (OpenAI, Claude, GoCardless, etc.)
# will be configured through the web interface after deployment
```

#### 1.3 Backup Current State

```bash
# Backup local database
make db-backup

# Commit all changes
git add .
git commit -m "Production deployment ready"
git push origin main
```

### Phase 2: NAS Infrastructure Setup (20 minutes)

#### 2.1 Connect to NAS and Create Directory Structure

```bash
# SSH into NAS
ssh k2600x@192.168.1.11

# Create required directories
sudo mkdir -p /volume1/docker/ai-service/{postgres,redis,influxdb,qdrant}
sudo mkdir -p /volume1/docker/ai-service/{documents,logs,config,backups}
sudo mkdir -p /volume1/docker/ai-service/config/watchtower

# Set proper permissions
sudo chown -R k2600x:users /volume1/docker/ai-service
chmod -R 755 /volume1/docker/ai-service
```

#### 2.2 Copy Configuration Files to NAS

From your local development machine:

```bash
# Copy environment file
scp .env.production k2600x@192.168.1.11:/volume1/docker/ai-service/

# Copy Docker Compose file
scp docker-compose.production.yml k2600x@192.168.1.11:/volume1/docker/ai-service/

# Copy database schema
scp scripts/complete-production-schema.sql k2600x@192.168.1.11:/volume1/docker/ai-service/config/

# Copy nginx configs if needed
scp -r nginx/*.conf k2600x@192.168.1.11:/volume1/docker/ai-service/nginx/
```

### Phase 3: Docker Image Build and Registry (25 minutes)

#### 3.1 Build Production Images Locally

```bash
# Build the API image with production optimizations
docker build -f Dockerfile.api \
  --build-arg VERSION=$(git describe --tags --always) \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg COMMIT=$(git rev-parse HEAD) \
  --build-arg COMMIT_SHORT=$(git rev-parse --short HEAD) \
  -t ghcr.io/christianlb/ai-service:latest \
  -t ghcr.io/christianlb/ai-service:$(git describe --tags --always) \
  .

# Build frontend if separate (usually included in API)
docker build -f Dockerfile.frontend \
  -t ghcr.io/christianlb/ai-service:frontend-latest \
  .
```

#### 3.2 Push to GitHub Container Registry

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u christianlb --password-stdin

# Push images
docker push ghcr.io/christianlb/ai-service:latest
docker push ghcr.io/christianlb/ai-service:$(git describe --tags --always)

# Push frontend if separate
docker push ghcr.io/christianlb/ai-service:frontend-latest
```

#### 3.3 Pull Images on NAS

```bash
# SSH to NAS
ssh k2600x@192.168.1.11

# Navigate to project directory
cd /volume1/docker/ai-service

# Login to registry
docker login ghcr.io -u christianlb

# Pull the latest image
docker pull ghcr.io/christianlb/ai-service:latest
```

### Phase 4: Database Setup (20 minutes)

#### 4.1 Start Database Services

```bash
# On NAS
cd /volume1/docker/ai-service

# Start only PostgreSQL and Redis first
docker-compose -f docker-compose.production.yml up -d postgres redis

# Wait for databases to initialize
sleep 30

# Verify they're running
docker ps | grep -E "ai-postgres|ai-redis"

# Check PostgreSQL logs
docker logs ai-postgres --tail 50

# Test PostgreSQL connection
docker exec ai-postgres pg_isready -U ai_user -d ai_service
```

#### 4.2 Apply Prisma Migrations

From your local development machine:

```bash
# Set production database URL
export DATABASE_URL="postgresql://ai_user:aiservice2024@192.168.1.11:5432/ai_service?schema=public"

# Deploy all migrations
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status

# Expected output: "Database schema is up to date!"
```

#### 4.3 Verify Database Schemas

```bash
# Check all required schemas exist
make prod-sql SQL="SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('public', 'financial', 'trading', 'tagging')"

# Verify tables were created
make prod-sql SQL="SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema IN ('public', 'financial', 'trading', 'tagging')"

# Check integration_configs table exists
make prod-sql SQL="SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'financial' AND table_name = 'integration_configs')"
```

### Phase 5: Application Deployment (15 minutes)

#### 5.1 Start Additional Services (Optional)

```bash
# On NAS - Start InfluxDB and Qdrant if needed for trading module
cd /volume1/docker/ai-service
docker-compose -f docker-compose.production.yml up -d influxdb qdrant

# Wait for services
sleep 20
```

#### 5.2 Start Main Application

```bash
# Start the AI Service API (includes frontend)
docker-compose -f docker-compose.production.yml up -d ai-service

# Monitor startup logs
docker logs -f ai-service --tail 100

# Look for: "Server running on port 3001"
```

#### 5.3 Create Admin User

From your local machine:

```bash
# Create default admin user
make prod-auth-create-admin

# This creates:
# Email: admin@ai-service.local
# Password: admin123

# Verify user was created
make prod-auth-list-users
```

#### 5.4 Initial Health Verification

```bash
# Check API health endpoint
curl http://192.168.1.11:3001/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":...,"version":"..."}

# Check API status
curl http://192.168.1.11:3001/status

# Check frontend loads
curl -I http://192.168.1.11:3001/
# Should return: HTTP/1.1 200 OK
```

### Phase 6: Integration Configuration (10 minutes)

#### 6.1 Access Web Interface

1. Open browser to: `http://192.168.1.11:3001`
2. Login with credentials:
   - Email: `admin@ai-service.local`
   - Password: `admin123`

#### 6.2 Configure API Keys via Web UI

1. Navigate to **Settings** → **Integrations**
2. Add each integration:

**OpenAI Configuration:**

- Integration Type: `openai`
- API Key: Your OpenAI API key
- Click "Save" (automatically encrypted)

**Claude Configuration:**

- Integration Type: `claude`
- API Key: Your Anthropic API key
- Click "Save"

**GoCardless Configuration (if needed):**

- Integration Type: `gocardless`
- Access Token: Your GoCardless token
- Secret ID: Your GoCardless secret
- Environment: `sandbox` or `live`
- Click "Save"

**Telegram Configuration (if needed):**

- Integration Type: `telegram`
- Bot Token: Your Telegram bot token
- Chat ID: Your Telegram chat ID
- Click "Save"

#### 6.3 Verify Integrations

```bash
# Get auth token
TOKEN=$(curl -s -X POST http://192.168.1.11:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ai-service.local","password":"admin123"}' \
  | jq -r '.token')

# Check integration status
curl http://192.168.1.11:3001/api/integrations/status \
  -H "Authorization: Bearer $TOKEN"
```

### Phase 7: Watchtower Setup for Auto-Updates (15 minutes)

#### 7.1 Understanding Watchtower

Watchtower is a container that automatically updates other Docker containers when new images are available. Benefits:

- **Continuous Deployment**: Automatically pulls and deploys new versions
- **Zero Downtime**: Performs rolling updates
- **Cleanup**: Removes old images to save space
- **Notifications**: Can send alerts when updates occur

#### 7.2 Create Watchtower Configuration

On the NAS:

```bash
# Create authentication config for GHCR
cat > /volume1/docker/ai-service/config/watchtower/config.json <<EOF
{
  "auths": {
    "ghcr.io": {
      "auth": "$(echo -n "christianlb:YOUR_GITHUB_TOKEN" | base64)",
      "email": "your-email@example.com"
    }
  }
}
EOF

# Secure the config file
chmod 600 /volume1/docker/ai-service/config/watchtower/config.json
```

#### 7.3 Deploy Watchtower Container

```bash
# Run Watchtower with proper configuration
docker run -d \
  --name ai-watchtower \
  --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /volume1/docker/ai-service/config/watchtower/config.json:/config.json:ro \
  -e WATCHTOWER_CLEANUP=true \
  -e WATCHTOWER_POLL_INTERVAL=3600 \
  -e WATCHTOWER_INCLUDE_STOPPED=false \
  -e WATCHTOWER_INCLUDE_RESTARTING=false \
  -e WATCHTOWER_SCOPE=ai-service \
  -e WATCHTOWER_DEBUG=false \
  -e WATCHTOWER_NOTIFICATIONS=shoutrrr \
  -e WATCHTOWER_NOTIFICATION_URL="telegram://YOUR_BOT_TOKEN@telegram?chats=YOUR_CHAT_ID" \
  containrrr/watchtower \
  --scope ai-service

# Verify Watchtower is running
docker logs ai-watchtower --tail 20

# Check Watchtower found the containers
docker logs ai-watchtower | grep "Scanned"
```

#### 7.4 Test Watchtower

```bash
# Force an immediate update check
docker exec ai-watchtower sh -c 'kill -USR1 1'

# Check logs for update activity
docker logs ai-watchtower --tail 50
```

### Phase 8: Post-Deployment Validation (15 minutes)

#### 8.1 Complete System Health Check

```bash
# Run comprehensive health check
make prod-health

# Check all running containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Expected containers:
# - ai-postgres (healthy)
# - ai-redis (healthy)
# - ai-service (healthy)
# - ai-watchtower (running)
# - ai-influxdb (optional, healthy)
# - ai-qdrant (optional, running)
```

#### 8.2 Functional Testing Checklist

- [ ] **Web Interface Access**
  - Browse to http://192.168.1.11:3001
  - Page loads without errors
  - Can see login screen

- [ ] **Authentication**
  - Login with admin@ai-service.local
  - Dashboard loads after login
  - JWT token properly set

- [ ] **Integration Configuration**
  - Navigate to Settings → Integrations
  - All configured integrations show as "Connected"
  - API keys shown as encrypted (●●●●●●)

- [ ] **Financial Module**
  - Navigate to Financial Dashboard
  - Metrics load properly
  - GoCardless connection works (if configured)

- [ ] **Trading Module** (if applicable)
  - Navigate to Trading section
  - Market data loads
  - Strategies visible

- [ ] **Document Upload**
  - Test file upload functionality
  - Verify files saved to /documents directory

#### 8.3 Performance Verification

```bash
# Check memory usage
docker stats --no-stream

# Check disk usage
df -h /volume1/docker/ai-service

# Check network connectivity
curl -w "\n\nTotal time: %{time_total}s\n" http://192.168.1.11:3001/health

# Database query performance
time make prod-sql SQL="SELECT COUNT(*) FROM financial.integration_configs"
```

## Post-Deployment

### Security Hardening

#### Change Default Passwords

```bash
# Change admin password via UI or API
curl -X POST http://192.168.1.11:3001/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "admin123",
    "newPassword": "your-secure-password-here"
  }'
```

#### Configure Firewall

On the NAS:

```bash
# Only allow necessary ports
# Internal: PostgreSQL (5432), Redis (6379) - blocked externally
# External: API/Frontend (3001)

# Using Synology firewall UI or iptables
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5432 -s 192.168.1.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 6379 -s 192.168.1.0/24 -j ACCEPT
```

### Backup Configuration

#### Automated Database Backups

```bash
# Add to crontab on NAS
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /volume1/docker/ai-service && \
  docker exec ai-postgres pg_dump -U ai_user ai_service | \
  gzip > backups/backup_$(date +\%Y\%m\%d_%H%M%S).sql.gz && \
  find backups -name "backup_*.sql.gz" -mtime +7 -delete
```

#### Manual Backup

```bash
# Create manual backup
make prod-backup

# List available backups
ls -la /volume1/docker/ai-service/backups/

# Backup docker volumes
docker run --rm \
  -v ai-service_postgres-data:/data \
  -v /volume1/docker/ai-service/backups:/backup \
  alpine tar czf /backup/postgres_volume_$(date +%Y%m%d).tar.gz -C /data .
```

### Monitoring Setup

#### Log Rotation

Create `/volume1/docker/ai-service/config/logrotate.conf`:

```
/volume1/docker/ai-service/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 0644 k2600x users
    postrotate
        docker exec ai-service kill -USR1 1
    endscript
}
```

Add to crontab:

```bash
0 0 * * * /usr/sbin/logrotate /volume1/docker/ai-service/config/logrotate.conf
```

#### Health Monitoring

Create a simple monitoring script:

```bash
#!/bin/bash
# /volume1/docker/ai-service/scripts/health-check.sh

API_URL="http://localhost:3001/health"
TELEGRAM_TOKEN="your-bot-token"
CHAT_ID="your-chat-id"

# Check health
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ $RESPONSE -ne 200 ]; then
    # Send alert
    MESSAGE="Alert: AI Service health check failed. HTTP Status: $RESPONSE"
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_TOKEN/sendMessage" \
      -d "chat_id=$CHAT_ID" \
      -d "text=$MESSAGE"

    # Try to restart
    docker restart ai-service
fi
```

Add to crontab for every 5 minutes:

```bash
*/5 * * * * /volume1/docker/ai-service/scripts/health-check.sh
```

## Maintenance & Operations

### Regular Maintenance Tasks

#### Daily Tasks

- Check application logs for errors
- Verify backup completed successfully
- Monitor disk space usage

#### Weekly Tasks

- Review container resource usage
- Check for security updates
- Test backup restoration process

#### Monthly Tasks

- Update dependencies if needed
- Review and rotate API keys
- Analyze performance metrics

### Common Operations

#### Viewing Logs

```bash
# Application logs
docker logs ai-service --tail 100 --follow

# Database logs
docker logs ai-postgres --tail 50

# Watchtower logs
docker logs ai-watchtower --tail 50

# Using Make commands
make prod-logs
```

#### Restarting Services

```bash
# Restart application only
docker restart ai-service

# Restart all services
docker-compose -f docker-compose.production.yml restart

# Stop and start cleanly
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

#### Database Operations

```bash
# Connect to database
docker exec -it ai-postgres psql -U ai_user -d ai_service

# Run SQL query
make prod-sql SQL="SELECT * FROM users LIMIT 10"

# Export data
docker exec ai-postgres pg_dump -U ai_user -t financial.clients ai_service > clients_export.sql
```

#### Updating the Application

With Watchtower running, updates are automatic. For manual updates:

```bash
# Pull latest image
docker pull ghcr.io/christianlb/ai-service:latest

# Recreate container with new image
docker-compose -f docker-compose.production.yml up -d --force-recreate ai-service
```

### Performance Tuning

#### PostgreSQL Optimization

Edit PostgreSQL configuration:

```sql
-- Connect to database
docker exec -it ai-postgres psql -U ai_user -d ai_service

-- Adjust settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '8MB';
ALTER SYSTEM SET random_page_cost = 1.1;

-- Reload configuration
SELECT pg_reload_conf();
```

#### Redis Optimization

```bash
# Connect to Redis
docker exec -it ai-redis redis-cli

# Set max memory
CONFIG SET maxmemory 512mb
CONFIG SET maxmemory-policy allkeys-lru

# Save configuration
CONFIG REWRITE
```

## Troubleshooting

### Common Issues and Solutions

#### Container Won't Start

```bash
# Check logs
docker logs ai-service --tail 100

# Common causes:
# - Port already in use
sudo lsof -i :3001

# - Database connection failed
docker exec ai-postgres pg_isready

# - Environment variables missing
docker exec ai-service env | grep -E "POSTGRES|REDIS|JWT"
```

#### Database Connection Issues

```bash
# Test connection from API container
docker exec ai-service pg_isready -h ai-postgres -U ai_user

# Check PostgreSQL is accepting connections
docker exec ai-postgres psql -U ai_user -d ai_service -c "SELECT 1"

# Verify network
docker network ls
docker network inspect ai-service-network
```

#### High Memory Usage

```bash
# Check memory usage
docker stats --no-stream

# Limit container memory
# Edit docker-compose.production.yml:
# services:
#   ai-service:
#     deploy:
#       resources:
#         limits:
#           memory: 1G

# Restart with new limits
docker-compose -f docker-compose.production.yml up -d
```

#### Disk Space Issues

```bash
# Check disk usage
df -h /volume1/docker

# Clean up old images
docker image prune -a -f

# Clean up old logs
find /volume1/docker/ai-service/logs -name "*.log" -mtime +30 -delete

# Remove old backups
find /volume1/docker/ai-service/backups -name "*.sql.gz" -mtime +30 -delete
```

#### API Not Responding

```bash
# Check if container is running
docker ps | grep ai-service

# Check port binding
netstat -tlnp | grep 3001

# Test from inside container
docker exec ai-service curl http://localhost:3001/health

# Check Node.js process
docker exec ai-service ps aux | grep node
```

### Debug Mode

Enable debug logging:

```bash
# Edit .env.production
LOG_LEVEL=debug
NODE_ENV=development

# Restart service
docker restart ai-service

# Watch debug logs
docker logs -f ai-service
```

## Rollback Procedures

### Automatic Rollback with Watchtower

If an update fails, Watchtower can rollback:

```bash
# Stop Watchtower first
docker stop ai-watchtower

# Rollback to previous version
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --run-once \
  --cleanup=false \
  --rollback ai-service

# Restart Watchtower
docker start ai-watchtower
```

### Manual Rollback

#### Step 1: Backup Current State

```bash
# Backup database
make prod-backup

# Save current image tag
docker images | grep ai-service > current_version.txt
```

#### Step 2: Stop Services

```bash
cd /volume1/docker/ai-service
docker-compose -f docker-compose.production.yml down
```

#### Step 3: Restore Previous Version

```bash
# Pull previous version (replace with actual tag)
docker pull ghcr.io/christianlb/ai-service:v1.2.3

# Update docker-compose.yml to use specific tag
sed -i 's/:latest/:v1.2.3/g' docker-compose.production.yml

# Start services
docker-compose -f docker-compose.production.yml up -d
```

#### Step 4: Restore Database (if needed)

```bash
# List available backups
ls -la /volume1/docker/ai-service/backups/

# Restore specific backup
gunzip < backups/backup_20250130.sql.gz | \
  docker exec -i ai-postgres psql -U ai_user -d ai_service
```

#### Step 5: Verify Rollback

```bash
# Check version
curl http://192.168.1.11:3001/api/version

# Test functionality
make prod-health
```

## Security Considerations

### Security Best Practices

1. **API Key Management**
   - Never store API keys in environment files
   - Use the Integration Service for all credentials
   - Rotate API keys regularly
   - Monitor API key usage

2. **Network Security**
   - Only expose necessary ports (3001)
   - Use firewall rules to restrict access
   - Consider VPN for remote access
   - Enable HTTPS with SSL certificates

3. **Database Security**
   - Use strong passwords (minimum 16 characters)
   - Restrict database access to Docker network only
   - Regular security updates
   - Encrypted backups

4. **Container Security**
   - Run containers as non-root user
   - Keep base images updated
   - Scan images for vulnerabilities
   - Use read-only file systems where possible

5. **Application Security**
   - Strong JWT secrets (32+ characters)
   - Session timeout configuration
   - Rate limiting on API endpoints
   - Input validation and sanitization

### Security Audit Checklist

- [ ] All default passwords changed
- [ ] Firewall configured and active
- [ ] SSL/TLS enabled (if exposed to internet)
- [ ] API keys stored encrypted in database
- [ ] Database not accessible externally
- [ ] Redis password set and strong
- [ ] JWT secret is unique and strong
- [ ] Backup encryption enabled
- [ ] Log files secured with proper permissions
- [ ] Watchtower using authenticated registry access
- [ ] Regular security updates scheduled
- [ ] Monitoring and alerting configured

## Appendix

### Quick Command Reference

```bash
# Deployment Commands
make deploy                      # Full deployment with backup
make prod-deploy-image           # Deploy new Docker image
make db-migrate-deploy          # Apply database migrations
make prod-health               # Comprehensive health check

# Maintenance Commands
make prod-logs                 # View application logs
make prod-status              # Check service status
make prod-backup             # Create database backup
make prod-restore BACKUP=... # Restore from backup
make restart-service         # Restart application

# Database Commands
make prod-sql SQL="..."      # Execute SQL query
make prod-auth-create-admin  # Create admin user
make prod-auth-list-users   # List all users
make prod-auth-reset-password # Reset user password

# Troubleshooting Commands
make prod-ps                 # List running containers
docker logs ai-service -f    # Follow application logs
docker exec -it ai-service sh # Shell into container
docker stats                 # Monitor resource usage
```

### Environment Variables Reference

| Variable               | Description                 | Required | Default     |
| ---------------------- | --------------------------- | -------- | ----------- |
| NODE_ENV               | Environment mode            | Yes      | production  |
| PORT                   | API port                    | Yes      | 3001        |
| POSTGRES_HOST          | Database host               | Yes      | ai-postgres |
| POSTGRES_PORT          | Database port               | Yes      | 5432        |
| POSTGRES_DB            | Database name               | Yes      | ai_service  |
| POSTGRES_USER          | Database user               | Yes      | ai_user     |
| POSTGRES_PASSWORD      | Database password           | Yes      | -           |
| DATABASE_URL           | Full database URL           | Yes      | -           |
| REDIS_HOST             | Redis host                  | Yes      | ai-redis    |
| REDIS_PORT             | Redis port                  | Yes      | 6379        |
| REDIS_PASSWORD         | Redis password              | Yes      | -           |
| JWT_SECRET             | JWT signing secret          | Yes      | -           |
| INTEGRATION_CONFIG_KEY | Encryption key for API keys | Yes      | -           |
| LOG_LEVEL              | Logging level               | No       | info        |

### Port Reference

| Service      | Internal Port | External Port | Description               |
| ------------ | ------------- | ------------- | ------------------------- |
| API/Frontend | 3001          | 3001          | Main application          |
| PostgreSQL   | 5432          | -             | Database (internal only)  |
| Redis        | 6379          | -             | Cache (internal only)     |
| InfluxDB     | 8086          | -             | Time series DB (internal) |
| Qdrant       | 6333/6334     | -             | Vector DB (internal)      |

### File Structure on NAS

```
/volume1/docker/ai-service/
├── docker-compose.production.yml
├── .env.production
├── postgres/                 # PostgreSQL data
├── redis/                    # Redis data
├── influxdb/                # InfluxDB data (optional)
├── qdrant/                  # Qdrant data (optional)
├── documents/               # Uploaded documents
├── logs/                    # Application logs
├── config/
│   ├── complete-production-schema.sql
│   ├── logrotate.conf
│   └── watchtower/
│       └── config.json      # GHCR authentication
├── backups/                 # Database backups
├── nginx/                   # Nginx configs (if used)
└── scripts/                 # Maintenance scripts
```

### Support and Resources

- **Documentation**: `/docs` directory in repository
- **Issues**: GitHub Issues for bug reports
- **Updates**: Automatic via Watchtower
- **Monitoring**: Built-in health endpoints
- **Logs**: Comprehensive logging to `/logs` directory

---

_Last Updated: January 2025_
_Version: 1.0.0_
_Author: AI Service Development Team_
