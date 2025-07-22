# Extended Project Context

This document provides deeper context about the AI Service project that helps Claude Code understand the business domain, technical constraints, and project philosophy.

## Business Context

### Project Vision
The AI Service is a **personal finance automation platform** designed to be an "extension of the human brain" for financial operations. It's not just a budgeting app—it's an intelligent system that learns patterns, automates decisions, and provides cognitive amplification for financial management.

### Core Value Propositions
1. **Real Banking Integration**: Direct connection to actual bank accounts via GoCardless (not manual imports)
2. **AI-Powered Intelligence**: 90%+ accurate automatic categorization that learns from user feedback
3. **Automation First**: Workflows that run without human intervention
4. **Privacy Focused**: Self-hosted on personal infrastructure (Synology NAS)
5. **Extensible Platform**: Plugin architecture for new capabilities

### User Profile
- Primary user: Technical professional managing personal/business finances
- Location: Europe (primarily EUR transactions)
- Needs: Automated bookkeeping, intelligent insights, tax preparation
- Technical level: Comfortable with Docker, command line, self-hosting

### Business Model
- Not a SaaS product—personal tool that could be packaged for others
- Potential revenue: Consulting, custom implementations, open-source sponsorship
- Cost centers: OpenAI API, server infrastructure, development time

## Technical Architecture Philosophy

### Design Principles
1. **Modular Monolith**: Start monolithic, prepare for microservices
2. **Database First**: Schema is the source of truth, code follows
3. **Type Safety**: TypeScript everywhere, runtime validation with Zod
4. **AI-Augmented**: Every feature considers how AI can enhance it
5. **Automation Ready**: APIs designed for workflow automation

### Technology Choices Rationale

**PostgreSQL over MongoDB**
- Financial data needs ACID compliance
- Complex relationships between entities
- SQL familiarity for debugging
- PostGIS ready for future location features

**Express over Fastify/Nest.js**
- Mature ecosystem
- Simple middleware model
- Easy to understand for contributions
- No magic, explicit routing

**React over Vue/Angular**
- Best ecosystem for financial dashboards
- TanStack Query for server state
- Component marketplace availability
- Team familiarity

**Docker over Kubernetes**
- Simplicity for single-server deployment
- docker-compose is enough for current scale
- Easy backup/restore procedures
- Lower operational overhead

### System Boundaries

**What the system IS**:
- Personal financial command center
- Automation platform for financial workflows
- Learning system that improves with use
- Integration hub for financial services

**What the system IS NOT**:
- Investment advisor or trading bot
- Tax calculation software
- Multi-tenant SaaS platform
- Accounting software replacement

## Technical Debt & Future Considerations

### Current Technical Debt
1. **Memory Usage**: Containers using >90% memory, needs optimization
2. **SQL to Prisma Migration**: ~30% of code still using raw SQL
3. **Test Coverage**: Currently ~40%, target 80%
4. **Error Handling**: Inconsistent patterns across modules
5. **Documentation**: API docs auto-generation needed

### Planned Improvements
1. **Performance**: Redis caching layer for expensive queries
2. **Security**: OAuth2 provider for third-party integrations
3. **Scalability**: Message queue for background jobs
4. **Monitoring**: Prometheus + Grafana stack
5. **AI Features**: Local LLM option for privacy

### Migration Path
Currently migrating from "clever prototype" to "production system":
- Phase 1: Type safety everywhere (Prisma migration) ✅ 70%
- Phase 2: Comprehensive testing ⏳
- Phase 3: Performance optimization
- Phase 4: Multi-user support
- Phase 5: Plugin marketplace

## Security & Compliance Considerations

### Security Posture
- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based (user, admin)
- **Encryption**: TLS for transit, considering at-rest
- **Secrets**: Environment variables, considering Vault
- **Audit**: All financial operations logged

