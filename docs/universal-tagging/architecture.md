# Universal AI Tagging System - Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [Database Schema](#database-schema)
6. [AI Integration Architecture](#ai-integration-architecture)
7. [Security Architecture](#security-architecture)
8. [Scalability & Performance](#scalability--performance)

## System Overview

The Universal AI Tagging System is a comprehensive solution for intelligent content categorization and tagging. It combines AI-powered analysis with pattern matching and user feedback to provide accurate, scalable tagging across multiple entity types.

### Key Features
- **Multi-entity support**: Transactions, documents, clients, invoices
- **Hierarchical tagging**: Parent-child tag relationships
- **AI-powered suggestions**: Claude and OpenAI integration
- **Pattern matching**: Rule-based tagging
- **Real-time updates**: WebSocket integration
- **Batch processing**: Efficient bulk operations
- **Learning system**: Continuous improvement from feedback

### Technology Stack
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI Providers**: Anthropic Claude, OpenAI
- **Caching**: Redis
- **Queue**: Bull (Redis-based)
- **Real-time**: Socket.io
- **Authentication**: JWT

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                │
├─────────────────────┬─────────────────────┬─────────────────────────────┤
│   Web Application   │   Mobile App        │   API Consumers             │
│   (React)           │   (React Native)    │   (External Systems)        │
└─────────────────────┴─────────────────────┴─────────────────────────────┘
                      │                      │
                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API Gateway Layer                              │
├─────────────────────────────────────────────────────────────────────────┤
│   - Authentication (JWT)                                                 │
│   - Rate Limiting                                                        │
│   - Request Routing                                                      │
│   - WebSocket Management                                                 │
└─────────────────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Application Layer                               │
├──────────────────┬──────────────────┬──────────────────┬───────────────┤
│  Tag Service     │ Entity Service   │  AI Service      │ Analytics     │
│  - CRUD ops      │ - Tag entities   │  - Claude API    │ - Metrics    │
│  - Hierarchy     │ - Batch ops      │  - OpenAI API    │ - Reports    │
│  - Search        │ - Relationships  │  - Suggestions   │ - Insights   │
└──────────────────┴──────────────────┴──────────────────┴───────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Business Logic Layer                           │
├──────────────────┬──────────────────┬──────────────────┬───────────────┤
│ Pattern Matching │ Learning Engine  │ Rule Engine      │ Workflow      │
│ - Keywords       │ - Feedback       │ - Business rules │ - Automation │
│ - Regex          │ - Improvements   │ - Validation     │ - Events     │
└──────────────────┴──────────────────┴──────────────────┴───────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Data Layer                                    │
├────────────────┬────────────────┬────────────────┬─────────────────────┤
│  PostgreSQL    │     Redis      │  Queue (Bull)  │   File Storage      │
│  - Tags        │  - Cache       │  - Batch jobs  │   - Documents       │
│  - Entities    │  - Sessions    │  - Async tasks │   - Attachments     │
│  - Mappings    │  - Rate limits │  - Retries     │                     │
└────────────────┴────────────────┴────────────────┴─────────────────────┘
```

## Component Architecture

### 1. API Gateway Layer

#### Authentication Middleware
```typescript
interface AuthMiddleware {
  validateToken(token: string): Promise<User>;
  refreshToken(refreshToken: string): Promise<TokenPair>;
  revokeToken(token: string): Promise<void>;
}
```

#### Rate Limiting
```typescript
interface RateLimiter {
  standard: RateLimit;    // 100 req/min
  ai: RateLimit;         // 20 req/min
  batch: RateLimit;      // 5 req/min
  search: RateLimit;     // 50 req/min
}
```

### 2. Service Layer Architecture

#### Tag Service
```typescript
interface ITagService {
  // CRUD Operations
  createTag(data: CreateTag, userId: string): Promise<Tag>;
  updateTag(id: string, data: UpdateTag, userId: string): Promise<Tag>;
  deleteTag(id: string, options?: DeleteOptions, userId: string): Promise<void>;
  getTag(id: string): Promise<Tag>;
  listTags(query: TagQuery): Promise<PaginatedResponse<Tag>>;
  
  // Hierarchy Operations
  getTagHierarchy(parentId?: string): Promise<TagHierarchy>;
  getTagPath(tagId: string): Promise<TagPath[]>;
  
  // Search Operations
  searchTags(search: TagSearch): Promise<Tag[]>;
  
  // Bulk Operations
  bulkCreateTags(tags: CreateTag[], userId: string): Promise<Tag[]>;
  bulkUpdateTags(updates: TagUpdate[], userId: string): Promise<Tag[]>;
}
```

#### Entity Tagging Service
```typescript
interface IEntityTaggingService {
  // Single Entity Operations
  tagEntity(
    entityType: EntityType,
    entityId: string,
    request: TagEntityRequest,
    userId: string
  ): Promise<TagEntityResponse>;
  
  getEntityTags(
    entityType: EntityType,
    entityId: string
  ): Promise<EntityTag[]>;
  
  removeEntityTag(
    entityType: EntityType,
    entityId: string,
    tagId: string,
    userId: string
  ): Promise<void>;
  
  // Batch Operations
  batchTagEntities(
    request: BatchTagRequest,
    userId: string
  ): Promise<BatchTagResponse>;
  
  reTagEntities(
    request: ReTagRequest,
    userId: string
  ): Promise<ReTagResponse>;
  
  // Discovery Operations
  findEntitiesByTag(
    tagId: string,
    entityTypes?: EntityType[],
    pagination?: Pagination
  ): Promise<EntityPreview[]>;
  
  discoverRelationships(
    entityType: EntityType,
    entityId: string
  ): Promise<EntityRelationship[]>;
}
```

#### AI Tagging Service
```typescript
interface IAITaggingService {
  // Suggestion Engine
  suggestTags(
    content: string,
    entityType: EntityType,
    metadata?: Record<string, any>,
    options?: AIOptions
  ): Promise<TagSuggestion[]>;
  
  // Categorization
  autoCategorize(
    content: string,
    entityType: EntityType,
    options?: CategoryOptions
  ): Promise<Category[]>;
  
  // Learning System
  learnFromFeedback(feedback: TagFeedback): Promise<void>;
  learnFromCorrection(learning: TagLearning): Promise<void>;
  improveTagPatterns(
    tagId: string,
    examples: PatternExamples
  ): Promise<void>;
  
  // Multi-language Support
  getMultilingualSuggestions(
    content: string,
    entityType: EntityType,
    languages: string[]
  ): Promise<Map<string, TagSuggestion[]>>;
  
  // Analytics
  getTagAnalytics(): Promise<TagAnalytics>;
}
```

### 3. Pattern Matching Engine

```typescript
interface IPatternMatchingService {
  // Pattern Types
  matchKeywords(content: string, keywords: string[]): MatchResult;
  matchMerchants(content: string, merchants: string[]): MatchResult;
  matchRegex(content: string, pattern: string): MatchResult;
  matchCustomRules(content: string, rules: CustomRule[]): MatchResult;
  
  // Composite Matching
  matchPatterns(
    content: string,
    patterns: TagPatterns
  ): Promise<PatternMatch[]>;
  
  // Pattern Learning
  updatePatterns(
    tagId: string,
    successfulMatches: string[],
    failedMatches: string[]
  ): Promise<void>;
}
```

## Data Flow

### 1. Tagging Flow

```
User Request → API Gateway → Tag Service → AI Service
                                  ↓
                           Pattern Matcher
                                  ↓
                           Rule Engine
                                  ↓
                           Database
                                  ↓
                           Response → User
```

### 2. Learning Flow

```
User Feedback → API Gateway → AI Service → Learning Engine
                                               ↓
                                        Pattern Update
                                               ↓
                                        Model Training
                                               ↓
                                        Database Update
```

### 3. Batch Processing Flow

```
Batch Request → API Gateway → Queue Service
                                  ↓
                            Worker Process
                                  ↓
                         Parallel Processing
                                  ↓
                           Result Aggregation
                                  ↓
                            Notification
```

## Database Schema

### Core Tables

#### UniversalTag Table
```sql
CREATE TABLE UniversalTag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  entityTypes TEXT[] NOT NULL,
  patterns JSONB,
  rules JSONB,
  confidence DECIMAL(3,2) DEFAULT 0.50,
  embeddingModel VARCHAR(50),
  parentId UUID REFERENCES UniversalTag(id),
  path TEXT NOT NULL,
  level INTEGER DEFAULT 0,
  color VARCHAR(7),
  icon VARCHAR(50),
  isActive BOOLEAN DEFAULT true,
  isSystem BOOLEAN DEFAULT false,
  metadata JSONB,
  usageCount INTEGER DEFAULT 0,
  successRate DECIMAL(3,2) DEFAULT 0.00,
  lastUsed TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy UUID NOT NULL,
  updatedBy UUID NOT NULL
);

-- Indexes
CREATE INDEX idx_tag_code ON UniversalTag(code);
CREATE INDEX idx_tag_entity_types ON UniversalTag USING GIN(entityTypes);
CREATE INDEX idx_tag_parent ON UniversalTag(parentId);
CREATE INDEX idx_tag_path ON UniversalTag(path);
CREATE INDEX idx_tag_active ON UniversalTag(isActive);
```

#### EntityTag Table
```sql
CREATE TABLE EntityTag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entityType VARCHAR(50) NOT NULL,
  entityId VARCHAR(255) NOT NULL,
  tagId UUID NOT NULL REFERENCES UniversalTag(id),
  confidence DECIMAL(3,2) NOT NULL,
  method VARCHAR(20) NOT NULL,
  appliedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  appliedBy UUID NOT NULL,
  isVerified BOOLEAN DEFAULT false,
  verifiedBy UUID,
  verifiedAt TIMESTAMP,
  metadata JSONB,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(entityType, entityId, tagId)
);

-- Indexes
CREATE INDEX idx_entity_tag_lookup ON EntityTag(entityType, entityId);
CREATE INDEX idx_entity_tag_tag ON EntityTag(tagId);
CREATE INDEX idx_entity_tag_verified ON EntityTag(isVerified);
CREATE INDEX idx_entity_tag_applied ON EntityTag(appliedAt);
```

#### TagLearning Table
```sql
CREATE TABLE TagLearning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tagId UUID NOT NULL REFERENCES UniversalTag(id),
  entityType VARCHAR(50) NOT NULL,
  entityId VARCHAR(255) NOT NULL,
  content TEXT,
  isPositive BOOLEAN NOT NULL,
  confidence DECIMAL(3,2),
  feedback JSONB,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy UUID NOT NULL
);

