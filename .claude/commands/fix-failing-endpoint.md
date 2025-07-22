# Fix Failing Endpoint

This command helps fix endpoints returning 500 errors or other failures.

## Usage
```
/fix-failing-endpoint [endpoint-path]
```

## Investigation Steps

1. **Check logs for the specific error**:
   ```bash
   make dev-logs | grep -A 10 -B 5 "[endpoint-path]"
   ```

2. **Common error patterns**:
   - `relation "table_name" does not exist` → Missing migration
   - `Cannot read properties of undefined` → Null check needed
   - `Authentication failed` → Token issues
   - `ECONNREFUSED` → Service not running

3. **For database errors**:
   ```bash
   # Check migration status
   make db-migrate-status
   
   # If migrations pending
   make db-migrate
   
   # If table missing in Prisma
   make db-studio  # Visual check
   ```

4. **For frontend errors**:
   - Add null checks: `data?.property?.value || defaultValue`
   - Check React Query error states
   - Verify API response structure matches types

5. **For auth errors**:
   ```bash
   # Test with fresh token
   make auth-token
   
   # Check auth service health
   curl http://localhost:3001/api/auth/verify
   ```

## Quick Fixes

### Missing table/relation
```typescript
// Add to prisma/schema.prisma
model MissingTable {
  id        String   @id @default(uuid())
  // ... fields
  @@schema("financial")
}

// Then run
make db-migrate-create NAME=add_missing_table
make db-migrate
```

### Null reference errors
```typescript
// Before
const value = response.data.nested.property;

// After
const value = response?.data?.nested?.property || defaultValue;
```

### Async error handling
```typescript
try {
  const result = await service.method();
  return res.json(result);
} catch (error) {
  console.error('Endpoint error:', error);
  return res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}
```

## Testing the fix
```bash
# Get token
TOKEN=$(make auth-token 2>/dev/null | grep -oP 'Token: \K.*')

# Test endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/[endpoint-path]
```