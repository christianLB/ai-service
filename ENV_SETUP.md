# Environment Variables Setup

This service requires proper environment variable configuration to function. **NO hardcoded credentials are allowed in the codebase.**

## Quick Setup

1. Copy the template file:
   ```bash
   cp .env.template .env.local
   ```

2. Edit `.env.local` with your actual values (see below)

3. The service will automatically load variables from `.env.local`

## Required Variables

### Database (PostgreSQL) - MANDATORY
```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5434
POSTGRES_DB=ai_service
POSTGRES_USER=ai_user
POSTGRES_PASSWORD=your_secure_password_here
```

### Cache (Redis) - MANDATORY for production
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password
```

### Financial Integration (GoCardless)
```bash
GO_SECRET_ID=your_gocardless_secret_id
GO_SECRET_KEY=your_gocardless_secret_key
GO_REDIRECT_URI=https://localhost:3000/financial/callback
```

### AI Services
```bash
OPENAI_API_KEY=your_openai_api_key
N8N_API_KEY=your_n8n_api_key
```

## Security Notes

- **Never commit** `.env.local` to the repository
- `.env.local` is already in `.gitignore`
- The service will **fail to start** if required variables are missing
- Use strong, unique passwords for database and Redis

## Docker Environment

For Docker deployment, ensure all environment variables are properly set in your Docker environment or docker-compose.yml file.

## Validation

The service validates all required environment variables on startup and will provide clear error messages if any are missing.