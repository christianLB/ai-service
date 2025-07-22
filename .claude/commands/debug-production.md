# Debug Production Issues

Commands and strategies for debugging production problems safely.

## Usage
```
/debug-production [issue-type]
```

## Safe Debugging Commands

### 1. Check System Health
```bash
# Overall status
make prod-status

# Service logs (last 100 lines)
make prod-logs

# Specific service logs
make prod-logs-api
make prod-logs-frontend

# Database health
make prod-db-check
```

### 2. Common Issues

#### High Memory Usage
```bash
# Check container stats
docker stats --no-stream

# Inside container
docker exec ai-service-api-prod top
docker exec ai-service-api-prod free -m

# Possible solutions:
# - Restart service: make prod-restart
# - Scale horizontally
# - Optimize queries
```

#### Database Connection Issues
```bash
# Test connection
make prod-db-check

# Check connection pool
docker exec ai-service-api-prod \
  psql -U $DB_USER -d $DB_NAME -c "SELECT count(*) FROM pg_stat_activity;"

# Reset connections if needed
docker exec ai-service-api-prod \
  psql -U $DB_USER -d $DB_NAME -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';"
```

#### API Endpoint Failures
```bash
# Test specific endpoint
curl -X GET https://api.yourdomain.com/health

# With auth
TOKEN=$(make prod-auth-token)
curl -H "Authorization: Bearer $TOKEN" \
  https://api.yourdomain.com/api/endpoint

# Check nginx logs
docker exec nginx tail -f /var/log/nginx/error.log
```

### 3. Performance Investigation

#### Slow Queries
```bash
# Find slow queries
docker exec ai-service-postgres \
  psql -U $DB_USER -d $DB_NAME -c "
  SELECT query, mean_exec_time, calls 
  FROM pg_stat_statements 
  ORDER BY mean_exec_time DESC 
  LIMIT 10;"

# Check query plan
docker exec ai-service-postgres \
  psql -U $DB_USER -d $DB_NAME -c "EXPLAIN ANALYZE [YOUR_QUERY];"
```

#### API Response Times
```bash
# Simple benchmark
for i in {1..10}; do
  time curl -s https://api.yourdomain.com/health > /dev/null
done

# Check response times in logs
make prod-logs-api | grep "Response time"
```

### 4. Emergency Procedures

#### Quick Rollback
```bash
# Stop current deployment
make prod-down

# Restore from backup
make prod-restore-backup BACKUP_DATE=2024-01-20

# Redeploy previous version
git checkout [previous-tag]
make deploy
```

#### Service Restart (minimal downtime)
```bash
# Rolling restart
docker-compose -f docker-compose.prod.yml restart ai-service-api

# Full restart if needed
make prod-restart
```

#### Emergency Maintenance Mode
```bash
# Enable maintenance mode
echo "maintenance" > /tmp/maintenance.flag
docker cp /tmp/maintenance.flag nginx:/usr/share/nginx/html/

# Disable after fix
docker exec nginx rm /usr/share/nginx/html/maintenance.flag
```

### 5. Data Integrity Checks

```bash
# Check for orphaned records
make prod-db-shell
\c ai_service
SELECT COUNT(*) FROM financial.transactions WHERE client_id NOT IN (SELECT id FROM financial.clients);

# Verify financial totals
SELECT 
  SUM(amount) as total_transactions,
  COUNT(*) as transaction_count 
FROM financial.transactions 
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day';
```

### 6. Monitoring & Alerts

#### Set up quick monitoring
```bash
# CPU/Memory alerts
watch -n 5 'docker stats --no-stream | grep ai-service'

# Database connections
watch -n 10 'make prod-db-check'

# API health
while true; do
  curl -s https://api.yourdomain.com/health || echo "API DOWN"
  sleep 30
done
```

## Best Practices

1. **Always backup first**:
   ```bash
   make prod-backup
   ```

2. **Test in staging**:
   - Replicate issue in development
   - Test fix locally
   - Deploy to staging first

3. **Communicate**:
   - Notify users of issues
   - Update status page
   - Document in incident log

4. **Post-mortem**:
   - What went wrong?
   - How was it fixed?
   - How to prevent recurrence?

## DO NOT DO IN PRODUCTION

- ❌ Run migrations without backup
- ❌ Delete data without verification
- ❌ Change environment variables without testing
- ❌ Force push to production branch
- ❌ Ignore error logs
- ❌ Skip health checks after deployment

## Useful Debug Queries

```sql
-- Active connections
SELECT pid, usename, application_name, client_addr, state 
FROM pg_stat_activity;

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'financial'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Recent errors (if logging enabled)
SELECT * FROM financial.error_logs 
ORDER BY created_at DESC 
LIMIT 20;
```