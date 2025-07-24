# Document Intelligence Security Documentation

## Overview

Security is paramount in the Document Intelligence module as it handles potentially sensitive documents and personal information. This document outlines the comprehensive security measures implemented to protect data confidentiality, integrity, and availability.

## Security Architecture

### Defense in Depth

The module implements multiple layers of security:

```
┌─────────────────────────────────────┐
│         Application Layer           │ ← Input validation, auth
├─────────────────────────────────────┤
│         Service Layer               │ ← Business logic security
├─────────────────────────────────────┤
│         Data Layer                  │ ← Encryption, access control
├─────────────────────────────────────┤
│         Infrastructure              │ ← Network security, isolation
└─────────────────────────────────────┘
```

## Authentication & Authorization

### JWT-Based Authentication

```typescript
interface AuthConfig {
  jwtSecret: string;
  jwtExpiry: string;              // e.g., '24h'
  refreshTokenExpiry: string;     // e.g., '7d'
  issuer: string;
  audience: string;
}

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

### Role-Based Access Control (RBAC)

```typescript
enum DocumentPermission {
  UPLOAD = 'document.upload',
  VIEW = 'document.view',
  ANALYZE = 'document.analyze',
  DELETE = 'document.delete',
  SHARE = 'document.share',
  ADMIN = 'document.admin'
}

interface Role {
  name: string;
  permissions: DocumentPermission[];
}

const ROLES: Record<string, Role> = {
  viewer: {
    name: 'Viewer',
    permissions: [DocumentPermission.VIEW]
  },
  user: {
    name: 'User',
    permissions: [
      DocumentPermission.UPLOAD,
      DocumentPermission.VIEW,
      DocumentPermission.ANALYZE
    ]
  },
  admin: {
    name: 'Admin',
    permissions: Object.values(DocumentPermission)
  }
};

class AuthorizationService {
  checkPermission(
    user: AuthUser,
    permission: DocumentPermission,
    resource?: Document
  ): boolean {
    // Check role permissions
    if (user.role.permissions.includes(permission)) {
      // Additional resource-level check
      if (resource) {
        return this.checkResourceAccess(user, resource);
      }
      return true;
    }
    
    return false;
  }
  
  private checkResourceAccess(user: AuthUser, document: Document): boolean {
    // Owner always has access
    if (document.userId === user.id) return true;
    
    // Check sharing permissions
    if (document.sharedWith?.includes(user.id)) return true;
    
    // Admin override
    if (user.role.name === 'admin') return true;
    
    return false;
  }
}
```

## Input Validation & Sanitization

### File Upload Security

```typescript
class FileUploadValidator {
  private readonly config = {
    maxFileSize: 52428800,  // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/html',
      'text/markdown',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    blockedExtensions: ['.exe', '.dll', '.bat', '.cmd', '.scr'],
    magicNumbers: {
      pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]),  // %PDF
      docx: Buffer.from([0x50, 0x4B, 0x03, 0x04])  // PK..
    }
  };

  async validateFile(file: Express.Multer.File): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Size check
    if (file.size > this.config.maxFileSize) {
      errors.push(`File size exceeds maximum of ${this.config.maxFileSize} bytes`);
    }
    
    // MIME type check
    if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} not allowed`);
    }
    
    // Extension check
    const ext = path.extname(file.originalname).toLowerCase();
    if (this.config.blockedExtensions.includes(ext)) {
      errors.push(`File extension ${ext} is blocked`);
    }
    
    // Magic number verification
    const fileBuffer = await fs.readFile(file.path);
    if (!this.verifyMagicNumber(fileBuffer, file.mimetype)) {
      errors.push('File content does not match declared type');
    }
    
    // Virus scan
    if (this.config.enableVirusScan) {
      const scanResult = await this.virusScanner.scan(file.path);
      if (!scanResult.clean) {
        errors.push(`Virus detected: ${scanResult.threat}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
