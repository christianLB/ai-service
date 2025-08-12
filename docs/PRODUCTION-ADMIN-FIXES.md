# Production Admin Fixes Summary

## 🔧 Issues Fixed (2025-08-12)

### 1. Docker Command Path Issues

**Problem**: `sudo: docker: command not found`
**Solution**: Updated all docker commands to use full path `/usr/local/bin/docker`

### 2. Docker-Compose Path Issues

**Problem**: `docker-compose: command not found`
**Solution**: Updated to use full path `/usr/local/bin/docker-compose`

### 3. Password Hashing Issues

**Problem**: Complex stdin redirection failed over SSH with "Permission denied"
**Solution**:

- Replaced complex node script approach with `bcrypt-cli` npm package
- Added simpler fallback option with pre-hashed temporary password

## 📝 Available Commands

### Quick Admin Creation (Recommended for First Setup)

```bash
# Simple version with temporary password 'admin123'
make prod-create-admin-simple

# Or use the script directly
./scripts/prod-create-admin.sh
```

### Full Admin Management

```bash
# Create admin with custom password (requires bcrypt-cli)
make prod-create-admin

# Reset any user's password
make prod-reset-password

# List all users
make prod-list-users
```

### Database Management

```bash
# Change database password (updates .env too)
make prod-change-db-password

# Optimize database
make prod-optimize-db
```

### API Keys

```bash
# Set API keys (encrypted storage)
make prod-set-api-keys
```

### Backup & Recovery

```bash
# Full backup
make prod-backup-full

# List backups
make prod-list-backups
```

### Health & Monitoring

```bash
# Comprehensive health check
make prod-health-check

# Tail logs
make prod-logs-tail
```

### Maintenance

```bash
# Clean old logs
make prod-clean-logs
```

## 🚀 Quick Start for New Production Setup

1. **Create initial admin user**:

   ```bash
   make prod-create-admin-simple
   # Email: admin@ai-service.local
   # Password: admin123 (temporary)
   ```

2. **Login and change password immediately**:
   - Login to the web interface
   - Navigate to user settings
   - Change password from temporary one

3. **Set API keys**:

   ```bash
   make prod-set-api-keys
   # Follow prompts to set OpenAI, Claude, GoCardless keys
   ```

4. **Create backup**:
   ```bash
   make prod-backup-full
   ```

## 📍 File Locations

- **Makefile.prod-admin**: `/home/k2600x/dev/ai-service/Makefile.prod-admin`
- **Simple admin script**: `/home/k2600x/dev/ai-service/scripts/prod-create-admin.sh`
- **Documentation**: `/home/k2600x/dev/ai-service/docs/PRODUCTION-ADMIN-GUIDE.md`
- **Production backups**: `/volume1/docker/ai-service/backups/` (on NAS)

## ⚠️ Important Notes

1. **Synology Docker Path**: Always use `/usr/local/bin/docker` not just `docker`
2. **Synology Docker-Compose Path**: Always use `/usr/local/bin/docker-compose`
3. **User Table**: The table name is `"User"` with capital U and requires quotes in SQL
4. **Temporary Password**: When using `prod-create-admin-simple`, always change the password after first login
5. **SSH Requirements**: Ensure SSH key authentication is set up for seamless operation

## 🐛 Troubleshooting

### If commands still fail with "command not found"

Check Docker installation path on NAS:

```bash
ssh k2600x@192.168.1.11 "which docker"
ssh k2600x@192.168.1.11 "ls -la /usr/local/bin/docker*"
```

### If password hashing fails

Use the simple version:

```bash
make prod-create-admin-simple
```

This uses a pre-hashed password 'admin123' that you must change after login.

### If database connection fails

Check container is running:

```bash
ssh k2600x@192.168.1.11 "sudo /usr/local/bin/docker ps | grep ai-postgres"
```
