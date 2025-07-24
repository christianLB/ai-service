# Document Intelligence Configuration Guide

## Overview

This guide covers all configuration options for the Document Intelligence module, including environment variables, service settings, and integration configurations.

## Environment Variables

### Core Configuration

```env
# Document Intelligence Enable/Disable
DOCUMENT_INTELLIGENCE_ENABLED=true      # Enable document processing
DOCUMENT_DEBUG=false                    # Debug logging
DOCUMENT_VERBOSE_LOGS=false             # Verbose logging

# Service Configuration
DOCUMENT_SERVICE_PORT=3001              # API port
DOCUMENT_SERVICE_HOST=0.0.0.0          # API host
DOCUMENT_WORKERS=4                      # Worker processes
```

### OpenAI Configuration

```env
# OpenAI API Settings
OPENAI_API_KEY=sk-...                  # Your OpenAI API key
OPENAI_ORGANIZATION=org-...             # Optional org ID

# Model Selection
OPENAI_MODEL=gpt-4-turbo-preview       # Analysis model
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Embedding model
OPENAI_VISION_MODEL=gpt-4-vision-preview      # Vision model (future)

# Model Parameters
OPENAI_TEMPERATURE=0.3                 # Lower = more consistent
OPENAI_MAX_TOKENS=4000                 # Max tokens per request
OPENAI_TOP_P=0.9                       # Nucleus sampling
OPENAI_FREQUENCY_PENALTY=0.0           # Reduce repetition
OPENAI_PRESENCE_PENALTY=0.0            # Increase topic diversity

# Rate Limiting
OPENAI_REQUESTS_PER_MINUTE=50          # API rate limit
OPENAI_REQUEST_DELAY=100               # Delay between requests (ms)
OPENAI_MAX_RETRIES=3                   # Retry attempts
OPENAI_RETRY_DELAY=1000                # Initial retry delay (ms)
```

### Storage Configuration

```env
# File Storage
DOCUMENT_STORAGE_PATH=./storage/documents    # Base storage path
DOCUMENT_TEMP_PATH=./storage/documents/temp  # Temporary files
MAX_FILE_SIZE=52428800                       # 50MB in bytes
MAX_STORAGE_PER_USER=1073741824              # 1GB per user

# Allowed File Types
ALLOWED_FILE_TYPES=pdf,docx,txt,html,md,csv,xlsx
BLOCKED_EXTENSIONS=exe,dll,bat,cmd,scr,com,pif

# Storage Options
ENABLE_COMPRESSION=true                 # Compress stored files
COMPRESSION_LEVEL=6                     # 1-9 (speed vs size)
ENABLE_ENCRYPTION=true                  # Encrypt at rest
ENCRYPTION_ALGORITHM=aes-256-gcm        # Encryption method

# Cleanup Settings
AUTO_CLEANUP_ENABLED=true               # Auto cleanup old files
CLEANUP_AFTER_DAYS=90                   # Days before cleanup
CLEANUP_SCHEDULE="0 2 * * *"            # Cron schedule (2 AM daily)
```

### Database Configuration

```env
# PostgreSQL Settings
DATABASE_URL=postgresql://user:pass@localhost:5432/ai_service_db
DB_SCHEMA=documents                     # Schema for documents
DB_POOL_MIN=2                          # Min connections
DB_POOL_MAX=10                         # Max connections
DB_IDLE_TIMEOUT=30000                  # Idle timeout (ms)
DB_CONNECTION_TIMEOUT=5000             # Connection timeout (ms)

# pgvector Configuration
PGVECTOR_DIMENSIONS=1536               # Embedding dimensions
PGVECTOR_INDEX_TYPE=ivfflat            # Index type (ivfflat, hnsw)
PGVECTOR_LISTS=100                     # Number of lists for ivfflat
PGVECTOR_PROBES=10                     # Number of probes for search

# Query Settings
DB_STATEMENT_TIMEOUT=30000             # Query timeout (ms)
DB_LOG_QUERIES=false                   # Log all queries
DB_SLOW_QUERY_THRESHOLD=1000           # Slow query threshold (ms)
```

