# Contracts and Validation Patterns

This document outlines the standardized patterns for API contracts, validation, and error handling across all services.

## Overview

All services follow a contract-first approach using OpenAPI specifications and shared validation utilities to ensure consistency.

## Key Components

### 1. OpenAPI Specifications

- Location: `/openapi/`
- Generated TypeScript types: `@ai/contracts`
- Automated drift detection: `pnpm contracts:check`

### 2. Shared Validation Utilities

- Package: `@ai/http-utils`
- Provides pagination, error formatting, and validation middleware

### 3. Standardized Error Schema

```json
{
  "message": "string",
  "code": "string (optional)",
  "details": [{ "path": "string", "message": "string" }] // optional
}
```

## Pagination Pattern

All list endpoints accept standardized pagination parameters:

- `page`: integer >= 1 (default: 1)
- `limit`: integer 1-100 (default: 20)

### Using parsePagination

```typescript
import { parsePagination } from '@ai/http-utils';

app.get('/api/resources', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const [items, total] = await Promise.all([
      db.resources.findMany({ skip, take: limit }),
      db.resources.count(),
    ]);

    res.json({ items, total, page, limit });
  } catch (err) {
    // Error handling - see Error Handling section
  }
});
```

## Validation Patterns

### Request Validation Middleware

```typescript
import { z } from 'zod';
import { validateRequest } from '@ai/http-utils';

router.get(
  '/api/resources',
  validateRequest({
    query: z.object({
      page: z.union([z.string(), z.number()]).optional(),
      limit: z.union([z.string(), z.number()]).optional(),
      status: z.enum(['active', 'inactive']).optional(),
      search: z.string().optional(),
    }),
  }),
  async (req, res) => {
    // Request is validated, proceed with handler
  }
);
```

### Body Validation

```typescript
router.post(
  '/api/resources',
  validateRequest({
    body: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      metadata: z.record(z.unknown()).optional(),
    }),
  }),
  async (req, res) => {
    // Body is validated and typed
  }
);
```

### Parameter Validation

```typescript
router.get(
  '/api/resources/:id',
  validateRequest({
    params: z.object({
      id: z.string().uuid(),
    }),
  }),
  async (req, res) => {
    // Params are validated
  }
);
```

## Error Handling

### Using formatError

```typescript
import { formatError } from '@ai/http-utils';

app.get('/api/resources', async (req, res) => {
  try {
    // Your logic here
  } catch (error) {
    const { status, body } = formatError(error);
    res.status(status).json(body);
  }
});
```

### Service-Level Error Handling

For services using parsePagination:

```typescript
try {
  const { page, limit, skip } = parsePagination(req.query);
  // ... rest of logic
} catch (err) {
  const e = err as Error & { statusCode?: number };
  if (e.statusCode === 400) {
    return res.status(400).json({ message: e.message });
  }
  res.status(500).json({ message: 'Internal server error' });
}
```

## Gateway Error Propagation

The API Gateway properly propagates errors from downstream services:

```typescript
// Helper function for consistent error handling
function handleProxyError(err: any, res: Response): void {
  const error = err as Error & { statusCode?: number };

  if (error.statusCode) {
    res.status(error.statusCode).json({
      message: error.message,
      code: error.statusCode === 400 ? 'BAD_REQUEST' : 'ERROR',
    });
  } else {
    res.status(502).json({
      message: 'Gateway error',
      code: 'GATEWAY_ERROR',
    });
  }
}
```

## Migration Guide

### For Existing Routes

1. **Add validation middleware**:

   ```typescript
   // Before
   router.get('/', async (req, res) => { ... });

   // After
   router.get('/',
     validateRequest({ query: paginationSchema }),
     async (req, res) => { ... }
   );
   ```

2. **Use parsePagination for list endpoints**:

   ```typescript
   // Before
   const page = parseInt(req.query.page) || 1;
   const limit = parseInt(req.query.limit) || 20;

   // After
   const { page, limit, skip } = parsePagination(req.query);
   ```

3. **Standardize error responses**:

   ```typescript
   // Before
   res.status(400).json({ error: 'Bad request' });

   // After
   res.status(400).json({ message: 'Bad request', code: 'BAD_REQUEST' });
   ```

## Testing

### Testing Pagination

```typescript
describe('GET /api/resources', () => {
  it('should validate pagination parameters', async () => {
    const res = await request(app).get('/api/resources?page=0&limit=200');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      message: expect.stringContaining('page must be an integer >= 1'),
    });
  });

  it('should use default pagination', async () => {
    const res = await request(app).get('/api/resources');

    expect(res.body).toMatchObject({
      page: 1,
      limit: 20,
    });
  });
});
```

## Contract Management

### Workflow

1. **Update OpenAPI spec**: Edit `/openapi/ai-service.json`
2. **Regenerate contracts**: `pnpm contracts:generate`
3. **Build contracts**: `pnpm contracts:build`
4. **Verify no drift**: `pnpm contracts:check`

### CI Integration

The CI pipeline automatically checks for contract drift:

```yaml
- name: Check contracts
  run: pnpm contracts:check
```

## Best Practices

1. **Always validate inputs**: Use validation middleware for all endpoints
2. **Use typed contracts**: Import types from `@ai/contracts`
3. **Consistent error shapes**: Always use the standard Error schema
4. **Document in OpenAPI**: Keep the spec as source of truth
5. **Test edge cases**: Validate error paths and boundaries

## Common Patterns

### Paginated Response Type

```typescript
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}
```

### Query Filters with Pagination

```typescript
const schema = z.object({
  // Pagination
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),

  // Filters
  status: z.enum(['active', 'inactive']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),

  // Sorting
  sortBy: z.enum(['name', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
```

## Support

For questions or issues with contracts and validation:

1. Check this documentation
2. Review examples in `/src/routes/financial/clients.routes.example.ts`
3. Run `pnpm contracts:check` to verify sync
4. Contact the architecture team for complex cases
