# Universal AI Tagging System

## Overview

The Universal AI Tagging System is a comprehensive, AI-powered classification and tagging engine designed to work across all entities in the AI Service application. Unlike the current transaction-specific categorization system, this unified approach enables intelligent tagging for transactions, documents, clients, invoices, and any future entity types.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Concepts](#core-concepts)
3. [Technical Design](#technical-design)
4. [Implementation Plan](#implementation-plan)
5. [Migration Strategy](#migration-strategy)
6. [Use Cases](#use-cases)
7. [API Reference](#api-reference)
8. [Performance Considerations](#performance-considerations)

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Universal AI Tagging System               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │   Entities   │  │   AI Engine  │  │   Tag Storage    │  │
│  ├─────────────┤  ├─────────────┤  ├──────────────────┤  │
│  │ Transactions │  │   Claude AI  │  │  Universal Tags  │  │
│  │  Documents   │  │   OpenAI     │  │  Entity Tags     │  │
│  │   Clients    │  │  Embeddings  │  │  Tag Patterns    │  │
│  │   Invoices   │  │   ML Models  │  │  Tag Hierarchy   │  │
│  │   [Future]   │  │              │  │                  │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Core Tagging Service                    │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ • Pattern Matching  • AI Analysis  • Learning Loop  │  │
│  │ • Cross-Entity Links • Semantic Search • Feedback   │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Universal Tagging Service**: Core service that handles all tagging operations
2. **AI Integration Layer**: Connects to Claude, OpenAI, and other AI providers
3. **Pattern Engine**: Flexible pattern matching using JSONB storage
4. **Learning System**: Continuous improvement from user feedback
5. **Cross-Entity Intelligence**: Discovers relationships between different entities

## Core Concepts

### 1. Universal Tags

Universal tags are flexible, hierarchical labels that can be applied to any entity type:

```typescript
interface UniversalTag {
  id: string;
  code: string;              // Unique identifier (e.g., "EXPENSE_FOOD")
  name: string;              // Human-readable name
  entityType: string;        // Which entities this tag applies to
  patterns: JsonPattern;     // Flexible matching patterns
  embedding: number[];       // Vector for semantic matching
  hierarchy: TagHierarchy;   // Parent/child relationships
}
```

### 2. Entity Tagging

Any entity can be tagged with multiple tags, each with confidence scores:

```typescript
interface EntityTag {
  entityType: string;        // "transaction", "document", "client", etc.
  entityId: string;          // ID of the tagged entity
  tagId: string;             // Reference to UniversalTag
  confidence: number;        // 0.0 to 1.0
  method: TagMethod;         // How the tag was applied
  metadata: JsonMetadata;    // Additional context
}
```

### 3. Tagging Methods

- **AI Analysis**: Using Claude or OpenAI to understand content
- **Pattern Matching**: Rule-based matching using patterns
- **Semantic Search**: Vector similarity using embeddings
- **User Manual**: Direct user assignment
- **Cross-Entity**: Inferred from related entities

## Technical Design

### Database Schema

```prisma
// Universal tag definition
model UniversalTag {
  id              String           @id @default(cuid())
  code            String           @unique
  name            String
  description     String?
  entityTypes     String[]         // Array of applicable entity types
  
  // Flexible pattern storage
  patterns        Json             // JSONB for complex patterns
  rules           Json             // Business rules
  
  // AI/ML fields
  embedding       Float[]          // Vector representation
  embeddingModel  String?          // Model used for embedding
  confidence      Float            @default(0.5)
  
  // Hierarchy
  parentId        String?
  parent          UniversalTag?    @relation("TagHierarchy", fields: [parentId], references: [id])
  children        UniversalTag[]   @relation("TagHierarchy")
  path            String           // Materialized path for efficient queries
  level           Int              // Hierarchy depth
  
  // Metadata
  color           String?          // UI representation
  icon            String?          // Icon identifier
  isActive        Boolean          @default(true)
  isSystem        Boolean          @default(false)
  
  // Usage tracking
  usageCount      Int              @default(0)
  successRate     Float            @default(0.0)
  lastUsed        DateTime?
  
  // Timestamps
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  
  // Relations
  entityTags      EntityTag[]
  patterns        TagPattern[]
  
  @@index([code])
  @@index([entityTypes])
  @@index([parentId])
  @@index([path])
}

// Entity-tag relationship
model EntityTag {
  id              String           @id @default(cuid())
  entityType      String           // "transaction", "document", "client", etc.
  entityId        String           // ID of the tagged entity
  tagId           String
  tag             UniversalTag     @relation(fields: [tagId], references: [id])
  
  // Tagging metadata
  method          String           // "AI", "PATTERN", "RULE", "MANUAL", "INFERRED"
  confidence      Float            @default(0.5)
  appliedBy       String?          // User ID or "SYSTEM"
  
  // AI analysis results
  aiProvider      String?          // "claude", "openai", etc.
  aiModel         String?          // Specific model version
  aiResponse      Json?            // Raw AI response for debugging
  aiReasoning     String?          // Human-readable explanation
  
  // User feedback
  isVerified      Boolean          @default(false)
  verifiedBy      String?
  verifiedAt      DateTime?
  feedback        String?
  isCorrect       Boolean?         // null = not reviewed, true/false = user feedback
  
  // Cross-entity relationships
  sourceEntityType String?         // If inferred from another entity
  sourceEntityId   String?
  relationshipType String?         // How entities are related
  
  // Timestamps
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  
  @@unique([entityType, entityId, tagId])
  @@index([entityType, entityId])
  @@index([tagId])
  @@index([confidence])
  @@index([method])
}

// Tag patterns for matching
model TagPattern {
  id              String           @id @default(cuid())
  tagId           String
  tag             UniversalTag     @relation(fields: [tagId], references: [id])
  
  patternType     String           // "KEYWORD", "REGEX", "SEMANTIC", "NUMERIC", "DATE"
  pattern         Json             // Flexible pattern definition
  weight          Float            @default(1.0)
  minConfidence   Float            @default(0.5)
  
  // Performance tracking
  matchCount      Int              @default(0)
  successCount    Int              @default(0)
  accuracy        Float            @default(0.0)
  
  isActive        Boolean          @default(true)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  
  @@index([tagId, patternType])
  @@index([isActive])
}

// Cross-entity relationships discovered through tagging
model EntityRelationship {
  id              String           @id @default(cuid())
  
  // Source entity
  sourceType      String
  sourceId        String
  
  // Target entity
  targetType      String
  targetId        String
  
  // Relationship details
  relationshipType String          // "MENTIONED_IN", "RELATED_TO", "PART_OF", etc.
  confidence      Float
  discoveredBy    String           // "AI", "PATTERN", "USER"
  metadata        Json?
  
  createdAt       DateTime         @default(now())
  
  @@unique([sourceType, sourceId, targetType, targetId, relationshipType])
  @@index([sourceType, sourceId])
  @@index([targetType, targetId])
}
```

### Service Architecture

```typescript
// Core service interface
export interface IUniversalTaggingService {
  // Tag operations
  tagEntity(entity: TaggableEntity, options?: TaggingOptions): Promise<TaggingResult>;
  removeTag(entityType: string, entityId: string, tagId: string): Promise<void>;
  updateTagConfidence(entityTagId: string, confidence: number): Promise<void>;
  
  // Batch operations
  batchTagEntities(entities: TaggableEntity[], options?: TaggingOptions): Promise<BatchTaggingResult>;
  retagEntities(filter: EntityFilter, options?: TaggingOptions): Promise<BatchTaggingResult>;
  
  // Learning and feedback
  provideFeedback(entityTagId: string, feedback: TagFeedback): Promise<void>;
  learnFromCorrection(entityType: string, entityId: string, correctTagId: string): Promise<void>;
  
  // Search and discovery
  findEntitiesByTag(tagId: string, options?: SearchOptions): Promise<TaggedEntity[]>;
  searchTags(query: string, entityType?: string): Promise<UniversalTag[]>;
  discoverRelationships(entityType: string, entityId: string): Promise<EntityRelationship[]>;
  
  // Analytics
  getTagMetrics(tagId: string): Promise<TagMetrics>;
  getEntityTagHistory(entityType: string, entityId: string): Promise<TagHistory>;
  getTaggingAccuracy(timeRange?: TimeRange): Promise<AccuracyMetrics>;
}

// Entity that can be tagged
export interface TaggableEntity {
  type: string;              // "transaction", "document", "client", etc.
  id: string;                // Unique identifier
  content: string;           // Text content for analysis
  metadata?: Record<string, any>;  // Additional context
  existingTags?: string[];   // Current tags (if any)
}

// Tagging options
export interface TaggingOptions {
  method?: 'auto' | 'ai' | 'pattern' | 'manual';
  aiProvider?: 'claude' | 'openai';
  confidenceThreshold?: number;
  maxTags?: number;
  includeHierarchy?: boolean;
  language?: string;
}

// Tagging result
export interface TaggingResult {
  entity: TaggableEntity;
  tags: AppliedTag[];
  relationships?: EntityRelationship[];
  processingTime: number;
  method: string;
}
```

## Implementation Plan

### Phase 1: Foundation (Weeks 1-2)
1. Create database schema and migrations
2. Implement core UniversalTaggingService
3. Build pattern matching engine
4. Create initial tag hierarchy

### Phase 2: AI Integration (Weeks 3-4)
1. Integrate Claude AI for intelligent tagging
2. Implement embedding generation with OpenAI
3. Build semantic search capabilities
4. Create learning feedback system

### Phase 3: Entity Integration (Weeks 5-6)
1. Migrate transaction categorization to new system
2. Implement document tagging
3. Add client and invoice tagging
4. Build cross-entity relationship discovery

### Phase 4: UI Development (Weeks 7-8)
1. Create universal tag management interface
2. Build entity tagging components
3. Implement tag analytics dashboard
4. Add batch tagging tools

### Phase 5: Optimization (Weeks 9-10)
1. Performance tuning and caching
2. Background job processing
3. Advanced analytics
4. API documentation

## Migration Strategy

### Step 1: Parallel Systems
Run the new universal tagging system alongside the existing `ai_tags` table:

```sql
-- Create new tables without affecting existing system
CREATE SCHEMA IF NOT EXISTS tagging;

-- Universal tags in new schema
CREATE TABLE tagging.universal_tags (...);
CREATE TABLE tagging.entity_tags (...);
```

### Step 2: Data Migration
Migrate existing transaction categories to universal tags:

```typescript
async function migrateExistingTags() {
  const existingTags = await prisma.ai_tags.findMany();
  
  for (const oldTag of existingTags) {
    await universalTagService.createTag({
      code: `TRANSACTION_${oldTag.tag_name.toUpperCase()}`,
      name: oldTag.tag_name,
      entityTypes: ['transaction'],
      patterns: {
        // Convert existing patterns to new format
      }
    });
  }
}
```

### Step 3: Gradual Rollout
1. Enable universal tagging for new transactions
2. Backfill historical transactions in batches
3. Switch document intelligence to use universal tags
4. Migrate other entities progressively

### Step 4: Deprecation
After successful migration:
1. Update all code references
2. Remove old `ai_tags` table
3. Archive migration code

## Use Cases

### 1. Transaction Categorization
```typescript
const result = await taggingService.tagEntity({
  type: 'transaction',
  id: 'txn_123',
  content: 'AMAZON PRIME SUBSCRIPTION',
  metadata: {
    amount: -14.99,
    currency: 'EUR',
    date: '2025-01-15'
  }
});

// Result:
{
  tags: [
    { code: 'EXPENSE_SUBSCRIPTION', confidence: 0.95 },
    { code: 'VENDOR_AMAZON', confidence: 0.98 },
    { code: 'RECURRING_MONTHLY', confidence: 0.87 }
  ]
}
```

### 2. Document Classification
```typescript
const result = await taggingService.tagEntity({
  type: 'document',
  id: 'doc_456',
  content: documentText,
  metadata: {
    fileName: 'contract_2025.pdf',
    fileSize: 1024000,
    source: 'email'
  }
});

// Result:
{
  tags: [
    { code: 'DOC_CONTRACT', confidence: 0.92 },
    { code: 'LEGAL_BINDING', confidence: 0.88 },
    { code: 'VENDOR_AGREEMENT', confidence: 0.85 },
    { code: 'EXPIRES_2025_Q4', confidence: 0.90 }
  ],
  relationships: [
    {
      targetType: 'client',
      targetId: 'client_789',
      relationshipType: 'CONTRACT_WITH',
      confidence: 0.87
    }
  ]
}
```

### 3. Cross-Entity Intelligence
```typescript
// Find all entities related to a specific vendor
const entities = await taggingService.findRelatedEntities({
  tag: 'VENDOR_ACME_CORP',
  includeTypes: ['transaction', 'document', 'invoice', 'client']
});

// Returns transactions, contracts, invoices, and client records
// all tagged with or related to ACME Corp
```

### 4. Smart Suggestions
```typescript
// When viewing a client, suggest related tags based on their activity
const suggestions = await taggingService.suggestTags({
  type: 'client',
  id: 'client_123',
  context: 'viewing_profile'
});

// Suggests: "HIGH_VALUE", "TECH_INDUSTRY", "QUARTERLY_BILLING"
// based on their transactions, documents, and patterns
```

## API Reference

### REST Endpoints

```yaml
# Tag Management
GET    /api/tags                      # List all tags
POST   /api/tags                      # Create new tag
PUT    /api/tags/:id                  # Update tag
DELETE /api/tags/:id                  # Delete tag

# Entity Tagging
POST   /api/entities/:type/:id/tags   # Tag an entity
GET    /api/entities/:type/:id/tags   # Get entity tags
DELETE /api/entities/:type/:id/tags/:tagId  # Remove tag

# Batch Operations
POST   /api/tagging/batch             # Tag multiple entities
POST   /api/tagging/retag             # Re-tag entities

# Search and Discovery
GET    /api/tags/search               # Search tags
GET    /api/entities/by-tag/:tagId   # Find entities by tag
GET    /api/relationships/:type/:id   # Get entity relationships

# Analytics
GET    /api/tags/:id/metrics          # Tag usage metrics
GET    /api/tagging/accuracy          # System accuracy metrics
```

### GraphQL Schema

```graphql
type UniversalTag {
  id: ID!
  code: String!
  name: String!
  description: String
  entityTypes: [String!]!
  parent: UniversalTag
  children: [UniversalTag!]!
  usageCount: Int!
  confidence: Float!
}

type EntityTag {
  id: ID!
  entity: TaggedEntity!
  tag: UniversalTag!
  confidence: Float!
  method: TagMethod!
  appliedAt: DateTime!
  verifiedBy: User
}

type Query {
  tags(entityType: String, search: String): [UniversalTag!]!
  taggedEntities(tagId: ID!, type: String): [TaggedEntity!]!
  entityTags(type: String!, id: ID!): [EntityTag!]!
}

type Mutation {
  tagEntity(input: TagEntityInput!): TaggingResult!
  removeTag(entityType: String!, entityId: ID!, tagId: ID!): Boolean!
  provideFeedback(entityTagId: ID!, feedback: FeedbackInput!): Boolean!
}
```

## Performance Considerations

### 1. Caching Strategy
- Cache tag hierarchies in Redis (24-hour TTL)
- Cache embedding vectors for frequently used tags
- Cache entity-tag mappings for hot entities

### 2. Indexing
- Composite indexes on (entityType, entityId)
- Full-text search indexes on tag names and descriptions
- Vector indexes for embedding similarity search

### 3. Batch Processing
- Process tagging in batches of 100 entities
- Use queue system for large retagging operations
- Implement rate limiting for AI providers

### 4. Query Optimization
- Use materialized views for tag statistics
- Implement pagination for large result sets
- Use database-level aggregations where possible

### 5. Scalability
- Horizontal scaling through read replicas
- Partition entity_tags table by entity_type
- Consider separate embedding storage (Pinecone, Weaviate)

## Security Considerations

1. **Access Control**: Tag-level permissions (who can create, apply, remove tags)
2. **Audit Trail**: Complete history of tag changes and who made them
3. **Data Privacy**: Ensure sensitive tags are properly protected
4. **Rate Limiting**: Prevent abuse of AI tagging endpoints
5. **Validation**: Strict input validation for tag patterns and rules

## Future Enhancements

1. **Machine Learning Models**: Train custom models on your data
2. **Auto-Tagging Rules**: Create complex rules for automatic tagging
3. **Tag Recommendations**: Suggest new tags based on usage patterns
4. **Multi-Language Support**: Tags and patterns in multiple languages
5. **External Integrations**: Import/export tags to external systems
6. **Advanced Analytics**: Predictive analytics based on tag patterns
7. **Tag Workflows**: Approval workflows for sensitive tags
8. **Mobile SDK**: Tag entities from mobile applications

## Conclusion

The Universal AI Tagging System represents a paradigm shift from siloed categorization to intelligent, cross-entity classification. By leveraging modern AI capabilities and flexible schema design, this system provides a foundation for building a knowledge graph that understands the relationships between all business entities, enabling powerful insights and automation opportunities.