### Processing Configuration

```env
# Document Processing
CHUNK_SIZE=1000                        # Tokens per chunk
CHUNK_OVERLAP=200                      # Overlap between chunks
MIN_CHUNK_SIZE=100                     # Minimum chunk size
MAX_CHUNKS_PER_DOC=500                 # Maximum chunks per document

# Chunking Strategy
CHUNKING_METHOD=sliding_window         # sliding_window, semantic, structural
PRESERVE_FORMATTING=true               # Maintain formatting
SMART_CHUNKING=true                    # Use AI for chunking

# Processing Limits
PROCESSING_TIMEOUT=300000              # 5 minutes timeout
MAX_PROCESSING_RETRIES=3               # Retry attempts
CONCURRENT_PROCESSING=5                # Parallel documents
PROCESSING_QUEUE_SIZE=100              # Queue capacity

# OCR Settings
ENABLE_OCR=true                        # OCR for images/scanned PDFs
OCR_LANGUAGE=eng                       # Tesseract language
OCR_DPI=300                           # OCR resolution
OCR_TIMEOUT=60000                      # OCR timeout (ms)
```

### Search Configuration

```env
# Search Settings
SEARCH_METHOD=hybrid                   # hybrid, vector, fulltext
VECTOR_WEIGHT=0.7                      # Weight for vector search
TEXT_WEIGHT=0.3                        # Weight for text search
SIMILARITY_THRESHOLD=0.7               # Minimum similarity score

# Search Limits
SEARCH_RESULTS_LIMIT=20                # Default result limit
MAX_SEARCH_RESULTS=100                 # Maximum results
SEARCH_TIMEOUT=5000                    # Search timeout (ms)

# Search Optimization
ENABLE_SEARCH_CACHE=true               # Cache search results
SEARCH_CACHE_TTL=3600                  # Cache TTL (seconds)
SEARCH_CACHE_SIZE=1000                 # Max cached queries

# Full-Text Search
FTS_LANGUAGE=english                   # PostgreSQL FTS language
FTS_STEMMING=true                      # Enable word stemming
FTS_RANKING_ALGORITHM=ts_rank_cd       # Ranking algorithm
```

### Analysis Configuration

```env
# Analysis Types
ENABLE_SUMMARIZATION=true              # Document summarization
ENABLE_ENTITY_EXTRACTION=true          # Extract entities
ENABLE_TOPIC_ANALYSIS=true             # Identify topics
ENABLE_SENTIMENT_ANALYSIS=true         # Analyze sentiment
ENABLE_QUESTION_GENERATION=true        # Generate questions

# Analysis Parameters
DEFAULT_SUMMARY_LENGTH=medium          # short, medium, detailed
ENTITY_CONFIDENCE_THRESHOLD=0.8        # Min confidence for entities
TOPIC_CONFIDENCE_THRESHOLD=0.7         # Min confidence for topics
MAX_ENTITIES_PER_DOC=100               # Limit entities
MAX_TOPICS_PER_DOC=20                  # Limit topics

# Custom Analysis
CUSTOM_ENTITY_TYPES=invoice_number,po_number,contract_id
CUSTOM_PROMPTS_PATH=./prompts/custom   # Custom prompt templates
```

### Q&A Configuration

```env
# Question Answering
QA_CONTEXT_SIZE=3000                   # Max context tokens
QA_CHUNK_LIMIT=10                      # Max chunks for context
QA_CONFIDENCE_THRESHOLD=0.7            # Min answer confidence
QA_FALLBACK_ENABLED=true               # Fallback to general knowledge

# Q&A Optimization
QA_CACHE_ENABLED=true                  # Cache Q&A results
QA_CACHE_TTL=1800                      # Cache TTL (seconds)
QA_RERANK_RESULTS=true                 # Re-rank context chunks
QA_CROSS_ENCODER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
```

