# GoCardless Bank Account Data API

## Overview

GoCardless Bank Account Data API provides PSD2-compliant access to bank account information across 2,500+ banks in the UK and Europe. In our AI Service, we use GoCardless to fetch real banking data for financial analysis, transaction categorization, and invoice reconciliation.

### Key Features We Use
- 🏦 Real-time bank account access
- 💰 Balance retrieval
- 📊 Transaction history (up to 24 months)
- 🔐 PSD2-compliant authentication
- 🌍 Multi-bank support (BBVA, Santander, etc.)

## Quick Start

### Environment Variables
```bash
# These are now managed through the database
# Use the integration settings API to configure:
# - GOCARDLESS_SECRET_ID
# - GOCARDLESS_SECRET_KEY
```

### Our Implementation Files
- **Main Service**: `src/services/financial/gocardless.service.ts`
- **Integration Config**: `src/services/integrations/integration-config.service.ts`
- **API Routes**: `src/routes/financial/dashboard.routes.ts`
- **Types**: `src/types/financial/gocardless.types.ts`

## Our Implementation

### 1. Authentication Flow

```typescript
// From gocardless.service.ts
private async getAccessToken(): Promise<string> {
  const cacheKey = 'gocardless_access_token';
  const cached = this.tokenCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const credentials = await this.integrationConfig.getDecryptedSecrets(
    'gocardless',
    this.userId
  );

  const response = await axios.post('/api/v2/token/new/', {
    secret_id: credentials.secret_id,
    secret_key: credentials.secret_key
  });

  // Cache for 23 hours (tokens valid for 24)
  this.tokenCache.set(cacheKey, response.data.access, 82800);
  
  return response.data.access;
}
```

### 2. Bank Account Linking (Requisitions)

```typescript
// Create requisition for bank account linking
async createRequisition(institutionId: string): Promise<Requisition> {
  const response = await this.request('POST', '/requisitions/', {
    institution_id: institutionId,
    redirect: `${process.env.DASHBOARD_URL}/banking/callback`,
    reference: `user_${this.userId}_${Date.now()}`
  });

  // Store requisition in database
  await this.database.createRequisition({
    userId: this.userId,
    requisitionId: response.data.id,
    institutionId,
    status: 'CR'
  });

  return response.data;
}
```

### 3. Syncing Account Data

```typescript
// Our sync strategy respects rate limits
async syncBankData(accountId: string): Promise<SyncResult> {
  const syncPlan = [
    { endpoint: 'details', rateLimit: 4 },
    { endpoint: 'balances', rateLimit: 4 },
    { endpoint: 'transactions', rateLimit: 4 }
  ];

  for (const { endpoint, rateLimit } of syncPlan) {
    const canSync = await this.checkRateLimit(accountId, endpoint);
    
    if (!canSync) {
      logger.warn(`Rate limit reached for ${endpoint}`);
      continue;
    }

    await this.syncEndpoint(accountId, endpoint);
    await this.updateRateLimitTracking(accountId, endpoint);
  }
}
```

### 4. Transaction Processing

```typescript
// Process and categorize transactions
async processTransactions(accountId: string): Promise<void> {
  const transactions = await this.getTransactions(accountId);
  
  for (const tx of transactions.booked) {
    // Store raw transaction
    const dbTx = await this.storeTransaction(tx);
    
    // AI categorization
    const category = await this.openAIService.categorizeTransaction({
      amount: tx.transactionAmount.amount,
      description: tx.remittanceInformationUnstructured,
      merchant: tx.creditorName || tx.debtorName
    });
    
    // Update with category
    await this.updateTransactionCategory(dbTx.id, category);
  }
}
```

## Code Examples

### Complete Sync Flow
```typescript
// Example from our dashboard route
router.post('/sync-bank-data', authenticate, async (req, res) => {
  try {
    const goCardless = new GoCardlessService(req.user.id);
    
    // Get all linked accounts
    const requisitions = await goCardless.getActiveRequisitions();
    
    for (const requisition of requisitions) {
      for (const accountId of requisition.accounts) {
        // Sync with rate limit protection
        await goCardless.syncBankData(accountId);
      }
    }
    
    res.json({ 
      message: 'Sync completed',
      accountsSynced: requisitions.flatMap(r => r.accounts).length
    });
  } catch (error) {
    logger.error('Bank sync failed:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});
```