-- Indexes
CREATE INDEX idx_learning_tag ON TagLearning(tagId);
CREATE INDEX idx_learning_entity ON TagLearning(entityType, entityId);
CREATE INDEX idx_learning_positive ON TagLearning(isPositive);
```

### Relationships

```sql
-- Tag Hierarchy
ALTER TABLE UniversalTag 
ADD CONSTRAINT fk_parent_tag 
FOREIGN KEY (parentId) REFERENCES UniversalTag(id) 
ON DELETE CASCADE;

-- Entity Tag Cascade
ALTER TABLE EntityTag 
ADD CONSTRAINT fk_tag 
FOREIGN KEY (tagId) REFERENCES UniversalTag(id) 
ON DELETE CASCADE;
```

## AI Integration Architecture

### 1. AI Provider Abstraction

```typescript
interface AIProvider {
  name: string;
  suggestTags(
    content: string,
    context: AIContext
  ): Promise<TagSuggestion[]>;
  
  categorize(
    content: string,
    options: CategoryOptions
  ): Promise<Category[]>;
  
  generateEmbedding(
    text: string
  ): Promise<number[]>;
}

class ClaudeProvider implements AIProvider {
  async suggestTags(content: string, context: AIContext) {
    const prompt = this.buildPrompt(content, context);
    const response = await claudeAPI.complete(prompt);
    return this.parseResponse(response);
  }
}

