# AI Service Production Deployment - Definitive Procedure

## 🎯 Overview

This document provides the definitive, immediately actionable procedure to deploy the AI Service on Synology NAS, addressing all issues identified by previous deployment attempts.

## 🔥 Critical Pre-Deployment Checklist

Before starting, ensure you have:
- [ ] Root/sudo access to your Synology NAS
- [ ] OpenAI API key (real, not placeholder)
- [ ] Telegram Bot token (if using Telegram features)
- [ ] Docker and Docker Compose installed on NAS
- [ ] Port 3003 available (not in use by other services)

## 📋 Step-by-Step Deployment

### Step 1: Initial Setup on Synology NAS

**On your Synology NAS, run the setup script:**

```bash
# Download and run the definitive setup script
curl -fsSL https://raw.githubusercontent.com/k2600x/ai-service/main/scripts/setup-synology-production.sh | sudo bash
```

**This script will:**
- ✅ Create all required directories with correct permissions
- ✅ Download latest configuration files
- ✅ Set up environment template
- ✅ Configure systemd service
- ✅ Verify prerequisites

### Step 2: Configure Environment Variables

**Edit the production environment file:**

```bash
sudo nano /volume1/docker/ai-service/config/production.env
```

**CRITICAL: Replace ALL values marked with 'CHANGE_THIS':**

```bash
# Database passwords
POSTGRES_PASSWORD=your_ultra_secure_database_password_here
REDIS_PASSWORD=your_redis_password_here

# API Keys (CRITICAL)
OPENAI_API_KEY=sk-proj-your_real_openai_key_here
TELEGRAM_BOT_TOKEN=your_real_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Security tokens
JWT_SECRET=your_ultra_secure_jwt_secret_here
GRAFANA_ADMIN_PASSWORD=your_grafana_admin_password_here
```

**Verify the file permissions:**
```bash
ls -la /volume1/docker/ai-service/config/production.env
# Should show: -rw------- 1 root root (permissions 600)
```

### Step 3: Deploy the Services

**Navigate to the project directory:**
```bash
cd /volume1/docker/ai-service
```

**Pull the latest images:**
```bash
docker-compose pull
```

**Start the services:**
```bash
docker-compose up -d
```

**Alternative using systemd:**
```bash
systemctl start ai-service
```

### Step 4: Verify Deployment

**Check service status:**
```bash
docker-compose ps
```

**Expected output should show all services as "Up":**
```
         Name                       Command                State           Ports
-----------------------------------------------------------------------------------
ai-service-db           docker-entrypoint.sh postgres   Up      5432/tcp
ai-service-prod         docker-entrypoint.sh node ...   Up      0.0.0.0:3003->3000/tcp
ai-service-redis        docker-entrypoint.sh redis ...   Up      6379/tcp
ai-service-watchtower   /watchtower --scope ai-ser ...   Up      8080/tcp
```

**Test the application:**
```bash
# Test health endpoint
curl http://localhost:3003/status

# Expected response:
# {"status":"ok","uptime":X,"database":"connected","version":"1.0.0"}
```

**Check logs for errors:**
```bash
# Main service logs
docker-compose logs ai-service-prod

# Database logs
docker-compose logs ai-service-db

# All services
docker-compose logs
```

### Step 5: Configure External Access (Optional)

**If using Cloudflare or external domain:**

1. Configure your router to forward port 3003 to your NAS
2. Set up Cloudflare DNS record pointing to your external IP
3. Configure SSL certificate through DSM or Cloudflare

**Test external access:**
```bash
curl https://your-domain.com/status
```

## 🔧 Troubleshooting Common Issues

### Issue 1: Environment Variables Not Loading

**Symptoms:** Services start but can't connect to database
**Solution:**
```bash
# Verify env file exists and has correct permissions
ls -la /volume1/docker/ai-service/config/production.env

# Check if environment variables are being read
docker-compose exec ai-service-prod printenv | grep POSTGRES
```

### Issue 2: Database Connection Failed

**Symptoms:** AI service can't connect to PostgreSQL
**Solution:**
```bash
# Check if PostgreSQL container is healthy
docker-compose ps ai-service-db

# Test database connection manually
docker-compose exec ai-service-db psql -U ai_user -d ai_service -c "\l"

# Verify database initialization
docker-compose logs ai-service-db | grep "database system is ready"
```

### Issue 3: Port 3003 Already in Use

**Symptoms:** "Port is already allocated" error
**Solution:**
```bash
# Find what's using port 3003
sudo netstat -tulpn | grep :3003

# Stop conflicting service or change port in docker-compose.yml
sudo docker stop $(sudo docker ps -q --filter "publish=3003")
```

