# Document Intelligence Setup Guide

## Prerequisites

### System Requirements
- Node.js 20.x or higher
- PostgreSQL 15.x with pgvector extension
- OpenAI API access
- Minimum 4GB RAM
- 10GB+ free disk space for document storage

### Optional Requirements
- Telegram Bot Token (for Telegram integration)
- Redis (for caching)
- LibreOffice (for advanced document conversion)

## Installation Steps

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-service.git
cd ai-service

# Install dependencies
npm install

# Install optional document processing tools
sudo apt-get install -y \
  poppler-utils \      # PDF processing
  libreoffice \        # Document conversion
  tesseract-ocr        # OCR capabilities
```

### 2. Database Setup

#### Enable pgvector Extension

```bash
# Install pgvector
sudo apt-get install postgresql-15-pgvector

# Connect to PostgreSQL
psql -U postgres -d ai_service_db

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Create documents schema
CREATE SCHEMA IF NOT EXISTS documents;
```

#### Run Migrations

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Verify document tables
psql -U postgres -d ai_service_db -c "\dt documents.*"
```

### 3. Environment Configuration

Create `.env.local` file:

```bash
# Copy example environment
cp .env.example .env.local
```

Add document-specific variables:

```env
# Document Intelligence Configuration
DOCUMENT_INTELLIGENCE_ENABLED=true

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# File Storage
DOCUMENT_STORAGE_PATH=./storage/documents
MAX_FILE_SIZE=52428800  # 50MB in bytes
ALLOWED_FILE_TYPES=pdf,docx,txt,html,md,csv,xlsx

# Processing Configuration
CHUNK_SIZE=1000         # Tokens per chunk
CHUNK_OVERLAP=200       # Overlap between chunks
MAX_CHUNKS_PER_DOC=100  # Maximum chunks

# Search Configuration
SEARCH_RESULTS_LIMIT=10
SIMILARITY_THRESHOLD=0.7

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_ENABLED=false

# Performance
ENABLE_DOCUMENT_CACHE=true
CACHE_TTL=3600         # 1 hour
CONCURRENT_ANALYSES=3   # Parallel document analyses
```

### 4. Create Storage Directories

```bash
# Create document storage structure
mkdir -p storage/documents/{uploads,processed,temp}
mkdir -p logs/documents

# Set permissions
chmod -R 755 storage/documents
```

### 5. Initialize Document Module

```bash
# Run initialization script
npm run documents:init

# This will:
# - Create necessary database tables
# - Set up default configurations
# - Initialize vector indices
# - Create sample analysis templates
```

### 6. Verify Installation

```bash
# Check module health
curl http://localhost:3001/api/documents/health

# Expected response:
{
  "status": "healthy",
  "components": {
    "database": "connected",
    "storage": "available",
    "openai": "connected",
    "vectorSearch": "ready"
  },
  "storage": {
    "used": "125MB",
    "available": "9.8GB"
  }
}
```

## Docker Setup

### Using Docker Compose

```yaml
# docker-compose.yml additions
services:
  # Add pgvector to postgres
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      - POSTGRES_DB=ai_service_db
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d

  # Document processor (optional)
  document-processor:
    image: document-processor:latest
    volumes:
      - ./storage/documents:/documents
    environment:
      - PROCESSING_MODE=local
```

### Docker Environment

Create `.env.docker`:

```env
# Document Intelligence
DOCUMENT_STORAGE_PATH=/app/storage/documents
OPENAI_API_KEY=sk-your-key
DOCUMENT_INTELLIGENCE_ENABLED=true
```

## Initial Configuration

### 1. Analysis Templates

Configure default analysis templates:

```javascript
// Default templates (can be customized)
{
  "invoice": {
    "extractFields": ["invoiceNumber", "date", "total", "vendor", "items"],
    "summaryLength": "short",
    "generateQuestions": true
  },
  "contract": {
    "extractFields": ["parties", "dates", "obligations", "terms"],
    "summaryLength": "detailed",
    "identifyRisks": true
  },
  "report": {
    "extractFields": ["keyFindings", "recommendations", "data"],
    "summaryLength": "executive",
    "generateQuestions": true
  }
}
```

