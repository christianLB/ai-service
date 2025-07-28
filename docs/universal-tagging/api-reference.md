# Universal AI Tagging System - API Reference

## Overview

This document provides a complete reference for the Universal AI Tagging System API endpoints, including request/response formats, authentication requirements, and usage examples.

## Base URL

```
Development: http://localhost:3001/api
Production: https://api.yourdomain.com/api
```

## Authentication

All API endpoints require JWT authentication:

```http
Authorization: Bearer <jwt-token>
```

## Endpoints

### Tag Management

#### List All Tags
```http
GET /tags
```

Query Parameters:
- `entityType` (string, optional): Filter by entity type
- `search` (string, optional): Search tags by name or code
- `parentId` (string, optional): Filter by parent tag
- `page` (number, default: 1): Page number
- `limit` (number, default: 20): Items per page

Response:
```json
{
  "data": [
    {
      "id": "tag_123",
      "code": "EXPENSE_FOOD",
      "name": "Food & Dining",
      "entityTypes": ["transaction"],
      "parentId": "tag_456",
      "confidence": 0.85,
      "usageCount": 1234,
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### Create Tag
```http
POST /tags
```

Request Body:
```json
{
  "code": "EXPENSE_ENTERTAINMENT",
  "name": "Entertainment",
  "description": "Entertainment expenses",
  "entityTypes": ["transaction", "invoice"],
  "parentId": "tag_parent_id",
  "patterns": {
    "keywords": ["netflix", "spotify", "cinema"],
    "merchants": ["Netflix Inc", "Spotify AB"]
  }
}
```

Response:
```json
{
  "id": "tag_789",
  "code": "EXPENSE_ENTERTAINMENT",
  "name": "Entertainment",
  "createdAt": "2025-01-27T10:00:00Z"
}
```

#### Update Tag
```http
PUT /tags/:id
```

Request Body:
```json
{
  "name": "Entertainment & Media",
  "patterns": {
    "keywords": ["netflix", "spotify", "cinema", "hbo"],
    "merchants": ["Netflix Inc", "Spotify AB", "HBO Max"]
  },
  "confidence": 0.9
}
```

#### Delete Tag
```http
DELETE /tags/:id
```

Query Parameters:
- `reassignTo` (string, optional): ID of tag to reassign entities to

### Entity Tagging

#### Tag an Entity
```http
POST /entities/:type/:id/tags
```

Path Parameters:
- `type`: Entity type (transaction, document, client, invoice)
- `id`: Entity ID

Request Body:
```json
{
  "method": "auto",
  "options": {
    "aiProvider": "claude",
    "confidenceThreshold": 0.7,
    "maxTags": 5
  }
}
```

Response:
```json
{
  "entity": {
    "type": "transaction",
    "id": "trans_123"
  },
  "tags": [
    {
      "tagId": "tag_456",
      "code": "EXPENSE_FOOD",
      "name": "Food & Dining",
      "confidence": 0.92,
      "method": "AI"
    }
  ],
  "processingTime": 145,
  "aiProvider": "claude"
}
```

#### Get Entity Tags
```http
GET /entities/:type/:id/tags
```

Response:
```json
{
  "entity": {
    "type": "transaction",
    "id": "trans_123",
    "preview": "AMAZON PRIME SUBSCRIPTION"
  },
  "tags": [
    {
      "id": "entity_tag_123",
      "tagId": "tag_456",
      "code": "EXPENSE_SUBSCRIPTION",
      "name": "Subscriptions",
      "confidence": 0.95,
      "method": "AI",
      "appliedAt": "2025-01-27T10:00:00Z",
      "appliedBy": "SYSTEM",
      "isVerified": true,
      "verifiedBy": "user_123",
      "verifiedAt": "2025-01-27T11:00:00Z"
    }
  ]
}
```

#### Remove Tag from Entity
```http
DELETE /entities/:type/:id/tags/:tagId
```

Response:
```json
{
  "success": true,
  "message": "Tag removed successfully"
}
```

#### Update Tag Confidence
```http
PATCH /entities/:type/:id/tags/:tagId
```

Request Body:
```json
{
  "confidence": 0.98,
  "isVerified": true
}
```

### Batch Operations

#### Batch Tag Entities
```http
POST /tagging/batch
```

Request Body:
```json
{
  "entities": [
    {
      "type": "transaction",
      "id": "trans_123",
      "content": "NETFLIX SUBSCRIPTION",
      "metadata": { "amount": -15.99 }
    },
    {
      "type": "document",
      "id": "doc_456",
      "content": "Contract agreement...",
      "metadata": { "format": "pdf" }
    }
  ],
  "options": {
    "method": "auto",
    "aiProvider": "claude",
    "maxTags": 3
  }
}
```

Response:
```json
{
  "results": [
    {
      "entityId": "trans_123",
      "status": "success",
      "tags": [...],
      "processingTime": 120
    },
    {
      "entityId": "doc_456",
      "status": "success",
      "tags": [...],
      "processingTime": 350
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "totalProcessingTime": 470
  }
}
```

#### Re-tag Entities
```http
POST /tagging/retag
```

Request Body:
```json
{
  "filter": {
    "entityType": "transaction",
    "dateRange": {
      "start": "2025-01-01",
      "end": "2025-01-31"
    },
    "tags": ["UNCATEGORIZED"]
  },
  "options": {
    "method": "ai",
    "batchSize": 100
  }
}
```

### Learning & Feedback

#### Submit Feedback
```http
POST /tagging/feedback
```

Request Body:
```json
{
  "entityType": "transaction",
  "entityId": "trans_123",
  "entityTagId": "entity_tag_456",
  "feedback": {
    "isCorrect": false,
    "suggestedTagId": "tag_789",
    "reason": "This is a business expense, not personal"
  }
}
```

#### Learn from Correction
```http
POST /tagging/learn
```

Request Body:
```json
{
  "entityType": "transaction",
  "entityId": "trans_123",
  "correctTagId": "tag_789",
  "previousTagId": "tag_456"
}
```

### Search & Discovery

#### Search Tags
```http
GET /tags/search
```

Query Parameters:
- `q` (string, required): Search query
- `entityType` (string, optional): Filter by entity type
- `limit` (number, default: 10): Maximum results

Response:
```json
{
  "results": [
    {
      "id": "tag_123",
      "code": "EXPENSE_FOOD",
      "name": "Food & Dining",
      "path": "/expenses/food",
      "score": 0.95
    }
  ]
}
```

#### Find Entities by Tag
```http
GET /entities/by-tag/:tagId
```

Query Parameters:
- `types` (string[], optional): Entity types to include
- `page` (number): Page number
- `limit` (number): Items per page

Response:
```json
{
  "tag": {
    "id": "tag_123",
    "code": "EXPENSE_FOOD",
    "name": "Food & Dining"
  },
  "entities": [
    {
      "type": "transaction",
      "id": "trans_123",
      "preview": "CARREFOUR SUPERMARKET",
      "taggedAt": "2025-01-27T10:00:00Z",
      "confidence": 0.92
    }
  ],
  "pagination": {...}
}
```

#### Discover Relationships
```http
GET /relationships/:type/:id
```

Response:
```json
{
  "entity": {
    "type": "document",
    "id": "doc_123"
  },
  "relationships": [
    {
      "targetType": "client",
      "targetId": "client_456",
      "relationshipType": "CONTRACT_WITH",
      "confidence": 0.87,
      "discoveredBy": "AI",
      "metadata": {
        "contractNumber": "2025-001"
      }
    }
  ]
}
```

### Analytics

#### Tag Metrics
```http
GET /tags/:id/metrics
```

Query Parameters:
- `period` (string): day, week, month, year
- `startDate` (string): ISO date
- `endDate` (string): ISO date

Response:
```json
{
  "tag": {
    "id": "tag_123",
    "code": "EXPENSE_FOOD"
  },
  "metrics": {
    "usageCount": 1234,
    "avgConfidence": 0.89,
    "verificationRate": 0.94,
    "trends": [
      {
        "date": "2025-01-01",
        "count": 45,
        "avgConfidence": 0.88
      }
    ]
  }
}
```

#### System Accuracy
```http
GET /tagging/accuracy
```

Query Parameters:
- `period` (string): Period to analyze
- `entityType` (string, optional): Filter by entity type

Response:
```json
{
  "overall": {
    "accuracy": 0.91,
    "totalTagged": 12345,
    "verified": 11234,
    "corrected": 456
  },
  "byEntityType": {
    "transaction": {
      "accuracy": 0.93,
      "count": 8000
    },
    "document": {
      "accuracy": 0.87,
      "count": 4345
    }
  },
  "byMethod": {
    "AI": { "accuracy": 0.89 },
    "PATTERN": { "accuracy": 0.94 },
    "MANUAL": { "accuracy": 1.0 }
  }
}
```

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid tag code format",
    "details": {
      "field": "code",
      "value": "invalid code",
      "constraint": "Must be uppercase with underscores"
    }
  },
  "timestamp": "2025-01-27T10:00:00Z",
  "path": "/api/tags"
}
```

Common Error Codes:
- `AUTHENTICATION_ERROR`: Invalid or missing token
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `VALIDATION_ERROR`: Invalid request data
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource conflict (e.g., duplicate tag code)
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Standard endpoints**: 100 requests per minute
- **AI endpoints**: 20 requests per minute
- **Batch operations**: 5 requests per minute

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706353200
```

## Webhooks

Configure webhooks to receive real-time notifications:

### Webhook Events
- `tag.created`: New tag created
- `tag.updated`: Tag updated
- `tag.deleted`: Tag deleted
- `entity.tagged`: Entity tagged
- `entity.tag.removed`: Tag removed from entity
- `entity.tag.verified`: Tag verified by user

### Webhook Payload
```json
{
  "event": "entity.tagged",
  "timestamp": "2025-01-27T10:00:00Z",
  "data": {
    "entity": {
      "type": "transaction",
      "id": "trans_123"
    },
    "tags": [
      {
        "tagId": "tag_456",
        "code": "EXPENSE_FOOD",
        "confidence": 0.92
      }
    ]
  }
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { UniversalTaggingClient } from '@ai-service/tagging-sdk';

const client = new UniversalTaggingClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.yourdomain.com'
});

// Tag an entity
const result = await client.tagEntity({
  type: 'transaction',
  id: 'trans_123',
  options: {
    method: 'auto',
    maxTags: 3
  }
});

// Search tags
const tags = await client.searchTags('food', {
  entityType: 'transaction',
  limit: 5
});
```

### Python
```python
from ai_service import UniversalTaggingClient

client = UniversalTaggingClient(
    api_key='your-api-key',
    base_url='https://api.yourdomain.com'
)

# Tag an entity
result = client.tag_entity(
    entity_type='transaction',
    entity_id='trans_123',
    options={
        'method': 'auto',
        'max_tags': 3
    }
)

# Search tags
tags = client.search_tags(
    query='food',
    entity_type='transaction',
    limit=5
)
```

## Best Practices

1. **Batch Operations**: Use batch endpoints for multiple entities
2. **Caching**: Cache tag hierarchies and frequently used tags
3. **Error Handling**: Implement exponential backoff for retries
4. **Webhooks**: Use webhooks instead of polling for real-time updates
5. **Confidence Thresholds**: Set appropriate thresholds based on use case