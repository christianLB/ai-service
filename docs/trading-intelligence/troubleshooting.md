# Trading Intelligence Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common issues with the Trading Intelligence module. Always check logs and system status before attempting fixes.

## Quick Diagnostics

### System Health Check

```bash
# Check all trading services
curl http://localhost:3001/api/trading/health

# Check specific components
make trading-health

# View recent logs
make trading-logs

# Check database connections
make check-db-trading
```

### Debug Mode

Enable detailed logging:

```env
# In .env.local
LOG_LEVEL=debug
TRADING_DEBUG=true
TRADING_VERBOSE_LOGS=true
```

## Common Issues

### 1. Exchange Connection Problems

#### Symptom: "Exchange not connected" error

**Possible Causes**:
- Invalid API credentials
- IP not whitelisted
- Rate limiting
- Network issues

**Solutions**:

1. **Verify API Keys**:
   ```bash
   # Test connection
   curl -X POST http://localhost:3001/api/trading/exchanges/test \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"exchange": "binance"}'
   ```

2. **Check IP Whitelist**:
   - Login to exchange
   - Navigate to API settings
   - Add server IP to whitelist

3. **Rate Limit Issues**:
   ```typescript
   // Temporary: Increase delay between requests
   EXCHANGE_REQUEST_DELAY=1000 # milliseconds
   ```

#### Symptom: "Insufficient permissions" error

**Solution**:
Ensure API key has required permissions:
- Spot trading
- Reading account info
- Reading market data

### 2. Trading Execution Issues

#### Symptom: Orders failing with "Insufficient balance"

**Diagnostics**:
```bash
# Check actual balance
curl http://localhost:3001/api/trading/exchanges/binance/balance \
  -H "Authorization: Bearer $TOKEN"

# Check position sizes
curl http://localhost:3001/api/trading/risk/parameters \
  -H "Authorization: Bearer $TOKEN"
```

**Solutions**:
1. Reduce position size in risk parameters
2. Check for locked funds in open orders
3. Account for trading fees

#### Symptom: "Order rejected" errors

**Common Reasons**:
- Price outside valid range
- Minimum order size not met
- Market closed
- Invalid symbol

**Debug Steps**:
```javascript
// Enable order validation logging
{
  "logging": {
    "orderValidation": true,
    "exchangeResponses": true
  }
}
```

### 3. Strategy Problems

#### Symptom: Strategy not generating signals

**Diagnostics**:
```bash
# Check strategy status
curl http://localhost:3001/api/trading/strategies/$STRATEGY_ID \
  -H "Authorization: Bearer $TOKEN"

# View strategy logs
docker logs ai-service-api 2>&1 | grep "strategy"
```

**Common Issues**:
1. **Insufficient market data**:
   ```bash
   # Check data collection
   curl http://localhost:3001/api/trading/market-data/status
   ```

2. **Invalid parameters**:
   ```typescript
   // Validate strategy config
   npm run trading:validate-strategies
   ```

3. **Market conditions**:
   - Strategy waiting for entry conditions
   - Risk limits preventing trades

#### Symptom: Poor strategy performance

**Analysis Tools**:
```bash
# Generate performance report
curl http://localhost:3001/api/trading/performance/analysis \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"strategyId": "$STRATEGY_ID", "period": "30d"}'

# Run backtest with current parameters
npm run trading:backtest -- --strategy=$STRATEGY_ID
```

### 4. Database Issues

#### Symptom: "Database connection timeout"

**Check InfluxDB**:
```bash
# Test InfluxDB connection
curl http://localhost:8086/health

# Check disk space
df -h | grep influxdb

# View InfluxDB logs
docker logs influxdb
```

**Solutions**:
1. Restart InfluxDB:
   ```bash
   docker restart influxdb
   ```

2. Clear old data:
   ```bash
   # Delete data older than 30 days
   influx delete --bucket market-data \
     --start 1970-01-01T00:00:00Z \
     --stop $(date -d '30 days ago' --iso-8601)
   ```

#### Symptom: "Vector database error" (Qdrant)

**Check Qdrant**:
```bash
# Test connection
curl http://localhost:6333/collections

# Check disk usage
docker exec qdrant df -h

# Restart if needed
docker restart qdrant
```

### 5. Performance Issues

#### Symptom: Slow trade execution

**Diagnostics**:
```typescript
// Enable performance monitoring
{
  "monitoring": {
    "traceExecutions": true,
    "slowQueryThreshold": 1000
  }
}
```

**Common Causes**:
1. **Network latency**:
   ```bash
   # Test exchange latency
   ping api.binance.com
   ```

