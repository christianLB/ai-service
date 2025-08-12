# Production Admin Guide

This guide covers the production administration commands for managing users, passwords, API keys, and system health.

## 🚀 Quick Start

All production admin commands are available through the main Makefile:

```bash
# View all production admin commands
make help-prod

# Or view admin-specific commands
make -f Makefile.prod-admin help
```

## 👤 User Management

### Create Admin User

Create a new admin user in the production database:

```bash
make prod-create-admin
```

This command will:

- Prompt for email (default: admin@ai-service.local)
- Prompt for password (min 12 chars) or generate a secure one
- Hash the password using bcrypt-cli in a Docker container
- Create or update the user in the database

**Example:**

```bash
$ make prod-create-admin
Enter email for admin user [admin@ai-service.local]: john@example.com
Enter password (min 12 chars): [hidden]
Enter full name [System Administrator]: John Doe
✅ Admin user created successfully
📧 Email: john@example.com
👤 Name: John Doe
```

### Reset User Password

Reset the password for any user:

```bash
make prod-reset-password
```

This command will:

- Prompt for the user's email
- Verify the user exists
- Prompt for new password or generate one
- Update the password in the database

### List All Users

View all users in the production system:

```bash
make prod-list-users
```

## 🔐 Database Password Management

### Change Database Password

Change the PostgreSQL password in production:

```bash
make prod-change-db-password
```

**⚠️ WARNING:** This operation requires restarting all services!

This command will:

1. Backup current .env configuration
2. Update PostgreSQL password
3. Update .env.production file
4. Update DATABASE_URL connection string
5. Restart all services
6. Verify connectivity

**Requirements:**

- New password must be at least 16 characters
- All services will be briefly unavailable during restart

## 🔑 API Key Management

### Set API Keys

Configure API keys through the encrypted Integration Service:

```bash
make prod-set-api-keys
```

You can set:

1. OpenAI API Key
2. Claude API Key
3. GoCardless Access Token
4. All keys at once

**Note:** Keys are encrypted and stored in the database, not in plain text files.

## 💾 Backup & Restore

### Full Backup

Create a complete backup of database and configuration:

```bash
make prod-backup-full
```

This creates a timestamped backup containing:

- Complete database dump (compressed)
- .env.production file
- docker-compose.production.yml
- nginx configuration

Backups are stored in: `/volume1/docker/ai-service/backups/`

### List Backups

View all available backups:

```bash
make prod-list-backups
```

## 🏥 Health & Monitoring

### Comprehensive Health Check

Run a complete system health check:

```bash
make prod-health-check
```

This command checks:

- Container status
- Database connectivity
- API health endpoint
- Frontend accessibility
- System resources (memory, disk)
- Container resource usage

### Tail Logs

View real-time logs from all containers:

```bash
make prod-logs-tail
```

Press `Ctrl+C` to stop tailing logs.

## 🛠️ Maintenance

### Optimize Database

Run PostgreSQL optimization:

```bash
make prod-optimize-db
```

This runs `VACUUM ANALYZE` to:

- Reclaim storage space
- Update query planner statistics
- Improve query performance

### Clean Old Logs

Remove logs older than 30 days:

```bash
make prod-clean-logs
```

## 🔒 Security Best Practices

### Password Requirements

- **Admin passwords**: Minimum 12 characters
- **Database passwords**: Minimum 16 characters
- **Use generated passwords** when possible for maximum security

### Backup Strategy

1. **Before major changes**: Always run `make prod-backup-full`
2. **Regular backups**: Schedule weekly full backups
3. **Test restores**: Periodically verify backup integrity

### API Key Security

- Keys are encrypted in the database
- Never store keys in plain text files
- Rotate keys regularly
- Use separate keys for production

## 🚨 Emergency Procedures

### If Password Change Fails

If database password change fails:

1. Check backup file exists:

   ```bash
   ssh k2600x@192.168.1.11 ls -la /volume1/docker/ai-service/.env.production.backup*
   ```

2. Restore from backup:

   ```bash
   ssh k2600x@192.168.1.11 "cd /volume1/docker/ai-service && \
     cp .env.production.backup-[timestamp] .env.production"
   ```

3. Restart services:
   ```bash
   ssh k2600x@192.168.1.11 "cd /volume1/docker/ai-service && \
     sudo docker-compose -f docker-compose.production.yml restart"
   ```

### If Services Won't Start

1. Check logs:

   ```bash
   make prod-logs-tail
   ```

2. Verify environment file:

   ```bash
   ssh k2600x@192.168.1.11 "grep -E 'POSTGRES|DATABASE' /volume1/docker/ai-service/.env.production"
   ```

3. Test database connection:
   ```bash
   ssh k2600x@192.168.1.11 "sudo docker exec ai-postgres psql -U ai_user -d ai_service -c 'SELECT 1'"
   ```

## 📝 Command Reference

| Command                   | Description                            |
| ------------------------- | -------------------------------------- |
| `prod-create-admin`       | Create admin user in production        |
| `prod-reset-password`     | Reset user password                    |
| `prod-list-users`         | List all users                         |
| `prod-change-db-password` | Change database password               |
| `prod-set-api-keys`       | Set API keys via Integration Service   |
| `prod-backup-full`        | Complete backup of database and config |
| `prod-list-backups`       | List available backups                 |
| `prod-health-check`       | Comprehensive health check             |
| `prod-logs-tail`          | Tail logs from all containers          |
| `prod-optimize-db`        | Run database optimization              |
| `prod-clean-logs`         | Clean old log files                    |

## 🔗 Related Documentation

- [Production Deployment Guide](./PRODUCTION-DEPLOYMENT-GUIDE.md)
- [Security Best Practices](./authentication/security-best-practices.md)
- [Database Management](./database/README.md)
