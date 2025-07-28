# Universal AI Tagging System - Troubleshooting Guide

## Table of Contents
1. [Common Issues](#common-issues)
2. [Debugging Tips](#debugging-tips)
3. [Performance Tuning](#performance-tuning)
4. [FAQ](#faq)
5. [Support Resources](#support-resources)

## Common Issues

### 1. Authentication Issues

#### Problem: "Invalid token" error
**Symptoms:**
```json
{
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Invalid token"
  }
}
```

**Solutions:**
1. **Check token expiration:**
   ```javascript
   // Decode JWT to check expiration
   const decoded = jwt.decode(token);
   console.log('Token expires:', new Date(decoded.exp * 1000));
   ```

2. **Refresh token if expired:**
   ```javascript
   async function refreshAccessToken() {
     const response = await fetch('/api/auth/refresh', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ refreshToken: storedRefreshToken })
     });
     const data = await response.json();
     return data.data.accessToken;
   }
   ```

3. **Verify token format:**
   - Ensure "Bearer " prefix in Authorization header
   - Check for proper JWT structure (header.payload.signature)

#### Problem: Rate limit exceeded
**Symptoms:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "reset": "2024-01-20T10:30:00.000Z"
    }
  }
}
```

**Solutions:**
1. **Implement exponential backoff:**
   ```javascript
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.code === 'RATE_LIMIT_EXCEEDED' && i < maxRetries - 1) {
           const delay = Math.min(1000 * Math.pow(2, i), 10000);
           await new Promise(resolve => setTimeout(resolve, delay));
         } else {
           throw error;
         }
       }
     }
   }
   ```

2. **Check rate limit headers:**
   ```javascript
   function handleRateLimit(response) {
     const remaining = response.headers.get('X-RateLimit-Remaining');
     const reset = response.headers.get('X-RateLimit-Reset');
     
     if (parseInt(remaining) < 10) {
       console.warn(`Low rate limit: ${remaining} requests remaining`);
       // Implement request queuing or delay
     }
   }
   ```

3. **Use different rate limit tiers appropriately:**
   - Standard endpoints: 100 req/min
   - AI endpoints: 20 req/min
   - Batch endpoints: 5 req/min

### 2. Tagging Accuracy Issues

#### Problem: Low AI tagging accuracy
**Symptoms:**
- Tags don't match content
- Confidence scores consistently low
- Many false positives/negatives

**Solutions:**

1. **Analyze accuracy metrics:**
   ```javascript
   async function analyzeAccuracy() {
     const accuracy = await client.get('/api/tagging/accuracy?period=week');
     
     console.log('Overall accuracy:', accuracy.data.overall.accuracy);
     console.log('By method:', accuracy.data.byMethod);
     
     // Identify weak areas
     Object.entries(accuracy.data.byMethod).forEach(([method, data]) => {
       if (data.accuracy < 0.7) {
         console.warn(`Low accuracy for ${method}: ${data.accuracy}`);
       }
     });
   }
   ```

2. **Improve tag patterns:**
   ```javascript
   async function improveTagPatterns(tagId) {
     // Get recent examples
     const verifiedExamples = await getVerifiedExamples(tagId);
     const rejectedExamples = await getRejectedExamples(tagId);
     
     // Submit improvements
     await client.post('/api/tagging/improve-patterns', {
       tagId,
       successfulExamples: verifiedExamples,
       failedExamples: rejectedExamples
     });
   }
   ```

3. **Adjust confidence thresholds:**
   ```javascript
   // Start with lower threshold and increase based on results
   const thresholds = {
     initial: 0.6,
     standard: 0.7,
     strict: 0.8
   };
   
   // Monitor and adjust
   async function adjustThreshold(currentAccuracy) {
     if (currentAccuracy > 0.9) {
       return thresholds.initial; // Can be more lenient
     } else if (currentAccuracy > 0.8) {
       return thresholds.standard;
     } else {
       return thresholds.strict; // Need higher confidence
     }
   }
   ```

#### Problem: Tags not matching business rules
**Symptoms:**
- Required tags missing
- Conflicting tags applied
- Business logic violations

**Solutions:**

1. **Implement custom validation rules:**
   ```javascript
   class TagValidator {
     constructor() {
       this.rules = [
         {
           name: 'expense-income-conflict',
           validate: (tags) => {
             const hasExpense = tags.some(t => t.code.startsWith('EXPENSE_'));
             const hasIncome = tags.some(t => t.code.startsWith('INCOME_'));
             return !(hasExpense && hasIncome);
           },
           message: 'Cannot have both expense and income tags'
         },
         {
           name: 'required-category',
           validate: (tags) => {
             return tags.some(t => t.level === 1); // Must have top-level category
           },
           message: 'At least one category tag required'
         }
       ];
     }
     
     validate(tags) {
       const errors = [];
       for (const rule of this.rules) {
         if (!rule.validate(tags)) {
           errors.push({
             rule: rule.name,
             message: rule.message
           });
         }
       }
       return errors;
     }
   }
   ```

2. **Apply post-processing rules:**
   ```javascript
   async function applyBusinessRules(entityId, suggestedTags) {
     const validator = new TagValidator();
     const errors = validator.validate(suggestedTags);
     
     if (errors.length > 0) {
       // Fix violations
       const correctedTags = await correctTagViolations(suggestedTags, errors);
       
       // Log for learning
       await client.post('/api/tagging/feedback', {
         entityId,
         originalTags: suggestedTags,
         correctedTags,
         violations: errors
       });
       
       return correctedTags;
     }
     
     return suggestedTags;
   }
   ```

### 3. Performance Issues

#### Problem: Slow API responses
**Symptoms:**
- Response times > 1 second
- Timeouts on batch operations
- UI feels sluggish

**Solutions:**

1. **Profile API performance:**
   ```javascript
   class PerformanceMonitor {
     async measureEndpoint(endpoint, method = 'GET', body = null) {
       const measurements = [];
       
       for (let i = 0; i < 10; i++) {
         const start = performance.now();
         
         await fetch(endpoint, {
           method,
           headers: {
             'Authorization': `Bearer ${token}`,
             'Content-Type': 'application/json'
           },
           body: body ? JSON.stringify(body) : null
         });
         
         const duration = performance.now() - start;
         measurements.push(duration);
       }
       
       return {
         avg: measurements.reduce((a, b) => a + b) / measurements.length,
         min: Math.min(...measurements),
         max: Math.max(...measurements),
         p95: measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.95)]
       };
     }
   }
   ```

2. **Implement caching:**
   ```javascript
   class CachedTaggingClient {
     constructor(client) {
       this.client = client;
       this.cache = new Map();
       this.ttl = 300000; // 5 minutes
     }
     
     async getTags(entityType) {
       const key = `tags:${entityType}`;
       const cached = this.cache.get(key);
       
       if (cached && cached.expires > Date.now()) {
         return cached.data;
       }
       
       const data = await this.client.get(`/api/tags?entityType=${entityType}`);
       
       this.cache.set(key, {
         data,
         expires: Date.now() + this.ttl
       });
       
       return data;
     }
     
     invalidateCache(pattern) {
       for (const [key] of this.cache) {
         if (key.includes(pattern)) {
           this.cache.delete(key);
         }
       }
     }
   }
   ```

3. **Optimize batch operations:**
   ```javascript
   async function optimizedBatchTag(entities) {
     // Group by similar content for better AI performance
     const grouped = groupBySimilarity(entities);
     
     // Process groups in parallel with concurrency control
     const concurrency = 3;
     const results = [];
     
     for (let i = 0; i < grouped.length; i += concurrency) {
       const batch = grouped.slice(i, i + concurrency);
       const batchResults = await Promise.all(
         batch.map(group => tagBatch(group))
       );
       results.push(...batchResults.flat());
     }
     
     return results;
   }
   
   function groupBySimilarity(entities) {
     // Simple grouping by entity type and content length
     const groups = {};
     
     entities.forEach(entity => {
       const key = `${entity.type}:${Math.floor(entity.content.length / 100)}`;
       groups[key] = groups[key] || [];
       groups[key].push(entity);
     });
     
     return Object.values(groups);
   }
   ```

#### Problem: High memory usage
**Symptoms:**
- Browser tab crashes
- Server out of memory errors
- Slow garbage collection

**Solutions:**

1. **Implement pagination and virtualization:**
   ```javascript
   class VirtualizedTagList extends React.Component {
     render() {
       return (
         <VirtualList
           height={600}
           itemCount={this.props.tags.length}
           itemSize={50}
           width={'100%'}
         >
           {({ index, style }) => (
             <div style={style}>
               <TagItem tag={this.props.tags[index]} />
             </div>
           )}
         </VirtualList>
       );
     }
   }
   ```

2. **Stream large results:**
   ```javascript
   async function* streamLargeDataset(endpoint) {
     let page = 1;
     let hasMore = true;
     
     while (hasMore) {
       const response = await fetch(`${endpoint}?page=${page}&limit=100`);
       const data = await response.json();
       
       yield data.data;
       
       hasMore = data.pagination.hasNext;
       page++;
     }
   }
   
   // Usage
   for await (const batch of streamLargeDataset('/api/entities/by-tag/abc123')) {
     processBatch(batch);
   }
   ```

### 4. Integration Issues

#### Problem: Webhook delivery failures
**Symptoms:**
- Missing webhook notifications
- Delayed updates
- Out-of-sync data

**Solutions:**

1. **Implement webhook retry logic:**
   ```javascript
   class WebhookReliability {
     constructor(webhookUrl, secret) {
       this.webhookUrl = webhookUrl;
       this.secret = secret;
       this.queue = [];
       this.retryDelays = [1000, 5000, 15000, 60000]; // Exponential backoff
     }
     
     async sendWebhook(event, data, attempt = 0) {
       try {
         const payload = JSON.stringify({ event, data, timestamp: new Date() });
         const signature = this.generateSignature(payload);
         
         const response = await fetch(this.webhookUrl, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'X-Webhook-Signature': signature
           },
           body: payload,
           timeout: 5000
         });
         
         if (!response.ok) {
           throw new Error(`Webhook failed: ${response.status}`);
         }
         
         return true;
       } catch (error) {
         if (attempt < this.retryDelays.length) {
           console.log(`Webhook failed, retrying in ${this.retryDelays[attempt]}ms`);
           
           setTimeout(() => {
             this.sendWebhook(event, data, attempt + 1);
           }, this.retryDelays[attempt]);
         } else {
           // Store for manual retry
           this.storeFailedWebhook(event, data, error);
         }
         
         return false;
       }
     }
     
     generateSignature(payload) {
       return crypto
         .createHmac('sha256', this.secret)
         .update(payload)
         .digest('hex');
     }
   }
   ```

2. **Implement webhook monitoring:**
   ```javascript
   class WebhookMonitor {
     constructor() {
       this.metrics = {
         sent: 0,
         delivered: 0,
         failed: 0,
         avgDeliveryTime: 0
       };
     }
     
     async checkWebhookHealth(webhookUrl) {
       const testPayload = {
         event: 'webhook.test',
         data: { timestamp: new Date() }
       };
       
       const start = Date.now();
       
       try {
         const response = await fetch(webhookUrl, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(testPayload),
           timeout: 10000
         });
         
         const deliveryTime = Date.now() - start;
         
         return {
           healthy: response.ok,
           statusCode: response.status,
           deliveryTime,
           message: response.ok ? 'Webhook is healthy' : 'Webhook test failed'
         };
       } catch (error) {
         return {
           healthy: false,
           error: error.message,
           deliveryTime: Date.now() - start
         };
       }
     }
   }
   ```

## Debugging Tips

### 1. Enable Debug Logging

```javascript
class TaggingDebugger {
  constructor(enabled = false) {
    this.enabled = enabled;
    this.logs = [];
  }
  
