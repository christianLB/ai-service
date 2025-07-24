# Document Intelligence Architecture

## System Overview

The Document Intelligence module is designed as a modular, scalable system for intelligent document processing. It leverages AI capabilities to transform unstructured documents into structured, searchable knowledge.

## Core Components

### 1. Document Ingestion Service
**Location**: `src/services/document-intelligence/document-ingestion.service.ts`

Responsible for:
- File upload handling
- Format detection
- Content extraction
- Metadata generation
- Initial processing

**Key Methods**:
```typescript
- ingestDocument(file, userId): Process new document
- extractContent(file): Extract text from various formats
- generateMetadata(content): Create document metadata
- validateDocument(file): Ensure file is processable
```

### 2. OpenAI Analysis Service
**Location**: `src/services/document-intelligence/openai-analysis.service.ts`

Handles all AI-powered analysis:
- Document summarization
- Entity extraction
- Topic analysis
- Question generation
- Embeddings creation

**Analysis Pipeline**:
```
Document → Content Extraction → Chunking → AI Analysis → Storage
                                    ↓
                            Embeddings → Vector DB
```

### 3. Storage Service
**Location**: `src/services/document-intelligence/storage.service.ts`

Manages document persistence:
- File storage (local/cloud)
- Metadata database
- Analysis results
- Vector embeddings

### 4. Search Service
**Location**: `src/services/document-intelligence/search.service.ts`

Provides intelligent search:
- Semantic search using embeddings
- Full-text search fallback
- Relevance ranking
- Result aggregation

## Data Architecture

### Database Schema (PostgreSQL)

**Schema**: `documents`

```sql
-- Main documents table
CREATE TABLE documents.documents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  file_path TEXT,
  content_hash VARCHAR(64),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document metadata
CREATE TABLE documents.document_metadata (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents.documents(id),
  title TEXT,
  author TEXT,
  creation_date DATE,
  language VARCHAR(10),
  page_count INTEGER,
  word_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analysis results
CREATE TABLE documents.analysis_results (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents.documents(id),
  analysis_type VARCHAR(50),
  results JSONB,
  confidence_score FLOAT,
  model_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Embeddings storage
CREATE TABLE documents.embeddings (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents.documents(id),
  chunk_index INTEGER,
  chunk_text TEXT,
  embedding vector(1536),  -- Using pgvector
  created_at TIMESTAMP DEFAULT NOW()
);

-- Q&A interactions
CREATE TABLE documents.qa_interactions (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents.documents(id),
  user_id UUID REFERENCES users(id),
  question TEXT,
  answer TEXT,
  context TEXT,
  confidence_score FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### File Storage Structure

```
/storage
  /documents
    /{year}/{month}/{day}
      /{document-id}
        /original           # Original uploaded file
        /processed          # Processed/cleaned version
        /chunks             # Document chunks for analysis
        /exports            # Generated exports
```

## Processing Pipeline

### 1. Document Ingestion Flow

```mermaid
graph LR
    A[Upload] --> B[Validation]
    B --> C[Format Detection]
    C --> D[Content Extraction]
    D --> E[Preprocessing]
    E --> F[Storage]
    F --> G[Analysis Queue]
```

### 2. Analysis Pipeline

```typescript
interface AnalysisPipeline {
  stages: [
    'contentExtraction',      // Extract raw text
    'preprocessing',          // Clean and normalize
    'chunking',              // Split into chunks
    'embedding',             // Generate embeddings
    'analysis',              // Run AI analysis
    'storage',               // Store results
    'indexing'               // Update search index
  ];
}
```

### 3. Search Pipeline

```typescript
interface SearchPipeline {
  stages: [
    'queryProcessing',       // Parse and enhance query
    'embeddingGeneration',   // Create query embedding
    'vectorSearch',          // Find similar documents
    'reranking',            // Re-rank by relevance
    'resultEnrichment',     // Add metadata
    'formatting'            // Format for response
  ];
}
```

## AI Integration

### OpenAI Configuration

```typescript
interface OpenAIConfig {
  // Model settings
  model: 'gpt-4-turbo-preview';
  maxTokens: 4000;
  temperature: 0.3;  // Lower for consistency
  
