# GoCardless Sandbox Testing Guide

## Overview

The AI Service now includes support for GoCardless sandbox testing, allowing you to test the complete financial data integration flow using mock bank data without connecting to real bank accounts.

## 🧪 What is Sandbox Mode?

Sandbox mode uses GoCardless's mock bank institution called "Sandbox Finance" (`SANDBOXFINANCE_SFIN0000`) to simulate:
- Bank account connections
- Authorization flows
- Transaction data ingestion
- Account balance updates

All without touching real financial data!

## 🚀 Quick Start

### 1. Enable Sandbox Mode

Set the following environment variables in your `.env.local`:

```bash
# Enable sandbox mode
GO_SANDBOX_MODE=true

GO_SANDBOX_INSTITUTION_ID=SANDBOXFINANCE_SFIN0000
GO_SANDBOX_ACCESS_TOKEN=your_sandbox_access_token

# Your regular GoCardless credentials still required
GO_SECRET_ID=your_secret_id
GO_SECRET_KEY=your_secret_key
```

### 2. Start the Development Server

```bash
make dev-up
```

### 3. Check Sandbox Status

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
  },
  "metadata": {
    "message": "🧪 Sandbox mode is ACTIVE - using mock bank data"
  }
}
```

## 🔑 Using Real Sandbox Credentials

Follow these steps to configure sandbox mode with your actual GoCardless sandbox credentials:

1. Sign up or log in at [GoCardless Sandbox](https://manage-sandbox.gocardless.com).
2. Create an access token under **Developers → Access tokens**.
3. Note the `secret_id` and `secret_key` from **Developers → API credentials**.
4. Update your `.env.local` with the credentials:

```bash
GO_SANDBOX_MODE=true
GO_SANDBOX_INSTITUTION_ID=SANDBOXFINANCE_SFIN0000
GO_SANDBOX_ACCESS_TOKEN=<your_sandbox_access_token>
GO_SECRET_ID=<your_sandbox_secret_id>
GO_SECRET_KEY=<your_sandbox_secret_key>
```

5. Start the development server:

```bash
make dev-up
```

6. Validate the configuration:

```bash
curl http://localhost:3000/api/financial/sandbox-status
```

The response should show `"enabled": true` and the sandbox institution details.

## 📋 Complete Testing Flow

### Step 1: Initialize Sandbox Account

```bash
curl -X POST http://localhost:3000/api/financial/setup-sandbox
```

This returns:
- `requisitionId`: The ID for tracking this connection
- `consentUrl`: URL to complete mock authorization
- Instructions for next steps

### Step 2: Complete Mock Authorization

1. Open the `consentUrl` in your browser
2. Follow the GoCardless sandbox authorization flow
3. Use any mock credentials (GoCardless sandbox accepts any input)
4. Complete the authorization

### Step 3: Complete Setup

After authorization, complete the setup:

```bash
curl -X POST http://localhost:3000/api/financial/complete-setup \
  -H "Content-Type: application/json" \
  -d '{"requisitionId": "YOUR_REQUISITION_ID"}'
```

### Step 4: View Mock Data

Check imported accounts:
```bash
curl http://localhost:3000/api/financial/accounts
```

Check imported transactions:
```bash
curl http://localhost:3000/api/financial/transactions
```

## 🔧 API Endpoints

### Sandbox-Specific Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/financial/sandbox-status` | GET | Check sandbox mode configuration |
| `/api/financial/setup-sandbox` | POST | Initialize sandbox account connection |
| `/api/financial/sandbox-reset` | POST | Reset all sandbox data |

### Regular Endpoints (Work with Sandbox)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/financial/setup-bbva` | POST | In sandbox mode, uses mock bank |
| `/api/financial/complete-setup` | POST | Complete setup after authorization |
| `/api/financial/requisition-status/:id` | GET | Check authorization status |
| `/api/financial/accounts` | GET | List all accounts (including sandbox) |
| `/api/financial/transactions` | GET | List all transactions |

## 🧹 Resetting Sandbox Data

To clean up and start fresh:

```bash
curl -X POST http://localhost:3000/api/financial/sandbox-reset
```

This will delete all accounts and transactions associated with the sandbox institution.

## 🛠️ Using Test Helpers

A test helper utility is available for automated testing:

```javascript
// Import the test helper
import { SandboxTestHelper } from './src/utils/sandbox-test-helper';

// Create instance
const tester = new SandboxTestHelper({
  baseUrl: 'http://localhost:3000'
});

// Run complete test flow
const result = await tester.runCompleteTestFlow();

// Or run individual steps
const status = await tester.checkSandboxStatus();
const setup = await tester.setupSandboxAccount();
const complete = await tester.completeSandboxSetup(requisitionId);
```

## 📝 Test Script

Run the automated test script:

```bash
npm run test:sandbox
# or
./scripts/test-sandbox.sh
```

## ⚠️ Important Notes

1. **Development Only**: Sandbox mode only works when `NODE_ENV=development`
2. **Mock Data**: All data from Sandbox Finance is mock/test data
3. **No Real Transactions**: No real financial transactions are processed
4. **Clear Indicators**: All sandbox responses include 🧪 emoji and clear messages
5. **Separate Data**: Sandbox accounts are tracked with `institution_id = SANDBOXFINANCE_SFIN0000`

## 🔍 Troubleshooting

### Sandbox Mode Not Working

1. Check environment variables:
   ```bash
   echo $GO_SANDBOX_MODE          # Should be "true"
   echo $GO_SANDBOX_INSTITUTION_ID  # Should be "SANDBOXFINANCE_SFIN0000"
   echo $GO_SANDBOX_ACCESS_TOKEN   # Should show your access token
   echo $NODE_ENV                 # Should be "development"
   ```

2. Verify configuration:
   ```bash
   curl http://localhost:3000/api/financial/sandbox-status
   ```

### Authorization Issues

- Ensure you're using the sandbox consent URL
- Complete the full authorization flow
- Check requisition status before completing setup

### No Mock Data

- GoCardless sandbox provides limited mock transactions
- Data may vary between test sessions
- Use the transaction sync endpoint to refresh

## 🎯 Use Cases

1. **Development Testing**: Test the complete flow without real bank accounts
2. **CI/CD Integration**: Automated tests using sandbox mode
3. **Demo Environment**: Show functionality without real data
4. **Feature Development**: Build and test new features safely
5. **Onboarding**: Let new developers explore without risk

## 📚 Additional Resources

- [GoCardless Sandbox Documentation](https://developer.gocardless.com/bank-account-data/sandbox)
- [GoCardless API Reference](https://developer.gocardless.com/api-reference)
- [Project README](../README.md)

## 🤝 Contributing

When adding new financial features:
1. Always test in sandbox mode first
2. Add sandbox-specific test cases
3. Document any sandbox limitations
4. Update this guide if needed

---

Happy Testing! 🧪🚀