  log(category, message, data) {
    if (!this.enabled) return;
    
    const entry = {
      timestamp: new Date(),
      category,
      message,
      data
    };
    
    this.logs.push(entry);
    console.log(`[${category}]`, message, data);
  }
  
  async debugTagging(entityType, entityId) {
    this.log('START', `Debugging tagging for ${entityType}/${entityId}`);
    
    // Get entity content
    const entity = await getEntity(entityType, entityId);
    this.log('ENTITY', 'Entity data', entity);
    
    // Get available tags
    const tags = await getTags(entityType);
    this.log('TAGS', `Found ${tags.length} available tags`, tags.slice(0, 5));
    
    // Try pattern matching
    const patternMatches = await matchPatterns(entity.content, tags);
    this.log('PATTERNS', `Pattern matches: ${patternMatches.length}`, patternMatches);
    
    // Try AI suggestions
    const aiSuggestions = await getAISuggestions(entity.content, entityType);
    this.log('AI', `AI suggestions: ${aiSuggestions.length}`, aiSuggestions);
    
    // Compare results
    const comparison = this.compareResults(patternMatches, aiSuggestions);
    this.log('COMPARISON', 'Results comparison', comparison);
    
    return {
      entity,
      patternMatches,
      aiSuggestions,
      comparison,
      logs: this.logs
    };
  }
  
