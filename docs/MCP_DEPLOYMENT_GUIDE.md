# MCP Bridge Deployment Guide

## Overview

The MCP (Model Context Protocol) Bridge provides a standardized interface for Claude Code and other AI assistants to interact with the AI Service capabilities. This guide covers the deployment process and configuration.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Claude Code    │────▶│   MCP Bridge    │────▶│   AI Service    │
│  (Client)       │◀────│   (Port 8380)   │◀────│   (Port 8080)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Quick Start

### Local Development

1. **Build the project:**
   ```bash
   make mcp-build
   ```

2. **Start locally:**
   ```bash
   docker compose -f docker-compose.mcp-local.yml up -d
   ```

3. **Test the service:**
   ```bash
   curl http://localhost:8380/health
   ```

### Production Deployment

1. **Deploy to NAS:**
   ```bash
   make mcp-deploy
   ```

2. **Check status:**
   ```bash
   make mcp-status
   ```

3. **View logs:**
   ```bash
   make mcp-logs
   ```

## Configuration

### Environment Variables

Create a `.env` file in the mcp-bridge directory:

```env
# Server Configuration
NODE_ENV=production
PORT=8380
HOST=0.0.0.0

# Authentication
JWT_SECRET=your-secure-jwt-secret-at-least-32-chars
API_KEYS=key1:api-key-1,key2:api-key-2

# AI Service
AI_SERVICE_URL=http://ai-service:8080
AI_SERVICE_TIMEOUT=30000

# CORS
CORS_ORIGINS=http://localhost:3000,http://192.168.1.11:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Generate API Keys

```bash
cd mcp-bridge
./scripts/generate-api-keys.sh
```

## Available Tools

The MCP Bridge exposes 24 tools across 3 categories:

### Financial Tools (9)
- `get_financial_summary` - Get comprehensive financial overview
- `get_account_balance` - Get account balances
- `analyze_expenses` - Analyze expenses by category
- `get_transactions` - Get filtered transactions
- `create_invoice` - Create new invoices
- `categorize_transaction` - Categorize transactions
- `auto_categorize_transactions` - Auto-categorize using AI
- `generate_financial_report` - Generate PDF reports
- `sync_financial_data` - Sync with GoCardless

### Document Tools (7)
- `search_documents` - Semantic document search
- `analyze_document` - AI document analysis
- `ask_document_question` - Q&A on documents
- `get_document_details` - Get document metadata
- `extract_document_entities` - Extract named entities
- `generate_document_summary` - Generate summaries
- `compare_documents` - Compare multiple documents

### System Tools (8)
- `get_system_status` - System health status
- `get_neural_status` - Neural components status
- `get_system_metrics` - Performance metrics
- `trigger_backup` - Manual backup trigger
- `clear_cache` - Clear system caches
- `get_service_logs` - Retrieve service logs
- `health_check` - Comprehensive health check
- `restart_service` - Restart system services

## Using the Python Client

### List all tools:
```bash
MCP_ENDPOINT=http://localhost:8380 \
MCP_API_KEY=your-api-key \
python3 scripts/mcp-client.py list
```

### Execute a tool:
```bash
MCP_ENDPOINT=http://localhost:8380 \
MCP_API_KEY=your-api-key \
python3 scripts/mcp-client.py tool health_check
```

### With parameters:
```bash
MCP_ENDPOINT=http://localhost:8380 \
MCP_API_KEY=your-api-key \
python3 scripts/mcp-client.py tool get_transactions \
  --limit 10 \
  --category "Food"
```

## Docker Configuration

### Production (docker-compose.mcp.yml)
```yaml
version: '3.8'

services:
  mcp-bridge:
    image: mcp-bridge:latest
    container_name: mcp-bridge
    restart: unless-stopped
    ports:
      - "8380:8080"
    environment:
      - NODE_ENV=production
    volumes:
      - /volume1/docker/ai-service-mcp/logs:/app/logs
      - /volume1/docker/ai-service-mcp/config/.env:/app/config/.env:ro
    networks:
      - ai-service-network
```

## Monitoring

### Health Check
```bash
curl http://192.168.1.11:8380/health
```

### Metrics
```bash
curl http://192.168.1.11:8380/mcp/info
```

### Tool Statistics
```bash
make mcp-status
```

## Maintenance

### View logs:
```bash
make mcp-logs
```

### Clean old logs:
```bash
make mcp-clean-logs
```

### Backup configuration:
```bash
make mcp-backup
```

### Restart service:
```bash
make mcp-restart
```

## Troubleshooting

### Common Issues

1. **Authentication errors:**
   - Ensure JWT_SECRET is at least 32 characters
   - Check API_KEYS format: `name:key,name2:key2`

2. **Connection to AI Service failed:**
   - Verify AI_SERVICE_URL is correct
   - Check Docker network connectivity
   - Ensure AI Service is running

3. **Rate limiting:**
   - Check rate limit configuration
   - Monitor usage patterns
   - Adjust limits if needed

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
```

### Test individual tools:
```bash
# Test without auth
curl http://localhost:8380/mcp/tools/health_check/execute \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}'

# Test with API key
curl http://localhost:8380/mcp/tools/get_system_status/execute \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{}'
```

## Security

1. **API Keys:** Always use strong, randomly generated API keys
2. **JWT Secret:** Must be at least 32 characters, keep secure
3. **Network:** Use Docker networks for internal communication
4. **CORS:** Configure allowed origins restrictively
5. **Rate Limiting:** Adjust based on usage patterns

## Next Steps

1. Configure reverse proxy for HTTPS
2. Set up monitoring alerts
3. Implement log rotation
4. Configure automated backups
5. Set up CI/CD pipeline