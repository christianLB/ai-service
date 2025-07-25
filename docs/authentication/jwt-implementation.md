# JWT Authentication Implementation

This document provides the JWT (JSON Web Token) implementation details extracted from the system's security architecture.

## Overview

The AI Service uses JWT-based authentication for securing API endpoints and managing user sessions. JWTs provide a stateless, scalable authentication mechanism that works well with our distributed architecture.

## JWT Configuration

```typescript
interface AuthConfig {
  jwtSecret: string;
  jwtExpiry: string;              // e.g., '24h'
  refreshTokenExpiry: string;     // e.g., '7d'
  issuer: string;
  audience: string;
}
```

## Core Authentication Service

```typescript
class DocumentAuthService {
  async validateRequest(req: Request): Promise<AuthUser> {
    const token = this.extractToken(req);
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }
    
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret, {
        issuer: this.config.issuer,
        audience: this.config.audience
      });
      
      // Additional validation
      const user = await this.userService.getUser(decoded.userId);
      
      if (!user.active) {
        throw new UnauthorizedError('User account inactive');
      }
      
      return user;
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }
}
```

## Token Structure

### Access Token Claims
```typescript
interface JWTPayload {
  // Standard claims
  iss: string;    // Issuer
  sub: string;    // Subject (userId)
  aud: string;    // Audience
  exp: number;    // Expiration time
  iat: number;    // Issued at
  jti: string;    // JWT ID
  
  // Custom claims
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}
```

### Token Generation
```typescript
async generateToken(user: User): Promise<TokenPair> {
  const payload: JWTPayload = {
    iss: this.config.issuer,
    sub: user.id,
    aud: this.config.audience,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(),
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions
  };
  
  const accessToken = jwt.sign(payload, this.config.jwtSecret);
  const refreshToken = await this.generateRefreshToken(user);
  
  return { accessToken, refreshToken };
}
```

## Token Extraction

```typescript
private extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check query parameter (for downloads)
  if (req.query.token) {
    return req.query.token as string;
  }
  
  // Check cookies
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }
  
  return null;
}
```

## Token Refresh Flow

```typescript
async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
  // Validate refresh token
  const decoded = await this.validateRefreshToken(refreshToken);
  
  // Check if token is blacklisted
  if (await this.isTokenBlacklisted(refreshToken)) {
    throw new UnauthorizedError('Refresh token revoked');
  }
  
  // Get user
  const user = await this.userService.getUser(decoded.userId);
  
  // Generate new token pair
  const newTokens = await this.generateToken(user);
  
  // Blacklist old refresh token
  await this.blacklistToken(refreshToken);
  
  return newTokens;
}
```

## Security Best Practices

### 1. Token Storage
- **Access tokens**: Store in memory or session storage
- **Refresh tokens**: Store in httpOnly cookies or secure storage
- **Never store tokens in localStorage** (XSS vulnerable)

### 2. Token Expiration
- **Access tokens**: Short-lived (15-60 minutes)
- **Refresh tokens**: Longer-lived (7-30 days)
- **Implement token rotation** on refresh

### 3. Token Validation
```typescript
async validateToken(token: string): Promise<JWTPayload> {
  try {
    // Verify signature and claims
    const decoded = jwt.verify(token, this.config.jwtSecret, {
      issuer: this.config.issuer,
      audience: this.config.audience,
      clockTolerance: 30 // 30 seconds clock skew tolerance
    });
    
    // Check additional claims
    if (!decoded.userId || !decoded.role) {
      throw new Error('Invalid token structure');
    }
    
    // Check if token is blacklisted
    if (await this.isTokenBlacklisted(token)) {
      throw new Error('Token revoked');
    }
    
    return decoded as JWTPayload;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token expired');
    }
    throw new UnauthorizedError('Invalid token');
  }
}
```

### 4. Token Revocation
```typescript
class TokenBlacklist {
  async revokeToken(token: string, reason: string): Promise<void> {
    const decoded = jwt.decode(token) as JWTPayload;
    
    await this.redis.setex(
      `blacklist:${decoded.jti}`,
      decoded.exp - Math.floor(Date.now() / 1000), // TTL until token expires
      JSON.stringify({
        userId: decoded.userId,
        reason,
        revokedAt: new Date()
      })
    );
  }
  
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const decoded = jwt.decode(token) as JWTPayload;
    const result = await this.redis.get(`blacklist:${decoded.jti}`);
    return result !== null;
  }
}
```

## Middleware Implementation

```typescript
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    });
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-256-bit-secret-key-here
JWT_ISSUER=ai-service
JWT_AUDIENCE=ai-service-api
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# Token Security
JWT_ALGORITHM=HS256
JWT_CLOCK_TOLERANCE=30
```

## Common JWT Errors

### Error Types
```typescript
enum JWTError {
  INVALID_TOKEN = 'Invalid token format or signature',
  EXPIRED_TOKEN = 'Token has expired',
  REVOKED_TOKEN = 'Token has been revoked',
  MISSING_TOKEN = 'No token provided',
  INVALID_ISSUER = 'Token issuer mismatch',
  INVALID_AUDIENCE = 'Token audience mismatch',
  MALFORMED_TOKEN = 'Token structure is invalid'
}
```

### Error Handling
```typescript
function handleJWTError(error: any): ErrorResponse {
  if (error.name === 'JsonWebTokenError') {
    return { code: 401, message: JWTError.INVALID_TOKEN };
  }
  if (error.name === 'TokenExpiredError') {
    return { code: 401, message: JWTError.EXPIRED_TOKEN };
  }
  if (error.name === 'NotBeforeError') {
    return { code: 401, message: 'Token not yet valid' };
  }
  return { code: 401, message: 'Authentication failed' };
}
```

## Testing JWT Authentication

### Generate Test Token
```typescript
function generateTestToken(overrides?: Partial<JWTPayload>): string {
  const payload: JWTPayload = {
    iss: 'test-issuer',
    sub: 'test-user-id',
    aud: 'test-audience',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    jti: 'test-jwt-id',
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    permissions: ['read', 'write'],
    ...overrides
  };
  
  return jwt.sign(payload, 'test-secret');
}
```

## Integration with Other Services

### Auth Service Integration
```typescript
// src/services/auth/auth.service.ts
export class AuthService {
  async login(credentials: LoginCredentials): Promise<TokenPair> {
    const user = await this.validateCredentials(credentials);
    return this.generateToken(user);
  }
  
  async logout(token: string): Promise<void> {
    await this.revokeToken(token, 'User logout');
  }
  
  async validateSession(token: string): Promise<User> {
    const payload = await this.validateToken(token);
    return this.userService.getUser(payload.userId);
  }
}
```

## Security Checklist

- [ ] Use strong, randomly generated JWT secrets (minimum 256 bits)
- [ ] Implement proper token expiration times
- [ ] Use HTTPS for all token transmission
- [ ] Implement token refresh mechanism
- [ ] Add token revocation/blacklist functionality
- [ ] Validate all JWT claims (iss, aud, exp)
- [ ] Handle token errors gracefully
- [ ] Implement rate limiting on auth endpoints
- [ ] Log authentication events for auditing
- [ ] Regular rotation of JWT secrets