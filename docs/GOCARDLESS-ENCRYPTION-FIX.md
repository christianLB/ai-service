# GoCardless Encryption Key Fix Guide

## Problem Summary

GoCardless manual transaction sync fails with "no configured credentials" error, even though credentials exist in the database. The root cause is that the credentials were encrypted with a different key than what the application currently uses.

## Root Cause

1. GoCardless credentials were encrypted with an unknown key (not the current `JWT_SECRET`)
2. When the application tries to decrypt them, it gets a "bad decrypt" error
3. The service interprets this as "no credentials configured"

## Solution: Implement INTEGRATION_CONFIG_KEY

### Step 1: Generate a New Integration Key

```bash
# Generate a secure 32-character key and update .env.local automatically
node scripts/generate-integration-key.js --update

# Or generate without updating (to add manually)
node scripts/generate-integration-key.js
```

### Step 2: Update Docker Configuration

The key has already been added to `docker-compose.dev.yml`:

```yaml
environment:
  - INTEGRATION_CONFIG_KEY=${INTEGRATION_CONFIG_KEY:-ai-service-integration-key-2025!}
```

### Step 3: Re-encrypt Existing Credentials

```bash
# Test what will be changed (dry run)
node scripts/re-encrypt-credentials.js --dry-run

# Actually re-encrypt credentials
node scripts/re-encrypt-credentials.js
```

**Note**: This will successfully re-encrypt credentials that were encrypted with the current `JWT_SECRET`, but GoCardless credentials will fail because they use an unknown key.

### Step 4: Reset GoCardless Credentials

Since the original encryption key is unknown, you'll need to reset the GoCardless credentials:

```bash
# Interactive script to reset and optionally set new credentials
node scripts/reset-gocardless-credentials.js
```

Or manually set them:

```bash
# Get credentials from https://bankaccountdata.gocardless.com/
# Navigate to User Secrets section

# Set using the CLI tool
node scripts/set-config-key.js gocardless secret_id "your-uuid-here" --global
node scripts/set-config-key.js gocardless secret_key "your-43-char-key-here" --global
```

### Step 5: Restart Services

```bash
# Restart Docker containers to load new environment variable
make dev-down
make dev-up
```

### Step 6: Test the Fix

```bash
# Check GoCardless status
curl http://localhost:3001/api/financial/gocardless/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test manual sync (be careful of rate limits)
curl -X POST http://localhost:3001/api/financial/sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Key Benefits

1. **Consistent Encryption**: All environments use the same `INTEGRATION_CONFIG_KEY`
2. **Separation of Concerns**: JWT tokens and integration configs use different keys
3. **Future Proof**: Easy to rotate the integration key without affecting JWT tokens
4. **Clear Intent**: The key name clearly indicates its purpose

## Scripts Created

1. **`generate-integration-key.js`**: Generates secure 32-character keys and updates .env.local
2. **`re-encrypt-credentials.js`**: Re-encrypts credentials with the new key
3. **`reset-gocardless-credentials.js`**: Helps reset GoCardless credentials when original key is lost
4. **`test-gocardless-decrypt.js`**: Tests decryption with various keys (for debugging)

## Environment Variables

Add to `.env.local`:
```env
# Integration Configuration Encryption Key
# This key is used to encrypt sensitive integration configurations like API keys
# Must be exactly 32 characters for AES-256 encryption
INTEGRATION_CONFIG_KEY=your-32-character-key-here
```

## Security Notes

1. Never commit the actual `INTEGRATION_CONFIG_KEY` to version control
2. Use different keys for different environments (dev, staging, production)
3. Rotate keys periodically and re-encrypt credentials
4. Keep the key length at exactly 32 characters for AES-256 encryption

## Troubleshooting

### "bad decrypt" errors
- The credential was encrypted with a different key
- Use `reset-gocardless-credentials.js` to remove and re-add

### "No credentials configured"
- Check if credentials exist: `SELECT * FROM financial.integration_configs WHERE integration_type = 'gocardless'`
- Verify the INTEGRATION_CONFIG_KEY is set in environment
- Ensure Docker containers were restarted after adding the key

### Testing decryption
```bash
# Test which key can decrypt existing credentials
node scripts/test-gocardless-decrypt.js
```