# AI Service Documentation Hub

Welcome to the AI Service documentation. This is the central hub for all technical documentation, organized by domain for easy navigation.

## 🚨 CRITICAL - Start Here
**The project has critical issues that must be fixed before any other work:**
- **[IMMEDIATE ACTION PLAN](./IMMEDIATE-ACTION-PLAN.md)** - What to fix RIGHT NOW (Build is broken!)
- **[CONTRACT-FIRST MIGRATION](./TECH-DEBT-CONTRACT-FIRST-MIGRATION.md)** - Complete technical debt analysis

## 📊 Current Status
- **Build**: ❌ BROKEN (58 TypeScript errors)
- **Migration**: 🟡 4% Complete (8/200 endpoints)
- **Deployment**: ❌ Blocked by build errors
- **Priority**: Fix build → Migrate dashboard → Complete migration

## 📚 Documentation Structure

### Core Domains

#### 💰 [Financial Intelligence](./financial-intelligence/)
Banking integration, invoice management, and financial analysis
- GoCardless integration for real-time bank data
- AI-powered transaction categorization
- Invoice generation and management
- Real estate asset tracking

#### 🔐 [Authentication](./authentication/)
Security, JWT implementation, and access control
- JWT-based authentication system
- Role-based access control (RBAC)
- Security best practices
- Testing authentication flows

#### 🚀 [Deployment](./deployment/)
CI/CD, infrastructure, and production deployment
- GitHub Actions workflows
- Synology NAS deployment
- Docker configuration
- Infrastructure architecture

#### 💻 [Development](./development/)
Development workflows, automation, and coding standards
- Automated CRUD generation
- Makefile command system
- Testing strategies
- Architecture patterns

#### 📡 [Communication](./communication/)
Telegram bot, MCP Bridge, and messaging systems
- Telegram bot integration
- MCP Bridge architecture
- Cross-platform messaging
- Notification systems

#### 🎨 [Frontend](./frontend/)
React dashboard and UI components
- React 18 + TypeScript setup
- Ant Design components
- API integration patterns
- Automated UI generation

### Specialized Domains

#### 📄 [Document Intelligence](./document-intelligence/)
PDF/DOCX analysis and semantic search
- Multi-format document ingestion
- AI-powered analysis
- Semantic search capabilities
- Security and privacy

#### 📈 [Trading Intelligence](./trading-intelligence/)
Cryptocurrency trading and market analysis
- Multi-exchange integration
- AI trading strategies
- Risk management
- Performance analytics

## 🗺️ Quick Navigation

### By Task

**Setting Up Development**
1. Start with [Development Setup](./development/)
2. Review [Authentication](./authentication/)
3. Check [Frontend Guide](./frontend/)

**Understanding the System**
1. Read [Financial Intelligence](./financial-intelligence/)
2. Explore [Trading Intelligence](./trading-intelligence/)
3. Learn about [Document Intelligence](./document-intelligence/)

**Deploying to Production**
1. Follow [Deployment Guide](./deployment/)
2. Configure [Authentication](./authentication/security-best-practices.md)
3. Set up [Monitoring](./deployment/infrastructure/)

**Integrating Services**
1. Implement [Telegram Bot](./communication/telegram/)
2. Connect [MCP Bridge](./communication/mcp-bridge/)
3. Configure [GoCardless](./financial-intelligence/gocardless/)

## 📋 Documentation Standards

### File Naming
- Use lowercase with hyphens: `module-name.md`
- Be descriptive: `jwt-implementation.md` not `jwt.md`
- Group related docs in subdirectories

### Content Structure
1. **Title and Overview** - What this document covers
2. **Quick Start** - Get running quickly
3. **Detailed Sections** - In-depth information
4. **Examples** - Code samples and use cases
5. **Troubleshooting** - Common issues
6. **Related Docs** - Links to related topics

### Code Examples
```typescript
// Always include language hints
// Provide context and comments
// Show both success and error cases
```

## 🔍 Finding Information

### Search Strategies
1. **By Domain**: Navigate to the relevant domain folder
2. **By Feature**: Use README files in each domain
3. **By Technology**: Check architecture docs in each domain
4. **By Task**: Follow the Quick Navigation guides above

### Key Documents
- **Project Context**: `/CLAUDE.md` (root) - AI assistant context
- **Main README**: `/README.md` (root) - Project overview
- **API Reference**: `/docs/api-reference/` - Complete API docs

## 🤝 Contributing to Documentation

### Adding New Documents
1. Place in the appropriate domain folder
2. Update the domain's README.md
3. Follow naming conventions
4. Include in relevant indexes

### Updating Existing Docs
1. Keep version history notes
2. Update related documents
3. Test code examples
4. Update last modified date

## 📊 Documentation Coverage

### Well Documented ✅
- Financial Intelligence
- Authentication System
- Deployment Procedures
- Development Workflows

### Needs Expansion 🚧
- Frontend Component Library
- Trading Strategy Details
- Performance Optimization
- Monitoring and Alerts

## 🔄 Recent Updates

- **2025-07-25**: Complete documentation reorganization
- **2025-07-22**: Enhanced CRUD generator docs
- **2025-07-15**: Updated deployment guides
- **2025-07-10**: New authentication documentation

## 📞 Getting Help

1. **Check Documentation**: Start with the relevant domain
2. **Search Codebase**: Look for examples in code
3. **Review Tests**: Tests often show usage patterns
4. **Ask Team**: Reach out for clarification

---

*This documentation is continuously evolving. Last major reorganization: July 25, 2025*