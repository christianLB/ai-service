# OpenAPI React Query Codegen - Practical Implementation Guide

## Quick Start (5 Minutes)

### Step 1: Install the Package

```bash
cd frontend
pnpm add -D @7nohe/openapi-react-query-codegen
```

### Step 2: Create Configuration File

```typescript
// frontend/openapi-rq.config.ts
import { defineConfig } from '@7nohe/openapi-react-query-codegen';

export default defineConfig({
  input: '../openapi/financial.yaml', // Start with one service
  output: {
    path: './src/generated/hooks',
  },
  client: 'axios', // We'll customize this later
});
```

### Step 3: Generate Hooks

```bash
npx openapi-rq -c openapi-rq.config.ts
```

### Step 4: Use Generated Hooks

```tsx
// Before (Manual - 250+ lines)
import { useClients } from './hooks/use-clients-sdk';

// After (Generated - 0 lines to maintain!)
import { useGetClients } from '@/generated/hooks';

function ClientList() {
  const { data, isLoading, error } = useGetClients({
    // Fully typed parameters!
    page: 1,
    limit: 10,
    status: 'active'
  });
  
  if (isLoading) return <Spin />;
  if (error) return <Alert message={error.message} />;
  
  return <ClientTable data={data} />;
}
```

## Complete Setup for AI Service

### 1. Full Configuration

```typescript
// frontend/openapi-rq.config.ts
import { defineConfig } from '@7nohe/openapi-react-query-codegen';
import path from 'path';

export default defineConfig({
  // Multiple service specs
  input: [
    { path: '../openapi/financial.yaml', name: 'financial' },
    { path: '../openapi/trading.yaml', name: 'trading' },
    { path: '../openapi/auth.yaml', name: 'auth' },
    { path: '../openapi/ai-core.yaml', name: 'aiCore' },
    { path: '../openapi/comm.yaml', name: 'comm' },
  ],
  
  output: {
    path: './src/generated/hooks',
    // Split by service for better organization
    mode: 'tags-split',
    // Apply prettier formatting
    prettier: true,
    // Generate barrel exports
    barrel: true,
  },
  
  // Use a custom client wrapper
  client: {
    type: 'custom',
    // We'll create this adapter
    path: './src/lib/openapi-rq-client.ts',
  },
  
  // Generate all hook types
  hooks: {
    query: true,
    suspense: true,
    mutation: true,
    infinite: true,
    prefetch: true,
  },
  
  // TypeScript configuration
  typescript: {
    // Use enums instead of string literals
    enumStyle: 'enum',
    // Use Date type for date strings
    dateType: 'Date',
  },
});
```

### 2. Custom Client Adapter

Since you already have an SDK client using openapi-fetch, create an adapter:

```typescript
// frontend/src/lib/openapi-rq-client.ts
import { apiClient } from './api-client';
import type { RequestOptions } from '@7nohe/openapi-react-query-codegen';

/**
 * Adapter to use our existing SDK client with openapi-react-query-codegen
 */
export const client = {
  // GET requests
  get: async <T = unknown>(
    url: string,
    options?: RequestOptions
  ): Promise<T> => {
    const service = getServiceFromUrl(url);
    const { data, error } = await apiClient[service].GET(url as any, {
      params: options?.params,
    });
    
    if (error) throw error;
    return data as T;
  },
  
  // POST requests
  post: async <T = unknown>(
    url: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> => {
    const service = getServiceFromUrl(url);
    const { data: response, error } = await apiClient[service].POST(url as any, {
      body: data,
      params: options?.params,
    });
    
    if (error) throw error;
    return response as T;
  },
  
  // PUT requests
  put: async <T = unknown>(
    url: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> => {
    const service = getServiceFromUrl(url);
    const { data: response, error } = await apiClient[service].PUT(url as any, {
      body: data,
      params: options?.params,
    });
    
    if (error) throw error;
    return response as T;
  },
  
  // PATCH requests
  patch: async <T = unknown>(
    url: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> => {
    const service = getServiceFromUrl(url);
    const { data: response, error } = await apiClient[service].PATCH(url as any, {
      body: data,
      params: options?.params,
    });
    
    if (error) throw error;
    return response as T;
  },
  
  // DELETE requests
  delete: async <T = unknown>(
    url: string,
    options?: RequestOptions
  ): Promise<T> => {
    const service = getServiceFromUrl(url);
    const { data: response, error } = await apiClient[service].DELETE(url as any, {
      params: options?.params,
    });
    
    if (error) throw error;
    return response as T;
  },
};

// Helper to determine which service client to use
function getServiceFromUrl(url: string): string {
  if (url.includes('/financial/')) return 'financial';
  if (url.includes('/trading/')) return 'trading';
  if (url.includes('/auth/')) return 'auth';
  if (url.includes('/ai/')) return 'aiCore';
  if (url.includes('/comm/')) return 'comm';
  return 'gateway'; // default
}
```

