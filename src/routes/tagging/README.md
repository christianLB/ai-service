# Universal AI Tagging System - API Integration Guide

## Overview

This directory contains the complete API implementation for the Universal AI Tagging System. The system provides intelligent tagging capabilities for various entity types (transactions, documents, clients, invoices) using AI and pattern matching.

## Directory Structure

```
src/
├── routes/tagging/
│   ├── index.ts              # Main router that combines all tagging routes
│   ├── tag.routes.ts         # Tag management endpoints
│   ├── entity.routes.ts      # Entity tagging endpoints
│   └── operations.routes.ts  # Batch operations and analytics
├── services/tagging/
│   ├── tag.service.ts        # Tag CRUD operations
│   ├── entity-tagging.service.ts  # Entity tagging logic
│   ├── ai-tagging.service.ts      # AI-powered tagging
│   ├── pattern-matching.service.ts # Pattern-based tagging
│   ├── interfaces.ts         # Service interfaces
│   └── errors.ts            # Custom error classes
├── types/tagging/
│   ├── tag.types.ts         # Core type definitions and schemas
│   ├── response.types.ts    # Response DTOs
│   ├── webhook.types.ts     # Webhook configurations
│   └── index.ts            # Type exports
└── middleware/
    ├── rate-limit.middleware.ts    # Rate limiting
    └── tagging-error.middleware.ts # Error handling

```

## Integration Steps

### 1. Add to Main Express App

In your main Express app file (e.g., `src/app.ts` or `src/server.ts`), add:

```typescript
import express from 'express';
import taggingRoutes from './routes/tagging';
import { taggingErrorHandler } from './middleware/tagging-error.middleware';

const app = express();

// ... other middleware ...

// Mount tagging routes
app.use('/api', taggingRoutes);

// Add tagging error handler (should be after all routes)
app.use(taggingErrorHandler);
```

### 2. Database Schema Requirements

The tagging system requires the following Prisma schema additions:

```prisma
model Tag {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?
  entityTypes String[]
  parentId    String?
  parent      Tag?     @relation("TagHierarchy", fields: [parentId], references: [id])
  children    Tag[]    @relation("TagHierarchy")
  patterns    Json?
  confidence  Float?
  usageCount  Int      @default(0)
  isActive    Boolean  @default(true)
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String?
  updatedBy   String?
  
  entityTags  EntityTag[]
  
  @@index([code])
  @@index([parentId])
  @@index([entityTypes])
}

model EntityTag {
  id           String   @id @default(uuid())
  entityType   String
  entityId     String
  tagId        String
  tag          Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)
  confidence   Float
  method       String   // 'AI', 'PATTERN', 'MANUAL', 'AUTO'
  appliedAt    DateTime @default(now())
  appliedBy    String?
  isVerified   Boolean  @default(false)
  verifiedBy   String?
  verifiedAt   DateTime?
  metadata     Json?
  
  @@unique([entityType, entityId, tagId])
  @@index([entityType, entityId])
  @@index([tagId])
  @@index([appliedAt])
}

model TagFeedback {
  id             String   @id @default(uuid())
  entityType     String
  entityId       String
  entityTagId    String
  isCorrect      Boolean
  suggestedTagId String?
  reason         String?
  confidence     Float?
  createdAt      DateTime @default(now())
  
  @@index([entityType, entityId])
  @@index([createdAt])
}

model TagLearningEvent {
  id            String   @id @default(uuid())
  entityType    String
  entityId      String
  correctTagId  String
  previousTagId String?
  context       Json?
  createdAt     DateTime @default(now())
  
  @@index([correctTagId])
  @@index([createdAt])
}
```

### 3. Environment Variables

Add these to your `.env` file:

```env
# Redis for rate limiting (optional, falls back to memory)
REDIS_URL=redis://localhost:6379

# AI Provider Keys (if using real AI services)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_claude_key
```

