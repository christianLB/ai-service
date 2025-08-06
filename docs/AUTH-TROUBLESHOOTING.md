# Authentication Troubleshooting Guide

This guide helps diagnose and fix common authentication issues in the AI Service.

## Quick Diagnostics

Run these commands to quickly identify auth issues:

```bash
# Quick auth diagnostics
make auth-diagnose

# Monitor auth metrics
make auth-monitor

# Fix common issues automatically
make auth-fix-common
```

## Common Issues and Solutions

### 1. "Invalid token type" Error

**Symptom**: Login works but protected endpoints return `{"error": "Invalid token type"}`

**Cause**: The JWT access token is missing the `type: 'access'` field that the middleware expects.

**Solution**:
1. Check `src/services/auth/auth.service.ts`
2. In the `generateAccessToken` method, ensure the payload includes:
   ```typescript
   const payload = {
     userId: user.id,
     email: user.email,
     role: user.role,
     type: 'access'  // <-- This field is required!
   };
   ```

**Quick Fix**:
```bash
make auth-fix-common
```

### 2. "Token expired" Error

**Symptom**: Previously working tokens stop working after some time

**Cause**: JWT tokens have expired (default: 15 minutes for access tokens)

**Solution**:
1. Use refresh token to get new access token
2. Or login again to get fresh tokens

**Check token expiry settings**:
```bash
grep JWT_EXPIRES .env.local
# Should show: JWT_EXPIRES_IN=15m
```

### 3. Login Fails with "Invalid credentials"

**Symptom**: Cannot login with test credentials

**Cause**: Test user doesn't exist or password is wrong

**Solution**:
```bash
# Reset and recreate test user
make auth-dev-reset

# Default test credentials:
# Email: test@example.com
# Password: testPassword123
```

### 4. "No token provided" Error

**Symptom**: All API calls fail with authentication error

**Cause**: Not sending Authorization header or wrong format

**Solution**: Ensure requests include:
```bash
Authorization: Bearer YOUR_TOKEN_HERE
```

**Example**:
```bash
# Get token
TOKEN=$(make auth-token 2>/dev/null | grep -oP 'Token: \K.*')

# Use token
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me
```

### 5. Database Connection Issues

**Symptom**: Login fails with database errors

**Cause**: Auth tables missing or database not running

**Solution**:
```bash
# Check database status
make db-status

# Run migrations if needed
make db-migrate

# Check auth tables exist
docker exec ai-service-postgres psql -U ai_user -d ai_service -c "\dt"
```

## Token Structure Requirements

### Access Token
Must include these fields:
- `userId`: User's UUID
- `email`: User's email address
- `role`: User role (admin, user, etc.)
- `type`: Must be `'access'`
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp

### Refresh Token
Must include:
- `userId`: User's UUID
- `type`: Must be `'refresh'`
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp

## Middleware Configuration

The auth middleware (`src/middleware/auth.middleware.ts`) validates:

1. **Token presence**: Authorization header must exist
2. **Token format**: Must be "Bearer TOKEN"
3. **Token validity**: Must be signed with correct JWT_SECRET
4. **Token type**: Must have `type: 'access'`
5. **Required fields**: Must have userId, email, and role

## Testing Authentication

### Manual Testing
```bash
# 1. Create test user
node scripts/create-test-user.js

# 2. Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testPassword123"}'

# 3. Use the returned token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/auth/me
```

### Automated Testing
```bash
# Run complete test suite
make auth-test-complete

# Quick test
make auth-test

# Comprehensive health check
make auth-check
```

## Environment Variables

Required auth configuration in `.env.local`:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Optional
ALLOW_REGISTRATION=false
AUTH_BYPASS=false
```

## Debugging Tools

### 1. Token Diagnostics
```bash
node scripts/diagnose-auth-tokens.js
```
This shows:
- Token generation process
- Payload structure
- Validation simulation
- Common issues

### 2. Quick Auth Test
```bash
./scripts/quick-auth-test.sh
```
This tests:
- Login flow
- Token structure
- Protected endpoints
- Common failure points

### 3. Auth Monitor
```bash
make auth-monitor
```
Shows:
- Recent login attempts
- Active sessions
- Failed authentications

## Development Helpers

### Reset Authentication
```bash
# Clear tokens and reset test user
make auth-dev-reset
```

### Validate Middleware
```bash
# Check middleware configuration
make auth-validate-middleware
```

### Get Admin Token
```bash
# Get a valid JWT token for testing
make auth-token
```

## Security Best Practices

1. **Never use default JWT_SECRET in production**
2. **Set appropriate token expiry times**
3. **Use HTTPS in production**
4. **Implement rate limiting on auth endpoints**
5. **Log authentication events for monitoring**
6. **Regularly rotate JWT secrets**

## Emergency Recovery

If authentication is completely broken:

1. **Check basics**:
   ```bash
   make dev-status
   make db-status
   ```

2. **Reset auth system**:
   ```bash
   make auth-dev-reset
   make auth-fix-common
   ```

3. **Restart services**:
   ```bash
   make dev-restart
   ```

4. **Check logs**:
   ```bash
   docker logs ai-service-api --tail 100
   ```

## Related Documentation

- [SQL to Prisma Migration](./AFTER_MIGRATION_TROUBLESHOOTING.md)
- [API Documentation](./API.md)
- [Security Guide](./SECURITY.md)