class OpenAIProvider implements AIProvider {
  async suggestTags(content: string, context: AIContext) {
    const messages = this.buildMessages(content, context);
    const response = await openaiAPI.chat(messages);
    return this.parseResponse(response);
  }
}
```

### 2. AI Request Flow

```
                    ┌─────────────────┐
                    │   AI Manager    │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
         ┌──────▼──────┐          ┌──────▼──────┐
         │   Claude    │          │   OpenAI    │
         │  Provider   │          │  Provider   │
         └──────┬──────┘          └──────┬──────┘
                │                         │
                └────────────┬────────────┘
                             │
                    ┌────────▼────────┐
                    │ Response Parser │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Confidence    │
                    │   Calculator    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    Results      │
                    └─────────────────┘
```

### 3. Learning Pipeline

```typescript
class LearningPipeline {
  async processFeedback(feedback: TagFeedback) {
    // 1. Validate feedback
    await this.validateFeedback(feedback);
    
    // 2. Update tag confidence
    await this.updateTagConfidence(feedback);
    
    // 3. Store learning data
    await this.storeLearningData(feedback);
    
    // 4. Trigger pattern update if threshold met
    if (await this.shouldUpdatePatterns(feedback.tagId)) {
      await this.schedulePatternUpdate(feedback.tagId);
    }
    
    // 5. Update AI model if needed
    if (await this.shouldUpdateModel()) {
      await this.scheduleModelUpdate();
    }
  }
}
```

## Security Architecture

### 1. Authentication & Authorization

```typescript
interface SecurityLayer {
  // Authentication
  authenticate(token: string): Promise<User>;
  
