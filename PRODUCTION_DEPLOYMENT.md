# Production Deployment Instructions

## Current System Architecture

The system is partially migrated to microservices architecture with the following components:

### Microservices (Implemented)

- **Auth Service** (Port 3004): JWT authentication and user management
- **Financial Service** (Port 3002): Client, invoice, and financial operations
- **Trading Service** (Port 3006): Cryptocurrency trading operations

### Monolith (Port 3001)

Still handles:

- Dashboard
- Tagging/categorization
- Document intelligence
- System health monitoring
- Other legacy services

## Deployment Steps

### 1. Environment Preparation

```bash
# Clone the repository
git clone <repository-url>
cd ai-service

# Create production environment file
cp .env.example .env.production

# Edit .env.production with production values:
# - JWT_SECRET (generate a secure 32+ character secret)
# - POSTGRES_PASSWORD (strong password)
# - REDIS_PASSWORD (strong password)
# - OPENAI_API_KEY (if using AI features)
# - GOCARDLESS_* (for banking integration)
```

### 2. Database Setup

```bash
# The system uses PostgreSQL with multiple schemas
# Schemas: auth, financial, public, tagging, trading

# Run database migrations
./ai-cli.js db migrate

# Verify migrations
./ai-cli.js db status
```

### 3. Docker Deployment (Recommended)

```bash
# Build and start all services
docker-compose -f docker-compose.production.yml up -d

# Check service health
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### 4. Manual Deployment (Alternative)

If not using Docker, deploy each service separately:

#### Auth Service

```bash
cd apps/auth-svc
npm install
npm run build
DATABASE_URL="postgresql://user:pass@host:5434/ai_service?schema=auth" \
JWT_SECRET="your-secret" \
PORT=3004 \
npm start
```

#### Financial Service

```bash
cd apps/financial-svc
npm install
npm run build
DATABASE_URL="postgresql://user:pass@host:5434/ai_service?schema=financial" \
JWT_SECRET="your-secret" \
PORT=3002 \
npm start
```

#### Monolith (Main API)

```bash
# In root directory
npm install
npm run build
POSTGRES_HOST=localhost \
POSTGRES_PORT=5434 \
OPENAI_API_KEY="your-key" \
JWT_SECRET="your-secret" \
PORT=3001 \
npm start
```

#### Frontend

```bash
cd frontend
npm install
npm run build
# Serve dist/ folder with nginx or any static server
```

### 5. Nginx Configuration (Production)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Auth Service
    location /api/auth {
        proxy_pass http://localhost:3004;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Financial Service
    location /api/financial {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Other APIs (Monolith)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Service Dependencies

### Required Services

- PostgreSQL 15+ (Port 5434)
- Redis 7+ (Port 6379)

### Optional Services

- InfluxDB (for trading metrics)
- Qdrant (for vector search)

## Health Checks

Each service exposes a health endpoint:

- Auth: http://localhost:3004/health
- Financial: http://localhost:3002/health
- Monolith: http://localhost:3001/health

## Default Credentials

After deployment, a default admin user is created:

- Email: `admin@ai-service.local`
- Password: `admin123`

**IMPORTANT**: Change this immediately after first login!

## Monitoring

### Check Service Status

```bash
# Using the CLI
./ai-cli.js dev status

# Or manually
curl http://localhost:3004/health  # Auth
curl http://localhost:3002/health  # Financial
curl http://localhost:3001/health  # Monolith
```

### View Logs

```bash
# Docker
docker-compose -f docker-compose.production.yml logs -f [service-name]

# Manual deployment
tail -f logs/*.log
```

## Troubleshooting

### Common Issues

1. **"Table users does not exist"**
   - The User table is in the `auth` schema, not `public`
   - Ensure DATABASE_URL includes `?schema=auth` for auth service

2. **"Cannot connect to postgres"**
   - Check if using correct host (localhost vs postgres)
   - Verify port (5434 for external, 5432 for Docker internal)

3. **"Invalid token" errors**
   - Ensure all services use the same JWT_SECRET
   - Check if auth service is running and accessible

4. **Port conflicts**
   - Stop any Docker containers using the same ports
   - Check with: `docker ps` and `lsof -i :PORT`

## Security Considerations

1. **Use strong secrets**:
   - JWT_SECRET: At least 32 characters
   - Database passwords: Complex and unique
   - Never commit secrets to repository

2. **Enable HTTPS in production**:
   - Use Let's Encrypt for SSL certificates
   - Redirect all HTTP to HTTPS

3. **Firewall rules**:
   - Only expose ports 80/443 publicly
   - Keep database and Redis ports internal

4. **Regular updates**:
   - Keep dependencies updated
   - Monitor security advisories

## Backup Strategy

```bash
# Database backup
pg_dump -h localhost -p 5434 -U ai_user ai_service > backup_$(date +%Y%m%d).sql

# Or using the CLI
./ai-cli.js db backup

# Redis backup
redis-cli --rdb /path/to/backup.rdb
```

## Scaling Considerations

The microservices architecture allows independent scaling:

- Auth Service: Low resource, can handle many requests
- Financial Service: Medium resource, scale based on invoice processing
- Trading Service: High resource for real-time data
- Monolith: Will be further decomposed in future releases

## Support

For issues or questions:

- Check logs first
- Review this documentation
- Contact the development team

## Next Steps

The migration to microservices is ongoing. Future releases will:

- Extract dashboard service from monolith
- Create dedicated tagging service
- Implement API Gateway for unified routing
- Add service mesh for inter-service communication