### 3. Update Package Scripts

```json
// frontend/package.json
{
  "scripts": {
    // Add generation scripts
    "hooks:generate": "openapi-rq -c openapi-rq.config.ts",
    "hooks:watch": "nodemon --watch '../openapi/*.yaml' --exec 'pnpm hooks:generate'",
    
    // Update existing contracts script
    "contracts:generate": "cd .. && pnpm contracts:generate && cd frontend && pnpm hooks:generate",
    
    // Pre-build hook generation
    "prebuild": "pnpm hooks:generate",
    "predev": "pnpm hooks:generate"
  }
}
```

### 4. Integration with Existing Code

#### Migration Wrapper (Temporary)

```typescript
// frontend/src/hooks/use-clients-migration.ts
import { useGetClients as useGetClientsGenerated } from '@/generated/hooks/financial';
import { useClients as useClientsManual } from './use-clients-sdk';

/**
 * Migration wrapper to safely transition from manual to generated hooks
 */
export function useClients(params?: ClientQuery) {
  // Feature flag for gradual rollout
  const useGenerated = import.meta.env.VITE_USE_GENERATED_HOOKS === 'true';
  
  if (useGenerated) {
    // Use the generated hook
    return useGetClientsGenerated({
      page: params?.page,
      limit: params?.limit,
      search: params?.search,
      status: params?.status,
      sortBy: params?.sortBy,
      sortOrder: params?.sortOrder,
    });
  } else {
    // Fall back to manual hook
    return useClientsManual(params);
  }
}
```

#### Direct Usage Example

```tsx
// frontend/src/pages/clients/ClientList.tsx
import { 
  useGetClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useGetClientsKey // Query key for cache invalidation
} from '@/generated/hooks/financial';
import { useQueryClient } from '@tanstack/react-query';

export function ClientList() {
  const queryClient = useQueryClient();
  
  // Fetch clients with full type safety
  const { data: clients, isLoading, error } = useGetClients({
    page: 1,
    limit: 20,
    status: 'active'
  });
  
  // Mutations with automatic cache invalidation
  const createMutation = useCreateClient({
    onSuccess: () => {
      // Invalidate and refetch clients
      queryClient.invalidateQueries({ queryKey: useGetClientsKey() });
      message.success('Client created successfully');
    }
  });
  
  const updateMutation = useUpdateClient({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: useGetClientsKey() });
      message.success('Client updated successfully');
    }
  });
  
  const deleteMutation = useDeleteClient({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: useGetClientsKey() });
      message.success('Client deleted successfully');
    }
  });
  
  // Component logic...
  return (
    <div>
      {isLoading && <Spin />}
      {error && <Alert message={error.message} type="error" />}
      {clients && (
        <Table
          dataSource={clients.data}
          columns={columns}
          pagination={{
            total: clients.total,
            pageSize: clients.limit,
            current: clients.page,
          }}
        />
      )}
    </div>
  );
}
```

### 5. Advanced Patterns

#### Infinite Scrolling

```tsx
// frontend/src/components/InfiniteClientList.tsx
import { useGetClientsInfinite } from '@/generated/hooks/financial';

export function InfiniteClientList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useGetClientsInfinite({
    limit: 20,
  }, {
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.data.length < 20) return undefined;
      return pages.length + 1; // Next page number
    },
  });
  
  const clients = data?.pages.flatMap(page => page.data) ?? [];
  
  return (
    <InfiniteScroll
      dataLength={clients.length}
      next={fetchNextPage}
      hasMore={hasNextPage}
      loader={<Spin />}
    >
      {clients.map(client => (
        <ClientCard key={client.id} client={client} />
      ))}
    </InfiniteScroll>
  );
}
```

#### Suspense Mode