  compareResults(patterns, ai) {
    const patternIds = new Set(patterns.map(p => p.tagId));
    const aiIds = new Set(ai.map(a => a.tagId));
    
    return {
      commonTags: [...patternIds].filter(id => aiIds.has(id)),
      patternOnly: [...patternIds].filter(id => !aiIds.has(id)),
      aiOnly: [...aiIds].filter(id => !patternIds.has(id)),
      agreementRate: 
        [...patternIds].filter(id => aiIds.has(id)).length / 
        Math.max(patternIds.size, aiIds.size)
    };
  }
}
```

### 2. Request/Response Logging

```javascript
// Intercept all API calls for debugging
const originalFetch = window.fetch;

window.fetch = async function(...args) {
  const [url, options] = args;
  
  console.group(`API Call: ${options?.method || 'GET'} ${url}`);
  console.log('Request:', options);
  
  const start = performance.now();
  
  try {
    const response = await originalFetch(...args);
    const duration = performance.now() - start;
    
    // Clone response to read body
    const clone = response.clone();
    const body = await clone.json();
    
    console.log('Response:', {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
      duration: `${duration.toFixed(2)}ms`
    });
    
    console.groupEnd();
    
    return response;
  } catch (error) {
    console.error('Request failed:', error);
    console.groupEnd();
    throw error;
  }
};
```

### 3. Performance Profiling

```javascript
class TaggingProfiler {
  constructor() {
    this.measurements = new Map();
  }
  
