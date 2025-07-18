# 🔌 MCP Integration for Claude Code

This document explains how to use the MCP Bridge Server with Claude Code to access AI Service capabilities.

## 🚀 Quick Start

### Setup Environment

```bash
# Set MCP endpoint (production)
export MCP_ENDPOINT=https://mcp.ai-service.anaxi.net

# Or for local development
export MCP_ENDPOINT=http://localhost:8080

# Set authentication (choose one)
export MCP_AUTH_TOKEN=your-jwt-token
# OR
export MCP_API_KEY=your-api-key
```

### Basic Usage

```bash
# List all available tools
python mcp-bridge/scripts/mcp-client.py list

# Get financial summary
python mcp-bridge/scripts/mcp-client.py tool get_financial_summary --period month

# Search documents
python mcp-bridge/scripts/mcp-client.py tool search_documents --query "invoice" --limit 5

# Check system status
python mcp-bridge/scripts/mcp-client.py tool get_system_status
```

## 📋 Common Tasks

### Financial Analysis

```bash
# Get account balance
python mcp-bridge/scripts/mcp-client.py tool get_account_balance

# Analyze expenses for current month
python mcp-bridge/scripts/mcp-client.py tool analyze_expenses \
  --startDate "2024-01-01" \
  --endDate "2024-01-31"

# Auto-categorize transactions
python mcp-bridge/scripts/mcp-client.py tool auto_categorize_transactions --limit 50

# Generate monthly report
python mcp-bridge/scripts/mcp-client.py tool generate_financial_report \
  --type monthly \
  --includeCharts true
```

### Document Management

```bash
# Search for contracts
python mcp-bridge/scripts/mcp-client.py tool search_documents \
  --query "contract" \
  --documentType pdf \
  --limit 10

# Ask question about specific document
python mcp-bridge/scripts/mcp-client.py tool ask_document_question \
  --documentId "doc-123" \
  --question "What are the payment terms?"

# Extract entities from documents
python mcp-bridge/scripts/mcp-client.py tool extract_document_entities \
  --json '{"documentIds": ["doc-123", "doc-456"], "entityTypes": ["person", "organization"]}'
```

### System Operations

```bash
# Health check
python mcp-bridge/scripts/mcp-client.py tool health_check --detailed true

# Get system metrics
python mcp-bridge/scripts/mcp-client.py tool get_system_metrics --includeHistory true

# View recent logs
python mcp-bridge/scripts/mcp-client.py tool get_service_logs \
  --service api \
  --level error \
  --lines 50
```

## 🔧 Advanced Usage

### Using JSON Parameters

For complex parameters, use the `--json` flag:

```bash
python mcp-bridge/scripts/mcp-client.py tool create_invoice --json '{
  "clientName": "Acme Corp",
  "clientEmail": "billing@acme.com",
  "items": [
    {
      "description": "Consulting Services",
      "quantity": 10,
      "unitPrice": 150,
      "taxRate": 0.21
    }
  ],
  "dueDate": "2024-02-15"
}'
```

### Batch Operations

```bash
# Create a script for batch operations
cat > batch_analysis.sh << 'EOF'
#!/bin/bash
MCP="python mcp-bridge/scripts/mcp-client.py tool"

# Get financial overview
$MCP get_financial_summary --period year

# Analyze each quarter
for quarter in Q1 Q2 Q3 Q4; do
  echo "Analyzing $quarter..."
  $MCP analyze_expenses --startDate "2024-${quarter}-01" --endDate "2024-${quarter}-31"
done

# Generate comprehensive report
$MCP generate_financial_report --type yearly --includeCharts true --includeForecast true
EOF

chmod +x batch_analysis.sh
./batch_analysis.sh
```

## 🔐 Authentication

### Option 1: JWT Token (Recommended)

```bash
# Get token from AI Service login
curl -X POST https://ai-service.anaxi.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "your-password"}' \
  | jq -r '.token'

# Set token
export MCP_AUTH_TOKEN=<token-from-above>
```

### Option 2: API Key

```bash
# Set API key (if configured)
export MCP_API_KEY=your-api-key
```

## 📝 Tool Reference

### Get Tool Information

```bash
# View detailed info about any tool
python mcp-bridge/scripts/mcp-client.py info <tool_name>

# Example
python mcp-bridge/scripts/mcp-client.py info get_transactions
```

### List Tools by Category

```bash
# Financial tools
python mcp-bridge/scripts/mcp-client.py list --category financial

# Document tools
python mcp-bridge/scripts/mcp-client.py list --category documents

# System tools
python mcp-bridge/scripts/mcp-client.py list --category system
```

## 🚨 Troubleshooting

### Connection Issues

```bash
# Test connection
curl $MCP_ENDPOINT/health

# Check server info
python mcp-bridge/scripts/mcp-client.py server
```

### Authentication Errors

```bash
# Verify token is valid
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" $MCP_ENDPOINT/mcp/info
```

### Rate Limiting

If you encounter rate limit errors, wait before retrying or contact admin to increase limits.

## 💡 Tips

1. **Use tab completion**: Set up aliases for common commands
2. **Save results**: Pipe output to files for analysis
3. **Combine tools**: Chain multiple tools for complex workflows
4. **Monitor usage**: Check rate limits with server info command

## 🔗 Useful Aliases

Add to your shell profile:

```bash
# MCP shortcuts
alias mcp='python ~/ai-service/mcp-bridge/scripts/mcp-client.py'
alias mcp-financial='mcp tool get_financial_summary --period'
alias mcp-search='mcp tool search_documents --query'
alias mcp-status='mcp tool get_system_status'

# Quick reports
alias daily-report='mcp tool get_financial_summary --period day'
alias weekly-report='mcp tool get_financial_summary --period week'
alias monthly-report='mcp tool get_financial_summary --period month'
```