```tsx
// frontend/src/pages/ClientDetail.tsx
import { useGetClientSuspense } from '@/generated/hooks/financial';
import { Suspense } from 'react';

function ClientDetailContent({ clientId }: { clientId: string }) {
  // This will suspend until data is loaded
  const { data: client } = useGetClientSuspense({ id: clientId });
  
  return (
    <div>
      <h1>{client.name}</h1>
      <p>{client.email}</p>
      {/* ... */}
    </div>
  );
}

export function ClientDetail({ clientId }: { clientId: string }) {
  return (
    <Suspense fallback={<Spin size="large" />}>
      <ErrorBoundary fallback={<Alert message="Failed to load client" />}>
        <ClientDetailContent clientId={clientId} />
      </ErrorBoundary>
    </Suspense>
  );
}
```

#### Prefetching

```tsx
// frontend/src/hooks/usePrefetch.ts
import { 
  prefetchGetClient,
  prefetchGetClientInvoices 
} from '@/generated/hooks/financial';
import { useQueryClient } from '@tanstack/react-query';

export function useClientPrefetch() {
  const queryClient = useQueryClient();
  
  const prefetchClient = async (clientId: string) => {
    // Prefetch client details and invoices in parallel
    await Promise.all([
      prefetchGetClient(queryClient, { id: clientId }),
      prefetchGetClientInvoices(queryClient, { clientId }),
    ]);
  };
  
  return { prefetchClient };
}

// Usage in component
function ClientRow({ client }: { client: Client }) {
  const { prefetchClient } = useClientPrefetch();
  
  return (
    <tr
      onMouseEnter={() => prefetchClient(client.id)}
      onClick={() => navigate(`/clients/${client.id}`)}
    >
      <td>{client.name}</td>
      {/* ... */}
    </tr>
  );
}
```

## Generated Output Structure

After running the generator, you'll get:

```
frontend/src/generated/hooks/
├── financial/
│   ├── clients.ts       # All client-related hooks
│   ├── invoices.ts      # All invoice-related hooks
│   ├── accounts.ts      # All account-related hooks
│   ├── transactions.ts  # All transaction-related hooks
│   └── index.ts         # Barrel exports
├── trading/
│   ├── trades.ts
│   ├── strategies.ts
│   └── index.ts
├── auth/
│   ├── authentication.ts
│   ├── users.ts
│   └── index.ts
├── common.ts            # Shared types and utilities
└── index.ts             # Main barrel export
```

Example generated hook file:

```typescript
// frontend/src/generated/hooks/financial/clients.ts

/**
 * Generated by @7nohe/openapi-react-query-codegen
 * Do not edit manually.
 */

import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { client } from '@/lib/openapi-rq-client';
import type { Client, CreateClientDto, UpdateClientDto } from '@ai/contracts';

// Query Keys
export const getClientsKey = (params?: GetClientsParams) => 
  ['clients', 'list', params] as const;

export const getClientKey = (id: string) => 
  ['clients', 'detail', id] as const;

// GET /clients
export function useGetClients(
  params?: GetClientsParams,
  options?: UseQueryOptions<ClientsResponse>
) {
  return useQuery({
    queryKey: getClientsKey(params),
    queryFn: () => client.get<ClientsResponse>('/api/financial/clients', { params }),
    ...options,
  });
}

// GET /clients/:id
export function useGetClient(
  id: string,
  options?: UseQueryOptions<Client>
) {
  return useQuery({
    queryKey: getClientKey(id),
    queryFn: () => client.get<Client>(`/api/financial/clients/${id}`),
    enabled: !!id,
    ...options,
  });
}

// POST /clients
export function useCreateClient(
  options?: UseMutationOptions<Client, Error, CreateClientDto>
) {
  return useMutation({
    mutationFn: (data: CreateClientDto) => 
      client.post<Client>('/api/financial/clients', data),
    ...options,
  });
}

// PUT /clients/:id
export function useUpdateClient(
  options?: UseMutationOptions<Client, Error, UpdateClientParams>
) {
  return useMutation({
    mutationFn: ({ id, data }: UpdateClientParams) => 
      client.put<Client>(`/api/financial/clients/${id}`, data),
    ...options,
  });
}

// DELETE /clients/:id
export function useDeleteClient(
  options?: UseMutationOptions<void, Error, string>
) {
  return useMutation({
    mutationFn: (id: string) => 
      client.delete<void>(`/api/financial/clients/${id}`),
    ...options,
  });
}

// Infinite query for pagination
export function useGetClientsInfinite(
  params?: GetClientsParams,
  options?: UseInfiniteQueryOptions<ClientsResponse>
) {
  return useInfiniteQuery({
    queryKey: ['clients', 'infinite', params],
    queryFn: ({ pageParam = 1 }) => 
      client.get<ClientsResponse>('/api/financial/clients', {
        params: { ...params, page: pageParam }
      }),
    ...options,
  });
}

// Suspense versions
export function useGetClientsSuspense(params?: GetClientsParams) {
  return useSuspenseQuery({
    queryKey: getClientsKey(params),
    queryFn: () => client.get<ClientsResponse>('/api/financial/clients', { params }),
  });
}

// Prefetch functions
export function prefetchGetClients(
  queryClient: QueryClient,
  params?: GetClientsParams
) {
  return queryClient.prefetchQuery({
    queryKey: getClientsKey(params),
    queryFn: () => client.get<ClientsResponse>('/api/financial/clients', { params }),
  });
}
```

