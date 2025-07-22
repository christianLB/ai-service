# Implement Feature

Template for implementing complete features end-to-end.

## Usage
```
/implement-feature [feature-name] [module=financial|trading|document]
```

## Implementation Checklist

### 1. Planning Phase
- [ ] Define data model requirements
- [ ] Identify API endpoints needed
- [ ] Design UI/UX flow
- [ ] Consider security implications
- [ ] Plan testing strategy

### 2. Backend Implementation

#### Database Layer
```bash
# 1. Add models to prisma/schema.prisma
# 2. Generate and apply migrations
make db-migrate-create NAME=[feature]_schema
make db-migrate
```

#### Service Layer
Create service in `src/services/[module]/[feature].service.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

export class [Feature]Service {
  constructor(private prisma: PrismaClient) {}
  
  async create(data: Create[Feature]Dto) {
    // Validation
    // Business logic
    // Database operation
    return this.prisma.[model].create({ data });
  }
  
  async findAll(filters: [Feature]Filters) {
    // Implement pagination
    // Apply filters
    // Return formatted data
  }
}
```

#### API Routes
Add routes in `src/routes/[module].ts`:
```typescript
// CRUD endpoints
router.get('/[feature]', authenticate, async (req, res) => {
  try {
    const result = await [feature]Service.findAll(req.query);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/[feature]', authenticate, validate([Feature]Schema), async (req, res) => {
  try {
    const result = await [feature]Service.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    handleError(res, error);
  }
});
```

### 3. Frontend Implementation

#### React Query Hooks
Create hook in `frontend/src/hooks/use[Feature].ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function use[Feature]() {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['[feature]'],
    queryFn: () => api.get('/[module]/[feature]'),
  });
  
  const create = useMutation({
    mutationFn: (data) => api.post('/[module]/[feature]', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['[feature]']);
    },
  });
  
  return { data, isLoading, create };
}
```

#### UI Components
Create page in `frontend/src/pages/[Feature].tsx`:
```typescript
export function [Feature]Page() {
  const { data, isLoading, create } = use[Feature]();
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <PageLayout title="[Feature]">
      {/* List view */}
      {/* Create/Edit forms */}
      {/* Actions */}
    </PageLayout>
  );
}
```

### 4. Testing

#### Backend Tests
```typescript
describe('[Feature]Service', () => {
  it('should create a new [feature]', async () => {
    const result = await service.create(mockData);
    expect(result).toHaveProperty('id');
  });
});
```

#### API Tests
```typescript
describe('[Feature] API', () => {
  it('POST /[feature] should create new record', async () => {
    const response = await request(app)
      .post('/api/[module]/[feature]')
      .set('Authorization', `Bearer ${token}`)
      .send(validData);
      
    expect(response.status).toBe(201);
  });
});
```

### 5. Documentation

Update relevant docs:
- API documentation in `docs/api/[module].md`
- User guide in `docs/user-guide/[feature].md`
- Update CENTRO_COMUNICACION.md with feature status

### 6. Deployment Checklist

- [ ] All tests passing
- [ ] Database migrations ready
- [ ] Environment variables documented
- [ ] Feature flags configured (if needed)
- [ ] Monitoring/alerts set up
- [ ] Rollback plan defined

## Common Patterns

### Pagination
```typescript
async findAll(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  const [items, total] = await Promise.all([
    this.prisma.[model].findMany({ skip, take: limit }),
    this.prisma.[model].count(),
  ]);
  
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
```

### Error Handling
```typescript
class [Feature]Error extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

// Usage
if (!item) {
  throw new [Feature]Error('Item not found', 'NOT_FOUND');
}
```

### Validation
```typescript
import { z } from 'zod';

const Create[Feature]Schema = z.object({
  name: z.string().min(1).max(255),
  amount: z.number().positive(),
  // ...
});
```

## Quick Start Example

For a "Reports" feature:
```bash
# 1. Generate CRUD
make gen-crud-auto MODEL=Report

# 2. Add custom business logic
# 3. Create frontend page
# 4. Add to navigation
# 5. Test everything
# 6. Deploy
```