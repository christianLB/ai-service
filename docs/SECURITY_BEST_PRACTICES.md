# Security Best Practices

This document outlines security best practices for the AI Service project.

## Environment Variables and Secrets

### Never Commit Secrets

- **NEVER** commit real secrets, passwords, or API keys to version control
- Use `.env.local` files that are git-ignored for local development
- Use `.env.secrets.example` as a template with placeholders
- All production secrets should be stored in secure secret management systems

### Required Environment Variables

Copy `.env.secrets.example` to `.env.local` and set these required values:

```bash
# Authentication
JWT_SECRET=<minimum 32 characters, use: openssl rand -base64 32>
DEFAULT_ADMIN_PASSWORD=<strong password for admin user>

# Database
POSTGRES_PASSWORD=<strong database password>

# External Services
OPENAI_API_KEY=<your OpenAI API key>
TELEGRAM_BOT_TOKEN=<your Telegram bot token>
PDF_PASSWORD=<password for encrypted PDFs>
```

### Generating Secure Values

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate strong passwords
openssl rand -base64 24

# Generate encryption keys
openssl rand -hex 32
```

## Security Checklist

### Before Committing

- [ ] Run security scan: `npm audit`
- [ ] Check for exposed secrets: `grep -r "password\|secret\|token" --include="*.js" --include="*.ts"`
- [ ] Ensure `.env.local` is in `.gitignore`
- [ ] Review all changed files for hardcoded values

### Production Deployment

- [ ] All secrets are set via environment variables
- [ ] JWT_SECRET is unique and at least 32 characters
- [ ] Default passwords have been changed
- [ ] Database passwords are strong and unique
- [ ] API keys are valid and have appropriate permissions
- [ ] SSL/TLS is enabled for all connections

### Regular Maintenance

- [ ] Rotate secrets regularly (every 90 days)
- [ ] Review and revoke unused API keys
- [ ] Update dependencies for security patches
- [ ] Monitor security advisories

## Common Security Issues

### 1. Exposed Secrets in Code

**Problem**: Hardcoded passwords, tokens, or API keys in source code

**Solution**: 
- Move all secrets to environment variables
- Use `.env.local` for local development
- Use secure secret management for production

### 2. Weak JWT Secrets

**Problem**: Using default or weak JWT secrets

**Solution**:
- Generate strong random secrets: `openssl rand -base64 32`
- Ensure JWT_SECRET is at least 32 characters
- Never use default values in production

### 3. Default Passwords

**Problem**: Using default passwords for admin users or test accounts

**Solution**:
- Set `DEFAULT_ADMIN_PASSWORD` environment variable
- Force password change on first login
- Use strong password policies

### 4. Unencrypted Sensitive Data

**Problem**: Storing sensitive data in plain text

**Solution**:
- Encrypt sensitive data at rest
- Use environment variables for encryption keys
- Implement proper key rotation

## Security Tools

### npm audit

Run regularly to check for vulnerable dependencies:
```bash
npm audit
npm audit fix
```

### Secret Scanning

Use GitHub's secret scanning or tools like:
```bash
# TruffleHog
trufflehog filesystem .

# GitLeaks
gitleaks detect
```

### Environment Validation

The project includes validation to ensure required secrets are set:
- JWT_SECRET validation in `src/index.ts`
- PDF_PASSWORD validation in PDF processing scripts
- Admin password validation in seed scripts

## Incident Response

If a secret is accidentally exposed:

1. **Immediately revoke** the exposed credential
2. **Generate new credentials** and update all systems
3. **Review logs** for any unauthorized access
4. **Update** all affected systems with new credentials
5. **Document** the incident and lessons learned

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)