# Service Development Guide

## Overview

This guide establishes the **mandatory** patterns and practices for developing API services in the AI Service frontend application. Following these guidelines ensures proper authentication, error handling, and consistency across all services.

## 🚨 Critical Requirements

### 1. **ALWAYS Use the Centralized API Instance**

❌ **NEVER DO THIS:**
```typescript
// WRONG - Will cause 401 authentication errors
const response = await fetch('/api/endpoint', {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
});
```

✅ **ALWAYS DO THIS:**
```typescript
// CORRECT - Uses authenticated API instance
import api from './api';

const response = await api.get('/endpoint');
const response = await api.post('/endpoint', data);
```

### 2. **Authentication is Handled Automatically**

The centralized `api` instance from `./api` handles:
- Adding JWT Bearer tokens to all requests
- Automatic token refresh when tokens expire
- Redirecting to login when refresh fails
- Request queuing during token refresh

**You don't need to:**
- Add `Authorization` headers manually
- Handle 401 errors in your service
- Manage tokens in your service code
- Use `credentials: 'include'`

## Service Class Pattern

All services should follow this standard pattern:

```typescript
import api from './api';
import type { ApiResponse, PaginatedResponse } from '../types';

// Define your service-specific types
export interface MyFeature {
  id: string;
  name: string;
  // ... other fields
}

export interface MyFeatureFormData {
  name: string;
  // ... form fields
}

// Service class
class MyFeatureService {
  // Standard CRUD operations
  async create(data: MyFeatureFormData): Promise<ApiResponse<MyFeature>> {
    const response = await api.post('/my-feature', data);
    return response.data;
  }

  async getList(params?: Record<string, any>): Promise<PaginatedResponse<MyFeature>> {
    const response = await api.get('/my-feature', { params });
    return response.data;
  }

  async getById(id: string): Promise<ApiResponse<MyFeature>> {
    const response = await api.get(`/my-feature/${id}`);
    return response.data;
  }

  async update(id: string, data: Partial<MyFeatureFormData>): Promise<ApiResponse<MyFeature>> {
    const response = await api.put(`/my-feature/${id}`, data);
    return response.data;
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete(`/my-feature/${id}`);
    return response.data;
  }

  // Custom operations
  async customAction(id: string, action: string): Promise<ApiResponse<any>> {
    const response = await api.post(`/my-feature/${id}/${action}`);
    return response.data;
  }
}

// Export singleton instance
export const myFeatureService = new MyFeatureService();
```

## WebSocket Authentication

For WebSocket connections, include the authentication token:

```typescript
import { io, Socket } from 'socket.io-client';

class MyWebSocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    const token = localStorage.getItem('auth_token');
    
    this.socket = io(wsUrl, {
      auth: {
        token: token || ''
      },
      transports: ['websocket'],
      reconnection: true
    });

    return this.socket;
  }
}
```

## Error Handling

The `api` instance handles common errors, but you should handle service-specific errors:

```typescript
class MyService {
  async riskyOperation(data: any) {
    try {
      const response = await api.post('/risky-endpoint', data);
      return response.data;
    } catch (error: any) {
      // The api instance handles 401s and token refresh
      // Handle other errors here
      if (error.response?.status === 422) {
        throw new Error('Validation failed: ' + error.response.data.message);
      }
      throw error;
    }
  }
}
```

## File Structure

```
frontend/src/services/
├── api.ts                  # Centralized API instance (DO NOT MODIFY)
├── myFeatureService.ts     # Your service file
└── __tests__/
    └── myFeatureService.test.ts
```

## Testing Services

Always test authentication handling:

```typescript
import { myFeatureService } from '../myFeatureService';
import api from '../api';

jest.mock('../api');

describe('MyFeatureService', () => {
  it('should use api instance for requests', async () => {
    const mockData = { id: '1', name: 'Test' };
    (api.get as jest.Mock).mockResolvedValue({ data: mockData });

    const result = await myFeatureService.getById('1');

    expect(api.get).toHaveBeenCalledWith('/my-feature/1');
    expect(result).toEqual(mockData);
  });

  it('should not handle 401 errors (api instance handles them)', async () => {
    const error = { response: { status: 401 } };
    (api.get as jest.Mock).mockRejectedValue(error);

    // The promise should reject with the original error
    // The api instance will handle the 401 and redirect
    await expect(myFeatureService.getById('1')).rejects.toEqual(error);
  });
});
```

## Common Pitfalls to Avoid

### ❌ Don't Use fetch() Directly
```typescript
// WRONG
const response = await fetch(`${this.apiUrl}/endpoint`);
```

### ❌ Don't Hardcode API URLs
```typescript
// WRONG
const response = await fetch('https://api.example.com/endpoint');
```

### ❌ Don't Handle Token Management
```typescript
// WRONG
const token = localStorage.getItem('auth_token');
const response = await fetch('/api/endpoint', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### ❌ Don't Use XMLHttpRequest
```typescript
// WRONG
const xhr = new XMLHttpRequest();
xhr.open('GET', '/api/endpoint');
```

## Quick Checklist for New Services

Before committing a new service, ensure:

- [ ] Imports `api` from `'./api'`
- [ ] Uses `api.get()`, `api.post()`, etc. for all HTTP requests
- [ ] Does NOT use `fetch()`, `XMLHttpRequest`, or other HTTP clients
- [ ] Does NOT manually add authentication headers
- [ ] Does NOT handle 401 errors (let api instance handle them)
- [ ] Follows the standard service class pattern
- [ ] Includes TypeScript types for all data
- [ ] Has corresponding tests
- [ ] WebSocket connections include auth token

## Generating New Services

Use the service generator to create a new service with the correct patterns:

```bash
npm run generate:service -- --name=MyFeature
```

This will create:
- `src/services/myFeatureService.ts` with the correct patterns
- `src/services/__tests__/myFeatureService.test.ts` with basic tests
- Type definitions in the service file

## Questions?

If you're unsure about a pattern or need to do something unusual, ask for review before implementing. The goal is consistency and reliability across all services.

Remember: **Using the centralized api instance is not optional - it's mandatory for authentication to work correctly.**