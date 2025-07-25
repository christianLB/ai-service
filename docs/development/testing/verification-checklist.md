# AI Service Deployment Verification Checklist

## 🎯 Pre-Deployment Verification

### Environment Setup
- [ ] **Directory Structure Created**
  ```bash
  ls -la /volume1/docker/ai-service/
  # Should show: config, logs, postgres, redis, workflows, documents, knowledge
  ```

- [ ] **Permissions Set Correctly**
  ```bash
  ls -la /volume1/docker/ai-service/config/production.env
  # Should show: -rw------- 1 root root
  ```

- [ ] **All Required Files Present**
  ```bash
  # Check files exist:
  test -f /volume1/docker/ai-service/docker-compose.yml && echo "✅ Docker Compose" || echo "❌ Missing"
  test -f /volume1/docker/ai-service/config/production.env && echo "✅ Environment" || echo "❌ Missing"
  test -f /volume1/docker/ai-service/config/init-db.sql && echo "✅ Database Init" || echo "❌ Missing"
  ```

- [ ] **Environment Variables Configured**
  ```bash
  # Verify no placeholder values remain:
  grep -i "change_this" /volume1/docker/ai-service/config/production.env
  # Should return no results
  ```

## 🚀 Deployment Verification

### Container Status
- [ ] **All Containers Running**
  ```bash
  docker-compose ps
  # All services should show "Up"
  ```

- [ ] **Container Health Checks**
  ```bash
  # PostgreSQL
  docker-compose exec ai-service-db pg_isready -U ai_user -d ai_service
  # Should return: ai_service:5432 - accepting connections
  
  # Redis
  docker-compose exec ai-service-redis redis-cli ping
  # Should return: PONG
  
  # Main Application
  curl -f http://localhost:3003/status
  # Should return JSON with status: "ok"
  ```

### Database Verification
- [ ] **Database Initialization**
  ```bash
  # Check if tables were created
  docker-compose exec ai-service-db psql -U ai_user -d ai_service -c "\dt"
  # Should show tables: documents, knowledge_entries, autonomous_tasks, communication_log
  ```

- [ ] **Database Connectivity from App**
  ```bash
  # Check app logs for database connection
  docker-compose logs ai-service-prod | grep -i "database"
  # Should show successful connection messages
  ```

### Application Functionality
- [ ] **Health Endpoint**
  ```bash
  curl http://localhost:3003/status
  # Expected response:
  # {"status":"ok","uptime":X,"database":"connected","version":"1.0.0"}
  ```

- [ ] **API Endpoints**
  ```bash
  # Test workflow generation endpoint
  curl -X POST http://localhost:3003/api/flow-gen \
    -H "Content-Type: application/json" \
    -d '{"description":"Test workflow","save":false}'
  # Should return workflow JSON
  ```

- [ ] **Financial Endpoints (if configured)**
  ```bash
  curl http://localhost:3003/api/financial/dashboard/health
  # Should return financial system status
  ```

## 🔐 Security Verification

### File Permissions
- [ ] **Environment File Security**
  ```bash
  ls -la /volume1/docker/ai-service/config/production.env
  # Should be: -rw------- 1 root root (600 permissions)
  ```

- [ ] **Docker Socket Access**
  ```bash
  # Verify Watchtower has access
  docker-compose logs ai-service-watchtower | grep -i "error\|failed"
  # Should show no critical errors
  ```

### Network Security
- [ ] **Port Accessibility**
  ```bash
  # Test internal port
  netstat -tulpn | grep :3003
  # Should show docker-proxy listening on 3003
  
  # Test external access (if configured)
  curl -I https://your-domain.com/status
  # Should return 200 OK
  ```

- [ ] **Firewall Configuration**
  ```bash
  # Verify firewall rules (Synology specific)
  # Check DSM > Control Panel > Security > Firewall
  ```

## 📊 Performance Verification

### Resource Usage
- [ ] **Memory Usage**
  ```bash
  docker stats --no-stream
  # AI Service should use < 500MB under normal load
  ```

- [ ] **Disk Space**
  ```bash
  df -h /volume1/docker/ai-service/
  # Should show adequate free space (> 2GB recommended)
  ```

- [ ] **CPU Usage**
  ```bash
  docker stats --no-stream ai-service-prod
  # CPU usage should be < 50% under normal load
  ```

### Response Times
- [ ] **Health Check Performance**
  ```bash
  time curl http://localhost:3003/status
  # Should complete in < 2 seconds
  ```

- [ ] **API Response Times**
  ```bash
  # Test workflow generation performance
  time curl -X POST http://localhost:3003/api/flow-gen \
    -H "Content-Type: application/json" \
    -d '{"description":"Performance test","save":false}'
  # Should complete in < 10 seconds
  ```

## 🔄 Integration Verification

### Telegram Bot (if configured)
- [ ] **Bot Connectivity**
  ```bash
  # Check logs for Telegram webhook setup
  docker-compose logs ai-service-prod | grep -i "telegram"
  # Should show webhook configuration success
  ```

- [ ] **Bot Commands**
  ```
  # Test in Telegram:
  /start - Should receive welcome message
  /status - Should receive system status
  /help - Should receive command list
  ```

### Watchtower Updates
- [ ] **Update Mechanism**
  ```bash
  # Check Watchtower is monitoring correct containers
  docker-compose logs ai-service-watchtower | grep -i "monitoring"
  # Should show ai-service containers being monitored
  ```

