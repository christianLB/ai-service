# OpenAPI React Query Codegen Integration Architecture

## Executive Summary

**openapi-react-query-codegen** (@7nohe/openapi-react-query-codegen) is a powerful code generator that automatically creates React Query hooks from OpenAPI specifications. This architectural assessment outlines how to integrate it into the AI Service project to eliminate manual hook maintenance and ensure contract-driven frontend development.

## Current Architecture Analysis

### What We Have

```
┌─────────────────────────────────────────────────────────┐
│                   Current Architecture                   │
├───────────────────────────────────────────────────────────┤
│ OpenAPI Specs      │ /openapi/*.yaml                     │
│                    │ ├── auth.yaml                       │
│                    │ ├── financial.yaml                  │
│                    │ ├── trading.yaml                    │
│                    │ └── ...                             │
├────────────────────┼─────────────────────────────────────┤
│ Contract Types     │ /packages/contracts/               │
│                    │ └── src/generated/*.ts              │
│                    │     (openapi-typescript output)     │
├────────────────────┼─────────────────────────────────────┤
│ SDK Client         │ /packages/sdk-client/              │
│                    │ └── Uses openapi-fetch              │
│                    │     with generated types            │
├────────────────────┼─────────────────────────────────────┤
│ Manual Hooks       │ /frontend/src/hooks/*-sdk.ts       │
│                    │ ├── use-clients-sdk.ts (254 lines)  │
│                    │ ├── use-accounts-sdk.ts             │
│                    │ └── ... (manually maintained)       │
└────────────────────┴─────────────────────────────────────┘
```

### Pain Points

1. **Manual Hook Maintenance**: Each SDK hook is 200+ lines of boilerplate
2. **Duplication**: Similar patterns repeated across all hooks
3. **Drift Risk**: Manual hooks can drift from OpenAPI contracts
4. **Development Speed**: Creating new endpoints requires manual hook creation
5. **Type Safety**: While we have types, the hooks themselves aren't generated

## Proposed Architecture with openapi-react-query-codegen

### Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Target Architecture                    │
├───────────────────────────────────────────────────────────┤
│ OpenAPI Specs      │ /openapi/*.yaml                     │
│                    │ (Source of Truth)                   │
├────────────────────┼─────────────────────────────────────┤
│ Contract Types     │ /packages/contracts/               │
│                    │ └── src/generated/                  │
│                    │     ├── types/*.ts (openapi-ts)     │
│                    │     └── hooks/*.ts (react-query)    │
├────────────────────┼─────────────────────────────────────┤
│ Generated Hooks    │ Auto-generated from OpenAPI:        │
│                    │ ├── useGetClients()                 │
│                    │ ├── useGetClient()                  │
│                    │ ├── useCreateClient()               │
│                    │ ├── useUpdateClient()               │
│                    │ └── useDeleteClient()               │
├────────────────────┼─────────────────────────────────────┤
│ Custom Hooks       │ /frontend/src/hooks/               │
│                    │ └── Complex business logic only     │
└────────────────────┴─────────────────────────────────────┘
```

### Key Benefits

1. **Zero Manual Maintenance**: Hooks generated from OpenAPI specs
2. **Perfect Contract Alignment**: Frontend always matches backend contracts
3. **Automatic Query Keys**: Consistent cache invalidation
4. **Built-in Optimizations**: Suspense, prefetching, infinite queries
5. **Type Safety**: End-to-end type safety from backend to UI

## Integration Strategy

### Phase 1: Setup & Configuration (Day 1)

#### 1.1 Install Dependencies

```bash
# In the frontend directory
pnpm add -D @7nohe/openapi-react-query-codegen

# Ensure peer dependencies
pnpm add @tanstack/react-query axios # or your preferred client
```

#### 1.2 Configure Generation

Create `frontend/openapi-rq.config.ts`:

```typescript
import { defineConfig } from '@7nohe/openapi-react-query-codegen';

export default defineConfig({
  // Input OpenAPI specs
  input: {
    specs: [
      { path: '../openapi/financial.yaml', name: 'financial' },
      { path: '../openapi/trading.yaml', name: 'trading' },
      { path: '../openapi/auth.yaml', name: 'auth' },
      { path: '../openapi/ai-core.yaml', name: 'aiCore' },
      { path: '../openapi/comm.yaml', name: 'comm' },
    ],
  },
  
  // Output configuration
  output: {
    path: './src/generated/hooks',
    // Group by service for better organization
    mode: 'tags-split',
  },
  
  // Client configuration
  client: {
    // Use existing SDK client instead of axios
    type: 'custom',
    importPath: '@/lib/api-client',
  },
  
  // Hook generation options
  hooks: {
    // Generate all hook types
    query: true,
    suspense: true,
    mutation: true,
    infinite: true,
    prefetch: true,
  },
  
  // TypeScript options
  typescript: {
    // Use existing types from contracts package
    importTypes: '@ai/contracts',
  },
});
```

#### 1.3 Update Build Pipeline

Modify `package.json`:

```json
{
  "scripts": {
    "contracts:generate": "tsx scripts/generate-contracts.ts && openapi-rq -c openapi-rq.config.ts",
    "contracts:watch": "nodemon --watch '../openapi/*.yaml' --exec 'npm run contracts:generate'"
  }
}
```

### Phase 2: Migration Strategy (Days 2-3)

#### 2.1 Parallel Implementation

Run both systems in parallel initially:

```typescript
// frontend/src/hooks/use-clients-hybrid.ts
import { useGetClients } from '@/generated/hooks/financial';
import { useClients as useClientsManual } from './use-clients-sdk';

export function useClients(params?: ClientQuery) {
  // Use generated hook with fallback to manual
  const generated = useGetClients(params);
  const manual = useClientsManual(params);
  
  // Log differences for validation
  if (process.env.NODE_ENV === 'development') {
    console.log('Hook comparison:', { generated, manual });
  }
  
  // Return generated (or manual during transition)
  return generated;
}
```

#### 2.2 Service-by-Service Migration

```
Week 1: Financial Module
  ├── Day 1: Accounts hooks
  ├── Day 2: Clients hooks
  ├── Day 3: Invoices hooks
  └── Day 4: Transactions hooks

Week 2: Trading & Other Modules
  ├── Day 1: Trading hooks
  ├── Day 2: AI Core hooks
  ├── Day 3: Communication hooks
  └── Day 4: Authentication hooks
```

#### 2.3 Custom Hook Preservation

Keep custom business logic hooks:

```typescript
// frontend/src/hooks/use-client-with-invoices.ts
import { useGetClient, useGetClientInvoices } from '@/generated/hooks/financial';

// Custom hook combining multiple queries
export function useClientWithInvoices(clientId: string) {
  const client = useGetClient({ path: { id: clientId } });
  const invoices = useGetClientInvoices({ 
    path: { clientId },
    query: { limit: 100 }
  });
  
  return {
    client: client.data,
    invoices: invoices.data,
    isLoading: client.isLoading || invoices.isLoading,
    error: client.error || invoices.error,
  };
}
```

### Phase 3: Advanced Features (Week 2)

#### 3.1 Query Key Management

```typescript
// Generated automatically by openapi-react-query-codegen
export const clientsKeys = {
  all: ['clients'] as const,
  lists: () => [...clientsKeys.all, 'list'] as const,
  list: (params: ClientQuery) => [...clientsKeys.lists(), params] as const,
  details: () => [...clientsKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientsKeys.details(), id] as const,
};
```

#### 3.2 Optimistic Updates

```typescript
// frontend/src/hooks/use-optimistic-client.ts
import { useUpdateClient } from '@/generated/hooks/financial';
import { useQueryClient } from '@tanstack/react-query';

export function useOptimisticClientUpdate() {
  const queryClient = useQueryClient();
  const mutation = useUpdateClient({
    onMutate: async (variables) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: clientsKeys.detail(variables.id) });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData(clientsKeys.detail(variables.id));
      
      // Optimistically update
      queryClient.setQueryData(clientsKeys.detail(variables.id), variables.data);
      
      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(clientsKeys.detail(variables.id), context.previous);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: clientsKeys.all });
    },
  });
  
  return mutation;
}
```

#### 3.3 Prefetching Strategy

```typescript
// frontend/src/lib/prefetch-utils.ts
import { prefetchGetClients, prefetchGetClient } from '@/generated/hooks/financial';

export async function prefetchDashboardData(queryClient: QueryClient) {
  // Prefetch commonly used data
  await Promise.all([
    prefetchGetClients(queryClient, { query: { limit: 10, status: 'active' } }),
    prefetchGetAccounts(queryClient, {}),
    prefetchGetRecentInvoices(queryClient, { query: { limit: 5 } }),
  ]);
}
```

## Configuration Examples

### Basic Configuration

```typescript
// openapi-rq.config.ts
export default {
  input: '../openapi/api.yaml',
  output: {
    path: './src/generated/hooks',
    prettier: true,
  },
  client: 'axios',
};
```

### Advanced Configuration with Custom Client

```typescript
// openapi-rq.config.ts
export default {
  input: {
    specs: [
      { 
        path: '../openapi/financial.yaml',
        name: 'financial',
        // Filter to specific tags/operations
        operations: ['Clients', 'Invoices'],
      },
    ],
  },
  output: {
    path: './src/generated/hooks',
    mode: 'tags-split', // Split by OpenAPI tags
    mock: true, // Generate mock data
  },
  client: {
    type: 'custom',
    // Use our existing API client
    importPath: '@/lib/api-client',
    // Custom request function
    requestFn: 'apiClient.request',
  },
  hooks: {
    query: true,
    suspense: true,
    mutation: true,
    infinite: {
      // Only for specific endpoints
      enabled: (operation) => operation.operationId?.includes('list'),
    },
  },
  typescript: {
    // Enum handling
    enumStyle: 'enum',
    // Date handling
    dateType: 'Date',
  },
};
```

### Multi-Service Configuration

```typescript
// openapi-rq.config.ts
const services = ['financial', 'trading', 'auth', 'ai-core', 'comm'];

export default {
  input: services.map(service => ({
    path: `../openapi/${service}.yaml`,
    name: service,
  })),
  output: {
    path: './src/generated/hooks',
    // Organize by service
    filePattern: '{name}/{operation}.ts',
  },
  client: {
    type: 'custom',
    importPath: '@/lib/api-client',
    // Per-service client selection
    clientFactory: (service: string) => `apiClient.${service}`,
  },
};
```

## Implementation Checklist

### Pre-Implementation
- [ ] Review all existing manual hooks
- [ ] Document custom business logic to preserve
- [ ] Ensure OpenAPI specs are complete and accurate
- [ ] Set up development branch for migration

### Phase 1: Setup
- [ ] Install @7nohe/openapi-react-query-codegen
- [ ] Create openapi-rq.config.ts
- [ ] Update package.json scripts
- [ ] Generate first set of hooks
- [ ] Verify generated output

### Phase 2: Migration
- [ ] Create hybrid hooks for parallel testing
- [ ] Migrate financial module hooks
- [ ] Migrate trading module hooks
- [ ] Migrate remaining modules
- [ ] Update all component imports

### Phase 3: Optimization
- [ ] Implement prefetching strategy
- [ ] Add optimistic updates where needed
- [ ] Configure suspense boundaries
- [ ] Set up infinite queries for lists

### Phase 4: Cleanup
- [ ] Remove manual SDK hooks
- [ ] Update documentation
- [ ] Add generation to CI/CD pipeline
- [ ] Train team on new patterns

## Testing Strategy

### Unit Tests

```typescript
// frontend/src/hooks/__tests__/generated-hooks.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useGetClients } from '@/generated/hooks/financial';
import { createWrapper } from '@/test/utils';

describe('Generated Hooks', () => {
  it('should fetch clients', async () => {
    const { result } = renderHook(
      () => useGetClients({ query: { limit: 10 } }),
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(10);
  });
});
```

### E2E Tests

```typescript
// e2e/tests/hooks-migration.spec.ts
test('generated hooks work with real API', async ({ page }) => {
  await page.goto('/clients');
  
  // Should load clients using generated hooks
  await expect(page.locator('[data-testid="client-list"]')).toBeVisible();
  await expect(page.locator('[data-testid="client-row"]')).toHaveCount(10);
});
```

## Performance Optimizations

### 1. Bundle Size Optimization

```typescript
// vite.config.ts
export default {
  optimizeDeps: {
    // Pre-bundle generated hooks
    include: ['@/generated/hooks/**'],
  },
  build: {
    rollupOptions: {
      output: {
        // Code split by service
        manualChunks: {
          'hooks-financial': ['./src/generated/hooks/financial'],
          'hooks-trading': ['./src/generated/hooks/trading'],
        },
      },
    },
  },
};
```

### 2. Query Optimization

```typescript
// frontend/src/lib/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time based on data type
      staleTime: (query) => {
        if (query.queryKey[0] === 'clients') return 5 * 60 * 1000; // 5 min
        if (query.queryKey[0] === 'invoices') return 1 * 60 * 1000; // 1 min
        return 0;
      },
      // Garbage collection
      gcTime: 10 * 60 * 1000, // 10 min
      // Retry strategy
      retry: (failureCount, error) => {
        if (error.status === 404) return false;
        return failureCount < 3;
      },
    },
  },
});
```

## Troubleshooting Guide

### Common Issues

1. **Generated hooks not working**
   - Check OpenAPI spec validity
   - Verify client configuration
   - Ensure proper imports

2. **Type mismatches**
   - Regenerate contracts: `pnpm contracts:generate`
   - Check TypeScript version compatibility
   - Verify schema alignment

3. **Query key conflicts**
   - Use generated query keys consistently
   - Avoid manual key construction
   - Check for duplicate keys

## Architectural Patterns

### Pattern 1: Facade Pattern for Complex Operations

```typescript
// frontend/src/hooks/facades/use-invoice-operations.ts
import { 
  useGetInvoice,
  useUpdateInvoice,
  useSendInvoice,
  useGetInvoiceHistory 
} from '@/generated/hooks/financial';

export function useInvoiceOperations(invoiceId: string) {
  const invoice = useGetInvoice({ path: { id: invoiceId } });
  const history = useGetInvoiceHistory({ path: { invoiceId } });
  const update = useUpdateInvoice();
  const send = useSendInvoice();
  
  return {
    // Data
    invoice: invoice.data,
    history: history.data,
    
    // Operations
    update: (data: UpdateInvoiceDto) => update.mutate({ id: invoiceId, data }),
    send: () => send.mutate({ id: invoiceId }),
    
    // State
    isLoading: invoice.isLoading || history.isLoading,
    isUpdating: update.isPending,
    isSending: send.isPending,
  };
}
```

### Pattern 2: Composition for Dashboard Views

```typescript
// frontend/src/hooks/dashboards/use-financial-dashboard.ts
export function useFinancialDashboard() {
  const clients = useGetClients({ query: { status: 'active' } });
  const invoices = useGetRecentInvoices({ query: { limit: 10 } });
  const accounts = useGetAccounts();
  const metrics = useGetFinancialMetrics();
  
  return {
    isLoading: clients.isLoading || invoices.isLoading || 
               accounts.isLoading || metrics.isLoading,
    data: {
      clients: clients.data,
      invoices: invoices.data,
      accounts: accounts.data,
      metrics: metrics.data,
    },
    refetch: () => {
      clients.refetch();
      invoices.refetch();
      accounts.refetch();
      metrics.refetch();
    },
  };
}
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/contracts.yml
name: Contract Generation

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
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        
      - name: Generate contracts and hooks
        run: |
          pnpm install
          pnpm contracts:generate
          
      - name: Check for changes
        run: |
          git diff --exit-code || (
            echo "Contract changes detected!"
            git config user.name "GitHub Actions"
            git config user.email "actions@github.com"
            git add .
            git commit -m "chore: update generated contracts and hooks"
            git push
          )
```

## Monitoring and Validation

### Contract Drift Detection

```typescript
// scripts/validate-contract-drift.ts
import { compareSpecs } from '@apidevtools/swagger-diff';

async function validateContractDrift() {
  const specs = ['financial', 'trading', 'auth'];
  
  for (const spec of specs) {
    const deployed = await fetch(`${PROD_URL}/openapi/${spec}.json`);
    const local = await readFile(`./openapi/${spec}.yaml`);
    
    const diff = await compareSpecs(deployed, local);
    
    if (diff.length > 0) {
      console.error(`Contract drift detected in ${spec}:`, diff);
      process.exit(1);
    }
  }
}
```

## Best Practices

### 1. Naming Conventions

```typescript
// Generated hooks follow predictable patterns:
useGetClients()        // GET /clients
useGetClient()         // GET /clients/:id
useCreateClient()      // POST /clients
useUpdateClient()      // PUT /clients/:id
useDeleteClient()      // DELETE /clients/:id
```

### 2. Error Handling

```typescript
// Consistent error handling across all hooks
const { data, error, isError } = useGetClients();

if (isError) {
  // Generated hooks provide typed errors
  if (error.status === 403) {
    return <Forbidden />;
  }
  return <Error message={error.message} />;
}
```

### 3. Loading States

```typescript
// Built-in loading states
const { isLoading, isFetching, isRefetching } = useGetClients();

// isLoading: First load
// isFetching: Any fetch (including refetch)
// isRefetching: Background refetch
```

## Conclusion

Integrating openapi-react-query-codegen will:

1. **Eliminate 2,000+ lines** of manual hook code
2. **Guarantee contract alignment** between frontend and backend
3. **Accelerate development** by 10x for new endpoints
4. **Reduce bugs** from manual implementation errors
5. **Improve DX** with auto-completion and type safety

This is a **critical architectural improvement** that should be implemented immediately to achieve the goal of zero manual hook maintenance.

## Next Steps

1. **Immediate**: Install and configure openapi-react-query-codegen
2. **This Week**: Migrate financial module as proof of concept
3. **Next Week**: Complete migration of all modules
4. **Ongoing**: Add to standard development workflow

The investment in this setup will pay dividends immediately and compound over time as the API grows.