### 4. Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "rate-limiter-flexible": "^2.4.1",
    "ioredis": "^5.3.2"
  }
}
```

## API Endpoints

### Tag Management
- `GET /api/tags` - List tags with filtering
- `POST /api/tags` - Create a new tag
- `GET /api/tags/search` - Search tags
- `GET /api/tags/:id` - Get tag details
- `PUT /api/tags/:id` - Update a tag
- `DELETE /api/tags/:id` - Delete a tag

### Entity Tagging
- `POST /api/entities/:type/:id/tags` - Tag an entity
- `GET /api/entities/:type/:id/tags` - Get entity tags
- `DELETE /api/entities/:type/:id/tags/:tagId` - Remove tag
- `PATCH /api/entities/:type/:id/tags/:tagId` - Update tag

### Batch Operations
- `POST /api/tagging/batch` - Batch tag entities
- `POST /api/tagging/retag` - Re-tag entities
- `POST /api/tagging/feedback` - Submit feedback
- `POST /api/tagging/learn` - Learn from corrections

### Analytics
- `GET /api/tagging/accuracy` - System accuracy metrics
- `GET /api/tags/:id/metrics` - Tag-specific metrics
- `GET /api/relationships/:type/:id` - Discover relationships

## Usage Examples

### Creating a Tag

```bash
curl -X POST http://localhost:3001/api/tags \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "EXPENSE_FOOD",
    "name": "Food & Dining",
    "entityTypes": ["transaction"],
    "patterns": {
      "keywords": ["restaurant", "cafe", "food"],
      "merchants": ["McDonalds", "Starbucks"]
    }
  }'
```

### Tagging an Entity

```bash
curl -X POST http://localhost:3001/api/entities/transaction/trans_123/tags \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "auto",
    "options": {
      "aiProvider": "claude",
      "maxTags": 3
    }
  }'
```

### Batch Tagging

```bash
curl -X POST http://localhost:3001/api/tagging/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entities": [
      {
        "type": "transaction",
        "id": "trans_123",
        "content": "NETFLIX SUBSCRIPTION"
      }
    ],
    "options": {
      "method": "auto",
      "maxTags": 3
    }
  }'
```

## Rate Limits

- Standard endpoints: 100 requests/minute
- AI endpoints: 20 requests/minute
- Batch operations: 5 requests/minute
- Search endpoints: 50 requests/minute

## Error Handling

The system uses consistent error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid tag code format",
    "details": {
      "field": "code",
      "constraint": "Must be uppercase with underscores"
    }
  },
  "timestamp": "2025-01-27T10:00:00Z",
  "path": "/api/tags"
}
```

## Extending the System

### Adding New Entity Types

1. Add to `EntityTypeEnum` in `tag.types.ts`
2. Update `getEntity()` method in `entity-tagging.service.ts`
3. Update `extractEntityContent()` and `extractEntityMetadata()` methods
4. Add corresponding Prisma model if needed

### Adding New AI Providers

1. Implement the AI provider service
2. Update `suggestTags()` in `ai-tagging.service.ts`
3. Add provider configuration

### Custom Pattern Rules

Extend the `patterns` JSON structure in tags to add custom matching logic:

```json
{
  "patterns": {
    "keywords": ["..."],
    "customRules": {
      "yourRule": {
        "type": "complex",
        "conditions": {...}
      }
    }
  }
}
```

## Performance Considerations

1. **Caching**: Pattern matching results are cached for 5 minutes
2. **Batch Processing**: Use batch endpoints for multiple entities
3. **Database Indexes**: Ensure proper indexes on frequently queried fields
4. **Rate Limiting**: Implement Redis-based rate limiting for production

## Security Considerations

1. All endpoints require JWT authentication
2. Rate limiting prevents abuse
3. Input validation using Zod schemas
4. SQL injection prevention via Prisma
5. Proper error handling without exposing internals

## Testing

Run tests with:

```bash
# Unit tests
npm test src/services/tagging

# Integration tests
npm test src/routes/tagging

# E2E tests
npm run test:e2e
```

## Monitoring

Key metrics to monitor:

1. Tag accuracy rates
2. AI provider response times
3. Rate limit violations
4. Error rates by endpoint
5. Tag usage distribution

## Support

For issues or questions:
1. Check API documentation: `/docs/universal-tagging/api-reference.md`
2. Review error logs
3. Check rate limit status in response headers