```

### Content Sanitization

```typescript
class ContentSanitizer {
  sanitizeText(text: string): string {
    // Remove control characters
    let sanitized = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    // Normalize unicode
    sanitized = sanitized.normalize('NFC');
    
    // Remove potential XSS
    sanitized = this.escapeHtml(sanitized);
    
    // Limit length
    if (sanitized.length > this.config.maxTextLength) {
      sanitized = sanitized.substring(0, this.config.maxTextLength);
    }
    
    return sanitized;
  }
  
  sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let safe = filename.replace(/[\/\\]/g, '');
    
    // Remove special characters
    safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Limit length
    if (safe.length > 255) {
      const ext = path.extname(safe);
      safe = safe.substring(0, 255 - ext.length) + ext;
    }
    
    return safe;
  }
  
  private escapeHtml(text: string): string {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}
```

## Data Encryption

### Encryption at Rest

```typescript
class DocumentEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivation = 'scrypt';
  
  async encryptDocument(
    document: Buffer,
    userId: string
  ): Promise<EncryptedDocument> {
    // Generate document-specific key
    const salt = crypto.randomBytes(32);
    const key = await this.deriveKey(userId, salt);
    
    // Encrypt document
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(document),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: this.algorithm
    };
  }
  
  async decryptDocument(
    encryptedDoc: EncryptedDocument,
    userId: string
  ): Promise<Buffer> {
    // Derive key
    const salt = Buffer.from(encryptedDoc.salt, 'base64');
    const key = await this.deriveKey(userId, salt);
    
    // Decrypt
    const iv = Buffer.from(encryptedDoc.iv, 'base64');
    const authTag = Buffer.from(encryptedDoc.authTag, 'base64');
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(encryptedDoc.encrypted),
      decipher.final()
    ]);
  }
  
  private async deriveKey(userId: string, salt: Buffer): Promise<Buffer> {
    const masterKey = Buffer.from(process.env.MASTER_ENCRYPTION_KEY, 'hex');
    const info = Buffer.from(`document-encryption-${userId}`);
    
    return new Promise((resolve, reject) => {
      crypto.scrypt(masterKey, salt, 32, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }
}
```

### Encryption in Transit

All communication uses TLS 1.3:

```typescript
interface TLSConfig {
  minVersion: 'TLSv1.3';
  ciphers: string[];
  honorCipherOrder: true;
  key: Buffer;
  cert: Buffer;
  ca: Buffer[];
}

const tlsConfig: TLSConfig = {
  minVersion: 'TLSv1.3',
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ],
  honorCipherOrder: true,
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem'),
  ca: [fs.readFileSync('ca-cert.pem')]
};
```

## Privacy & Data Protection

### PII Detection and Handling

```typescript
class PIIDetector {
  private patterns = {
    ssn: /\b\d{3}-\d{2}-\d{4}\b/,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    phone: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/,
    passport: /\b[A-Z]{1,2}\d{6,9}\b/,
    driverLicense: /\b[A-Z]{1,2}\d{5,8}\b/
  };
  
  async detectPII(text: string): Promise<PIIDetectionResult> {
    const findings: PIIFinding[] = [];
    
    for (const [type, pattern] of Object.entries(this.patterns)) {
      const matches = text.match(new RegExp(pattern, 'g'));
      if (matches) {
        findings.push({
          type,
          count: matches.length,
          locations: this.findLocations(text, pattern)
        });
      }
    }
    
    // Use AI for context-aware detection
    const aiFindings = await this.aiPIIDetection(text);
    findings.push(...aiFindings);
    
    return {
      hasPII: findings.length > 0,
      findings,
      riskLevel: this.calculateRiskLevel(findings)
    };
  }
  
  maskPII(text: string, findings: PIIFinding[]): string {
    let masked = text;
    
    for (const finding of findings) {
      for (const location of finding.locations) {
        const original = masked.substring(location.start, location.end);
        const replacement = this.getMask(finding.type, original.length);
        masked = masked.substring(0, location.start) + 
                replacement + 
                masked.substring(location.end);
      }
    }
    
    return masked;
  }
}
```

### GDPR Compliance

```typescript
class GDPRCompliance {
  // Right to access
  async exportUserData(userId: string): Promise<UserDataExport> {
    const documents = await this.documentService.getUserDocuments(userId);
    const analyses = await this.analysisService.getUserAnalyses(userId);
    const interactions = await this.interactionService.getUserInteractions(userId);
    
    return {
      profile: await this.userService.getProfile(userId),
      documents: documents.map(d => this.sanitizeForExport(d)),
      analyses,
      interactions,
      exportDate: new Date(),
      format: 'json'
    };
  }
  
  // Right to erasure
  async deleteUserData(userId: string, verification: string): Promise<void> {
    // Verify request
    if (!await this.verifyDeletionRequest(userId, verification)) {
      throw new Error('Invalid deletion request');
    }
    
    // Start deletion process
    await this.db.transaction(async (trx) => {
      // Delete documents and files
      const documents = await trx('documents')
        .where('user_id', userId)
        .select('id', 'file_path');
      
      for (const doc of documents) {
        await this.fileStorage.deleteFile(doc.file_path);
      }
      
      // Delete database records
      await trx('documents').where('user_id', userId).delete();
      await trx('analyses').where('user_id', userId).delete();
      await trx('interactions').where('user_id', userId).delete();
      
      // Anonymize logs
      await this.anonymizeLogs(userId);
    });
    
    // Send confirmation
    await this.notifyDeletion(userId);
  }
  
  // Consent management
  async updateConsent(
    userId: string,
    consent: ConsentUpdate
  ): Promise<void> {
    await this.db('user_consent').insert({
      user_id: userId,
      consent_type: consent.type,
      granted: consent.granted,
      timestamp: new Date(),
      ip_address: consent.ipAddress,
      user_agent: consent.userAgent
    });
    
    // Apply consent changes
    if (!consent.granted && consent.type === 'analytics') {
      await this.disableAnalytics(userId);
    }
  }
}
```

## Access Control

### Document-Level Security

```typescript
interface DocumentSecurity {
  ownerId: string;
  visibility: 'private' | 'shared' | 'public';
  sharedWith: string[];
  permissions: {
    [userId: string]: DocumentPermission[];
  };
  expiresAt?: Date;
  passwordProtected: boolean;
}

class DocumentAccessControl {
  async checkAccess(
    userId: string,
    documentId: string,
    permission: DocumentPermission
  ): Promise<boolean> {
    const document = await this.getDocument(documentId);
    
    // Owner check
    if (document.security.ownerId === userId) {
      return true;
    }
    
    // Public documents
    if (document.security.visibility === 'public' && 
        permission === DocumentPermission.VIEW) {
      return true;
    }
    
    // Shared access
    if (document.security.sharedWith.includes(userId)) {
      const userPermissions = document.security.permissions[userId] || [];
      return userPermissions.includes(permission);
    }
    
    // Check expiration
    if (document.security.expiresAt && 
        new Date() > document.security.expiresAt) {
      return false;
    }
    
    return false;
  }
  
  async shareDocument(
    documentId: string,
    shareConfig: ShareConfig
  ): Promise<ShareResult> {
    // Generate secure share link
    const token = crypto.randomBytes(32).toString('hex');
    const shareLink = `${this.baseUrl}/shared/${token}`;
    
    // Store share configuration
    await this.db('document_shares').insert({
      document_id: documentId,
      token,
      shared_with: shareConfig.email,
      permissions: shareConfig.permissions,
      expires_at: shareConfig.expiresAt,
      max_views: shareConfig.maxViews,
      password_hash: shareConfig.password 
        ? await bcrypt.hash(shareConfig.password, 10)
        : null
    });
    
    return {
      shareLink,
      expiresAt: shareConfig.expiresAt,
      permissions: shareConfig.permissions
    };
  }
}
```

## Security Monitoring

### Audit Logging

```typescript
interface AuditLog {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

class AuditLogger {
  async log(event: AuditLog): Promise<void> {
    // Add security context
    const enrichedEvent = {
      ...event,
      sessionId: this.getSessionId(),
      requestId: this.getRequestId(),
      serverVersion: process.env.APP_VERSION
    };
    
    // Store in database
    await this.db('audit_logs').insert(enrichedEvent);
    
    // Alert on suspicious activity
    if (this.isSuspicious(event)) {
      await this.alertSecurity(event);
    }
  }
  
  private isSuspicious(event: AuditLog): boolean {
    // Multiple failed attempts
    if (!event.success && event.action === 'document.access') {
      const recentFailures = await this.getRecentFailures(
        event.userId,
        event.action
      );
      return recentFailures > 5;
    }
    
    // Unusual access patterns
    if (event.action === 'document.download') {
      const downloadRate = await this.getDownloadRate(event.userId);
      return downloadRate > this.config.maxDownloadRate;
    }
    
    return false;
  }
}
```

### Intrusion Detection

```typescript
class IntrusionDetection {
  private readonly rules = [
    {
      name: 'sql_injection',
      pattern: /(\b(union|select|insert|update|delete|drop)\b.*\b(from|where|table)\b)/i,
      severity: 'high'
    },
    {
      name: 'path_traversal',
      pattern: /(\.\.[\/\\]){2,}/,
      severity: 'high'
    },
    {
      name: 'xss_attempt',
      pattern: /<script[^>]*>.*?<\/script>/gi,
      severity: 'medium'
    }
  ];
  
  async checkRequest(req: Request): Promise<ThreatDetectionResult> {
    const threats: Threat[] = [];
    
    // Check all input parameters
    const inputs = {
      ...req.query,
      ...req.body,
      ...req.params
    };
    
    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'string') {
        for (const rule of this.rules) {
          if (rule.pattern.test(value)) {
            threats.push({
              type: rule.name,
              severity: rule.severity,
              location: key,
              value: value.substring(0, 100)
            });
          }
        }
      }
    }
    
    // Check for anomalies
    const anomalies = await this.detectAnomalies(req);
    threats.push(...anomalies);
    
    return {
      safe: threats.length === 0,
      threats,
      action: this.determineAction(threats)
    };
  }
}
```

## Incident Response

### Security Incident Handling

```typescript
class SecurityIncidentHandler {
  async handleIncident(incident: SecurityIncident): Promise<void> {
    // 1. Immediate containment
    await this.contain(incident);
    
    // 2. Investigation
    const investigation = await this.investigate(incident);
    
    // 3. Eradication
    await this.eradicate(incident, investigation);
    
    // 4. Recovery
    await this.recover(incident);
    
    // 5. Post-incident analysis
    await this.analyze(incident, investigation);
    
    // 6. Report generation
    await this.generateReport(incident, investigation);
  }
  
