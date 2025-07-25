# Authentication Documentation

This section contains all documentation related to authentication and authorization in the AI Service, including JWT implementation, security best practices, and role-based access control.

## 📁 Structure

### Core Documentation
- **[Implementation](./implementation.md)** - Complete authentication implementation guide
- **[JWT Implementation](./jwt-implementation.md)** - Detailed JWT token management
- **[Security Best Practices](./security-best-practices.md)** - Security guidelines and recommendations
- **[Testing Guide](./testing-guide.md)** - How to test authentication flows
- **[Fix Summary](./fix-summary.md)** - Historical fixes and improvements

## 🚀 Quick Start

1. **Understanding the System**: Start with [Implementation](./implementation.md)
2. **JWT Details**: Deep dive into [JWT Implementation](./jwt-implementation.md)
3. **Security**: Review [Security Best Practices](./security-best-practices.md)
4. **Testing**: Follow the [Testing Guide](./testing-guide.md)

## 🔑 Key Features

### JWT Authentication
- Stateless token-based authentication
- Access and refresh token mechanism
- Token blacklisting for revocation
- Configurable expiration times

### Role-Based Access Control (RBAC)
```typescript
enum Role {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer'
}

enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin'
}
```

### Security Features
- Password hashing with bcrypt
- Rate limiting on auth endpoints
- Session management
- Multi-factor authentication ready
- Audit logging for all auth events

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Client App    │────▶│   Auth Service   │────▶│   User Store   │
│  (React/API)    │◀────│   (JWT/RBAC)     │◀────│  (PostgreSQL)  │
└─────────────────┘     └──────────────────┘     └────────────────┘
         │                       │                         │
         │                       ▼                         │
         │              ┌──────────────────┐              │
         └─────────────▶│  Token Blacklist │◀─────────────┘
                        │     (Redis)      │
                        └──────────────────┘
```

## 🔐 Authentication Flow

### 1. Login Flow
```typescript
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securepassword"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 86400
}
```

### 2. Token Refresh
```typescript
POST /api/auth/refresh
{
  "refreshToken": "eyJhbGc..."
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 86400
}
```

### 3. Protected Request
```typescript
GET /api/protected/resource
Headers: {
  "Authorization": "Bearer eyJhbGc..."
}
```

## 🛡️ Security Configuration

### Environment Variables
```bash
# JWT Configuration
JWT_SECRET=your-256-bit-secret-key
JWT_ISSUER=ai-service
JWT_AUDIENCE=ai-service-api
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# Bcrypt Configuration
BCRYPT_ROUNDS=10

# Session Configuration
SESSION_SECRET=your-session-secret
SESSION_EXPIRY=24h

# Rate Limiting
AUTH_RATE_LIMIT_WINDOW=15m
AUTH_RATE_LIMIT_MAX=5
```

### Middleware Stack
```typescript
app.use(helmet());                    // Security headers
app.use(rateLimiter);                 // Rate limiting
app.use(authenticateJWT);             // JWT validation
app.use(authorizeRole);               // Role checking
app.use(auditLogger);                 // Audit logging
```

## 📊 Common Patterns

### Protected Route
```typescript
router.get('/protected',
  authenticateJWT,
  authorize([Permission.READ]),
  async (req, res) => {
    // Route handler
  }
);
```

### Role-Based Route
```typescript
router.post('/admin',
  authenticateJWT,
  requireRole(Role.ADMIN),
  async (req, res) => {
    // Admin-only handler
  }
);
```

### Resource-Based Authorization
```typescript
router.put('/resource/:id',
  authenticateJWT,
  async (req, res) => {
    const resource = await getResource(req.params.id);
    
    if (!canUserEdit(req.user, resource)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Update resource
  }
);
```

## 🐛 Troubleshooting

### Common Issues

1. **Token Expired**
   - Check token expiration settings
   - Implement refresh token flow
   - Ensure client refreshes tokens

2. **Invalid Token**
   - Verify JWT secret matches
   - Check issuer/audience claims
   - Validate token format

3. **CORS Issues**
   - Configure CORS for auth endpoints
   - Include credentials in requests
   - Check allowed origins

4. **Rate Limiting**
   - Adjust rate limit thresholds
   - Implement exponential backoff
   - Consider IP whitelisting

## 📈 Monitoring

### Key Metrics
- Login success/failure rates
- Token refresh frequency
- Authorization denials
- Suspicious activity patterns

### Audit Events
- User login/logout
- Failed authentication attempts
- Permission changes
- Token revocations

## 🔄 Recent Updates

- **2024-07-25**: Documentation reorganized
- **2024-07-13**: JWT implementation completed
- **2024-07-10**: RBAC system implemented
- **2024-07-08**: Security best practices updated

## 📚 Related Documentation

- [API Reference](../api-reference/) - Complete API documentation
- [Security](../deployment/security.md) - Infrastructure security
- [User Management](../development/user-management.md) - User system details