### Compliance Requirements
- **GDPR**: EU data privacy (user deletion, data export)
- **PSD2**: Open banking regulations (GoCardless compliant)
- **Tax**: Transaction categorization for reporting
- **Backup**: 3-2-1 backup strategy implementation

### Data Sensitivity Levels
1. **Critical**: Bank credentials, API keys (encrypted)
2. **Sensitive**: Transaction data, personal information
3. **Internal**: User preferences, categories
4. **Public**: Anonymous statistics, health endpoints

## Operational Context

### Deployment Environment
- **Hardware**: Synology DS920+ NAS (16GB RAM)
- **Network**: Behind Cloudflare, dynamic DNS
- **Backups**: Local + cloud (encrypted)
- **Monitoring**: Uptime Kuma + custom alerts
- **Updates**: Blue-green deployment planned

### Development Workflow
1. Local development in Docker
2. Test in isolated environment
3. Deploy to production via Make commands
4. Monitor via Telegram alerts
5. Rollback procedure ready

### Support & Maintenance
- **Logs**: Centralized in PostgreSQL + files
- **Alerts**: Telegram bot for critical issues
- **Metrics**: Custom dashboard for KPIs
- **Updates**: Monthly security patches
- **Backup**: Daily automated, tested monthly

## Integration Ecosystem

### Current Integrations
1. **GoCardless**: Banking data (PSD2 compliant)
2. **OpenAI**: Categorization and analysis
3. **Telegram**: Notifications and bot interface
4. **Email**: Invoice delivery system
5. **Exchanges**: Binance, Coinbase for crypto

### Planned Integrations
1. **Stripe**: Payment processing for invoices
2. **Wise**: Multi-currency operations
3. **QuickBooks**: Export for accountants
4. **Slack**: Team notifications
5. **Zapier**: No-code automation

### Integration Philosophy
- **API First**: Every feature exposed via API
- **Webhooks**: Real-time events for external systems
- **Standards**: OAuth2, OpenAPI, JSON:API
- **Rate Limiting**: Protect external services
- **Graceful Degradation**: System works if integration fails

## Performance Characteristics

### Current Metrics
- API response time: <200ms average
- Dashboard load: <3s on 3G
- Transaction sync: ~1000/minute
- Categorization: ~100/second
- Memory usage: 500MB-2GB per container

### Bottlenecks
1. Database queries without indexes
2. No caching layer implemented
3. Synchronous OpenAI calls
4. Large JSON responses
5. No pagination in some endpoints

### Optimization Opportunities
1. Redis for session and cache
2. Database query optimization
3. Lazy loading in frontend
4. Background job processing
5. CDN for static assets

## Team & Development Culture

### Development Philosophy
- **Pragmatic**: Working code > perfect code
- **Iterative**: Ship small, improve continuously
- **Documented**: Code explains how, docs explain why
- **Tested**: Trust through verification
- **Automated**: Humans for creative work only

### Code Standards
- **TypeScript**: Strict mode, no any
- **Formatting**: Prettier with team config
- **Linting**: ESLint with custom rules
- **Commits**: Conventional commits
- **Reviews**: PR required for main branch

### Communication Patterns
- **Async First**: Documentation over meetings
- **Public**: Discussions in GitHub issues
- **Transparent**: Mistakes are learning opportunities
- **Respectful**: No brilliant jerks policy
- **Growth**: Everyone teaches, everyone learns

## Project Constraints

### Technical Constraints
- Single server deployment (no distributed systems)
- 16GB RAM limit on NAS
- Dynamic IP (no static services)
- PostgreSQL only (no Redis in production yet)
- Docker Compose (no Kubernetes)

### Business Constraints
- Single developer maintenance
- Limited budget for cloud services
- EU data residency requirements
- Must remain self-hostable
- No VC funding intentions

### Time Constraints
- Evening/weekend development
- Monthly feature release cycle
- Quarterly major versions
- Annual architecture review
- Security patches within 48h

This context helps Claude Code understand not just what the code does, but why it exists and where it's heading.