  private async contain(incident: SecurityIncident): Promise<void> {
    switch (incident.type) {
      case 'data_breach':
        // Lock affected accounts
        await this.lockAccounts(incident.affectedUsers);
        // Revoke tokens
        await this.revokeTokens(incident.affectedUsers);
        break;
        
      case 'malware_upload':
        // Quarantine file
        await this.quarantineFile(incident.fileId);
        // Block user
        await this.blockUser(incident.userId);
        break;
        
      case 'unauthorized_access':
        // Terminate sessions
        await this.terminateSessions(incident.userId);
        // Force password reset
        await this.forcePasswordReset(incident.userId);
        break;
    }
  }
}
```

## Security Headers

```typescript
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};
```

## Best Practices

### Development Security

1. **Dependency Management**
   - Regular vulnerability scanning
   - Automated dependency updates
   - License compliance checks

2. **Code Security**
   - Static analysis (SAST)
   - Dynamic analysis (DAST)
   - Code review requirements

3. **Secret Management**
   - Environment variables
   - Secret rotation
   - No hardcoded secrets

### Operational Security

1. **Access Management**
   - Principle of least privilege
   - Regular access reviews
   - Multi-factor authentication

2. **Monitoring**
   - Real-time alerts
   - Anomaly detection
   - Performance monitoring

3. **Backup & Recovery**
   - Regular backups
   - Tested recovery procedures
   - Offsite storage

### Security Checklist

- [ ] All inputs validated and sanitized
- [ ] Authentication required for all endpoints
- [ ] Authorization checks implemented
- [ ] Data encrypted at rest and in transit
- [ ] PII detection and handling in place
- [ ] Audit logging enabled
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] File upload restrictions enforced
- [ ] Regular security assessments scheduled