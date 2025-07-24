# Document Intelligence Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common issues with the Document Intelligence module. Always check logs and system status before attempting fixes.

## Quick Diagnostics

### System Health Check

```bash
# Check document service health
curl http://localhost:3001/api/documents/health

# Check specific components
npm run documents:health

# View recent logs
npm run documents:logs

# Check storage status
npm run documents:storage-report
```

### Debug Mode

Enable detailed logging:

```env
# In .env.local
LOG_LEVEL=debug
DOCUMENT_DEBUG=true
DOCUMENT_VERBOSE_LOGS=true
```

## Common Issues

### 1. Upload Problems

#### Symptom: "File upload failed" error

**Possible Causes**:
- File too large
- Unsupported file type
- Storage permissions
- Disk space

**Solutions**:

1. **Check file size**:
   ```bash
   # Check configured limit
   grep MAX_FILE_SIZE .env.local
   
   # Default is 50MB (52428800 bytes)
   ```

2. **Verify file type**:
   ```bash
   # Check allowed types
   grep ALLOWED_FILE_TYPES .env.local
   
   # Should include: pdf,docx,txt,html,md,csv,xlsx
   ```

3. **Check storage permissions**:
   ```bash
   # Verify storage directory exists and is writable
   ls -la storage/documents/
   
   # Fix permissions if needed
   chmod -R 755 storage/documents/
   ```

4. **Check disk space**:
   ```bash
   df -h | grep -E "/$|storage"
   ```

#### Symptom: "Virus detected" or file rejected

**Solutions**:
```bash
# Check if virus scanning is enabled
grep SCAN_UPLOADS .env.local

# Temporarily disable for testing (NOT for production)
SCAN_UPLOADS=false

# Check virus scanner logs
tail -f logs/virus-scanner.log
```

### 2. Processing Errors

#### Symptom: Document stuck in "processing" status

**Diagnostics**:
```bash
# Check processing queue
npm run documents:queue-status

# View processing logs
docker logs ai-service-api 2>&1 | grep "document-processing"

# Check for errors
grep ERROR logs/documents/processing.log
```

**Solutions**:

1. **Restart processing**:
   ```bash
   # Retry failed documents
   npm run documents:retry-failed
   
   # Clear stuck jobs
   npm run documents:clear-stuck-jobs
   ```

2. **Check OpenAI connection**:
   ```bash
   # Test OpenAI API
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

3. **Memory issues**:
   ```env
   # Increase Node.js memory
   NODE_OPTIONS="--max-old-space-size=4096"
   ```

#### Symptom: "Content extraction failed"

**Common Issues**:

1. **Corrupted PDF**:
   ```bash
   # Test PDF validity
   pdfinfo problematic.pdf
   
   # Try alternative parser
   FALLBACK_PDF_PARSER=true
   ```

2. **Password-protected files**:
   ```typescript
   // Currently not supported
   // Workaround: Remove password before upload
   ```

3. **Complex layouts**:
   ```env
   # Enable OCR for better extraction
   ENABLE_OCR=true
   OCR_LANGUAGE=eng
   ```

### 3. Analysis Issues

#### Symptom: "Analysis failed" or timeout errors

**Diagnostics**:
```bash
# Check OpenAI usage
curl http://localhost:3001/api/documents/ai-usage