### Security Configuration

```env
# Authentication
JWT_SECRET=your-secret-key-here        # JWT signing secret
JWT_EXPIRES_IN=24h                     # Token expiration
REFRESH_TOKEN_EXPIRES_IN=7d            # Refresh token expiration

# File Security
SCAN_UPLOADS=true                      # Virus scanning
VIRUS_SCANNER=clamav                   # Scanner to use
SANITIZE_FILENAMES=true                # Clean filenames
CHECK_MAGIC_NUMBERS=true               # Verify file types

# Access Control
REQUIRE_AUTH=true                      # Require authentication
DOCUMENT_ISOLATION=true                # User isolation
ENABLE_SHARING=false                   # Document sharing
SHARE_LINK_EXPIRY=7d                   # Share link expiration

# Data Protection
ENABLE_PII_DETECTION=true              # Detect PII
PII_MASKING=true                       # Mask PII in logs
GDPR_COMPLIANCE=true                   # GDPR features
DATA_RETENTION_DAYS=365                # Data retention period
```

### Performance Configuration

```env
# Caching
ENABLE_REDIS_CACHE=true                # Use Redis for caching
REDIS_URL=redis://localhost:6379       # Redis connection
CACHE_PREFIX=docint:                   # Cache key prefix
DEFAULT_CACHE_TTL=3600                 # Default TTL (seconds)

# Connection Pooling
HTTP_POOL_SIZE=50                      # HTTP connection pool
HTTP_TIMEOUT=30000                     # HTTP timeout (ms)
KEEP_ALIVE=true                        # HTTP keep-alive

# Resource Limits
MAX_MEMORY_MB=2048                     # Max memory usage
CPU_THRESHOLD=80                       # CPU threshold (%)
MEMORY_THRESHOLD=85                    # Memory threshold (%)

# Monitoring
ENABLE_METRICS=true                    # Collect metrics
METRICS_PORT=9090                      # Metrics endpoint port
HEALTH_CHECK_INTERVAL=30000            # Health check interval (ms)
```

### Integration Configuration

#### Telegram Bot

```env
# Telegram Bot Settings
TELEGRAM_ENABLED=false                 # Enable Telegram bot
TELEGRAM_BOT_TOKEN=                    # Bot token from BotFather
TELEGRAM_WEBHOOK_URL=                  # Webhook URL (optional)
TELEGRAM_POLLING_INTERVAL=1000         # Polling interval (ms)

# Telegram Limits
TELEGRAM_MAX_FILE_SIZE=20971520        # 20MB limit
TELEGRAM_RATE_LIMIT=30                 # Messages per minute
TELEGRAM_SESSION_TIMEOUT=3600          # Session timeout (seconds)
TELEGRAM_MAX_SESSIONS=1000             # Max concurrent sessions

# Telegram Security
TELEGRAM_ALLOWED_USERS=                # Comma-separated user IDs
TELEGRAM_ADMIN_USERS=                  # Admin user IDs
TELEGRAM_LOG_MESSAGES=false            # Log all messages
```

#### MCP Bridge

```env
# MCP Bridge Integration
MCP_BRIDGE_ENABLED=true                # Enable MCP tools
MCP_BRIDGE_URL=https://mcp.example.com # Bridge URL
MCP_BRIDGE_API_KEY=                    # Bridge API key

# MCP Tool Settings
MCP_RATE_LIMIT=100                     # Requests per minute
MCP_TIMEOUT=30000                      # Request timeout (ms)
MCP_RETRY_ATTEMPTS=3                   # Retry attempts
```

### Notification Configuration