- [ ] **Notification Setup**
  ```bash
  # Test notification endpoint
  curl -X POST http://localhost:3003/api/watchtower/notify \
    -H "Content-Type: application/json" \
    -d '{"level":"info","title":"Test","message":"Notification test"}'
  # Should return success response
  ```

## 🧪 Stress Testing

### Load Testing
- [ ] **Concurrent Requests**
  ```bash
  # Test multiple simultaneous requests
  for i in {1..5}; do
    curl http://localhost:3003/status &
  done
  wait
  # All requests should succeed
  ```

- [ ] **Database Connection Pool**
  ```bash
  # Generate multiple database queries
  for i in {1..10}; do
    curl -X POST http://localhost:3003/api/flow-gen \
      -H "Content-Type: application/json" \
      -d '{"description":"Load test '$i'","save":false}' &
  done
  wait
  # All requests should complete successfully
  ```

### Failover Testing
- [ ] **Container Restart Recovery**
  ```bash
  # Restart main container
  docker-compose restart ai-service-prod
  sleep 30
  curl http://localhost:3003/status
  # Should return successful response after restart
  ```

- [ ] **Database Recovery**
  ```bash
  # Restart database container
  docker-compose restart ai-service-db
  sleep 60
  curl http://localhost:3003/status
  # Should reconnect and show database: "connected"
  ```

## 📝 Log Verification

### Application Logs
- [ ] **No Critical Errors**
  ```bash
  docker-compose logs ai-service-prod | grep -i "error\|critical\|fatal"
  # Should show no critical errors (warnings are acceptable)
  ```

- [ ] **Startup Sequence**
  ```bash
  docker-compose logs ai-service-prod | grep -i "server\|listening\|ready"
  # Should show successful startup messages
  ```

### Database Logs
- [ ] **Initialization Success**
  ```bash
  docker-compose logs ai-service-db | grep -i "ready\|accepting"
  # Should show "database system is ready to accept connections"
  ```

- [ ] **Connection Logs**
  ```bash
  docker-compose logs ai-service-db | grep -i "connection"
  # Should show successful connections from ai-service
  ```

## 🎯 Business Logic Verification

### Workflow Generation
- [ ] **Basic Workflow Creation**
  ```bash
  curl -X POST http://localhost:3003/api/flow-gen \
    -H "Content-Type: application/json" \
    -d '{"description":"Create a simple data processing workflow","save":true}'
  # Should return valid n8n workflow JSON
  ```

- [ ] **Workflow Validation**
  ```bash
  # The generated workflow should pass validation
  # Check logs for validation success messages
  docker-compose logs ai-service-prod | grep -i "validation"
  ```

### Financial Features (if configured)
- [ ] **Account Balance Retrieval**
  ```bash
  curl http://localhost:3003/api/financial/accounts
  # Should return account information (may be empty initially)
  ```

- [ ] **Transaction Analysis**
  ```bash
  curl http://localhost:3003/api/financial/transactions
  # Should return transaction data or empty array
  ```

## ✅ Deployment Success Criteria

**Mark deployment as SUCCESSFUL only when ALL of the following are true:**

### Core Requirements
- [ ] All containers show "Up" status
- [ ] Health endpoint returns 200 OK
- [ ] Database connectivity confirmed
- [ ] No critical errors in logs
- [ ] API endpoints respond correctly

### Security Requirements
- [ ] Environment file has secure permissions (600)
- [ ] No sensitive data in logs
- [ ] External access secured (if configured)
- [ ] Firewall rules properly configured

### Performance Requirements
- [ ] Response times < 3 seconds for health checks
- [ ] Memory usage < 500MB per container
- [ ] Adequate disk space available (> 2GB)
- [ ] CPU usage reasonable (< 50% average)

### Integration Requirements
- [ ] Telegram bot functional (if configured)
- [ ] Watchtower monitoring active
- [ ] Database migrations applied successfully
- [ ] All required APIs accessible

## 🚨 Failure Indicators

**Deployment has FAILED if any of these occur:**

- [ ] Any container shows "Exited" or "Restarting" status
- [ ] Health endpoint returns 500 or connection refused
- [ ] Database connection errors in logs
- [ ] Critical errors or stack traces in application logs
- [ ] API endpoints return 500 errors
- [ ] Environment variables not loaded correctly
- [ ] File permission errors
- [ ] Out of memory or disk space errors

## 📞 Post-Verification Actions

### If Verification PASSES:
1. **Document Deployment:**
   ```bash
   echo "$(date): AI Service deployment verification PASSED" >> /volume1/docker/ai-service/deployment.log
   ```

2. **Setup Monitoring:**
   - Configure log rotation
   - Set up automated backups
   - Enable health check monitoring

3. **Notify Stakeholders:**
   - Send deployment success notification
   - Update documentation with live URLs
   - Schedule first maintenance window

### If Verification FAILS:
1. **Collect Diagnostic Information:**
   ```bash
   # Save all logs
   docker-compose logs > /volume1/docker/ai-service/failure-logs-$(date +%Y%m%d-%H%M%S).txt
   
   # Save system state
   docker-compose ps > /volume1/docker/ai-service/failure-state-$(date +%Y%m%d-%H%M%S).txt
   ```

2. **Execute Rollback:**
   ```bash
   docker-compose down
   # Restore from backup if needed
   ```

3. **Root Cause Analysis:**
   - Review logs for error patterns
   - Verify configuration files
   - Check system resources
   - Validate environment variables

---

**Last Updated:** 2025-07-07  
**Version:** 1.0 - Comprehensive Verification Checklist