  startMeasure(name) {
    this.measurements.set(name, {
      start: performance.now(),
      marks: []
    });
  }
  
  mark(name, label) {
    const measurement = this.measurements.get(name);
    if (measurement) {
      measurement.marks.push({
        label,
        time: performance.now() - measurement.start
      });
    }
  }
  
  endMeasure(name) {
    const measurement = this.measurements.get(name);
    if (measurement) {
      measurement.end = performance.now();
      measurement.total = measurement.end - measurement.start;
      
      console.table([
        { Phase: 'Total', Time: `${measurement.total.toFixed(2)}ms` },
        ...measurement.marks.map(mark => ({
          Phase: mark.label,
          Time: `${mark.time.toFixed(2)}ms`
        }))
      ]);
      
      return measurement;
    }
  }
  
  async profileBatchOperation(entities) {
    this.startMeasure('batch-tagging');
    
    // Preparation
    this.mark('batch-tagging', 'Preparation');
    const prepared = await prepareEntities(entities);
    
    // AI Processing
    this.mark('batch-tagging', 'AI Processing');
    const aiResults = await processWithAI(prepared);
    
    // Pattern Matching
    this.mark('batch-tagging', 'Pattern Matching');
    const patternResults = await matchPatterns(prepared);
    
    // Merge Results
    this.mark('batch-tagging', 'Merge Results');
    const merged = mergeResults(aiResults, patternResults);
    
    // Save to Database
    this.mark('batch-tagging', 'Database Save');
    await saveResults(merged);
    
    const profile = this.endMeasure('batch-tagging');
    
    // Identify bottlenecks
    const bottleneck = profile.marks.reduce((prev, current) => 
      prev.time > current.time ? prev : current
    );
    
    console.warn(`Bottleneck: ${bottleneck.label} (${bottleneck.time.toFixed(2)}ms)`);
    
    return profile;
  }
}
```

## Performance Tuning

### 1. Database Query Optimization

```javascript
// Inefficient: N+1 query problem
async function getTaggedEntitiesInefficient(tagIds) {
  const results = [];
  
  for (const tagId of tagIds) {
    const entities = await prisma.entityTag.findMany({
      where: { tagId }
    });
    results.push(...entities);
  }
  
  return results;
}

// Optimized: Single query with includes
async function getTaggedEntitiesOptimized(tagIds) {
  return await prisma.entityTag.findMany({
    where: {
      tagId: { in: tagIds }
    },
    include: {
      tag: true,
      // Include related data in single query
      transaction: {
        select: {
          id: true,
          description: true,
          amount: true
        }
      }
    }
  });
}
```

### 2. Caching Strategies

```javascript
class SmartCache {
  constructor() {
    this.cache = new Map();
    this.hitRate = { hits: 0, misses: 0 };
  }
  
  // Time-based cache with size limit
  set(key, value, ttl = 300000) {
    // Implement LRU if cache is too large
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.hitRate.misses++;
      return null;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.hitRate.misses++;
      return null;
    }
    
