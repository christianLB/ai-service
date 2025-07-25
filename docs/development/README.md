# Development Documentation

This section contains all documentation related to development workflows, automation, testing, and architectural decisions for the AI Service.

## 📁 Structure

### [Automation](./automation/)
- **[Development Stack](./automation/development-stack.md)** - Automated CRUD generation system
- **[Development Stack Issues](./automation/development-stack-issues.md)** - Known issues and solutions
- **[Claude Automated Stack](./automation/claude-automated-stack.md)** - AI-assisted development workflows

### [Architecture](./architecture/)
- **[Modernization Plan](./architecture/modernization-plan.md)** - System modernization roadmap
- **[Modernization Plan Refined](./architecture/modernization-plan-refined.md)** - Detailed implementation plan
- **[Strategic Analysis](./architecture/strategic-analysis.md)** - Strategic technical decisions

### [Workflows](./workflows/)
- **[Development Methodology](./workflows/development-methodology.md)** - Development process and standards
- **[Makefile Documentation](./workflows/makefile-documentation.md)** - Make command reference
- **[Makefile Shortcuts](./workflows/makefile-shortcuts.md)** - Quick command reference
- **[Makefiles Guide](./workflows/makefiles-guide.md)** - Complete Makefile system guide

### [Testing](./testing/)
- **[Development Stack Testing](./testing/development-stack-testing.md)** - Testing automated systems
- **[Verification Checklist](./testing/verification-checklist.md)** - Pre-deployment verification

### [Guides](./guides/)
- **[Claude Operations](./guides/claude-operations.md)** - Working with Claude Code
- **[Schema Documentation](./guides/schema-documentation.md)** - Database schema guide
- **[Service Development](./guides/service-development.md)** - Service creation patterns

## 🚀 Quick Start

### 1. Setting Up Development Environment
```bash
# Clone repository
git clone https://github.com/yourusername/ai-service.git
cd ai-service

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development
make dev-up
```

### 2. Automated CRUD Generation
```bash
# Add model to prisma/schema.prisma first
model NewModel {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
}

# Generate Prisma client
npm run db:generate

# Create and apply migration
make db-migrate-create NAME=add_new_model
make db-migrate

# Generate complete CRUD stack
npm run generate:crud:auto NewModel
```

### 3. Development Workflow
```bash
# Start development environment
make dev-up

# Check status
make dev-status

# View logs
make dev-logs

# Run tests
make test

# Lint and format
make lint
make format
```

## 🛠️ Key Development Tools

### Automated Code Generation
The project uses Plop.js for automated code generation:

- **CRUD Generator**: Creates complete CRUD stack (service, routes, types, tests)
- **Model Validation**: Ensures Prisma models exist before generation
- **Rollback System**: Automatically reverts on generation errors
- **Template System**: Handlebars templates for consistent code

### Make Commands
Comprehensive Makefile system for common tasks:

```bash
# Database
make db-backup          # Backup database
make db-migrate         # Run migrations
make db-studio          # Open Prisma Studio

# Development
make dev-up             # Start all services
make dev-down           # Stop all services
make dev-refresh        # Restart services

# Testing
make test               # Run all tests
make test-watch         # Run tests in watch mode

# Production
make deploy-prod        # Deploy to production
make prod-logs          # View production logs
```

### Database Management
- **Prisma ORM**: Type-safe database access
- **Multi-schema**: Separate schemas for different domains
- **Migrations**: Version-controlled schema changes
- **Seeding**: Development data seeding

## 🏗️ Architecture Patterns

### Service Layer Pattern
```typescript
@Injectable()
export class ExampleService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService
  ) {}
  
  async findAll(params: FindAllParams) {
    return this.prisma.example.findMany({
      where: params.where,
      orderBy: params.orderBy,
      take: params.limit,
      skip: params.offset
    });
  }
}
```

### Route Pattern
```typescript
router.get('/', 
  authenticateJWT,
  validateQuery(ExampleQuerySchema),
  async (req, res) => {
    const result = await exampleService.findAll(req.query);
    res.json(result);
  }
);
```

### Error Handling
```typescript
class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
  }
}

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(err.statusCode || 500).json({
    error: err.message,
    code: err.code || 'INTERNAL_ERROR'
  });
});
```

## 🧪 Testing Strategy

### Unit Testing
- Jest for unit tests
- Service layer testing with mocked dependencies
- 80% coverage target

### Integration Testing
- Supertest for API testing
- Test database with migrations
- Real service integration

### E2E Testing
- Playwright for browser testing
- User journey validation
- Cross-browser support

## 📊 Code Quality

### Standards
- TypeScript strict mode
- ESLint with custom rules
- Prettier for formatting
- Husky for pre-commit hooks

### CI/CD Integration
- Automated testing on pull requests
- Code coverage reports
- Security scanning
- Dependency updates

## 🔒 Security Practices

### Development Security
- No secrets in code
- Environment variable validation
- Secure dependency management
- Regular security audits

### Code Review
- Pull request requirements
- Security checklist
- Performance review
- Documentation updates

## 📈 Performance Optimization

### Development Performance
- Hot module replacement
- Incremental compilation
- Docker layer caching
- Parallel test execution

### Production Build
- Tree shaking
- Code splitting
- Asset optimization
- CDN integration

## 🐛 Debugging

### Local Debugging
```bash
# Debug backend
npm run dev:debug

# Debug specific service
DEBUG=app:* npm run dev

# Debug database queries
DEBUG=prisma:query npm run dev
```

### Remote Debugging
- VS Code remote debugging
- Chrome DevTools for Node.js
- Production source maps (secure)

## 🔄 Recent Updates

- **2024-07-25**: Documentation reorganized
- **2024-07-22**: CRUD generator enhanced with validation
- **2024-07-15**: Makefile system simplified
- **2024-07-10**: Testing framework upgraded

## 📚 Related Documentation

- [API Reference](../api-reference/) - Complete API documentation
- [Deployment](../deployment/) - Deployment procedures
- [Architecture](../architecture/) - System architecture