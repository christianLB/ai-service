# Claude Code Sub-Agents for AI Service

This directory contains specialized sub-agents for the AI Service project. Each agent is optimized for specific domains and can work independently or in parallel to accelerate development.

## 🚀 Quick Start

### Using a Single Agent
```bash
# Example: Use the financial specialist for invoice work
"Use the financial specialist to help me add a new invoice template"

# Example: Use the trading specialist for strategy development
"Use the trading specialist to implement a new arbitrage strategy"
```

### Parallel Agent Execution
```bash
# Example: Multiple agents working on a feature
"Deploy 3 parallel agents:
- financial-specialist: Create invoice calculation service
- ui-specialist: Build invoice preview component  
- qa-specialist: Write tests for invoice module"
```

### Complex Workflows
```bash
# Example: Full-stack feature implementation
"Use sub-agents to implement recurring invoices:
- prisma-specialist: Design database schema
- financial-specialist: Implement business logic
- ui-specialist: Create management interface
- security-specialist: Audit the implementation"
```

## 📋 Available Agents

### Core Domain Specialists

#### 1. `financial-specialist` 
**Focus**: GoCardless, invoices, clients, transactions
- Expert in financial module operations
- Handles banking integrations and payment processing
- Manages invoice generation and client relationships
- **When to use**: Any financial feature, banking integration, invoice/payment work

#### 2. `trading-specialist`
**Focus**: Crypto/stock trading, arbitrage, market analysis  
- Develops trading strategies and algorithms
- Manages exchange integrations (Binance, Coinbase, Alpaca)
- Optimizes arbitrage bot for $500-$1,000/month target
- **When to use**: Trading features, market analysis, exchange integration

#### 3. `prisma-specialist`
**Focus**: Database schema, migrations, PostgreSQL optimization
- Manages multi-schema architecture (financial, public, trading)
- Creates safe migrations and optimizes queries
- Handles complex relationships and constraints
- **When to use**: Database changes, schema design, migration issues

### Development Efficiency Agents

#### 4. `crud-specialist`
**Focus**: Automated code generation, templates, scaffolding
- Generates complete CRUD operations from Prisma models
- Creates consistent code patterns across the project
- Validates before generation to prevent errors
- **When to use**: New model implementation, boilerplate generation

#### 5. `ui-specialist`
**Focus**: React, TypeScript, Tailwind CSS, dashboards
- Builds responsive, accessible UI components
- Implements TanStack Query for data fetching
- Creates data visualization and dashboards
- **When to use**: Frontend features, UI improvements, dashboard work

### Quality & Operations Agents

#### 6. `qa-specialist`
**Focus**: Jest, Supertest, test coverage, quality metrics
- Writes comprehensive test suites
- Ensures 80%+ code coverage
- Implements E2E test strategies
- **When to use**: Test writing, quality improvements, coverage gaps

#### 7. `devops-specialist`
**Focus**: Docker, deployment, monitoring, infrastructure
- Manages container orchestration
- Handles Synology NAS deployment
- Optimizes resource usage and performance
- **When to use**: Deployment issues, Docker configuration, infrastructure

#### 8. `security-specialist`
**Focus**: Authentication, authorization, vulnerability assessment
- Implements security best practices
- Conducts vulnerability assessments
- Ensures OWASP compliance
- **When to use**: Security audits, authentication work, compliance

## 🎯 Usage Patterns

### Pattern 1: Single Agent Focus
Best for specialized tasks within one domain:
```
"financial-specialist: implement invoice reminder system"
```

### Pattern 2: Parallel Development
Best for features spanning multiple domains:
```
"Deploy parallel agents for user dashboard:
- ui-specialist: Create dashboard layout
- financial-specialist: Calculate metrics
- trading-specialist: Add portfolio widget"
```

### Pattern 3: Sequential Workflow
Best for dependent tasks:
```
"Sequential workflow for new model:
1. prisma-specialist: Design schema
2. crud-specialist: Generate CRUD
3. qa-specialist: Write tests"
```

### Pattern 4: Full-Stack Feature
Best for complete feature implementation:
```
"Implement trading alerts feature using agents:
- prisma-specialist: Alert model schema
- trading-specialist: Alert logic
- ui-specialist: Alert UI
- devops-specialist: WebSocket setup
- security-specialist: Permission system"
```

## 💡 Best Practices

### 1. Choose the Right Agent
- Match agent expertise to task requirements
- Use domain specialists for complex logic
- Use efficiency agents for repetitive tasks

### 2. Parallel vs Sequential
- Use parallel for independent tasks
- Use sequential for dependent operations
- Maximum 10 parallel agents

### 3. Agent Coordination
- Specify clear tasks for each agent
- Define interfaces between agent outputs
- Review combined results

### 4. Context Efficiency
- Each agent has its own context window
- Reduces main context usage
- Enables larger scope operations

## 🔧 Advanced Usage

### Custom Agent Combinations
```bash
# Security-First Development
"Deploy security-specialist and qa-specialist in parallel:
- security: Audit authentication flow
- qa: Write security test cases"

# Performance Optimization
"Use specialized agents for performance:
- trading-specialist: Optimize algorithms
- devops-specialist: Profile containers
- prisma-specialist: Optimize queries"
```

### Agent Chaining
```bash
# Analysis → Implementation → Testing
"Chain agents for feature development:
1. security-specialist: Analyze requirements
2. financial-specialist: Implement logic
3. qa-specialist: Validate implementation"
```

### Domain-Specific Workflows
```bash
# Financial Module Workflow
"Financial feature workflow:
- prisma-specialist: Transaction schema
- financial-specialist: Business rules
- ui-specialist: Transaction UI
- qa-specialist: Integration tests"

# Trading Module Workflow  
"Trading feature workflow:
- trading-specialist: Strategy design
- prisma-specialist: Performance tables
- ui-specialist: Trading dashboard
- security-specialist: API security"
```

## 📊 Performance Benefits

- **5-10x faster** for multi-domain features
- **Parallel execution** reduces wait time
- **Specialized context** improves accuracy
- **Reduced errors** through domain expertise

## 🚨 Important Notes

1. **Agent Independence**: Each agent works in isolation
2. **No Cross-Communication**: Agents don't share context
3. **Main Coordination**: You coordinate agent outputs
4. **Resource Limits**: Max 10 parallel agents

## 📚 Examples by Feature Type

### Adding New Financial Report
```
Agents: financial-specialist, ui-specialist, qa-specialist
Tasks: Calculate metrics, design UI, write tests
```

### Implementing Trading Strategy
```
Agents: trading-specialist, prisma-specialist, security-specialist
Tasks: Algorithm design, data schema, API security
```

### Database Migration
```
Agents: prisma-specialist, qa-specialist
Tasks: Schema changes, migration testing
```

### UI Enhancement
```
Agents: ui-specialist, qa-specialist
Tasks: Component development, visual testing
```

---

**Remember**: Sub-agents are powerful tools for parallel development. Use them strategically to maximize efficiency while maintaining code quality and consistency.