    this.hitRate.hits++;
    return item.value;
  }
  
  // Preload frequently used data
  async warmUp() {
    const frequentTags = await getFrequentlyUsedTags();
    
    for (const tag of frequentTags) {
      this.set(`tag:${tag.id}`, tag, 3600000); // 1 hour
    }
  }
  
  getStats() {
    const total = this.hitRate.hits + this.hitRate.misses;
    return {
      size: this.cache.size,
      hitRate: total > 0 ? this.hitRate.hits / total : 0,
      hits: this.hitRate.hits,
      misses: this.hitRate.misses
    };
  }
}
```

### 3. Batch Processing Optimization

```javascript
class OptimizedBatchProcessor {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 100;
    this.concurrency = options.concurrency || 3;
    this.retryAttempts = options.retryAttempts || 3;
  }
  
  async processBatch(items, processor) {
    const results = [];
    const errors = [];
    
    // Split into optimal batch sizes
    const batches = this.createBatches(items);
    
    // Process batches with controlled concurrency
    for (let i = 0; i < batches.length; i += this.concurrency) {
      const concurrentBatches = batches.slice(i, i + this.concurrency);
      
      const batchPromises = concurrentBatches.map(batch => 
        this.processSingleBatch(batch, processor)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(...result.value);
        } else {
          errors.push({
            batch: concurrentBatches[index],
            error: result.reason
          });
        }
      });
      
      // Progress callback
      if (this.onProgress) {
        this.onProgress({
          processed: results.length,
          total: items.length,
          errors: errors.length
        });
      }
    }
    
    // Retry failed batches
    if (errors.length > 0 && this.retryAttempts > 0) {
      const retryItems = errors.flatMap(e => e.batch);
      const retryResults = await this.processBatch(
        retryItems,
        processor,
        this.retryAttempts - 1
      );
      results.push(...retryResults.results);
    }
    
    return { results, errors };
  }
  
  createBatches(items) {
    const batches = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    
    return batches;
  }
  
  async processSingleBatch(batch, processor) {
    const start = Date.now();
    
    try {
      const result = await processor(batch);
      
      // Log performance metrics
      const duration = Date.now() - start;
      const itemsPerSecond = (batch.length / duration) * 1000;
      
      console.log(`Batch processed: ${batch.length} items in ${duration}ms (${itemsPerSecond.toFixed(2)} items/sec)`);
      
      return result;
    } catch (error) {
      console.error(`Batch failed after ${Date.now() - start}ms:`, error);
      throw error;
    }
  }
}
```

## FAQ

### Q: How do I handle tag conflicts?
**A:** Implement a priority system:
```javascript
function resolveTagConflicts(tags) {
  // Define conflict groups
  const conflictGroups = [
    ['INCOME', 'EXPENSE'],
    ['PERSONAL', 'BUSINESS'],
    ['TAXABLE', 'TAX_EXEMPT']
  ];
  
  // Remove conflicts based on confidence
  const resolved = [...tags];
  
  conflictGroups.forEach(group => {
    const conflicting = resolved.filter(t => 
      group.some(g => t.code.includes(g))
    );
    
    if (conflicting.length > 1) {
      // Keep highest confidence
      conflicting.sort((a, b) => b.confidence - a.confidence);
      const keep = conflicting[0];
      
      // Remove others
      conflicting.slice(1).forEach(tag => {
        const index = resolved.indexOf(tag);
        if (index > -1) resolved.splice(index, 1);
      });
    }
  });
  
  return resolved;
}
```

### Q: How do I migrate existing data to use tags?
**A:** Use a phased migration approach:
```javascript
async function migrateExistingData() {
  // Phase 1: Analyze existing categorization
  const analysis = await analyzeCurrentData();
  
  // Phase 2: Create mapping rules
  const mappings = createCategoryToTagMappings(analysis);
  
  // Phase 3: Batch process with verification
  const processor = new OptimizedBatchProcessor({
    batchSize: 500,
    concurrency: 2
  });
  
  const results = await processor.processBatch(
    analysis.entities,
    async (batch) => {
      // Apply mappings
      const tagged = batch.map(entity => ({
        ...entity,
        suggestedTags: mappings[entity.category] || []
      }));
      
      // Get AI suggestions for unmapped
      const needsAI = tagged.filter(e => e.suggestedTags.length === 0);
      if (needsAI.length > 0) {
        const aiTags = await batchGetAITags(needsAI);
        // Merge results
      }
      
      return tagged;
    }
  );
  
  // Phase 4: Human verification for low-confidence results
  const lowConfidence = results.results.filter(r => 
    r.tags.every(t => t.confidence < 0.7)
  );
  
  await queueForManualReview(lowConfidence);
}
```

### Q: How do I ensure GDPR compliance?
**A:** Implement data privacy controls:
```javascript
class PrivacyCompliantTagger {
  async tagEntity(entity, options = {}) {
    // Sanitize PII before sending to AI
    const sanitized = this.sanitizePII(entity.content);
    
    // Get tags
    const tags = await this.aiService.suggestTags(sanitized, {
      ...options,
      excludePII: true
    });
    
    // Log for audit trail
    await this.auditLog.record({
      action: 'entity.tagged',
      entityId: entity.id,
      timestamp: new Date(),
      dataProcessed: {
        original: false, // Don't log original content
        sanitized: true
      }
    });
    
    return tags;
  }
  
