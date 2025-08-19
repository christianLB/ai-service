# SDK Migration Guide

## Overview

This guide documents the migration from axios-based API calls to the SDK client using openapi-fetch. This architectural alignment ensures type safety through contract-driven development.

## Migration Status

### ✅ Completed

- [x] SDK client setup (`/frontend/src/lib/api-client.ts`)
- [x] Dashboard service (`/frontend/src/services/dashboard-sdk.service.ts`)
- [x] Client hooks (`/frontend/src/hooks/use-clients-sdk.ts`)
- [x] Account hooks (`/frontend/src/hooks/use-accounts-sdk.ts`)
- [x] Notification hooks (`/frontend/src/hooks/use-notification-sdk.ts`)
- [x] Auth context (`/frontend/src/contexts/AuthContext-sdk.tsx`)

### 🚧 In Progress

- [ ] Component updates to use SDK hooks
- [ ] Remaining hook migrations

### 📋 Pending

- [ ] Remove axios dependency
- [ ] Delete manual type definitions
- [ ] Full testing suite validation

## Migration Pattern

### 1. Hook Migration

**Before (axios):**

```typescript
// use-client.ts
import api from '../services/api';
import type { Client, CreateClient } from '../types/client.types';

export function useClients(params?: ClientQuery) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: async () => {
      const response = await api.get<ClientListResponse>('/clients', { params });
      return response.data.data;
    },
  });
}
```

**After (SDK):**

```typescript
// use-clients-sdk.ts
import { financialApi } from '../lib/api-client';
import type { components } from '@ai/contracts';

type Client = components['schemas']['Client'];

export function useClients(params?: ClientQuery) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: async () => {
      const { data, error } = await financialApi.GET('/clients', {
        params: { query: params },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch clients');
      }

      return data?.data;
    },
  });
}
```

### 2. Service Migration

**Before (axios):**

```typescript
// dashboardService.ts
import api from './api';

class DashboardService {
  async getDashboardOverview(currency = 'EUR') {
    const response = await api.get('/financial/dashboard/overview', {
      params: { currency },
    });
    return response.data;
  }
}
```

**After (SDK):**

```typescript
// dashboard-sdk.service.ts
import { financialApi } from '../lib/api-client';

class DashboardSDKService {
  async getDashboardOverview(currency = 'EUR') {
    const { data, error } = await financialApi.GET('/dashboard/overview', {
      params: { query: { currency } },
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch dashboard overview');
    }

    return data;
  }
}
```

### 3. Component Update

**Before:**

```typescript
// Clients.tsx
import { useClients } from '../hooks/use-client';
import dashboardService from '../services/dashboardService';
```

**After:**

```typescript
// Clients.tsx
import { useClients } from '../hooks/use-clients-sdk';
import dashboardService from '../services/dashboard-sdk.service';
```

## Key Differences

### 1. Type Safety

- **Before**: Manual type definitions in `/frontend/src/types/`
- **After**: Auto-generated types from `@ai/contracts`

### 2. Error Handling

- **Before**: AxiosError with nested response structure
- **After**: Direct error object from openapi-fetch

### 3. Request Structure

- **Before**: `api.get(url, { params })`
- **After**: `api.GET(path, { params: { query, path } })`

### 4. Response Structure

- **Before**: `response.data`
- **After**: `{ data, error }` destructuring

## API Client Features

The new SDK client (`/frontend/src/lib/api-client.ts`) provides:

1. **Automatic token management**

   ```typescript
   setTokens(accessToken, refreshToken);
   clearTokens();
   ```

2. **Token refresh logic**

   ```typescript
   refreshAccessToken();
   ```

3. **Module-specific APIs**
   ```typescript
   import { authApi, financialApi, tradingApi, aiCoreApi, commApi } from '../lib/api-client';
   ```

## Migration Checklist

For each component/hook:

- [ ] Replace axios import with SDK client import
- [ ] Update type imports to use `@ai/contracts`
- [ ] Convert API calls to SDK pattern
- [ ] Update error handling
- [ ] Test functionality
- [ ] Remove old file once migration is verified

## Benefits

1. **Type Safety**: Full TypeScript support from OpenAPI schema
2. **Contract-Driven**: Single source of truth for API contracts
3. **Better DX**: Auto-completion and type checking
4. **Consistency**: Unified API client pattern
5. **Maintainability**: No manual type synchronization

## Next Steps

1. Complete remaining hook migrations
2. Update all components to use SDK versions
3. Remove axios dependency from package.json
4. Delete `/frontend/src/types/` directory
5. Update import paths throughout the codebase
6. Run full test suite validation