  // Analysis prompts
  prompts: {
    summarization: string;
    entityExtraction: string;
    topicAnalysis: string;
    questionGeneration: string;
  };
  
  // Embedding settings
  embeddingModel: 'text-embedding-3-small';
  embeddingDimensions: 1536;
}
```

### Analysis Types

1. **Summarization**
   - Executive summary (1-2 paragraphs)
   - Detailed summary (1 page)
   - Chapter summaries

2. **Entity Extraction**
   - People and organizations
   - Locations and dates
   - Money and quantities
   - Custom entities

3. **Topic Analysis**
   - Main themes
   - Keyword extraction
   - Category classification
   - Sentiment analysis

4. **Q&A Preparation**
   - Relevant chunks identification
   - Context window management
   - Answer generation

## API Architecture

### REST Endpoints

**Base Path**: `/api/documents`

**Core Endpoints**:
- `POST /upload` - Upload new document
- `GET /` - List documents
- `GET /:id` - Get document details
- `POST /:id/analyze` - Trigger analysis
- `GET /:id/analysis` - Get analysis results
- `POST /search` - Search documents
- `POST /:id/ask` - Ask question about document
- `GET /:id/download` - Download document

### MCP Bridge Integration

```yaml
Document Tools:
  - search_documents
  - analyze_document
  - ask_document_question
  - get_document_details
  - extract_document_entities
  - generate_document_summary
  - compare_documents
```

## Performance Optimization

### Caching Strategy

```typescript
interface CacheConfig {
  // Analysis cache
  analysisCache: {
    ttl: 86400;           // 24 hours
    maxSize: 1000;        // entries
  };
  
  // Embedding cache
  embeddingCache: {
    ttl: 604800;          // 7 days
    maxSize: 10000;       // vectors
  };
  
  // Search cache
  searchCache: {
    ttl: 3600;            // 1 hour
    maxSize: 100;         // queries
  };
}
```

### Chunking Strategy

```typescript
interface ChunkingConfig {
  maxChunkSize: 1000;     // tokens
  chunkOverlap: 200;      // tokens
  minChunkSize: 100;      // tokens
  
  strategies: {
    'pdf': 'paragraph',
    'docx': 'section',
    'txt': 'sliding-window',
    'html': 'semantic'
  };
}
```

## Security Architecture

### Access Control

```typescript
interface DocumentAccess {
  // Ownership
  owner: string;          // User ID
  
  // Permissions
  permissions: {
    read: string[];       // User IDs
    write: string[];      // User IDs
    delete: string[];     // User IDs
    share: string[];      // User IDs
  };
  
  // Sharing
  publicAccess: boolean;
  shareableLink?: string;
  linkExpiry?: Date;
}
```

### Data Protection

- Encryption at rest for sensitive documents
- Secure file storage with access controls
- Audit logging for all operations
- PII detection and masking
- Secure deletion procedures

## Scalability Considerations

### Current Architecture
- Single Node.js process
- Local file storage
- Shared database connections
- In-memory caching

### Future Enhancements
- Distributed processing with job queues
- Cloud storage integration (S3/GCS)
- Dedicated vector database
- Microservice separation
- Horizontal scaling support

## Integration Points

### Telegram Bot
- Document upload via chat
- Analysis results delivery
- Interactive Q&A sessions
- Search functionality

### Future Integrations
- Email gateway
- Slack integration
- Microsoft Teams
- WhatsApp Business
- REST API webhooks

## Monitoring & Observability

### Key Metrics
- Document processing time
- Analysis accuracy scores
- Search relevance metrics
- API response times
- Storage utilization
- Error rates by operation

### Logging Strategy
```typescript
interface LoggingConfig {
  documentIngestion: 'info';
  analysisOperations: 'debug';
  searchQueries: 'info';
  errors: 'error';
  performance: 'warn';
}
```

## Error Handling

### Error Categories
1. **Upload Errors**: Size limits, format issues
2. **Processing Errors**: Extraction failures
3. **Analysis Errors**: AI service issues
4. **Storage Errors**: Disk space, permissions
5. **Search Errors**: Index corruption, timeout

### Recovery Strategies
- Automatic retry with backoff
- Alternative processing paths
- Graceful degradation
- User notification
- Manual intervention options