  sanitizePII(content) {
    // Remove common PII patterns
    return content
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // SSN
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
      .replace(/\b\d{16}\b/g, '[CARD]') // Credit card
      .replace(/\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, '[PHONE]');
  }
  
  async exportUserData(userId) {
    // GDPR right to data portability
    const userData = await this.collectUserTagData(userId);
    
    return {
      tags: userData.tags,
      entities: userData.entities.map(e => ({
        id: e.id,
        type: e.type,
        tags: e.tags,
        taggedAt: e.taggedAt
      })),
      exportedAt: new Date(),
      format: 'json'
    };
  }
  
  async deleteUserData(userId) {
    // GDPR right to erasure
    await prisma.$transaction([
      // Remove user's tag applications
      prisma.entityTag.deleteMany({
        where: { appliedBy: userId }
      }),
      
      // Anonymize learning data
      prisma.tagLearning.updateMany({
        where: { createdBy: userId },
        data: { createdBy: 'anonymous' }
      })
    ]);
  }
}
```

## Support Resources

### 1. Logging and Monitoring

```javascript
// Comprehensive logging setup
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'tagging-error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'tagging-combined.log' 
    })
  ]
});

// Structured logging for better debugging
function logTaggingOperation(operation, context, result) {
  logger.info('Tagging operation', {
    operation,
    context: {
      entityType: context.entityType,
      entityId: context.entityId,
      method: context.method,
      provider: context.provider
    },
    result: {
      success: result.success,
      tagCount: result.tags?.length,
      processingTime: result.processingTime,
      confidence: result.avgConfidence
    },
    timestamp: new Date()
  });
}
```

### 2. Health Checks

```javascript
class SystemHealthCheck {
  async runHealthCheck() {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      aiProviders: await this.checkAIProviders(),
      queues: await this.checkQueues()
    };
    
    const overall = Object.values(checks).every(c => c.healthy);
    
    return {
      healthy: overall,
      timestamp: new Date(),
      checks
    };
  }
  
  async checkDatabase() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { healthy: true };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
  
  async checkAIProviders() {
    const providers = ['claude', 'openai'];
    const results = {};
    
    for (const provider of providers) {
      try {
        const response = await this.testAIProvider(provider);
        results[provider] = {
          healthy: true,
          responseTime: response.time
        };
      } catch (error) {
        results[provider] = {
          healthy: false,
          error: error.message
        };
      }
    }
    
    return results;
  }
}
```

### 3. Contact Information

- **Documentation**: `/docs/universal-tagging/`
- **API Status Page**: `https://status.your-domain.com`
- **Support Email**: `support@your-domain.com`
- **GitHub Issues**: `https://github.com/your-org/tagging-system/issues`

### Emergency Procedures

1. **System Down**:
   ```bash
   # Check system health
   curl https://api.your-domain.com/health
   
   # Restart services
   docker-compose restart api worker
   
   # Check logs
   docker-compose logs -f api
   ```

2. **Data Recovery**:
   ```bash
   # Latest backup
   aws s3 ls s3://backups/tagging-system/ --recursive | sort | tail -n 1
   
   # Restore database
   pg_restore -h localhost -U postgres -d tagging_system backup.dump
   ```

3. **Performance Emergency**:
   ```javascript
   // Emergency mode - disable non-critical features
   const emergencyMode = {
     disableAI: true,
     reduceBatchSize: true,
     cacheOnly: true
   };
   ```