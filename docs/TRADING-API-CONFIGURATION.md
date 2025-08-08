# Trading API Configuration Guide

This guide explains how to configure exchange API keys securely using the Integration Config Service.

## 🔐 Security Overview

- **No Environment Variables**: API keys are NOT stored in `.env` files
- **Database Storage**: All keys stored encrypted in PostgreSQL
- **AES-256-CBC Encryption**: Military-grade encryption for sensitive data
- **Per-User Support**: Each user can have their own API keys
- **Global Config**: Admin can set default keys for all users

## 📋 API Endpoints

### Configure Exchange API Keys

**Endpoint**: `POST /api/integrations/config/batch`  
**Auth**: Required (Bearer token)

```bash
# Configure Binance
curl -X POST http://localhost:3001/api/integrations/config/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "integrationType": "trading_binance",
    "configs": {
      "api_key": "your_binance_api_key",
      "secret": "your_binance_secret_key",
      "testnet": "false"
    }
  }'

# Configure Coinbase
curl -X POST http://localhost:3001/api/integrations/config/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "integrationType": "trading_coinbase",
    "configs": {
      "api_key": "your_coinbase_api_key",
      "secret": "your_coinbase_secret_key",
      "passphrase": "your_coinbase_passphrase",
      "testnet": "false"
    }
  }'

# Configure Alpaca
curl -X POST http://localhost:3001/api/integrations/config/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "integrationType": "trading_alpaca",
    "configs": {
      "api_key": "your_alpaca_api_key",
      "secret": "your_alpaca_secret_key",
      "testnet": "true"
    }
  }'
```

### Get Exchange Configuration

**Endpoint**: `GET /api/integrations/config/{integrationType}`  
**Auth**: Required

```bash
# Check Binance config (returns masked values)
curl http://localhost:3001/api/integrations/config/trading_binance \
  -H "Authorization: Bearer $TOKEN"

# Response
{
  "success": true,
  "configs": {
    "api_key": "bin***key",
    "secret": "***",
    "testnet": "false"
  }
}
```

### Test Exchange Connection

**Endpoint**: `GET /api/connectors/{exchange}/test`  
**Auth**: Required

```bash
# Test Binance connection
curl http://localhost:3001/api/connectors/binance/test \
  -H "Authorization: Bearer $TOKEN"

# Response
{
  "success": true,
  "connected": true,
  "exchange": "binance",
  "message": "Successfully connected to Binance"
}
```

### Delete Exchange Configuration

**Endpoint**: `DELETE /api/integrations/config/{integrationType}/{configKey}`  
**Auth**: Required

```bash
# Remove specific config
curl -X DELETE http://localhost:3001/api/integrations/config/trading_binance/api_key \
  -H "Authorization: Bearer $TOKEN"
```

## 🔑 Integration Types

Each exchange has a specific integration type identifier:

| Exchange | Integration Type | Required Keys |
|----------|-----------------|---------------|
| Binance | `trading_binance` | api_key, secret |
| Coinbase | `trading_coinbase` | api_key, secret, passphrase |
| Alpaca | `trading_alpaca` | api_key, secret |
| Kraken | `trading_kraken` | api_key, secret |

## 🛡️ Security Best Practices

### API Key Generation

1. **Binance**:
   - Enable only "Enable Reading" and "Enable Spot Trading"
   - Do NOT enable withdrawals
   - Restrict IP if possible
   - Set API key label for identification

2. **Coinbase**:
   - Create portfolio-specific API key
   - Grant only "trade" permissions
   - Save the passphrase securely
   - Enable IP whitelist

3. **Alpaca**:
   - Use paper trading keys first
   - Create separate keys for live trading
   - Enable only trading permissions
   - Use OAuth if available

### Storage Security

- Keys are encrypted before database storage
- Encryption key derived from `INTEGRATION_CONFIG_KEY` or JWT secret
- Each value encrypted with unique IV
- Decryption happens only in-memory
- Cache cleared every 5 minutes

## 🧪 Testing Workflow

### 1. Paper Trading Setup

```bash
# Configure with testnet/paper trading
curl -X POST http://localhost:3001/api/integrations/config/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "integrationType": "trading_binance",
    "configs": {
      "api_key": "testnet_api_key",
      "secret": "testnet_secret",
      "testnet": "true"
    }
  }'
```

### 2. Verify Connection

```bash
# Test each exchange
for exchange in binance coinbase alpaca; do
  echo "Testing $exchange..."
  curl http://localhost:3001/api/connectors/$exchange/test \
    -H "Authorization: Bearer $TOKEN"
done
```

### 3. Check Arbitrage Status

```bash
# See which exchanges are ready
curl http://localhost:3001/api/arbitrage/status \
  -H "Authorization: Bearer $TOKEN"

# Response shows connected exchanges
{
  "success": true,
  "data": {
    "connectedExchanges": ["binance", "coinbase"],
    "canRunArbitrage": true,
    "strategies": []
  }
}
```

## 🚀 Quick Start Commands

```bash
# 1. Get auth token
TOKEN=$(make auth-token 2>/dev/null | grep -oP 'Token: \K.*')

# 2. Configure all exchanges at once
./scripts/configure-exchanges.sh

# 3. Deploy arbitrage bot
curl -X POST http://localhost:3001/api/arbitrage/deploy \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"paperTrading": true}'

# 4. Monitor profits
watch -n 10 "curl -s http://localhost:3001/api/arbitrage/profits \
  -H 'Authorization: Bearer $TOKEN' | jq"
```

## 🔍 Troubleshooting

### "Exchange not connected"
- Check API keys are configured correctly
- Verify testnet setting matches your keys
- Check exchange API service status
- Review logs: `make trading-logs`

### "Invalid API Key"
- Regenerate keys on exchange
- Ensure no extra spaces in configuration
- Check if IP restrictions are blocking
- Verify permissions are set correctly

### "Rate limit exceeded"
- Reduce request frequency
- Check `checkIntervalMs` in strategy parameters
- Enable rate limiting in exchange config
- Use WebSocket subscriptions instead

## 📊 Database Schema

Configuration stored in `financial.integration_configs`:

```sql
CREATE TABLE financial.integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    integration_type VARCHAR(50) NOT NULL,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT true,
    is_global BOOLEAN DEFAULT false,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔗 Related Documentation

- [Trading Revenue Roadmap](./TRADING-REVENUE-ROADMAP.md)
- [Integration Service](../src/services/integrations/README.md)
- [Trading Connector Service](../src/services/trading/README.md)