### Issue 4: Watchtower Authentication Issues

**Symptoms:** Watchtower can't pull new images
**Solution:**
```bash
# Check Watchtower logs
docker-compose logs ai-service-watchtower

# Verify Watchtower has access to docker socket
ls -la /var/run/docker.sock
```

## 🎯 Performance Optimization

### After Successful Deployment

1. **Monitor Resource Usage:**
```bash
# Check container resource usage
docker stats

# Monitor disk space
df -h /volume1/docker/ai-service/
```

2. **Set Up Log Rotation:**
```bash
# Configure Docker log rotation in daemon.json
sudo nano /etc/docker/daemon.json
```

Add:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

3. **Schedule Regular Backups:**
```bash
# Create backup script
cat > /volume1/docker/ai-service/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/volume1/docker/ai-service/backups"
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T ai-service-db pg_dump -U ai_user ai_service > $BACKUP_DIR/db_$DATE.sql

# Backup configuration
cp /volume1/docker/ai-service/config/production.env $BACKUP_DIR/env_$DATE.backup

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.backup" -mtime +7 -delete
EOF

chmod +x /volume1/docker/ai-service/backup.sh

# Add to crontab (daily backup at 2 AM)
echo "0 2 * * * /volume1/docker/ai-service/backup.sh" | sudo crontab -
```

## 🛡️ Security Hardening

### After Deployment

1. **Change Default Passwords:**
   - Update all passwords in production.env
   - Use strong, unique passwords for each service

2. **Restrict Network Access:**
   - Configure firewall rules
   - Use fail2ban for intrusion detection

3. **Regular Security Updates:**
   - Enable automatic security updates
   - Monitor security advisories for used Docker images

4. **Audit Logs Regularly:**
   - Review application logs weekly
   - Set up alerting for suspicious activity

## 📊 Monitoring Setup

### Configure Alerts

1. **Health Check Monitoring:**
```bash
# Create health check script
cat > /volume1/docker/ai-service/health-monitor.sh << 'EOF'
#!/bin/bash
if ! curl -f http://localhost:3003/status >/dev/null 2>&1; then
    echo "AI Service health check failed" | mail -s "AI Service Alert" your-email@domain.com
fi
EOF

chmod +x /volume1/docker/ai-service/health-monitor.sh

# Run every 5 minutes
echo "*/5 * * * * /volume1/docker/ai-service/health-monitor.sh" | sudo crontab -
```

2. **Disk Space Monitoring:**
```bash
# Add disk space check to health-monitor.sh
echo 'DISK_USAGE=$(df /volume1/docker/ai-service | tail -1 | awk "{print \$5}" | sed "s/%//")' >> /volume1/docker/ai-service/health-monitor.sh
echo 'if [ $DISK_USAGE -gt 80 ]; then echo "Disk usage is ${DISK_USAGE}%" | mail -s "Disk Space Alert" your-email@domain.com; fi' >> /volume1/docker/ai-service/health-monitor.sh
```

## ✅ Success Criteria

**Deployment is successful when:**
- [ ] All containers are running (docker-compose ps shows "Up")
- [ ] Health endpoint returns 200 OK (curl http://localhost:3003/status)
- [ ] Database connection is established (logs show "connected")
- [ ] No error messages in container logs
- [ ] Telegram bot responds (if configured)
- [ ] External access works (if configured)

## 🔄 Rollback Procedure

**If deployment fails:**

1. **Stop all services:**
```bash
docker-compose down
```

2. **Restore from backup:**
```bash
# Restore environment file
cp /volume1/docker/ai-service/config/production.env.backup-YYYYMMDD-HHMMSS /volume1/docker/ai-service/config/production.env

# Restore database if needed
docker-compose exec -T ai-service-db psql -U ai_user -d ai_service < /volume1/docker/ai-service/backups/db_YYYYMMDD_HHMMSS.sql
```

3. **Start with previous configuration:**
```bash
docker-compose up -d
```

## 📞 Support and Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Review application logs
- Check disk space usage
- Verify backup integrity

**Monthly:**
- Update Docker images
- Rotate API keys
- Security audit

**Emergency Contacts:**
- System logs: `/volume1/docker/ai-service/logs/`
- Configuration: `/volume1/docker/ai-service/config/`
- Backups: `/volume1/docker/ai-service/backups/`

---

**Last Updated:** 2025-07-07  
**Version:** 1.0 - Definitive Deployment Procedure