```env
# Email Notifications (Future)
SMTP_HOST=smtp.gmail.com               # SMTP server
SMTP_PORT=587                          # SMTP port
SMTP_SECURE=false                      # Use TLS
SMTP_USER=                             # SMTP username
SMTP_PASS=                             # SMTP password
EMAIL_FROM=noreply@example.com         # From address

# Webhook Notifications
WEBHOOK_ENABLED=false                  # Enable webhooks
WEBHOOK_URL=                           # Webhook endpoint
WEBHOOK_SECRET=                        # Webhook secret
WEBHOOK_RETRY_ATTEMPTS=3               # Retry attempts
WEBHOOK_TIMEOUT=5000                   # Timeout (ms)
```

## Configuration Files

### Analysis Prompts Configuration

Create custom analysis prompts in `config/prompts.json`:

```json
{
  "summarization": {
    "executive": "Provide a concise executive summary focusing on key decisions and outcomes.",
    "technical": "Create a technical summary emphasizing implementation details and specifications.",
    "financial": "Summarize financial aspects including costs, revenues, and projections."
  },
  "entity_extraction": {
    "invoice": {
      "system": "Extract invoice-specific information.",
      "entities": ["invoice_number", "date", "total", "vendor", "items"]
    },
    "contract": {
      "system": "Extract contract details and obligations.",
      "entities": ["parties", "effective_date", "termination_date", "obligations"]
    }
  },
  "custom_entities": {
    "invoice_number": {
      "pattern": "INV-\\d{4,}",
      "context": ["invoice", "bill", "number"]
    },
    "po_number": {
      "pattern": "PO-\\d{4,}",
      "context": ["purchase", "order", "po"]
    }
  }
}
```

### Document Types Configuration

Define document type handling in `config/document-types.json`:

```json
{
  "types": {
    "invoice": {
      "identifiers": ["invoice", "bill", "statement"],
      "defaultAnalysis": ["summary", "entities", "amounts"],
      "customEntities": ["invoice_number", "line_items", "tax"],
      "summaryLength": "short"
    },
    "contract": {
      "identifiers": ["agreement", "contract", "terms"],
      "defaultAnalysis": ["summary", "entities", "obligations", "risks"],
      "customEntities": ["parties", "clauses", "dates"],
      "summaryLength": "detailed"
    },
    "report": {
      "identifiers": ["report", "analysis", "study"],
      "defaultAnalysis": ["summary", "topics", "findings"],
      "summaryLength": "medium"
    }
  }
}
```

### Search Configuration

Advanced search settings in `config/search.json`:

```json
{
  "synonyms": {
    "invoice": ["bill", "statement", "receipt"],
    "contract": ["agreement", "deal", "terms"],
    "payment": ["remittance", "transaction", "transfer"]
  },
  "stopWords": {
    "custom": ["the", "and", "or", "but", "in", "on", "at"],
    "useDefault": true
  },
  "boost": {
    "title": 2.0,
    "metadata": 1.5,
    "content": 1.0
  },
  "facets": {
    "fileType": {
      "enabled": true,
      "limit": 10
    },
    "dateRange": {
      "enabled": true,
      "ranges": ["today", "week", "month", "year"]
    },
    "category": {
      "enabled": true,
      "limit": 20
    }
  }
}
```

## Deployment Configuration

### Production Settings

```env
# Production Optimizations
NODE_ENV=production
CLUSTER_ENABLED=true                   # Enable clustering
WORKER_COUNT=4                         # Number of workers
WORKER_MEMORY=512                      # Memory per worker (MB)

# Production Security
FORCE_HTTPS=true                       # Force HTTPS
HSTS_ENABLED=true                      # HTTP Strict Transport Security
HSTS_MAX_AGE=31536000                  # HSTS max age (seconds)
CSP_ENABLED=true                       # Content Security Policy

# Production Monitoring
APM_ENABLED=true                       # Application monitoring
APM_SERVICE_NAME=document-intelligence # Service name
APM_SERVER_URL=http://apm.example.com # APM server
ERROR_TRACKING=true                    # Error tracking
SENTRY_DSN=                           # Sentry DSN
```

### Docker Configuration