# Monitor API calls
tail -f logs/openai-requests.log
```

**Solutions**:

1. **API Rate Limits**:
   ```env
   # Reduce concurrent analyses
   CONCURRENT_ANALYSES=1
   
   # Add delay between requests
   OPENAI_REQUEST_DELAY=1000
   ```

2. **Token Limits**:
   ```env
   # Reduce chunk size
   CHUNK_SIZE=500
   MAX_CHUNKS_PER_DOC=50
   ```

3. **Timeout Issues**:
   ```env
   # Increase timeout
   ANALYSIS_TIMEOUT=300000  # 5 minutes
   ```

#### Symptom: Poor analysis quality

**Solutions**:

1. **Adjust temperature**:
   ```env
   # Lower for more consistent results
   OPENAI_TEMPERATURE=0.3
   ```

2. **Improve prompts**:
   ```typescript
   // Check and update analysis prompts
   // Location: src/services/document-intelligence/prompts/
   ```

3. **Use better model**:
   ```env
   OPENAI_MODEL=gpt-4-turbo-preview
   ```

### 4. Search Problems

#### Symptom: Search returns no or poor results

**Diagnostics**:
```bash
# Check if embeddings exist
psql -U postgres -d ai_service_db -c \
  "SELECT COUNT(*) FROM documents.embeddings;"

# Test vector search
npm run documents:test-search "sample query"
```

**Solutions**:

1. **Regenerate embeddings**:
   ```bash
   # For all documents
   npm run documents:regenerate-embeddings
   
   # For specific document
   npm run documents:regenerate-embeddings --doc-id=123
   ```

2. **Check pgvector**:
   ```sql
   -- Verify extension
   SELECT * FROM pg_extension WHERE extname = 'vector';
   
   -- Check index
   \di documents.embeddings*
   ```

3. **Adjust similarity threshold**:
   ```env
   SIMILARITY_THRESHOLD=0.5  # Lower = more results
   ```

#### Symptom: Slow search performance

**Solutions**:

1. **Optimize indices**:
   ```bash
   npm run documents:optimize-indices
   ```

2. **Enable caching**:
   ```env
   ENABLE_SEARCH_CACHE=true
   CACHE_TTL=3600
   ```

3. **Reduce result size**:
   ```env
   SEARCH_RESULTS_LIMIT=10
   ```

### 5. Q&A Issues

#### Symptom: "Cannot answer question" or wrong answers

**Diagnostics**:
```bash
# Check context retrieval
npm run documents:test-qa --doc-id=123 --question="test question"

# View Q&A logs
grep "qa-interaction" logs/documents/qa.log
```

**Solutions**:

1. **Improve context retrieval**:
   ```env
   # Increase context size
   QA_CONTEXT_SIZE=3000
   
   # Get more chunks
   QA_CHUNK_LIMIT=10
   ```

2. **Better prompts**:
   ```typescript
   // Update Q&A system prompt
   // Location: src/services/document-intelligence/qa-prompts.ts
   ```

3. **Validate document content**:
   ```bash
   # Check if document has content
   npm run documents:validate --doc-id=123
   ```

### 6. Storage Issues

#### Symptom: "Storage full" or cannot save files

**Solutions**:

1. **Clean temporary files**:
   ```bash
   # Remove old temp files
   npm run documents:clean-temp
   
   # Remove orphaned files
   npm run documents:clean-orphaned
   ```

2. **Archive old documents**:
   ```bash
   # Archive documents older than 90 days
   npm run documents:archive --days=90
   ```

3. **Check storage usage**:
   ```bash
   # Detailed storage report
   npm run documents:storage-report --detailed
   ```

### 7. Database Issues

#### Symptom: "Database connection error"

**Solutions**:

1. **Check PostgreSQL**:
   ```bash
   # Test connection
   psql -U postgres -d ai_service_db -c "SELECT 1;"
   
   # Check if documents schema exists
   psql -U postgres -d ai_service_db -c "\dn documents"
   ```

2. **pgvector issues**:
   ```bash
   # Reinstall pgvector
   sudo apt-get install postgresql-15-pgvector
   
   # Re-enable extension
   psql -U postgres -d ai_service_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
   ```

### 8. Telegram Bot Issues

#### Symptom: Bot not responding

**Solutions**:

1. **Check bot token**:
   ```bash
   # Verify token
   curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe
   ```

2. **Check webhook (if used)**:
   ```bash
   # Get webhook info
   curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo
   
   # Delete webhook for polling mode
   curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook
   ```

3. **Rate limiting**:
   ```env
   # Adjust rate limits
   TELEGRAM_RATE_LIMIT=30  # messages per minute
   ```

## Performance Issues

### Slow Document Processing

**Diagnostics**:
```bash
# Profile processing time
npm run documents:profile --doc-id=123

