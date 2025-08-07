# CSRF Token Fix Documentation

## Issue Summary

After the SQL to Prisma migration, GoCardless synchronization started failing with:
```
403 {"success":false,"error":"Invalid CSRF token","code":"CSRF_VALIDATION_FAILED"}
```

## Root Cause

The backend has CSRF protection enabled globally, but the frontend wasn't sending CSRF tokens with POST requests.

## Solution Implemented

### 1. Frontend API Client Updates (`frontend/src/services/api.ts`)

Added CSRF token handling:
- Set `withCredentials: true` to enable cookie support
- Added CSRF token fetching function
- Modified request interceptor to include CSRF token in headers
- Added automatic CSRF token refresh on 403 errors

### 2. How It Works

1. **Token Acquisition**:
   - First checks for CSRF token in browser cookie
   - If not found, fetches from `/api/csrf-token` endpoint
   - Stores token for reuse

2. **Request Flow**:
   - All POST/PUT/DELETE/PATCH requests include `x-csrf-token` header
   - Auth endpoints are excluded (backend skips CSRF for `/api/auth/*`)

3. **Error Handling**:
   - If CSRF validation fails (403 with CSRF_VALIDATION_FAILED)
   - Automatically fetches new token and retries request

## Testing

Test script available: `scripts/test-gocardless-sync.sh`

Manual test:
```bash
# 1. Get CSRF token
curl http://localhost:3001/api/csrf-token

# 2. Use token in requests
curl -X POST http://localhost:3001/api/financial/sync \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -H "Content-Type: application/json"
```

## Browser Considerations

- CSRF tokens are stored in cookies (httpOnly: false)
- Tokens expire after 24 hours
- Clear browser cache if issues persist after deployment

## Security Notes

- CSRF protection remains active for all endpoints except auth
- Tokens are tied to user sessions via cookies
- No backend changes required - frontend-only fix