Docker environment variables:

```yaml
services:
  document-intelligence:
    environment:
      - NODE_ENV=production
      - DOCUMENT_INTELLIGENCE_ENABLED=true
      - DOCUMENT_STORAGE_PATH=/app/storage/documents
      - DATABASE_URL=postgresql://postgres:password@db:5432/docint
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - document-storage:/app/storage/documents
      - ./config:/app/config
```

### Kubernetes Configuration

ConfigMap for Kubernetes:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: document-intelligence-config
data:
  NODE_ENV: "production"
  DOCUMENT_INTELLIGENCE_ENABLED: "true"
  CHUNK_SIZE: "1000"
  MAX_FILE_SIZE: "52428800"
  SEARCH_METHOD: "hybrid"
  ENABLE_METRICS: "true"
```

## Configuration Best Practices

### 1. Environment-Specific Files

```
config/
├── .env.development    # Development settings
├── .env.staging        # Staging settings
├── .env.production     # Production settings
└── .env.local          # Local overrides (gitignored)
```

### 2. Secret Management

```bash
# Use secret management tools
# Example with Vault
vault kv put secret/document-intelligence \
  openai_api_key="sk-..." \
  jwt_secret="..." \
  encryption_key="..."
```

### 3. Configuration Validation

```typescript
// config-validator.ts
import { z } from 'zod';

const configSchema = z.object({
  openaiApiKey: z.string().startsWith('sk-'),
  maxFileSize: z.number().positive().max(104857600),
  chunkSize: z.number().positive().max(2000),
  // ... other validations
});

export function validateConfig(config: any) {
  return configSchema.parse(config);
}
```

### 4. Dynamic Configuration

```typescript
// Support runtime configuration updates
class ConfigManager {
  private config: Config;
  private watchers: ConfigWatcher[] = [];
  
  async updateConfig(updates: Partial<Config>) {
    this.config = { ...this.config, ...updates };
    await this.notifyWatchers();
  }
  
  watch(key: string, callback: (value: any) => void) {
    this.watchers.push({ key, callback });
  }
}
```

### 5. Performance Tuning

```env
# Development
CONCURRENT_PROCESSING=10
CHUNK_SIZE=1000
CACHE_TTL=300

# Production
CONCURRENT_PROCESSING=5
CHUNK_SIZE=750
CACHE_TTL=3600
```

## Monitoring Configuration

### Metrics Collection

```env
# Prometheus Metrics
METRICS_ENABLED=true
METRICS_PORT=9090
METRICS_PATH=/metrics
METRICS_PREFIX=docint_

# Custom Metrics
TRACK_PROCESSING_TIME=true
TRACK_API_USAGE=true
TRACK_STORAGE_USAGE=true
TRACK_SEARCH_PERFORMANCE=true
```

### Logging Configuration

```env
# Logging
LOG_LEVEL=info                        # debug, info, warn, error
LOG_FORMAT=json                       # json, pretty
LOG_DESTINATION=file                  # console, file, both
LOG_FILE_PATH=./logs/document-intelligence.log
LOG_MAX_SIZE=100M                     # Max log file size
LOG_MAX_FILES=10                      # Number of log files to keep
LOG_COMPRESS=true                     # Compress old logs
```

## Troubleshooting Configuration

### Debug Settings

```env
# Debug Mode
DEBUG=document-intelligence:*
DEBUG_SAVE_CHUNKS=true                # Save chunks for inspection
DEBUG_SAVE_EMBEDDINGS=true            # Save embeddings
DEBUG_LOG_PROMPTS=true                # Log AI prompts
DEBUG_LOG_RESPONSES=true              # Log AI responses
```

### Test Configuration

```env
# Test Settings
TEST_MODE=true
TEST_OPENAI_MOCK=true                 # Mock OpenAI calls
TEST_STORAGE_PATH=./test/storage
TEST_DATABASE_URL=postgresql://localhost/docint_test
```