# Check resource usage
docker stats ai-service-api
```

**Solutions**:

1. **Parallel processing**:
   ```env
   CONCURRENT_CHUNKS=5
   ENABLE_STREAMING=true
   ```

2. **Optimize chunking**:
   ```env
   CHUNK_SIZE=750
   CHUNK_OVERLAP=150
   ```

3. **Enable compression**:
   ```env
   ENABLE_COMPRESSION=true
   COMPRESSION_LEVEL=6
   ```

### High Memory Usage

**Solutions**:

1. **Limit concurrent operations**:
   ```env
   CONCURRENT_UPLOADS=3
   CONCURRENT_ANALYSES=1
   MAX_QUEUE_SIZE=10
   ```

2. **Stream large files**:
   ```env
   STREAM_THRESHOLD=10485760  # 10MB
   ```

3. **Garbage collection**:
   ```env
   NODE_OPTIONS="--max-old-space-size=2048 --expose-gc"
   ```

## Error Reference

### API Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| DOC001 | File too large | Reduce file size or increase limit |
| DOC002 | Unsupported format | Convert to supported format |
| DOC003 | Processing timeout | Retry or reduce file complexity |
| DOC004 | Analysis failed | Check OpenAI connection |
| DOC005 | Storage error | Check disk space and permissions |
| DOC006 | Database error | Check PostgreSQL connection |
| DOC007 | Permission denied | Check user permissions |
| DOC008 | Quota exceeded | Upgrade plan or wait |

## Recovery Procedures

### 1. Reset Document Processing

```bash
# Stop processing
npm run documents:stop-processing

# Clear queues
npm run documents:clear-queues

# Reset failed documents
npm run documents:reset-failed

# Restart processing
npm run documents:start-processing
```

### 2. Database Recovery

```bash
# Backup first
npm run documents:backup

# Check integrity
npm run documents:check-integrity

# Repair if needed
npm run documents:repair-db

# Rebuild indices
npm run documents:rebuild-indices
```

### 3. Full System Reset

```bash
# WARNING: This will clear all data
npm run documents:factory-reset

# Reinitialize
npm run documents:init
```

## Monitoring

### Key Metrics

```bash
# Processing metrics
npm run documents:metrics processing

# Storage metrics
npm run documents:metrics storage

# API metrics
npm run documents:metrics api
```

### Log Locations

```
/logs/documents/
├── upload.log       # Upload operations
├── processing.log   # Document processing
├── analysis.log     # AI analysis
├── search.log       # Search queries
├── qa.log          # Q&A interactions
└── error.log       # All errors
```

### Health Checks

```bash
# Automated health check
npm run documents:health-check

# Manual checks
curl http://localhost:3001/api/documents/health
curl http://localhost:3001/api/documents/stats
```

## Getting Help

### 1. Enable Debug Mode
```env
LOG_LEVEL=debug
DOCUMENT_DEBUG=true
```

### 2. Collect Diagnostics
```bash
npm run documents:diagnostics > diagnostics.log
```

### 3. Check Documentation
- Architecture: `/docs/document-intelligence/architecture.md`
- API Reference: `/docs/document-intelligence/api-reference.md`
- Configuration: `/docs/document-intelligence/configuration.md`

### 4. Common Solutions

Before reporting issues:
- Check file permissions
- Verify API keys
- Test with small files
- Check error logs
- Try alternative formats

## Preventive Maintenance

### Daily
- Monitor processing queue
- Check error logs
- Verify storage space

### Weekly
- Clean temporary files
- Optimize indices
- Review API usage

### Monthly
- Archive old documents
- Update dependencies
- Performance analysis
- Security audit