  // Authorization
  authorize(user: User, resource: string, action: string): boolean;
  
  // Rate Limiting
  checkRateLimit(user: User, endpoint: string): Promise<RateLimitStatus>;
  
  // Input Validation
  validateInput<T>(data: unknown, schema: Schema<T>): T;
  
  // Output Sanitization
  sanitizeOutput(data: any): any;
}
```

### 2. Security Measures

#### API Security
- JWT token authentication
- Role-based access control (RBAC)
- Rate limiting per endpoint type
- Request size limits
- CORS configuration

#### Data Security
- Encryption at rest (PostgreSQL)
- Encryption in transit (HTTPS)
- Input validation (Zod schemas)
- SQL injection prevention (Prisma)
- XSS prevention

#### AI Security
- Prompt injection prevention
- Content filtering
- PII detection and masking
- API key rotation
- Usage monitoring

### 3. Access Control Matrix

| Role | Tag Management | Entity Tagging | AI Features | Analytics | Admin |
|------|----------------|----------------|-------------|-----------|-------|
| User | Read | Read/Write Own | Read/Write | Read Own | No |
| Manager | Read/Write | Read/Write Team | Read/Write | Read Team | No |
| Admin | Full | Full | Full | Full | Yes |

## Scalability & Performance

### 1. Caching Strategy

```typescript
interface CacheStrategy {
  // Tag Cache
  tagCache: {
    ttl: 3600, // 1 hour
    keys: ['tag:{id}', 'tags:{entityType}', 'hierarchy:{parentId}']
  };
  
  // Entity Cache
  entityCache: {
    ttl: 600, // 10 minutes
    keys: ['entity:{type}:{id}:tags']
  };
  
