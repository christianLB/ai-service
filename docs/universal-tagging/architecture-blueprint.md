# Universal AI Tagging System - Architectural Blueprint

## Executive Summary

This document provides a comprehensive architectural blueprint for implementing the Universal AI Tagging System, designed as a senior architect following SOLID principles, clean architecture patterns, and the existing conventions of the AI Service codebase.

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           API Gateway Layer                              │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────────┐  │
│  │  REST API      │  │  GraphQL API   │  │  WebSocket (Real-time)  │  │
│  │  /api/tags/*   │  │  /graphql      │  │  /ws/tagging           │  │
│  └────────────────┘  └────────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                         Controller Layer                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────────┐  │
│  │ TagController  │  │ EntityTagCtrl  │  │  AnalyticsController    │  │
│  └────────────────┘  └────────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                     Service Orchestration Layer                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              TaggingOrchestrationService                         │  │
│  │  • Request validation  • Service coordination  • Caching         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                        Core Service Layer                                │
│  ┌───────────────┐ ┌────────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ TaggingEngine │ │ PatternEngine  │ │ AIEngine   │ │ Learning   │  │
│  │ Service       │ │ Service        │ │ Service    │ │ Service    │  │
│  └───────────────┘ └────────────────┘ └────────────┘ └────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                       Repository Layer                                   │
│  ┌───────────────┐ ┌────────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ TagRepository │ │ EntityTagRepo  │ │ PatternRepo│ │ MetricsRepo│  │
│  └───────────────┘ └────────────────┘ └────────────┘ └────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                      Infrastructure Layer                                │
│  ┌───────────────┐ ┌────────────────┐ ┌────────────┐ ┌────────────┐  │
│  │  PostgreSQL   │ │     Redis      │ │  Bull Queue│ │  pgvector  │  │
│  │  (Prisma ORM) │ │    (Cache)     │ │  (Workers) │ │ (Embeddings)│  │
│  └───────────────┘ └────────────────┘ └────────────┘ └────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Design Principles

1. **Separation of Concerns**: Each layer has a single, well-defined responsibility
2. **Dependency Inversion**: High-level modules don't depend on low-level modules
3. **Interface Segregation**: Clients aren't forced to depend on unused interfaces
4. **Open/Closed Principle**: Open for extension, closed for modification
5. **Single Responsibility**: Each class has one reason to change

## 2. Service Layer Architecture

### 2.1 Dependency Injection Container

```typescript
// src/services/tagging/container.ts
import { Container } from 'inversify';
import { TYPES } from './types';

const container = new Container();

// Core Services
container.bind<ITaggingEngine>(TYPES.TaggingEngine).to(TaggingEngineService).inSingletonScope();
container.bind<IPatternEngine>(TYPES.PatternEngine).to(PatternEngineService).inSingletonScope();
container.bind<IAIEngine>(TYPES.AIEngine).to(AIEngineService).inSingletonScope();
container.bind<ILearningEngine>(TYPES.LearningEngine).to(LearningEngineService).inSingletonScope();

// Repositories
container.bind<ITagRepository>(TYPES.TagRepository).to(TagRepository).inRequestScope();
container.bind<IEntityTagRepository>(TYPES.EntityTagRepository).to(EntityTagRepository).inRequestScope();

// Providers
container.bind<IAIProvider>(TYPES.ClaudeProvider).to(ClaudeProvider).inSingletonScope();
container.bind<IAIProvider>(TYPES.OpenAIProvider).to(OpenAIProvider).inSingletonScope();

export { container };
```

### 2.2 Service Interface Definitions

```typescript
// src/services/tagging/interfaces/tagging-engine.interface.ts
export interface ITaggingEngine {
  tagEntity(entity: TaggableEntity, options?: TaggingOptions): Promise<TaggingResult>;
  batchTagEntities(entities: TaggableEntity[], options?: BatchTaggingOptions): Promise<BatchTaggingResult>;
  retagEntity(entityType: string, entityId: string, options?: RetagOptions): Promise<TaggingResult>;
  removeTag(entityType: string, entityId: string, tagId: string): Promise<void>;
  verifyTag(entityTagId: string, userId: string): Promise<void>;
}

// src/services/tagging/interfaces/pattern-engine.interface.ts
export interface IPatternEngine {
  matchPatterns(features: EntityFeatures): Promise<PatternMatch[]>;
  addPattern(tagId: string, pattern: TagPattern): Promise<void>;
  updatePattern(patternId: string, updates: Partial<TagPattern>): Promise<void>;
  getPatternPerformance(patternId: string): Promise<PatternPerformance>;
}
```

### 2.3 Core Service Implementation

```typescript
// src/services/tagging/tagging-engine.service.ts
import { injectable, inject } from 'inversify';
import { TYPES } from './types';
import { prisma } from '../../lib/prisma';
import { Logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import { CacheManager } from './cache/cache-manager';

@injectable()
export class TaggingEngineService implements ITaggingEngine {
  private logger = new Logger('TaggingEngine');
  private cache: CacheManager;

  constructor(
    @inject(TYPES.PatternEngine) private patternEngine: IPatternEngine,
    @inject(TYPES.AIEngine) private aiEngine: IAIEngine,
    @inject(TYPES.LearningEngine) private learningEngine: ILearningEngine,
    @inject(TYPES.EntityAdapterFactory) private adapterFactory: IEntityAdapterFactory
  ) {
    this.cache = new CacheManager();
  }

  async tagEntity(entity: TaggableEntity, options: TaggingOptions = {}): Promise<TaggingResult> {
    const startTime = Date.now();
    
    try {
      // 1. Feature extraction
      const adapter = this.adapterFactory.getAdapter(entity.type);
      const features = await adapter.extractFeatures(entity);
      
      // 2. Check cache
      const cacheKey = this.generateCacheKey(entity);
      const cachedResult = await this.cache.get(cacheKey);
      if (cachedResult && !options.forceRefresh) {
        this.logger.debug(`Cache hit for entity ${entity.type}:${entity.id}`);
        return cachedResult;
      }
      
      // 3. Parallel analysis
      const [patternMatches, aiAnalysis, semanticMatches] = await Promise.all([
        this.patternEngine.matchPatterns(features),
        options.useAI !== false ? this.aiEngine.analyze(entity, features) : null,
        this.semanticEngine.findSimilar(features)
      ]);
      
      // 4. Merge and rank results
      const mergedTags = this.mergeTagResults(patternMatches, aiAnalysis, semanticMatches);
      
      // 5. Apply business rules
      const finalTags = await this.applyBusinessRules(mergedTags, entity, options);
      
      // 6. Persist results
      const result = await this.persistTags(entity, finalTags, options);
      
      // 7. Cache result
      await this.cache.set(cacheKey, result, { ttl: 3600 });
      
      // 8. Queue learning feedback
      await this.learningEngine.queueForAnalysis(entity, result);
      
      // 9. Emit events
      await this.emitTaggingEvent(entity, result);
      
      this.logger.info(`Tagged entity ${entity.type}:${entity.id} in ${Date.now() - startTime}ms`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to tag entity ${entity.type}:${entity.id}:`, error);
      throw new AppError('Tagging failed', 500, { entity, error });
    }
  }

  private async mergeTagResults(
    patternMatches: PatternMatch[],
    aiAnalysis: AIAnalysis | null,
    semanticMatches: SemanticMatch[]
  ): Promise<MergedTag[]> {
    const tagMap = new Map<string, MergedTag>();
    
    // Process pattern matches
    for (const match of patternMatches) {
      const existing = tagMap.get(match.tagId) || { 
        tagId: match.tagId,
        confidence: 0,
        sources: [],
        reasons: []
      };
      
      existing.confidence = Math.max(existing.confidence, match.confidence);
      existing.sources.push('pattern');
      existing.reasons.push(match.reason);
      
      tagMap.set(match.tagId, existing);
    }
    
    // Process AI analysis
    if (aiAnalysis) {
      for (const suggestion of aiAnalysis.suggestions) {
        const existing = tagMap.get(suggestion.tagId) || {
          tagId: suggestion.tagId,
          confidence: 0,
          sources: [],
          reasons: []
        };
        
        // Weight AI suggestions higher
        existing.confidence = Math.max(existing.confidence, suggestion.confidence * 1.2);
        existing.sources.push('ai');
        existing.reasons.push(suggestion.reasoning);
        
        tagMap.set(suggestion.tagId, existing);
      }
    }
    
    // Return sorted by confidence
    return Array.from(tagMap.values())
      .sort((a, b) => b.confidence - a.confidence);
  }
}
```

## 3. Database Schema Implementation Strategy

### 3.1 Prisma Schema Design

```prisma
// prisma/schema.prisma additions

model UniversalTag {
  id              String           @id @default(uuid())
  code            String           @unique @db.VarChar(100)
  name            String           @db.VarChar(255)
  description     String?
  entityTypes     String[]
  patterns        Json?
  rules           Json?
  embedding       Float[]?         // For pgvector
  embeddingModel  String?          @db.VarChar(50)
  confidence      Float            @default(0.5)
  parentId        String?          @db.Uuid
  path            String           @db.Text
  level           Int              @default(0)
  color           String?          @db.VarChar(7)
  icon            String?          @db.VarChar(50)
  isActive        Boolean          @default(true)
  isSystem        Boolean          @default(false)
  metadata        Json?
  usageCount      Int              @default(0)
  successRate     Float            @default(0.0)
  lastUsed        DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  
  // Relations
  parent          UniversalTag?    @relation("TagHierarchy", fields: [parentId], references: [id])
  children        UniversalTag[]   @relation("TagHierarchy")
  entityTags      EntityTag[]
  patterns        TagPattern[]
  metrics         TagMetric[]
  
  @@index([code])
  @@index([entityTypes])
  @@index([parentId])
  @@index([path])
  @@index([isActive])
  @@map("universal_tags")
  @@schema("public")
}

model EntityTag {
  id               String         @id @default(uuid())
  entityType       String         @db.VarChar(50)
  entityId         String         @db.VarChar(255)
  tagId            String         @db.Uuid
  method           TagMethod
  confidence       Float          @default(0.5)
  appliedBy        String?        @db.VarChar(255)
  aiProvider       String?        @db.VarChar(50)
  aiModel          String?        @db.VarChar(100)
  aiResponse       Json?
  aiReasoning      String?
  isVerified       Boolean        @default(false)
  verifiedBy       String?        @db.VarChar(255)
  verifiedAt       DateTime?
  feedback         String?
  isCorrect        Boolean?
  sourceEntityType String?        @db.VarChar(50)
  sourceEntityId   String?        @db.VarChar(255)
  relationshipType String?        @db.VarChar(50)
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  
  // Relations
  tag              UniversalTag   @relation(fields: [tagId], references: [id])
  feedbacks        TagFeedback[]
  
  @@unique([entityType, entityId, tagId])
  @@index([entityType, entityId])
  @@index([tagId])
  @@index([confidence])
  @@index([method])
  @@index([isVerified])
  @@map("entity_tags")
  @@schema("public")
}

enum TagMethod {
  AI
  PATTERN
  RULE
  MANUAL
  INFERRED
}
```

### 3.2 Migration Strategy

```typescript
// scripts/migrate-to-universal-tagging.ts
import { PrismaClient } from '@prisma/client';
import { Logger } from '../src/utils/logger';

const prisma = new PrismaClient();
const logger = new Logger('TagMigration');

export class UniversalTaggingMigration {
  async migrate() {
    await prisma.$transaction(async (tx) => {
      // 1. Create universal tags from existing categories
      const categories = await tx.categories.findMany();
      
      for (const category of categories) {
        await tx.universalTag.create({
          data: {
            code: this.generateTagCode(category.name),
            name: category.name,
            entityTypes: ['transaction'],
            confidence: 0.8,
            path: this.buildPath(category),
            metadata: {
              migratedFrom: 'categories',
              originalId: category.id
            }
          }
        });
      }
      
      // 2. Migrate existing categorizations
      const categorizations = await tx.transactionCategorizations.findMany();
      
      for (const cat of categorizations) {
        const tag = await tx.universalTag.findFirst({
          where: { metadata: { path: ['migratedFrom'], equals: 'categories' } }
        });
        
        if (tag) {
          await tx.entityTag.create({
            data: {
              entityType: 'transaction',
              entityId: cat.transaction_id,
              tagId: tag.id,
              method: cat.method === 'ai_auto' ? 'AI' : 'MANUAL',
              confidence: cat.confidence || 0.5
            }
          });
        }
      }
    });
  }
}
```

## 4. RESTful API Design

### 4.1 Route Structure

```typescript
// src/routes/tagging/index.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { tagController } from './tag.controller';
import { entityTagController } from './entity-tag.controller';
import { analyticsController } from './analytics.controller';
import * as schemas from './schemas';

const router = Router();

// Tag Management Routes
router.get('/tags', authenticate, tagController.listTags);
router.post('/tags', authenticate, validate(schemas.createTag), tagController.createTag);
router.get('/tags/:id', authenticate, tagController.getTag);
router.put('/tags/:id', authenticate, validate(schemas.updateTag), tagController.updateTag);
router.delete('/tags/:id', authenticate, tagController.deleteTag);

// Entity Tagging Routes
router.post('/entities/:type/:id/tags', authenticate, validate(schemas.tagEntity), entityTagController.tagEntity);
router.get('/entities/:type/:id/tags', authenticate, entityTagController.getEntityTags);
router.delete('/entities/:type/:id/tags/:tagId', authenticate, entityTagController.removeTag);
router.patch('/entities/:type/:id/tags/:tagId', authenticate, validate(schemas.updateEntityTag), entityTagController.updateEntityTag);

// Batch Operations
router.post('/tagging/batch', authenticate, validate(schemas.batchTag), entityTagController.batchTag);
router.post('/tagging/retag', authenticate, validate(schemas.retag), entityTagController.retag);

// Learning & Feedback
router.post('/tagging/feedback', authenticate, validate(schemas.submitFeedback), entityTagController.submitFeedback);

// Analytics
router.get('/tags/:id/metrics', authenticate, analyticsController.getTagMetrics);
router.get('/tagging/accuracy', authenticate, analyticsController.getSystemAccuracy);

export default router;
```

### 4.2 Controller Implementation

```typescript
// src/routes/tagging/tag.controller.ts
import { Request, Response, NextFunction } from 'express';
import { container } from '../../services/tagging/container';
import { TYPES } from '../../services/tagging/types';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/errors';

export class TagController {
  private taggingService = container.get<ITaggingOrchestrationService>(TYPES.TaggingOrchestration);

  listTags = asyncHandler(async (req: Request, res: Response) => {
    const { entityType, search, parentId, page = 1, limit = 20 } = req.query;
    
    const result = await this.taggingService.listTags({
      entityType: entityType as string,
      search: search as string,
      parentId: parentId as string,
      page: Number(page),
      limit: Number(limit)
    });
    
    res.json({
      success: true,
      data: result.tags,
      pagination: result.pagination
    });
  });

  createTag = asyncHandler(async (req: Request, res: Response) => {
    const { user } = req;
    const tagData = req.body;
    
    const tag = await this.taggingService.createTag({
      ...tagData,
      createdBy: user.id
    });
    
    res.status(201).json({
      success: true,
      data: tag
    });
  });

  updateTag = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    
    const tag = await this.taggingService.updateTag(id, updates);
    
    res.json({
      success: true,
      data: tag
    });
  });
}

export const tagController = new TagController();
```

## 5. Integration Patterns

### 5.1 Entity Adapter Pattern

```typescript
// src/services/tagging/adapters/base.adapter.ts
export abstract class BaseEntityAdapter implements IEntityAdapter {
  abstract prepareEntity(entity: any): Promise<TaggableEntity>;
  abstract extractFeatures(entity: any): Promise<EntityFeatures>;
  
  protected extractCommonMetadata(entity: any): CommonMetadata {
    return {
      createdAt: entity.created_at || entity.createdAt,
      updatedAt: entity.updated_at || entity.updatedAt,
      userId: entity.user_id || entity.userId
    };
  }
}

// src/services/tagging/adapters/transaction.adapter.ts
export class TransactionAdapter extends BaseEntityAdapter {
  async prepareEntity(transaction: any): Promise<TaggableEntity> {
    return {
      type: 'transaction',
      id: transaction.id,
      content: this.extractContent(transaction),
      metadata: {
        amount: transaction.amount,
        currency: transaction.currency,
        date: transaction.date,
        counterparty: transaction.counterparty_name,
        ...this.extractCommonMetadata(transaction)
      }
    };
  }
  
  private extractContent(transaction: any): string {
    return [
      transaction.description,
      transaction.counterparty_name,
      transaction.reference,
      transaction.category
    ].filter(Boolean).join(' ');
  }
}
```

### 5.2 Integration with Existing Services

```typescript
// src/services/financial/transaction-management.service.ts
import { container } from '../tagging/container';
import { TYPES } from '../tagging/types';

export class TransactionManagementService {
  private taggingService = container.get<ITaggingEngine>(TYPES.TaggingEngine);
  
  async createTransaction(data: CreateTransactionDto): Promise<Transaction> {
    // Create transaction
    const transaction = await prisma.transaction.create({ data });
    
    // Auto-tag transaction
    try {
      await this.taggingService.tagEntity({
        type: 'transaction',
        id: transaction.id,
        content: transaction.description,
        metadata: {
          amount: transaction.amount,
          currency: transaction.currency
        }
      });
    } catch (error) {
      // Log error but don't fail transaction creation
      logger.error('Failed to auto-tag transaction:', error);
    }
    
    return transaction;
  }
}
```

## 6. Scalability and Performance Architecture

### 6.1 Caching Strategy

```typescript
// src/services/tagging/cache/cache-manager.ts
export class CacheManager {
  private memoryCache: NodeCache;
  private redisCache: Redis;
  
  constructor() {
    this.memoryCache = new NodeCache({ stdTTL: 300 }); // 5 minutes
    this.redisCache = new Redis(config.redis);
  }
  
  async get<T>(key: string): Promise<T | null> {
    // L1 Cache - Memory
    const memoryResult = this.memoryCache.get<T>(key);
    if (memoryResult) {
      return memoryResult;
    }
    
    // L2 Cache - Redis
    const redisResult = await this.redisCache.get(key);
    if (redisResult) {
      const parsed = JSON.parse(redisResult) as T;
      this.memoryCache.set(key, parsed);
      return parsed;
    }
    
    return null;
  }
  
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 3600;
    
    // Set in both caches
    this.memoryCache.set(key, value, ttl);
    await this.redisCache.setex(key, ttl, JSON.stringify(value));
  }
}
```

### 6.2 Queue Processing

```typescript
// src/services/tagging/queues/tagging.queue.ts
import Bull from 'bull';
import { container } from '../container';
import { TYPES } from '../types';

export const taggingQueue = new Bull('tagging', {
  redis: config.redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

taggingQueue.process('tag-entity', 10, async (job) => {
  const taggingEngine = container.get<ITaggingEngine>(TYPES.TaggingEngine);
  const { entityType, entityId, options } = job.data;
  
  const entity = await loadEntity(entityType, entityId);
  return await taggingEngine.tagEntity(entity, options);
});

taggingQueue.process('batch-tag', 5, async (job) => {
  const taggingEngine = container.get<ITaggingEngine>(TYPES.TaggingEngine);
  const { entities, options } = job.data;
  
  return await taggingEngine.batchTagEntities(entities, options);
});
```

### 6.3 Database Optimization

```typescript
// src/services/tagging/repositories/tag.repository.ts
export class TagRepository implements ITagRepository {
  async findTagsByEntityTypes(entityTypes: string[]): Promise<UniversalTag[]> {
    return await prisma.universalTag.findMany({
      where: {
        entityTypes: {
          hasSome: entityTypes
        },
        isActive: true
      },
      include: {
        patterns: {
          where: { isActive: true }
        }
      },
      orderBy: {
        usageCount: 'desc'
      }
    });
  }
  
  async updateTagMetrics(tagId: string, metrics: TagMetricUpdate): Promise<void> {
    await prisma.$transaction([
      prisma.universalTag.update({
        where: { id: tagId },
        data: {
          usageCount: { increment: 1 },
          lastUsed: new Date()
        }
      }),
      prisma.tagMetric.create({
        data: {
          tagId,
          periodStart: new Date(),
          periodType: 'DAILY',
          ...metrics
        }
      })
    ]);
  }
}
```

## 7. Security Architecture

### 7.1 Permission System

```typescript
// src/services/tagging/security/permissions.ts
export enum TagPermission {
  CREATE_TAG = 'tag:create',
  UPDATE_TAG = 'tag:update',
  DELETE_TAG = 'tag:delete',
  APPLY_TAG = 'tag:apply',
  VERIFY_TAG = 'tag:verify',
  MANAGE_PATTERNS = 'tag:patterns:manage'
}

export class TagPermissionService {
  async checkPermission(
    user: User,
    permission: TagPermission,
    resource?: any
  ): Promise<boolean> {
    // Check role-based permissions
    const hasRolePermission = await this.checkRolePermission(user.role, permission);
    if (!hasRolePermission) return false;
    
    // Check resource-specific permissions
    if (resource) {
      return await this.checkResourcePermission(user, permission, resource);
    }
    
    return true;
  }
  
  private async checkResourcePermission(
    user: User,
    permission: TagPermission,
    resource: any
  ): Promise<boolean> {
    // Entity-level permissions
    if (resource.entityType && resource.entityId) {
      const entity = await this.loadEntity(resource.entityType, resource.entityId);
      return this.canAccessEntity(user, entity);
    }
    
    // Tag-level permissions
    if (resource.tagId) {
      const tag = await prisma.universalTag.findUnique({
        where: { id: resource.tagId }
      });
      
      if (tag?.isSystem && permission !== TagPermission.APPLY_TAG) {
        return user.role === 'admin';
      }
    }
    
    return true;
  }
}
```

### 7.2 Data Protection

```typescript
// src/services/tagging/security/encryption.ts
export class TagEncryptionService {
  private cipher: crypto.Cipher;
  
  async encryptSensitivePatterns(pattern: any): Promise<EncryptedData> {
    const key = await this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(pattern), 'utf8'),
      cipher.final()
    ]);
    
    return {
      data: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      algorithm: 'aes-256-gcm'
    };
  }
  
  async decryptPattern(encrypted: EncryptedData): Promise<any> {
    const key = await this.getEncryptionKey();
    const decipher = crypto.createDecipheriv(
      encrypted.algorithm,
      key,
      Buffer.from(encrypted.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted.data, 'base64')),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  }
}
```

## 8. Error Handling Patterns

### 8.1 Custom Error Types

```typescript
// src/services/tagging/errors/tagging.errors.ts
export class TaggingError extends AppError {
  constructor(message: string, statusCode: number, details?: any) {
    super(message, statusCode, details);
    this.name = 'TaggingError';
  }
}

export class TagNotFoundError extends TaggingError {
  constructor(tagId: string) {
    super(`Tag not found: ${tagId}`, 404, { tagId });
  }
}

export class InsufficientConfidenceError extends TaggingError {
  constructor(confidence: number, threshold: number) {
    super(
      `Confidence ${confidence} below threshold ${threshold}`,
      400,
      { confidence, threshold }
    );
  }
}

export class AIProviderError extends TaggingError {
  constructor(provider: string, originalError: any) {
    super(
      `AI provider error: ${provider}`,
      503,
      { provider, originalError: originalError.message }
    );
  }
}
```

### 8.2 Error Recovery

```typescript
// src/services/tagging/error-recovery.ts
export class ErrorRecoveryService {
  async handleTaggingFailure(
    entity: TaggableEntity,
    error: Error,
    context: TaggingContext
  ): Promise<TaggingResult> {
    logger.error(`Tagging failed for ${entity.type}:${entity.id}`, error);
    
    // Try fallback strategies
    if (error instanceof AIProviderError) {
      // Fallback to pattern matching only
      return await this.fallbackToPatternMatching(entity, context);
    }
    
    if (error instanceof NetworkError) {
      // Queue for retry
      await this.queueForRetry(entity, context);
      return this.createPendingResult(entity);
    }
    
    // Log to monitoring
    await this.logToMonitoring(error, entity, context);
    
    throw error;
  }
  
  private async fallbackToPatternMatching(
    entity: TaggableEntity,
    context: TaggingContext
  ): Promise<TaggingResult> {
    const patternEngine = container.get<IPatternEngine>(TYPES.PatternEngine);
    const features = await this.extractFeatures(entity);
    const matches = await patternEngine.matchPatterns(features);
    
    return {
      entity,
      tags: matches.map(m => ({
        tagId: m.tagId,
        confidence: m.confidence * 0.8, // Reduce confidence for fallback
        method: 'PATTERN',
        reasoning: 'AI unavailable - pattern matching only'
      })),
      processingTime: Date.now() - context.startTime,
      fallbackUsed: true
    };
  }
}
```

## 9. Monitoring and Observability

### 9.1 Metrics Collection

```typescript
// src/services/tagging/monitoring/metrics.ts
import { Counter, Histogram, Gauge } from 'prom-client';

export const taggingMetrics = {
  operationsTotal: new Counter({
    name: 'tagging_operations_total',
    help: 'Total tagging operations',
    labelNames: ['entity_type', 'method', 'status']
  }),
  
  operationDuration: new Histogram({
    name: 'tagging_duration_seconds',
    help: 'Tagging operation duration',
    labelNames: ['entity_type', 'method'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),
  
  confidenceDistribution: new Histogram({
    name: 'tag_confidence_distribution',
    help: 'Distribution of tag confidence scores',
    labelNames: ['entity_type', 'tag_code'],
    buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
  }),
  
  aiProviderLatency: new Histogram({
    name: 'ai_provider_latency_seconds',
    help: 'AI provider response latency',
    labelNames: ['provider', 'operation'],
    buckets: [0.5, 1, 2, 5, 10, 30]
  }),
  
  cacheHitRate: new Gauge({
    name: 'tagging_cache_hit_rate',
    help: 'Cache hit rate for tagging operations',
    labelNames: ['cache_level']
  })
};
```

### 9.2 Structured Logging

```typescript
// src/services/tagging/logging/tagging-logger.ts
export class TaggingLogger extends Logger {
  logTagOperation(operation: TagOperation): void {
    this.info('Tag operation', {
      type: 'TAG_OPERATION',
      operation: operation.type,
      entityType: operation.entityType,
      entityId: operation.entityId,
      tags: operation.tags.map(t => ({
        id: t.tagId,
        confidence: t.confidence,
        method: t.method
      })),
      userId: operation.userId,
      duration: operation.duration,
      timestamp: new Date().toISOString()
    });
  }
  
  logAIAnalysis(analysis: AIAnalysisLog): void {
    this.debug('AI analysis completed', {
      type: 'AI_ANALYSIS',
      provider: analysis.provider,
      model: analysis.model,
      entityType: analysis.entityType,
      tokensUsed: analysis.tokensUsed,
      duration: analysis.duration,
      cost: analysis.estimatedCost
    });
  }
}
```

## 10. Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-2)
- Set up database schema and migrations
- Implement core service interfaces
- Create dependency injection container
- Set up basic API routes

### Phase 2: Tagging Engine (Weeks 3-4)
- Implement pattern matching engine
- Integrate AI providers (Claude, OpenAI)
- Build entity adapters
- Create caching layer

### Phase 3: Integration (Weeks 5-6)
- Integrate with existing services
- Migrate existing categorization data
- Implement batch processing
- Add queue workers

### Phase 4: Advanced Features (Weeks 7-8)
- Implement learning engine
- Add relationship discovery
- Build analytics system
- Create admin interface

### Phase 5: Performance & Security (Weeks 9-10)
- Optimize database queries
- Implement security features
- Add monitoring and alerts
- Performance testing

### Phase 6: Documentation & Deployment (Weeks 11-12)
- Complete API documentation
- Create deployment scripts
- Write user guides
- Production deployment

## Conclusion

This architectural blueprint provides a comprehensive, production-ready design for the Universal AI Tagging System. It follows SOLID principles, integrates seamlessly with the existing codebase, and provides a scalable foundation for intelligent entity classification across all data types in the AI Service platform.

The modular design allows for incremental implementation while maintaining system stability, and the extensive use of interfaces ensures the system remains flexible and testable throughout its lifecycle.