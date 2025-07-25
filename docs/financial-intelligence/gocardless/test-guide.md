# GoCardless Testing Scripts Guide

This guide explains how to use the GoCardless testing scripts to diagnose and fix authentication issues.

## Prerequisites

1. Ensure the backend is running:
   ```bash
   make dev-up
   ```

2. Make sure you have GoCardless credentials configured in the database.

## Available Scripts

### 1. diagnose-gocardless-auth.ts
**Purpose**: Comprehensive diagnosis of GoCardless authentication issues

**Usage**:
```bash
npx ts-node scripts/diagnose-gocardless-auth.ts
```

**What it does**:
- Tests database connection
- Reads and validates credential format
- Tests direct authentication with GoCardless
- Tests service endpoints
- Tries different GoCardless URLs
- Provides detailed recommendations

**When to use**: When you get 401 errors or authentication fails

### 2. verify-gocardless-creds.ts
**Purpose**: Detailed credential verification and format checking

**Usage**:
```bash
npx ts-node scripts/verify-gocardless-creds.ts
```

**What it does**:
- Shows current credentials (obfuscated)
- Checks for format issues (UUID, length, whitespace)
- Tests authentication directly
- Offers to test against different environments
- Provides fixing guidance

**When to use**: When you suspect credential format issues

### 3. test-bbva-setup.ts
**Purpose**: Test the complete BBVA account setup flow

**Usage**:
```bash
npx ts-node scripts/test-bbva-setup.ts
```

**What it does**:
- Checks service health
- Tests GoCardless connection
- Creates BBVA requisition
- Guides through authorization
- Completes setup
- Verifies imported accounts

**When to use**: To test the full setup flow end-to-end

## Troubleshooting Flow

1. **First, run the diagnostic script**:
   ```bash
   npx ts-node scripts/diagnose-gocardless-auth.ts
   ```
   This will identify the main issues.

2. **If credential format issues are found**:
   ```bash
   npx ts-node scripts/verify-gocardless-creds.ts
   ```
   This will help you fix format problems.

3. **Once credentials are working, test the full flow**:
   ```bash
   npx ts-node scripts/test-bbva-setup.ts
   ```
   This will create a requisition and guide you through setup.

## Common Issues and Solutions

### 401 Authentication Error
- **Cause**: Invalid credentials
- **Solution**: 
  1. Run `diagnose-gocardless-auth.ts`
  2. Check if credentials are from the correct environment
  3. Regenerate credentials in GoCardless dashboard if needed

### Format Validation Errors
- **UUID Format Error**: Secret ID must be in format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Length Error**: Secret Key must be exactly 43 characters
- **Whitespace Error**: Remove any leading/trailing spaces

### Wrong Environment
- **Symptom**: Credentials work with one URL but not another
- **Solution**: Update `base_url` config to match your credentials:
  - Production: `https://bankaccountdata.gocardless.com/api/v2`
  - Sandbox: `https://bankaccountdata-sandbox.gocardless.com/api/v2`

## Updating Credentials

To update credentials via API:

```bash
# Update secret_id
curl -X POST http://localhost:3000/api/integrations/configs \
  -H "Content-Type: application/json" \
  -d '{
    "integrationType": "gocardless",
    "configKey": "secret_id",
    "configValue": "your-secret-id",
    "isGlobal": true,
    "encrypt": true
  }'

# Update secret_key
curl -X POST http://localhost:3000/api/integrations/configs \
  -H "Content-Type: application/json" \
  -d '{
    "integrationType": "gocardless",
    "configKey": "secret_key",
    "configValue": "your-secret-key",
    "isGlobal": true,
    "encrypt": true
  }'

# Update base_url (if needed)
curl -X POST http://localhost:3000/api/integrations/configs \
  -H "Content-Type: application/json" \
  -d '{
    "integrationType": "gocardless",
    "configKey": "base_url",
    "configValue": "https://bankaccountdata.gocardless.com/api/v2",
    "isGlobal": true,
    "encrypt": false
  }'
```

## Notes

- All scripts will close database connections properly
- Scripts provide detailed logging for debugging
- Credentials are always shown obfuscated for security
- The diagnostic endpoint (`/api/financial/diagnose-gocardless`) is also available via API