# Document Intelligence API Reference

## Base URL

```
http://localhost:3001/api/documents
```

## Authentication

All endpoints require JWT authentication:

```http
Authorization: Bearer <jwt-token>
```

## Endpoints

### Document Management

#### Upload Document
```http
POST /upload
```

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Request Body:**
```
file: <binary file data>
metadata: {
  "title": "Optional title",
  "description": "Optional description",
  "tags": ["tag1", "tag2"],
  "category": "invoice"
}
```

**Response:**
```json
{
  "document": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "filename": "invoice.pdf",
    "fileType": "application/pdf",
    "fileSize": 245632,
    "status": "processing",
    "uploadedAt": "2024-01-20T10:30:00Z",
    "metadata": {
      "title": "Invoice #12345",
      "tags": ["invoice", "2024"]
    }
  }
}
```

#### List Documents
```http
GET /
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (pending, processing, completed, failed)
- `category` (optional): Filter by category
- `search` (optional): Search in titles and content
- `startDate` (optional): Filter by upload date
- `endDate` (optional): Filter by upload date

**Response:**
```json
{
  "documents": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "filename": "report.pdf",
      "fileType": "application/pdf",
      "fileSize": 1024000,
      "status": "completed",
      "uploadedAt": "2024-01-20T10:30:00Z",
      "analyzedAt": "2024-01-20T10:35:00Z",
      "metadata": {
        "title": "Annual Report 2024",
        "pageCount": 45,
        "wordCount": 12500
      }
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

#### Get Document Details
```http
GET /:id
```

**Response:**
```json
{
  "document": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "filename": "contract.docx",
    "fileType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "fileSize": 524288,
    "status": "completed",
    "uploadedAt": "2024-01-20T10:30:00Z",
    "analyzedAt": "2024-01-20T10:35:00Z",
    "metadata": {
      "title": "Service Agreement",
      "author": "Legal Department",
      "creationDate": "2024-01-15",
      "pageCount": 12,
      "wordCount": 3500,
      "language": "en"
    },
    "analysis": {
      "summary": {
        "short": "Service agreement between...",
        "detailed": "This document establishes..."
      },
      "entities": {
        "people": ["John Doe", "Jane Smith"],
        "organizations": ["Acme Corp", "Tech Solutions Inc"],
        "dates": ["2024-01-15", "2024-12-31"],
        "money": ["$50,000", "$5,000/month"]
      },
      "topics": ["legal", "services", "agreement", "payment terms"],
      "sentiment": "neutral",
      "documentType": "contract"
    }
  }
}
```

#### Delete Document
```http
DELETE /:id
```

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

### Document Analysis

#### Analyze Document
```http
POST /:id/analyze
```

**Request Body:**
```json
{
  "analysisTypes": ["summary", "entities", "topics", "sentiment"],
  "options": {
    "summaryLength": "detailed",
    "customEntities": ["product names", "project codes"],
    "generateQuestions": true
  }
}
```

**Response:**
```json
{
  "analysis": {
    "id": "analysis-123",
    "documentId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "processing",
    "startedAt": "2024-01-20T10:35:00Z",
    "estimatedCompletion": "2024-01-20T10:37:00Z"
  }
}
```

#### Get Analysis Results
```http
GET /:id/analysis
```

**Query Parameters:**
- `type` (optional): Specific analysis type (summary, entities, topics, sentiment, questions)

**Response:**
```json
{
  "analysis": {
    "summary": {
      "short": "This invoice from Acme Corp...",
      "medium": "Invoice #12345 dated January 15, 2024...",
      "detailed": "Comprehensive analysis of invoice..."
    },
    "entities": {
      "people": [],
      "organizations": ["Acme Corp"],
      "locations": ["New York, NY"],
      "dates": ["2024-01-15", "2024-02-15"],
      "money": ["$5,000.00", "$250.00"],
      "custom": {
        "invoiceNumber": "12345",
        "poNumber": "PO-6789"
      }
    },
    "topics": [
      {
        "topic": "software services",
        "confidence": 0.92
      },
      {
        "topic": "monthly billing",
        "confidence": 0.88
      }
    ],
    "sentiment": {
      "overall": "neutral",
      "score": 0.0,
      "aspects": {
        "pricing": "positive",
        "terms": "neutral"
      }
    },
    "questions": [
      "What is the total amount due?",
      "When is the payment deadline?",
      "What services are included?"
    ],
    "metadata": {
      "modelVersion": "gpt-4-turbo-preview",
      "analysisDate": "2024-01-20T10:36:00Z",
      "processingTime": 45.2
    }
  }
}
```

### Search & Q&A

#### Search Documents
```http
POST /search
```

**Request Body:**
```json
{
  "query": "invoice software services 2024",
  "filters": {
    "fileType": ["pdf", "docx"],
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    },
    "categories": ["invoice", "contract"]
  },
  "options": {
    "searchType": "hybrid",
    "includeContent": true,
    "limit": 20
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "document": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "filename": "invoice_12345.pdf",
        "title": "Software Services Invoice"
      },
      "relevanceScore": 0.95,
      "matchedContent": [
        {
          "text": "...software services for the period...",
          "page": 1,
          "confidence": 0.92
        }
      ],
      "highlights": {
        "title": "Software Services <mark>Invoice</mark>",
        "content": "...providing <mark>software services</mark> for..."
      }
    }
  ],
  "totalResults": 15,
  "searchMetadata": {
    "queryTime": 125,
    "searchType": "hybrid",
    "vectorMatches": 12,
    "textMatches": 8
  }
}
```

#### Ask Question About Document
```http
POST /:id/ask
```

**Request Body:**
```json
{
  "question": "What is the total amount due on this invoice?",
  "options": {
    "includeContext": true,
    "confidenceThreshold": 0.7
  }
}
```

**Response:**
```json
{
  "answer": {
    "text": "The total amount due on this invoice is $5,250.00, which includes $5,000.00 for software services and $250.00 in taxes.",
    "confidence": 0.94,
    "context": [
      {
        "text": "Total: $5,000.00\nTax (5%): $250.00\nTotal Due: $5,250.00",
        "page": 2,
        "relevance": 0.98
      }
    ],
    "metadata": {
      "model": "gpt-4-turbo-preview",
      "processingTime": 2.3,
      "tokensUsed": 145
    }
  }
}
```

#### Ask Multiple Questions
```http
POST /ask-multiple
```

**Request Body:**
```json
{
  "documentIds": ["doc-1", "doc-2", "doc-3"],
  "question": "What are the payment terms?",
  "options": {
    "compareAnswers": true,
    "summarize": true
  }
}
```

### Document Operations

#### Generate Summary
```http
POST /:id/summary
```

**Request Body:**
```json
{
  "length": "executive",
  "format": "bullet_points",
  "focusAreas": ["financial", "obligations", "timeline"]
}
```

**Response:**
```json
{
  "summary": {
    "type": "executive",
    "format": "bullet_points",
    "content": [
      "• Total contract value: $50,000",
      "• Duration: 12 months starting Feb 1, 2024",
      "• Key deliverables: Software development and maintenance",
      "• Payment terms: Monthly installments of $4,166.67"
    ],
    "metadata": {
      "wordCount": 45,
      "generatedAt": "2024-01-20T10:40:00Z"
    }
  }
}
```

#### Extract Entities
```http
POST /:id/entities
```

**Request Body:**
```json
{
  "entityTypes": ["all"],
  "customTypes": ["product_codes", "account_numbers"],
  "options": {
    "includeContext": true,
    "groupByType": true
  }
}
```

#### Compare Documents
```http
POST /compare
```

**Request Body:**
```json
{
  "documentIds": ["doc-1", "doc-2"],
  "comparisonType": "content",
  "aspects": ["terms", "pricing", "dates"]
}
```

**Response:**
```json
{
  "comparison": {
    "similarity": 0.75,
    "differences": [
      {
        "aspect": "pricing",
        "document1": "$50,000 total",
        "document2": "$45,000 total",
        "significance": "high"
      }
    ],
    "commonElements": [
      "12-month duration",
      "Monthly payment schedule"
    ]
  }
}
```

### File Operations

#### Download Original Document
```http
GET /:id/download
```

**Query Parameters:**
- `token` (optional): Temporary download token for shared links

**Response:**
Binary file data with appropriate headers:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="document.pdf"
```

#### Get Document Preview
```http
GET /:id/preview
```

**Query Parameters:**
- `pages` (optional): Number of pages (default: 3)
- `format` (optional): text or html (default: text)

**Response:**
```json
{
  "preview": {
    "content": "First few pages of the document...",
    "totalPages": 45,
    "previewPages": 3,
    "format": "text"
  }
}
```

### Batch Operations

#### Batch Upload
```http
POST /batch/upload
```

**Request Body:**
Multipart form data with multiple files

**Response:**
```json
{
  "batch": {
    "id": "batch-123",
    "totalFiles": 5,
    "status": "processing",
    "documents": [
      {
        "filename": "doc1.pdf",
        "status": "uploaded",
        "id": "doc-1"
      }
    ]
  }
}
```

#### Batch Analysis
```http
POST /batch/analyze
```

**Request Body:**
```json
{
  "documentIds": ["doc-1", "doc-2", "doc-3"],
  "analysisTypes": ["summary", "entities"],
  "options": {
    "priority": "high"
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum allowed size of 50MB",
    "details": {
      "fileSize": 52428800,
      "maxSize": 50000000
    }
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `UNAUTHORIZED` | Invalid or missing token | 401 |
| `DOCUMENT_NOT_FOUND` | Document doesn't exist | 404 |
| `FILE_TOO_LARGE` | File exceeds size limit | 413 |
| `UNSUPPORTED_FILE_TYPE` | File type not supported | 415 |
| `ANALYSIS_FAILED` | Analysis process failed | 500 |
| `QUOTA_EXCEEDED` | API quota exceeded | 429 |
| `INVALID_REQUEST` | Invalid request format | 400 |

## Rate Limits

Default rate limits:
- Upload: 10 files per minute
- Analysis: 20 requests per minute
- Search: 30 requests per minute
- Q&A: 20 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1642684800
```

## Webhooks

Configure webhooks for async notifications:

```json
{
  "url": "https://your-app.com/webhooks/documents",
  "events": ["document.analyzed", "document.failed"],
  "secret": "your-webhook-secret"
}
```

Webhook payload:
```json
{
  "event": "document.analyzed",
  "timestamp": "2024-01-20T10:35:00Z",
  "data": {
    "documentId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "completed"
  }
}
```