# Universal AI Tagging System - API Reference

## Table of Contents
1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Tag Management](#tag-management)
4. [Entity Tagging](#entity-tagging)
5. [Batch Operations](#batch-operations)
6. [AI Operations](#ai-operations)
7. [Analytics & Metrics](#analytics--metrics)
8. [Error Handling](#error-handling)
9. [Response Formats](#response-formats)

## Authentication

All API endpoints require authentication using JWT (JSON Web Token).

### Headers
```http
Authorization: Bearer <your-jwt-token>
```

### Getting a Token
```bash
# Login endpoint (not part of tagging system)
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

## Rate Limiting

The API implements different rate limits for different types of operations:

| Endpoint Type | Limit | Window | Block Duration |
|--------------|-------|--------|----------------|
| Standard | 100 requests | 60 seconds | 60 seconds |
| AI | 20 requests | 60 seconds | 120 seconds |
| Batch | 5 requests | 60 seconds | 300 seconds |
| Search | 50 requests | 60 seconds | 60 seconds |

### Rate Limit Headers
All responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-20T10:30:00.000Z
Retry-After: 60
```

## Tag Management

### List Tags
```http
GET /api/tags?entityType=transaction&search=expense&page=1&limit=20&sortBy=name&sortOrder=asc
```

Query Parameters:
- `entityType` (optional): Filter by entity type (`transaction`, `document`, `client`, `invoice`)
- `search` (optional): Search in tag names and descriptions
- `parentId` (optional): Filter by parent tag ID for hierarchical tags
- `page` (default: 1): Page number
- `limit` (default: 20, max: 100): Items per page
- `sortBy` (default: `name`): Sort field (`name`, `code`, `usageCount`, `createdAt`)
- `sortOrder` (default: `asc`): Sort order (`asc`, `desc`)
- `isActive` (optional): Filter active/inactive tags

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "code": "EXPENSE_TRAVEL",
      "name": "Travel Expenses",
      "description": "All travel-related expenses",
      "entityTypes": ["transaction", "invoice"],
      "patterns": {
        "keywords": ["flight", "hotel", "taxi"],
        "merchants": ["UBER", "LYFT", "AIRBNB"]
      },
      "confidence": 0.85,
      "parentId": "660e8400-e29b-41d4-a716-446655440000",
      "path": "/expenses/travel",
      "level": 2,
      "color": "#FF5733",
      "icon": "airplane",
      "isActive": true,
      "isSystem": false,
      "usageCount": 245,
      "successRate": 0.92,
      "lastUsed": "2024-01-19T15:30:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-19T15:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Create Tag
```http
POST /api/tags
Content-Type: application/json

{
  "code": "EXPENSE_TRAVEL",
  "name": "Travel Expenses",
  "description": "All travel-related expenses",
  "entityTypes": ["transaction", "invoice"],
  "patterns": {
    "keywords": ["flight", "hotel", "taxi"],
    "merchants": ["UBER", "LYFT", "AIRBNB"],
    "categories": ["Transportation", "Accommodation"]
  },
  "parentId": "660e8400-e29b-41d4-a716-446655440000",
  "color": "#FF5733",
  "icon": "airplane",
  "confidence": 0.8
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "EXPENSE_TRAVEL",
    "name": "Travel Expenses",
    "path": "/expenses/travel",
    "level": 2,
    // ... full tag object
  }
}
```

### Get Tag by ID
```http
GET /api/tags/550e8400-e29b-41d4-a716-446655440000
```

### Update Tag
```http
PUT /api/tags/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "name": "Travel & Transportation Expenses",
  "description": "Updated description",
  "patterns": {
    "keywords": ["flight", "hotel", "taxi", "train", "bus"],
    "merchants": ["UBER", "LYFT", "AIRBNB", "BOOKING.COM"]
  },
  "confidence": 0.85
}
```

### Delete Tag
```http
DELETE /api/tags/550e8400-e29b-41d4-a716-446655440000?reassignTo=770e8400-e29b-41d4-a716-446655440000
```

Query Parameters:
- `reassignTo` (optional): UUID of tag to reassign entities to

### Search Tags
```http
GET /api/tags/search?q=expense&entityType=transaction&limit=10
```

### Get Tag Hierarchy
```http
GET /api/tags/hierarchy?parentId=660e8400-e29b-41d4-a716-446655440000
```

### Get Tag Path (Breadcrumb)
```http
GET /api/tags/550e8400-e29b-41d4-a716-446655440000/path
```

Response:
```json
{
  "success": true,
  "data": {
    "tagId": "550e8400-e29b-41d4-a716-446655440000",
    "path": [
      {
        "id": "root",
        "code": "ROOT",
        "name": "All Tags"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "code": "EXPENSES",
        "name": "Expenses"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "code": "EXPENSE_TRAVEL",
        "name": "Travel Expenses"
      }
    ]
  }
}
```

### Bulk Create Tags
```http
POST /api/tags/bulk
Content-Type: application/json

{
  "tags": [
    {
      "code": "TAG1",
      "name": "Tag 1",
      "entityTypes": ["transaction"]
    },
    {
      "code": "TAG2",
      "name": "Tag 2",
      "entityTypes": ["document"]
    }
  ]
}
```

### Bulk Update Tags
```http
PUT /api/tags/bulk
Content-Type: application/json

{
  "updates": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "data": {
        "name": "Updated Tag 1",
        "confidence": 0.9
      }
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "data": {
        "isActive": false
      }
    }
  ]
}
```

## Entity Tagging

### Tag an Entity
```http
POST /api/entities/transaction/12345/tags
Content-Type: application/json

{
  "method": "auto",
  "options": {
    "aiProvider": "claude",
    "confidenceThreshold": 0.7,
    "maxTags": 5,
    "includeRelated": true,
    "forceReTag": false
  }
}
```

Methods:
- `auto`: Uses AI + pattern matching
- `ai`: AI only
- `pattern`: Pattern matching only
- `manual`: Manual tagging

Response:
```json
{
  "success": true,
  "data": {
    "entity": {
      "type": "transaction",
      "id": "12345"
    },
    "tags": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440000",
        "entityType": "transaction",
        "entityId": "12345",
        "tagId": "550e8400-e29b-41d4-a716-446655440000",
        "tagCode": "EXPENSE_TRAVEL",
        "tagName": "Travel Expenses",
        "confidence": 0.92,
        "method": "AI",
        "appliedAt": "2024-01-20T10:00:00.000Z",
        "appliedBy": "user-123",
        "isVerified": false
      }
    ],
    "processingTime": 1250,
    "aiProvider": "claude"
  }
}
```

### Get Entity Tags
```http
GET /api/entities/transaction/12345/tags
```

### Remove Tag from Entity
```http
DELETE /api/entities/transaction/12345/tags/550e8400-e29b-41d4-a716-446655440000
```

### Update Entity Tag
```http
PATCH /api/entities/transaction/12345/tags/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "confidence": 0.95,
  "isVerified": true
}
```

### Find Entities by Tag
```http
GET /api/entities/by-tag/550e8400-e29b-41d4-a716-446655440000?types=transaction,invoice&page=1&limit=20
```

## Batch Operations

### Batch Tag Entities
```http
POST /api/tagging/batch
Content-Type: application/json

{
  "entities": [
    {
      "type": "transaction",
      "id": "12345",
      "content": "Uber ride to airport",
      "metadata": {
        "amount": 45.00,
        "currency": "USD"
      }
    },
    {
      "type": "invoice",
      "id": "67890",
      "content": "Hotel accommodation in Paris"
    }
  ],
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
  "success": true,
  "data": {
    "results": [
      {
        "entityId": "12345",
        "status": "success",
        "tags": [
          {
            "tagId": "550e8400-e29b-41d4-a716-446655440000",
            "tagCode": "EXPENSE_TRAVEL",
            "tagName": "Travel Expenses",
            "confidence": 0.95
          }
        ],
        "processingTime": 850
      },
      {
        "entityId": "67890",
        "status": "success",
        "tags": [
          {
            "tagId": "550e8400-e29b-41d4-a716-446655440000",
            "tagCode": "EXPENSE_TRAVEL",
            "tagName": "Travel Expenses",
            "confidence": 0.88
          }
        ],
        "processingTime": 920
      }
    ],
    "summary": {
      "total": 2,
      "successful": 2,
      "failed": 0,
      "skipped": 0,
      "totalProcessingTime": 1770
    }
  }
}
```

### Re-tag Entities
```http
POST /api/tagging/retag
Content-Type: application/json

{
  "filter": {
    "entityType": "transaction",
    "dateRange": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.999Z"
    },
    "tags": ["OLD_TAG_ID"],
    "hasNoTags": false
  },
  "options": {
    "method": "ai",
    "batchSize": 100,
    "dryRun": true
  }
}
```

## AI Operations

### Get AI Tag Suggestions
```http
POST /api/tagging/suggest
Content-Type: application/json

{
  "content": "Uber ride from JFK to Manhattan hotel",
  "entityType": "transaction",
  "metadata": {
    "amount": 65.00,
    "currency": "USD",
    "merchant": "UBER"
  },
  "options": {
    "provider": "claude",
    "maxTags": 5,
    "confidenceThreshold": 0.7
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "tagId": "550e8400-e29b-41d4-a716-446655440000",
        "tagCode": "EXPENSE_TRAVEL",
        "tagName": "Travel Expenses",
        "confidence": 0.95,
        "reasoning": "Transportation service for travel"
      },
      {
        "tagId": "660e8400-e29b-41d4-a716-446655440000",
        "tagCode": "TRANSPORT_TAXI",
        "tagName": "Taxi & Rideshare",
        "confidence": 0.92,
        "reasoning": "Uber is a rideshare service"
      }
    ],
    "provider": "claude"
  }
}
```

### Auto-Categorize Content
```http
POST /api/tagging/categorize
Content-Type: application/json

{
  "content": "Monthly subscription to cloud storage service",
  "entityType": "transaction",
  "language": "en",
  "context": {
    "recurring": true,
    "vendor": "Dropbox"
  }
}
```

### Batch AI Processing
```http
POST /api/tagging/batch-ai
Content-Type: application/json

{
  "items": [
    {
      "entityType": "transaction",
      "entityId": "12345",
      "content": "Coffee at Starbucks"
    },
    {
      "entityType": "document",
      "entityId": "67890",
      "content": "Meeting notes from client presentation"
    }
  ],
  "options": {
    "provider": "claude",
    "parallel": true
  }
}
```

### Get Multilingual Suggestions
```http
POST /api/tagging/multilingual
Content-Type: application/json

{
  "content": "Restaurant bill from dinner meeting",
  "entityType": "transaction",
  "targetLanguages": ["es", "fr", "de"]
}
```

### Get Contextual Suggestions
```http
POST /api/tagging/contextual
Content-Type: application/json

{
  "content": "Software license renewal",
  "entityType": "transaction",
  "context": {
    "previousTags": ["SOFTWARE", "SUBSCRIPTION"],
    "relatedEntities": ["invoice-789", "client-456"],
    "historicalPatterns": {
      "vendor": "Microsoft",
      "frequency": "annual"
    }
  }
}
```

## Analytics & Metrics

### Get System Accuracy
```http
GET /api/tagging/accuracy?period=month&entityType=transaction
```

Response:
```json
{
  "success": true,
  "data": {
    "overall": {
      "accuracy": 0.89,
      "totalTagged": 5420,
      "verified": 4824
    },
    "byEntityType": {
      "transaction": {
        "accuracy": 0.91,
        "count": 3200,
        "verified": 2912
      },
      "document": {
        "accuracy": 0.86,
        "count": 1500,
        "verified": 1290
      }
    },
    "byMethod": {
      "AI": {
        "accuracy": 0.92,
        "total": 2800,
        "verified": 2576
      },
      "PATTERN": {
        "accuracy": 0.88,
        "total": 1800,
        "verified": 1584
      },
      "MANUAL": {
        "accuracy": 1.0,
        "total": 820,
        "verified": 820
      }
    },
    "period": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.999Z"
    }
  }
}
```

### Get Tag Metrics
```http
GET /api/tags/550e8400-e29b-41d4-a716-446655440000/metrics?period=week
```

Response:
```json
{
  "success": true,
  "data": {
    "tagId": "550e8400-e29b-41d4-a716-446655440000",
    "tagCode": "EXPENSE_TRAVEL",
    "tagName": "Travel Expenses",
    "usageCount": 245,
    "successRate": 0.92,
    "lastUsed": "2024-01-19T15:30:00.000Z",
    "confidence": 0.85,
    "entityCount": 189,
    "accuracyMetrics": {
      "totalTagged": 245,
      "correctlyTagged": 225,
      "accuracy": 0.92
    }
  }
}
```

### Get Tag Analytics
```http
GET /api/tagging/analytics
```

### Discover Entity Relationships
```http
GET /api/relationships/transaction/12345
```

Response:
```json
{
  "success": true,
  "data": {
    "entity": {
      "type": "transaction",
      "id": "12345"
    },
    "relationships": [
      {
        "targetType": "invoice",
        "targetId": "67890",
        "relationshipType": "payment_for",
        "confidence": 0.95,
        "discoveredBy": "pattern_matching",
        "metadata": {
          "matchedOn": ["amount", "date", "reference"]
        }
      }
    ]
  }
}
```

## Feedback & Learning

### Submit Tag Feedback
```http
POST /api/tagging/feedback
Content-Type: application/json

{
  "entityType": "transaction",
  "entityId": "12345",
  "entityTagId": "880e8400-e29b-41d4-a716-446655440000",
  "feedback": {
    "isCorrect": false,
    "suggestedTagId": "990e8400-e29b-41d4-a716-446655440000",
    "reason": "This is a food expense, not travel",
    "confidence": 0.95
  }
}
```

### Learn from Corrections
```http
POST /api/tagging/learn
Content-Type: application/json

{
  "entityType": "transaction",
  "entityId": "12345",
  "correctTagId": "990e8400-e29b-41d4-a716-446655440000",
  "previousTagId": "550e8400-e29b-41d4-a716-446655440000",
  "context": {
    "userCorrection": true,
    "merchant": "STARBUCKS"
  }
}
```

### Improve Tag Patterns
```http
POST /api/tagging/improve-patterns
Content-Type: application/json

{
  "tagId": "550e8400-e29b-41d4-a716-446655440000",
  "successfulExamples": [
    "Uber ride to airport",
    "Flight ticket to Paris",
    "Hotel booking in London"
  ],
  "failedExamples": [
    "Coffee at airport",
    "Restaurant near hotel"
  ]
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "entityType",
      "value": "invalid_type",
      "constraint": "Must be one of: transaction, document, client, invoice"
    }
  },
  "timestamp": "2024-01-20T10:00:00.000Z",
  "path": "/api/tags"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| AUTHENTICATION_ERROR | 401 | Missing or invalid authentication token |
| AUTHORIZATION_ERROR | 403 | Insufficient permissions |
| VALIDATION_ERROR | 400 | Invalid request parameters |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict (e.g., duplicate tag code) |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| AI_PROVIDER_ERROR | 503 | AI service unavailable |
| INSUFFICIENT_CREDITS | 402 | Not enough AI credits |
| INTERNAL_ERROR | 500 | Server error |

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2024-01-20T10:00:00.000Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Webhook Event Format
```json
{
  "event": "entity.tagged",
  "timestamp": "2024-01-20T10:00:00.000Z",
  "data": {
    "entityType": "transaction",
    "entityId": "12345",
    "tags": [
      {
        "tagId": "550e8400-e29b-41d4-a716-446655440000",
        "tagCode": "EXPENSE_TRAVEL",
        "confidence": 0.92
      }
    ]
  }
}
```

## Webhook Events

| Event | Description |
|-------|-------------|
| tag.created | New tag created |
| tag.updated | Tag updated |
| tag.deleted | Tag deleted |
| entity.tagged | Entity tagged |
| entity.tag.removed | Tag removed from entity |
| entity.tag.verified | Entity tag verified |

## Best Practices

1. **Authentication**: Always include the Bearer token in the Authorization header
2. **Rate Limiting**: Implement exponential backoff when rate limited
3. **Batch Operations**: Use batch endpoints for multiple operations
4. **Error Handling**: Check the `success` field and handle errors appropriately
5. **Pagination**: Use pagination for large result sets
6. **Caching**: Cache tag lists and hierarchies that don't change frequently
7. **Webhooks**: Subscribe to webhooks for real-time updates
EOF < /dev/null