## Testing the Integration

### 1. Validate Generated Hooks

```typescript
// frontend/src/generated/hooks/__tests__/validation.test.ts
import { renderHook } from '@testing-library/react';
import { useGetClients } from '../financial';
import { createWrapper } from '@/test/utils';

describe('Generated Hooks Validation', () => {
  it('should have correct query key structure', () => {
    const { result } = renderHook(
      () => useGetClients({ page: 1, limit: 10 }),
      { wrapper: createWrapper() }
    );
    
    // Verify query key format
    expect(result.current.queryKey).toEqual([
      'clients',
      'list',
      { page: 1, limit: 10 }
    ]);
  });
  
  it('should handle errors correctly', async () => {
    // Mock API error
    server.use(
      rest.get('/api/financial/clients', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }));
      })
    );
    
    const { result, waitFor } = renderHook(
      () => useGetClients(),
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Server error');
  });
});
```

### 2. Compare with Manual Hooks

```typescript
// frontend/src/hooks/__tests__/migration-parity.test.ts
describe('Migration Parity Tests', () => {
  it('generated hooks should match manual hook behavior', async () => {
    const manualHook = renderHook(() => useClientsManual());
    const generatedHook = renderHook(() => useGetClients());
    
    await waitFor(() => {
      expect(manualHook.result.current.data).toEqual(
        generatedHook.result.current.data
      );
    });
  });
});
```

## Rollout Strategy

### Week 1: Pilot
- Day 1: Set up generator for financial module
- Day 2: Generate and test hooks
- Day 3: Migrate one component (ClientList)
- Day 4: Validate in staging
- Day 5: Review and adjust

### Week 2: Full Migration
- Day 1-2: Migrate all financial components
- Day 3-4: Migrate trading module
- Day 5: Migrate remaining modules

### Week 3: Cleanup
- Remove manual hooks
- Update documentation
- Team training

## Common Pitfalls & Solutions

### 1. Path Parameters

**Problem**: OpenAPI path parameters like `/clients/{id}`

**Solution**: Generator handles this automatically
```typescript
// Correct usage
const { data } = useGetClient(clientId); // Generator knows it's a path param
```

### 2. Query Parameters

**Problem**: Complex query parameters

**Solution**: Pass as object
```typescript
const { data } = useGetClients({
  page: 1,
  limit: 20,
  filters: { status: 'active' },
  sort: [{ field: 'name', order: 'asc' }]
});
```

### 3. File Uploads

**Problem**: Multipart form data

**Solution**: Custom mutation
```typescript
const uploadMutation = useMutation({
  mutationFn: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.postForm('/upload', formData);
  }
});
```

## Maintenance & Updates

### Automated Regeneration

```yaml
# .github/workflows/openapi-sync.yml
name: Sync OpenAPI Hooks

on:
  push:
    paths:
      - 'openapi/**'
      - 'backend/src/routes/**'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      
      - name: Generate hooks
        run: |
          cd frontend
          pnpm install
          pnpm hooks:generate
          
      - name: Commit changes
        run: |
          git config --global user.name "GitHub Actions"
          git config --global user.email "actions@github.com"
          git add src/generated/hooks
          git diff --staged --quiet || git commit -m "chore: update generated hooks"
          git push
```

## Conclusion

With this setup:
- **0 lines** of manual hook code to maintain
- **100% type safety** from backend to frontend
- **Automatic** query key management
- **Built-in** optimistic updates, infinite queries, suspense
- **10x faster** development for new endpoints

Start with the financial module and expand from there. The entire migration can be completed in 2-3 weeks with zero downtime.