2. **Database queries**:
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   WHERE mean_time > 1000 
   ORDER BY mean_time DESC;
   ```

3. **Memory issues**:
   ```bash
   # Check Node.js memory
   docker stats ai-service-api
   ```

#### Symptom: High CPU usage

**Solutions**:
1. Reduce market data frequency
2. Optimize strategy calculations
3. Enable caching:
   ```typescript
   ENABLE_MARKET_DATA_CACHE=true
   CACHE_TTL=60 # seconds
   ```

### 6. Risk Management Issues

#### Symptom: Emergency stop triggered unexpectedly

**Check triggers**:
```bash
# View risk events
curl http://localhost:3001/api/trading/risk/events \
  -H "Authorization: Bearer $TOKEN"

# Check current risk metrics
curl http://localhost:3001/api/trading/risk/metrics \
  -H "Authorization: Bearer $TOKEN"
```

**Common Triggers**:
- Daily loss limit exceeded
- Multiple stop losses hit
- Technical errors
- Manual intervention

#### Symptom: Positions exceeding limits

**Verify configuration**:
```typescript
// Check all risk parameters
{
  maxPositionSize: 0.10,      // 10% per position
  maxTotalExposure: 0.50,     // 50% total
  maxOpenPositions: 5,        // 5 concurrent
  // Ensure these match your intentions
}
```

### 7. AI/ML Issues

#### Symptom: "OpenAI API error"

**Solutions**:
1. Check API key:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

2. Monitor usage:
   ```bash
   # Check rate limits
   curl http://localhost:3001/api/trading/ai/usage
   ```

3. Fallback mode:
   ```env
   AI_FALLBACK_MODE=true
   ```

## Error Reference

### API Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| EXCH001 | Exchange not found | Configure exchange in settings |
| EXCH002 | Invalid credentials | Check API key and secret |
| EXCH003 | Rate limit exceeded | Wait and retry, increase delays |
| RISK001 | Position size exceeded | Reduce order amount |
| RISK002 | Daily loss limit hit | Wait for next day or adjust limits |
| STRAT001 | Strategy not found | Check strategy ID |
| STRAT002 | Invalid parameters | Review strategy configuration |
| DATA001 | No market data | Start data collection |
| DATA002 | Stale data | Check data feed connection |

### WebSocket Errors

| Event | Description | Action |
|-------|-------------|--------|
| connection_failed | Can't connect to WS | Check network, auth token |
| auth_failed | Invalid token | Refresh JWT token |
| subscription_failed | Can't subscribe | Check channel name, permissions |
| rate_limited | Too many messages | Reduce message frequency |

## Recovery Procedures

### 1. Full System Reset

```bash
# Stop all trading
make trading-stop

# Clear temporary data
make trading-clean-cache

# Restart services
make trading-restart

# Verify health
make trading-health
```

### 2. Database Recovery

```bash
# Backup current state
make trading-backup

# Reset connections
make db-reset-connections

# Repair tables if needed
npm run trading:db:repair

# Verify integrity
npm run trading:db:check
```

### 3. Strategy Reset

```bash
# Disable all strategies
npm run trading:strategies:disable-all

# Reset strategy states
npm run trading:strategies:reset

# Re-enable one by one
npm run trading:strategies:enable -- --id=$STRATEGY_ID
```

## Monitoring & Alerts

### Log Locations

```bash
# Application logs
/var/log/ai-service/trading.log
/var/log/ai-service/error.log

# Exchange logs
/var/log/ai-service/exchanges/

# Strategy logs
/var/log/ai-service/strategies/

# Docker logs
docker logs ai-service-api
docker logs influxdb
docker logs qdrant
```

### Key Metrics to Monitor

1. **System Health**:
   - API response time < 200ms
   - Database query time < 50ms
   - WebSocket latency < 100ms

2. **Trading Metrics**:
   - Order success rate > 95%
   - Signal generation frequency
   - Position count vs limits

3. **Risk Metrics**:
   - Current drawdown
   - Daily P&L
   - Exposure percentage

### Alert Configuration

```yaml
alerts:
  - name: "High Loss Alert"
    condition: "daily_loss > 3%"
    action: "email,telegram"
    
  - name: "System Error"
    condition: "error_rate > 5%"
    action: "telegram,emergency_stop"
    
  - name: "Connection Lost"
    condition: "exchange_connected = false"
    action: "email,retry_connection"
```

## Getting Help

### 1. Enable Debug Logging
```env
LOG_LEVEL=debug
TRADING_DEBUG=true
```

### 2. Collect Diagnostics
```bash
npm run trading:diagnostics
```

### 3. Check Documentation
- Architecture: `/docs/trading-intelligence/architecture.md`
- API Reference: `/docs/trading-intelligence/api-reference.md`
- Security: `/docs/trading-intelligence/security.md`

### 4. Contact Support
Include:
- Error messages
- Log excerpts
- Steps to reproduce
- System configuration

## Preventive Maintenance

### Daily
- Check system health
- Review error logs
- Monitor performance

### Weekly
- Update dependencies
- Clean old logs
- Optimize database

### Monthly
- Full system backup
- Security review
- Performance analysis
- Strategy evaluation