  // AI Response Cache
  aiCache: {
    ttl: 1800, // 30 minutes
    keys: ['ai:{provider}:{contentHash}']
  };
}
```

### 2. Database Optimization

#### Indexes
- Composite indexes on frequently queried columns
- GIN indexes for JSONB and array columns
- Partial indexes for filtered queries

#### Query Optimization
- Eager loading for related data
- Query result pagination
- Database connection pooling
- Read replicas for analytics

### 3. Horizontal Scaling

```
┌─────────────────────────────────────────────────────┐
│                   Load Balancer                      │
└──────────┬──────────┬──────────┬───────────────────┘
           │          │          │
    ┌──────▼──┐ ┌────▼────┐ ┌──▼──────┐
    │ API     │ │ API     │ │ API     │
    │ Server  │ │ Server  │ │ Server  │
    │ 1       │ │ 2       │ │ 3       │
    └─────────┘ └─────────┘ └─────────┘
           │          │          │
           └──────────┴──────────┘
                      │
    ┌─────────────────▼──────────────────┐
    │         Shared Services            │
    ├────────────┬────────────┬──────────┤
    │   Redis    │ PostgreSQL │  Queue   │
    │  Cluster   │  Cluster   │ Cluster  │
    └────────────┴────────────┴──────────┘
```

### 4. Performance Metrics

#### Target SLAs
- API Response Time: p95 < 200ms
- Batch Processing: 1000 entities/minute
- AI Suggestion Time: < 2 seconds
- Search Response: < 100ms
- Uptime: 99.9%

#### Monitoring
- Application Performance Monitoring (APM)
- Real-time metrics dashboard
- Error tracking and alerting
- Resource utilization monitoring

### 5. Queue Architecture

```typescript
interface QueueSystem {
  // Priority Queues
  queues: {
    critical: { concurrency: 10, priority: 1 },
    standard: { concurrency: 5, priority: 2 },
    batch: { concurrency: 2, priority: 3 }
  };
  
  // Job Types
  jobs: {
    tagEntity: { queue: 'standard', timeout: 30000 },
    batchTag: { queue: 'batch', timeout: 300000 },
    reindex: { queue: 'critical', timeout: 60000 },
    learn: { queue: 'standard', timeout: 60000 }
  };
  
  // Retry Strategy
  retry: {
    attempts: 3,
    backoff: 'exponential',
    delay: 1000
  };
}
```

## Deployment Architecture

### 1. Container Architecture

```yaml
services:
  api:
    image: tagging-api:latest
    replicas: 3
    resources:
      limits:
        memory: 2Gi
        cpu: 1000m
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
  
  worker:
    image: tagging-worker:latest
    replicas: 2
    resources:
      limits:
        memory: 4Gi
        cpu: 2000m
  
  redis:
    image: redis:7-alpine
    replicas: 1
    persistence:
      enabled: true
      size: 10Gi
  
  postgres:
    image: postgres:15
    replicas: 1
    persistence:
      enabled: true
      size: 100Gi
```

### 2. Infrastructure as Code

```terraform
resource "aws_ecs_service" "tagging_api" {
  name            = "tagging-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }
  
  auto_scaling {
    min_capacity = 2
    max_capacity = 10
    
    cpu_threshold    = 70
    memory_threshold = 80
  }
}
```

## Disaster Recovery

### 1. Backup Strategy
- Database: Daily automated backups with 30-day retention
- Redis: Periodic snapshots every 6 hours
- File Storage: Incremental backups with versioning

### 2. Recovery Procedures
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour
- Automated failover for critical services
- Manual intervention for data recovery

### 3. High Availability
- Multi-AZ deployment
- Database replication
- Redis Sentinel for automatic failover
- Load balancer health checks

## Future Enhancements

### 1. Planned Features
- GraphQL API support
- Real-time collaboration
- Advanced analytics dashboard
- Mobile SDK
- Webhook management UI

### 2. AI Improvements
- Custom model training
- Multi-modal tagging (images, audio)
- Explainable AI features
- Federated learning

### 3. Performance Enhancements
- Edge caching with CDN
- Database sharding
- Async API with WebSockets
- GPU acceleration for AI