### 2. File Type Configuration

```javascript
// Supported file types and their processors
{
  "pdf": {
    "processor": "pdfParser",
    "maxSize": "50MB",
    "ocrEnabled": true
  },
  "docx": {
    "processor": "docxParser",
    "maxSize": "25MB",
    "preserveFormatting": false
  },
  "txt": {
    "processor": "textParser",
    "maxSize": "10MB",
    "encoding": "utf-8"
  },
  "csv": {
    "processor": "csvParser",
    "maxSize": "100MB",
    "detectHeaders": true
  }
}
```

### 3. Search Configuration

```javascript
// Search settings
{
  "vectorSearch": {
    "enabled": true,
    "minSimilarity": 0.7,
    "maxResults": 20
  },
  "fullTextSearch": {
    "enabled": true,
    "language": "english",
    "stemming": true
  },
  "hybrid": {
    "vectorWeight": 0.7,
    "textWeight": 0.3
  }
}
```

## Telegram Bot Setup (Optional)

### 1. Create Telegram Bot

```bash
# Talk to @BotFather on Telegram
# Use /newbot command
# Save the token provided
```

### 2. Configure Bot

```env
# In .env.local
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_ENABLED=true
TELEGRAM_ALLOWED_USERS=user1,user2  # Optional whitelist
```

### 3. Start Bot

```bash
# Bot will start automatically with the service
npm run dev

# Or run bot separately
npm run telegram:bot
```

### 4. Bot Commands

```
/start - Initialize bot
/upload - Upload a document
/search [query] - Search documents
/ask [question] - Ask about last document
/list - List your documents
/help - Show help message
```

## Troubleshooting Setup Issues

### Common Problems

1. **pgvector not found**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-15-pgvector
   
   # macOS
   brew install pgvector
   ```

2. **OpenAI connection failed**
   - Verify API key is correct
   - Check API quota and billing
   - Test with curl:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

3. **File upload errors**
   - Check storage permissions
   - Verify directory exists
   - Check disk space

4. **Memory issues with large documents**
   ```env
   # Increase Node.js memory
   NODE_OPTIONS="--max-old-space-size=4096"
   ```

## Performance Tuning

### For Large Documents

```env
# Optimize for large files
CHUNK_SIZE=500          # Smaller chunks
MAX_CHUNKS_PER_DOC=200  # More chunks allowed
PROCESSING_TIMEOUT=300000  # 5 minutes

# Enable streaming
ENABLE_STREAMING=true
STREAM_BUFFER_SIZE=65536
```

### For Many Documents

```env
# Optimize for volume
CONCURRENT_UPLOADS=5
CONCURRENT_ANALYSES=1   # Reduce for stability
ENABLE_QUEUE=true
QUEUE_WORKERS=3
```

## Security Configuration

### File Upload Security

```env
# Security settings
SCAN_UPLOADS=true       # Virus scanning
MAX_FILE_SIZE=10485760  # 10MB limit
ALLOWED_FILE_TYPES=pdf,docx,txt
BLOCK_EXECUTABLES=true
SANITIZE_FILENAMES=true
```

### Access Control

```env
# Document access
REQUIRE_AUTH=true
DOCUMENT_ISOLATION=true  # Users see only their docs
ENABLE_SHARING=false     # Disable sharing initially
SESSION_TIMEOUT=3600     # 1 hour
```

## Next Steps

1. **Test Upload**: Try uploading a sample document
2. **Run Analysis**: Test document analysis features
3. **Search Test**: Verify search functionality
4. **Configure Templates**: Customize analysis templates
5. **Set Up Monitoring**: Configure logging and alerts

## Maintenance

### Regular Tasks

```bash
# Clean temporary files (daily)
npm run documents:clean-temp

# Optimize vector indices (weekly)
npm run documents:optimize-indices

# Backup document metadata (daily)
npm run documents:backup-metadata

# Archive old documents (monthly)
npm run documents:archive --days=90
```

### Health Monitoring

```bash
# Check system health
npm run documents:health

# View processing stats
npm run documents:stats

# Check storage usage
npm run documents:storage-report
```