### Rate Limit Management
```typescript
// Our rate limit tracking implementation
private async checkRateLimit(
  accountId: string, 
  endpoint: string
): Promise<boolean> {
  const key = `rate_limit:${accountId}:${endpoint}`;
  const current = await redis.get(key);
  
  if (!current) {
    return true;
  }
  
  const { count, resetAt } = JSON.parse(current);
  
  if (Date.now() > resetAt) {
    await redis.del(key);
    return true;
  }
  
  return count < 4; // PSD2 limit
}
```

## Best Practices

### 1. Token Management
- ✅ Cache tokens for 23 hours (not full 24)
- ✅ Implement automatic refresh on 401 errors
- ✅ Store credentials encrypted in database
- ❌ Never log or expose tokens

### 2. Rate Limit Handling
- ✅ Track calls per account per endpoint
- ✅ Implement exponential backoff on 429
- ✅ Split sync operations by endpoint
- ✅ Store rate limit reset timestamps

### 3. Error Handling
```typescript
// Our error handling pattern
private async request(method: string, path: string, data?: any) {
  try {
    return await axios.request({
      method,
      url: `${this.baseURL}${path}`,
      headers: { Authorization: `Bearer ${await this.getAccessToken()}` },
      data
    });
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expired, refresh and retry
      this.tokenCache.del('gocardless_access_token');
      return this.request(method, path, data);
    }
    
    if (error.response?.status === 429) {
      // Rate limited, schedule retry
      const retryAfter = error.response.headers['retry-after'] || 3600;
      await this.scheduleRetry(method, path, data, retryAfter);
    }
    
    throw new GoCardlessError(error.response?.data?.detail || error.message);
  }
}
```

### 4. PSD2 Compliance
- ✅ Handle 90-day access expiration
- ✅ Implement re-authentication flow
- ✅ Request only necessary data ranges
- ✅ Maintain audit trail of access

## Troubleshooting

### Common Issues

#### 1. "Rate limit exceeded"
```typescript
// Solution: Implement proper spacing
const SYNC_DELAY = 6 * 60 * 60 * 1000; // 6 hours
await this.scheduleSyncJob(accountId, new Date(Date.now() + SYNC_DELAY));
```

#### 2. "Invalid grant"
```typescript
// Solution: Clear token cache and re-authenticate
this.tokenCache.del('gocardless_access_token');
await this.getAccessToken(); // Forces new token
```

#### 3. "Account access expired"
```typescript
// Solution: Trigger re-authentication
await this.createRequisition(account.institutionId);
// Notify user to complete bank authentication
```

#### 4. Missing transactions
```typescript
// Solution: Check date ranges
const dateFrom = new Date();
dateFrom.setMonth(dateFrom.getMonth() - 3); // Max 90 days typically
const transactions = await this.getTransactions(accountId, dateFrom);
```

### Debug Tips

1. **Enable detailed logging**:
```typescript
logger.level = 'debug';
logger.debug('GoCardless request:', { method, path, accountId });
```

2. **Check rate limit headers**:
```typescript
logger.info('Rate limits:', {
  limit: response.headers['x-ratelimit-account-success-limit'],
  remaining: response.headers['x-ratelimit-account-success-remaining'],
  reset: response.headers['x-ratelimit-account-success-reset']
});
```

3. **Validate webhook signatures** (if using webhooks):
```typescript
const signature = req.headers['x-gocardless-signature'];
const isValid = crypto
  .createHmac('sha256', webhookSecret)
  .update(req.rawBody)
  .digest('hex') === signature;
```

## Resources

### Official Documentation
- [GoCardless API Docs](https://bankaccountdata-api.gocardless.com/docs)
- [PSD2 Compliance Guide](https://gocardless.com/guides/posts/psd2-compliance/)
- [API Reference](https://bankaccountdata-api.gocardless.com/api/v2/)

### Our Internal Docs
- [GoCardless Integration Setup](../GOCARDLESS_BANK_DATA_INTEGRATION.md)
- [Sandbox Testing Guide](../GOCARDLESS_SANDBOX_SETUP.md)
- [Financial Module Architecture](../ARCHITECTURE_V2.md#financial-module)

### Support
- GoCardless Support: support@gocardless.com
- API Status: https://www.gocardless-status.com/
- Our Issues: Check `#gocardless` tag in project issues

---

> **Note**: Always test new features in sandbox environment first. Production credentials are managed through the Integration Config service and should never be hardcoded.