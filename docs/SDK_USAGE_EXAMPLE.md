# AI Service SDK Usage Example

## Installation

```bash
# From the workspace root
npm install @ai/sdk-client
```

## Basic Usage

```typescript
import { createAIServiceClient } from '@ai/sdk-client';

// Create client instance
const client = createAIServiceClient({
  baseUrl: 'http://localhost:3001',
});

// Login
const loginResponse = await client.login('user@example.com', 'password');
if (loginResponse.data?.success) {
  console.log('Logged in successfully!');
  // Token is automatically set for future requests
}

// Health check
const health = await client.healthCheck();
console.log('Service status:', health.data);

// Get user profile
const profile = await client.auth.GET('/auth/profile');
console.log('User profile:', profile.data);

// List trading strategies
const strategies = await client.trading.GET('/trading/strategies', {
  params: {
    query: {
      active: true,
      page: 1,
      limit: 20,
    },
  },
});

// Execute a trade
const trade = await client.trading.POST('/trading/execute', {
  body: {
    symbol: 'BTC/USDT',
    side: 'buy',
    quantity: 0.001,
    type: 'market',
  },
});

// Upload and analyze a document
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('autoAnalyze', 'true');

const document = await client.aiCore.POST('/documents/upload', {
  body: formData,
});

// Send Telegram message
const message = await client.comm.POST('/telegram/send-message', {
  body: {
    chatId: '123456789',
    text: 'Hello from SDK!',
    parseMode: 'Markdown',
  },
});

// Get financial transactions
const transactions = await client.financial.GET('/api/financial/transactions', {
  params: {
    query: {
      page: 1,
      limit: 50,
      accountId: 'account-123',
    },
  },
});

// Logout
await client.logout();
```

## React Example with TanStack Query

```tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { createAIServiceClient } from '@ai/sdk-client';

const client = createAIServiceClient();

function useStrategies() {
  return useQuery({
    queryKey: ['strategies'],
    queryFn: async () => {
      const response = await client.trading.GET('/trading/strategies');
      return response.data;
    },
  });
}

function useCreateStrategy() {
  return useMutation({
    mutationFn: async (data: CreateStrategyRequest) => {
      const response = await client.trading.POST('/trading/strategies', {
        body: data,
      });
      return response.data;
    },
  });
}

// Component usage
function TradingStrategies() {
  const { data, isLoading, error } = useStrategies();
  const createStrategy = useCreateStrategy();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading strategies</div>;

  return (
    <div>
      {data?.data?.map((strategy) => (
        <div key={strategy.id}>{strategy.name}</div>
      ))}

      <button
        onClick={() => {
          createStrategy.mutate({
            name: 'New Strategy',
            type: 'scalping',
            parameters: {},
          });
        }}
      >
        Create Strategy
      </button>
    </div>
  );
}
```

## Type Safety

The SDK provides full TypeScript support with auto-completion:

```typescript
// All request/response types are fully typed
const response = await client.trading.GET('/trading/strategies/{strategyId}', {
  params: {
    path: {
      strategyId: 'strategy-123', // Required path parameter
    },
  },
});

// TypeScript knows the response shape
if (response.data?.success) {
  const strategy = response.data.data; // Fully typed TradingStrategy
  console.log(strategy.name, strategy.type, strategy.parameters);
}
```

## Error Handling

```typescript
try {
  const response = await client.auth.POST('/auth/login', {
    body: { email, password },
  });

  if (response.error) {
    // Handle HTTP errors
    console.error('Login failed:', response.error);
  } else if (response.data?.success === false) {
    // Handle business logic errors
    console.error('Login error:', response.data.error);
  } else {
    // Success
    console.log('Login successful!');
  }
} catch (error) {
  // Handle network errors
  console.error('Network error:', error);
}
```

## Advanced Configuration

```typescript
// Custom headers and interceptors
const client = createAIServiceClient({
  baseUrl: process.env.VITE_API_URL,
  headers: {
    'X-Custom-Header': 'value',
  },
});

// Update token after refresh
client.setAccessToken(newAccessToken);

// Clear token on logout
client.clearAccessToken();
```

## Available Clients

The SDK provides domain-specific clients:

- `client.gateway` - Health checks and metrics
- `client.auth` - Authentication and user management
- `client.financial` - Financial operations and transactions
- `client.trading` - Trading strategies and market operations
- `client.aiCore` - Document intelligence and AI operations
- `client.comm` - Telegram, email, and notifications

Each client is fully typed with all available endpoints and their request/response schemas.
