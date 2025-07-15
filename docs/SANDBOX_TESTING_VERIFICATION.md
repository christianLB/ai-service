# GoCardless Sandbox Testing Verification

## Overview
This document provides a complete verification process for the GoCardless sandbox integration to ensure all components work correctly.

## Prerequisites
1. Backend running: `make dev-up`
2. Frontend running: `cd frontend && npm run dev`
3. GoCardless sandbox access token from https://manage-sandbox.gocardless.com/

## Step 1: Configure Sandbox via UI

1. Navigate to http://localhost:3000/dashboard/integrations
2. Click on the **GoCardless** tab
3. Configure the following:
   - **Sandbox Mode**: Toggle ON
   - **Redirect URI**: `http://localhost:3000/financial/callback`
   - **Sandbox Access Token**: Your token from GoCardless sandbox portal
   - **Sandbox test bank ID**: `SANDBOXFINANCE_SFIN0000` (or leave empty for default)
4. Click **Guardar** (Save)

## Step 2: Verify Configuration

Run the configuration check script:
```bash
npx ts-node scripts/check-gocardless-config.ts
```

Expected output:
```
✅ Configuration Check:
Sandbox Mode: ENABLED 🧪
✓ Sandbox access token is configured
✓ Redirect URI: http://localhost:3000/financial/callback
✓ GoCardless service is responding
  Mode: SANDBOX
  Environment: development
```

## Step 3: Test API Endpoints Directly

### 3.1 Check Sandbox Status
```bash
curl http://localhost:3000/api/financial/sandbox-status
```

Expected response:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "institutionId": "SANDBOXFINANCE_SFIN0000",
    "institutionName": "Sandbox Finance (Mock Bank)",
    "environment": "development",
    "testAccountsAvailable": true
  }
}
```

### 3.2 Create Sandbox Requisition
```bash
curl -X POST http://localhost:3000/api/financial/setup-sandbox
```

Expected response:
```json
{
  "success": true,
  "data": {
    "requisitionId": "xxx-xxx-xxx",
    "consentUrl": "https://...",
    "requisition": {...}
  }
}
```

## Step 4: Test via UI

1. Navigate to http://localhost:3000/dashboard
2. Go to **Bank Accounts** section
3. Click on **Connect Bank Account** button
4. You should see two options:
   - **BBVA** (for production)
   - **Sandbox Bank** (for testing)
5. Click on **Sandbox Bank**
6. The authorization window should open
7. Complete the mock authorization
8. Return to the dashboard
9. Click **Complete Setup**
10. Verify that dummy accounts and transactions are imported

## Step 5: Run Complete Workflow Test

Execute the comprehensive test script:
```bash
./scripts/test-sandbox-workflow.sh
```

This script will:
1. Check backend status
2. Verify GoCardless configuration
3. Test all API endpoints
4. Guide you through the authorization flow
5. Verify data import

## Step 6: Verify Data Import

After completing the setup, check imported data:

### Check Accounts
```bash
curl http://localhost:3000/api/financial/accounts
```

You should see sandbox accounts with institution_id = "SANDBOXFINANCE_SFIN0000"

### Check Transactions
```bash
curl http://localhost:3000/api/financial/transactions
```

You should see dummy transactions from the sandbox accounts

## Troubleshooting

### Frontend 404 Error
If you get a 404 error when clicking sandbox bank:
1. Ensure you're running the latest frontend build
2. Clear browser cache
3. Rebuild frontend: `cd frontend && npm run build`

### No Sandbox Token
If sandbox mode fails:
1. Log into https://manage-sandbox.gocardless.com/
2. Go to Developers → Access tokens
3. Generate a new token
4. Update configuration via UI

### Authorization Fails
If the authorization window doesn't work:
1. Check browser console for errors
2. Ensure redirect_uri matches exactly
3. Try incognito/private browsing mode

## Cleanup

To reset all sandbox data:
```bash
curl -X POST http://localhost:3000/api/financial/sandbox-reset
```

## Summary

The complete workflow should work as follows:
1. User configures sandbox credentials in UI
2. User clicks "Sandbox Bank" in Bank Accounts page
3. Frontend calls `/api/financial/setup-sandbox`
4. Backend creates requisition and returns consent URL
5. User completes authorization in new window
6. User clicks "Complete Setup"
7. Frontend calls `/api/financial/complete-setup`
8. Backend imports dummy accounts and transactions
9. User sees imported data in dashboard