# Universal AI Tagging System - Integration Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Step-by-Step Integration](#step-by-step-integration)
3. [Best Practices](#best-practices)
4. [Performance Optimization](#performance-optimization)
5. [Tagging Strategies](#tagging-strategies)

## Quick Start

### Prerequisites
- API access token
- Base API URL: `https://your-api-domain.com/api`
- Node.js 16+ (for JavaScript examples)

### Quick Integration Example

```javascript
// 1. Initialize the client
const TaggingClient = require('@your-org/tagging-client');

const client = new TaggingClient({
  apiKey: 'your-api-token',
  baseUrl: 'https://your-api-domain.com/api'
});

// 2. Create a tag
const tag = await client.tags.create({
  code: 'EXPENSE_TRAVEL',
  name: 'Travel Expenses',
  entityTypes: ['transaction', 'invoice'],
  patterns: {
    keywords: ['flight', 'hotel', 'taxi', 'uber']
  }
});

// 3. Tag an entity
const result = await client.entities.tag('transaction', '12345', {
  method: 'auto',
  options: {
    aiProvider: 'claude',
    confidenceThreshold: 0.7
  }
});

console.log(`Tagged with ${result.tags.length} tags`);
```

## Step-by-Step Integration

### Step 1: Authentication

First, obtain an authentication token:

```javascript
async function authenticate(email, password) {
  const response = await fetch('https://your-api-domain.com/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  return data.data.accessToken;
}
```

### Step 2: Set Up Tag Hierarchy

Create a hierarchical tag structure:

```javascript
// Create parent tags
const expenseCategory = await createTag({
  code: 'EXPENSES',
  name: 'Expenses',
  entityTypes: ['transaction', 'invoice']
});

// Create child tags
const travelExpense = await createTag({
  code: 'EXPENSE_TRAVEL',
  name: 'Travel Expenses',
  parentId: expenseCategory.id,
  entityTypes: ['transaction', 'invoice'],
  patterns: {
    keywords: ['flight', 'hotel', 'taxi', 'uber', 'airbnb'],
    merchants: ['UBER', 'LYFT', 'AIRBNB', 'BOOKING.COM']
  }
});

const foodExpense = await createTag({
  code: 'EXPENSE_FOOD',
  name: 'Food & Dining',
  parentId: expenseCategory.id,
  entityTypes: ['transaction'],
  patterns: {
    keywords: ['restaurant', 'coffee', 'lunch', 'dinner'],
    merchants: ['STARBUCKS', 'MCDONALDS', 'SUBWAY']
  }
});
```

### Step 3: Implement Auto-Tagging

Set up automatic tagging for new entities:

```javascript
class TransactionTagger {
  constructor(apiClient) {
    this.client = apiClient;
  }

  async tagTransaction(transaction) {
    try {
      // Prepare transaction data
      const content = `${transaction.description} ${transaction.merchant}`;
      const metadata = {
        amount: transaction.amount,
        currency: transaction.currency,
        date: transaction.date,
        merchant: transaction.merchant
      };

      // Tag the transaction
      const result = await this.client.post('/entities/transaction/' + transaction.id + '/tags', {
        method: 'auto',
        options: {
          aiProvider: 'claude',
          confidenceThreshold: 0.7,
          maxTags: 5
        }
      });

      // Handle results
      if (result.data.tags.length > 0) {
        console.log(`Tagged transaction ${transaction.id} with:`, 
          result.data.tags.map(t => t.tagName).join(', '));
        
        // Optional: Verify high-confidence tags
        for (const tag of result.data.tags) {
          if (tag.confidence > 0.9) {
            await this.verifyTag(transaction.id, tag.tagId);
          }
        }
      }

      return result.data;
    } catch (error) {
      console.error('Tagging error:', error);
      // Implement fallback strategy
      return await this.fallbackTagging(transaction);
    }
  }

  async verifyTag(entityId, tagId) {
    return this.client.patch(`/entities/transaction/${entityId}/tags/${tagId}`, {
      isVerified: true
    });
  }

  async fallbackTagging(transaction) {
    // Pattern-based fallback
    const patterns = await this.client.get('/tags?entityType=transaction');
    const matches = this.matchPatterns(transaction, patterns.data);
    return { tags: matches };
  }

  matchPatterns(transaction, tags) {
    const matches = [];
    const description = transaction.description.toLowerCase();
    
    for (const tag of tags) {
      if (tag.patterns?.keywords) {
        const keywordMatch = tag.patterns.keywords.some(keyword => 
          description.includes(keyword.toLowerCase())
        );
        
        if (keywordMatch) {
          matches.push({
            tagId: tag.id,
            tagCode: tag.code,
            tagName: tag.name,
            confidence: 0.7,
            method: 'PATTERN'
          });
        }
      }
    }
    
    return matches;
  }
}
```

### Step 4: Batch Processing

For processing multiple entities efficiently:

```javascript
async function batchTagTransactions(transactions) {
  const BATCH_SIZE = 100;
  const results = [];

  // Process in batches
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    
    const batchRequest = {
      entities: batch.map(tx => ({
        type: 'transaction',
        id: tx.id,
        content: `${tx.description} ${tx.merchant}`,
        metadata: {
          amount: tx.amount,
          currency: tx.currency,
          date: tx.date
        }
      })),
      options: {
        aiProvider: 'claude',
        confidenceThreshold: 0.7
      }
    };

    try {
      const response = await client.post('/tagging/batch', batchRequest);
      results.push(...response.data.results);
      
      console.log(`Processed batch ${i / BATCH_SIZE + 1}: ${response.data.summary.successful} successful`);
    } catch (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error);
    }

    // Rate limiting - wait between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}
```

### Step 5: Implement Feedback Loop

Improve accuracy with user feedback:

```javascript
class TagFeedbackManager {
  constructor(apiClient) {
    this.client = apiClient;
  }

  async correctTag(entityType, entityId, currentTagId, correctTagId) {
    // Submit feedback
    await this.client.post('/tagging/feedback', {
      entityType,
      entityId,
      entityTagId: currentTagId,
      feedback: {
        isCorrect: false,
        suggestedTagId: correctTagId,
        confidence: 1.0
      }
    });

    // Learn from correction
    await this.client.post('/tagging/learn', {
      entityType,
      entityId,
      correctTagId,
      previousTagId: currentTagId,
      context: {
        userCorrection: true
      }
    });

    // Update the entity tag
    await this.client.delete(`/entities/${entityType}/${entityId}/tags/${currentTagId}`);
    await this.client.post(`/entities/${entityType}/${entityId}/tags`, {
      method: 'manual',
      tagId: correctTagId
    });
  }

  async confirmTag(entityType, entityId, tagId) {
    // Mark as verified
    await this.client.patch(`/entities/${entityType}/${entityId}/tags/${tagId}`, {
      isVerified: true
    });

    // Submit positive feedback
    await this.client.post('/tagging/feedback', {
      entityType,
      entityId,
      entityTagId: tagId,
      feedback: {
        isCorrect: true,
        confidence: 1.0
      }
    });
  }
}
```

## Best Practices

### 1. Tag Hierarchy Design

Design your tag hierarchy thoughtfully:

```javascript
const tagHierarchy = {
  // Level 1: Main categories
  INCOME: {
    name: 'Income',
    children: {
      // Level 2: Subcategories
      INCOME_SALARY: 'Salary & Wages',
      INCOME_FREELANCE: 'Freelance Income',
      INCOME_INVESTMENT: 'Investment Returns'
    }
  },
  EXPENSES: {
    name: 'Expenses',
    children: {
      EXPENSE_TRAVEL: {
        name: 'Travel',
        children: {
          // Level 3: Specific types
          TRAVEL_FLIGHT: 'Flights',
          TRAVEL_HOTEL: 'Hotels',
          TRAVEL_TRANSPORT: 'Local Transport'
        }
      },
      EXPENSE_FOOD: 'Food & Dining',
      EXPENSE_UTILITIES: 'Utilities'
    }
  }
};
```

### 2. Confidence Thresholds

Set appropriate confidence thresholds:

```javascript
const CONFIDENCE_THRESHOLDS = {
  autoApply: 0.9,      // Automatically apply without review
  suggest: 0.7,        // Suggest for review
  ignore: 0.5          // Below this, ignore the suggestion
};

function processTagSuggestions(suggestions) {
  const autoApply = [];
  const needsReview = [];

  for (const suggestion of suggestions) {
    if (suggestion.confidence >= CONFIDENCE_THRESHOLDS.autoApply) {
      autoApply.push(suggestion);
    } else if (suggestion.confidence >= CONFIDENCE_THRESHOLDS.suggest) {
      needsReview.push(suggestion);
    }
  }

  return { autoApply, needsReview };
}
```

### 3. Error Handling

Implement robust error handling:

```javascript
class TaggingService {
  async tagWithRetry(entityType, entityId, options, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.client.post(`/entities/${entityType}/${entityId}/tags`, options);
      } catch (error) {
        lastError = error;
        
        // Handle specific errors
        if (error.code === 'RATE_LIMIT_EXCEEDED') {
          const retryAfter = error.details.reset 
            ? new Date(error.details.reset) - new Date() 
            : 60000;
          
          console.log(`Rate limited. Waiting ${retryAfter}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
        } else if (error.code === 'AI_PROVIDER_ERROR') {
          // Switch to fallback provider
          options.options.aiProvider = 'openai';
        } else if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}
```

### 4. Caching Strategy

Implement caching for better performance:

```javascript
class TagCache {
  constructor(ttl = 3600000) { // 1 hour default
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async getOrFetch(key, fetchFn) {
    const cached = this.get(key);
    if (cached) return cached;
    
    const value = await fetchFn();
    this.set(key, value);
    return value;
  }
}

// Usage
const tagCache = new TagCache();

async function getTagHierarchy() {
  return tagCache.getOrFetch('tag-hierarchy', async () => {
    const response = await client.get('/tags/hierarchy');
    return response.data;
  });
}
```

## Performance Optimization

### 1. Bulk Operations

Always use bulk endpoints when processing multiple items:

```javascript
// ❌ Bad: Individual requests
for (const transaction of transactions) {
  await tagTransaction(transaction);
}

// ✅ Good: Batch request
await batchTagTransactions(transactions);
```

### 2. Parallel Processing

Process independent operations in parallel:

```javascript
async function processTransactionsInParallel(transactions, concurrency = 5) {
  const results = [];
  const executing = [];

  for (const transaction of transactions) {
    const promise = tagTransaction(transaction).then(result => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

  await Promise.all(executing);
  return results;
}
```

### 3. Webhook Integration

Use webhooks for real-time updates:

```javascript
// Express webhook handler
app.post('/webhooks/tagging', async (req, res) => {
  const { event, data } = req.body;

  switch (event) {
    case 'entity.tagged':
      await handleEntityTagged(data);
      break;
    
    case 'tag.updated':
      await refreshTagCache(data.tagId);
      break;
    
    case 'entity.tag.verified':
      await updateLocalRecords(data);
      break;
  }

  res.status(200).send('OK');
});

async function handleEntityTagged(data) {
  // Update local database
  await db.updateTransaction(data.entityId, {
    tags: data.tags.map(t => t.tagCode),
    taggedAt: new Date()
  });

  // Notify UI
  websocket.emit('transaction.tagged', data);
}
```

### 4. Smart Caching

Cache frequently used data:

```javascript
class SmartTaggingClient {
  constructor() {
    this.tagListCache = new Map();
    this.tagHierarchyCache = null;
    this.cacheExpiry = 3600000; // 1 hour
  }

  async getTagsForEntity(entityType) {
    const cacheKey = `tags-${entityType}`;
    const cached = this.tagListCache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const response = await client.get(`/tags?entityType=${entityType}`);
    
    this.tagListCache.set(cacheKey, {
      data: response.data,
      expires: Date.now() + this.cacheExpiry
    });

    return response.data;
  }

  clearCache() {
    this.tagListCache.clear();
    this.tagHierarchyCache = null;
  }
}
```

## Tagging Strategies

### 1. Multi-Level Tagging

Implement hierarchical tagging for better organization:

```javascript
async function applyHierarchicalTags(entityType, entityId, leafTagId) {
  // Get the full path of the tag
  const pathResponse = await client.get(`/tags/${leafTagId}/path`);
  const tagPath = pathResponse.data.path;

  // Apply all tags in the hierarchy
  const tags = [];
  for (const tag of tagPath) {
    if (tag.id !== 'root') {
      tags.push({
        tagId: tag.id,
        confidence: 1.0,
        method: 'MANUAL'
      });
    }
  }

  // Apply all at once
  await client.post(`/entities/${entityType}/${entityId}/tags/bulk`, { tags });
}
```

### 2. Context-Aware Tagging

Use context for better accuracy:

```javascript
async function contextualTagging(transaction, relatedTransactions) {
  // Analyze patterns in related transactions
  const context = {
    previousTags: extractCommonTags(relatedTransactions),
    merchantHistory: analyzeMerchantPatterns(transaction.merchant, relatedTransactions),
    timePatterns: analyzeTimePatterns(transaction.date, relatedTransactions)
  };

  // Get contextual suggestions
  const response = await client.post('/tagging/contextual', {
    content: transaction.description,
    entityType: 'transaction',
    context
  });

  return response.data.suggestions;
}

function extractCommonTags(transactions) {
  const tagFrequency = {};
  
  for (const tx of transactions) {
    for (const tag of tx.tags || []) {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    }
  }

  // Return tags that appear in >50% of transactions
  const threshold = transactions.length * 0.5;
  return Object.entries(tagFrequency)
    .filter(([tag, count]) => count >= threshold)
    .map(([tag]) => tag);
}
```

### 3. Learning from Patterns

Continuously improve tagging accuracy:

```javascript
class PatternLearner {
  async improveTagPatterns(tagId, timeWindow = 30) {
    // Get recent tagging results
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeWindow);

    // Fetch verified and rejected examples
    const verifiedExamples = await this.getVerifiedExamples(tagId, startDate, endDate);
    const rejectedExamples = await this.getRejectedExamples(tagId, startDate, endDate);

    // Submit pattern improvements
    if (verifiedExamples.length > 0 || rejectedExamples.length > 0) {
      await client.post('/tagging/improve-patterns', {
        tagId,
        successfulExamples: verifiedExamples.map(e => e.content),
        failedExamples: rejectedExamples.map(e => e.content)
      });
    }
  }

  async getVerifiedExamples(tagId, startDate, endDate) {
    // Query your database for verified tags
    return db.query(`
      SELECT DISTINCT content 
      FROM tagged_entities 
      WHERE tag_id = ? 
        AND is_verified = true 
        AND verified_at BETWEEN ? AND ?
    `, [tagId, startDate, endDate]);
  }
}
```

### 4. Custom Rules Engine

Implement business-specific rules:

```javascript
class CustomTaggingRules {
  constructor() {
    this.rules = [
      {
        name: 'Large Expense Rule',
        condition: (entity) => entity.amount > 1000,
        action: (entity) => ({ tagCode: 'LARGE_EXPENSE', confidence: 1.0 })
      },
      {
        name: 'Recurring Payment Rule',
        condition: (entity) => entity.metadata?.recurring === true,
        action: (entity) => ({ tagCode: 'RECURRING', confidence: 1.0 })
      },
      {
        name: 'Weekend Transaction Rule',
        condition: (entity) => {
          const date = new Date(entity.date);
          return date.getDay() === 0 || date.getDay() === 6;
        },
        action: (entity) => ({ tagCode: 'WEEKEND', confidence: 0.9 })
      }
    ];
  }

  async applyRules(entity) {
    const ruleTags = [];

    for (const rule of this.rules) {
      if (rule.condition(entity)) {
        const tag = rule.action(entity);
        const tagData = await this.resolveTag(tag.tagCode);
        
        if (tagData) {
          ruleTags.push({
            tagId: tagData.id,
            tagCode: tag.tagCode,
            tagName: tagData.name,
            confidence: tag.confidence,
            method: 'RULE'
          });
        }
      }
    }

    return ruleTags;
  }

  async resolveTag(tagCode) {
    // Cache tag lookups
    if (!this.tagCache) {
      this.tagCache = new Map();
    }

    if (this.tagCache.has(tagCode)) {
      return this.tagCache.get(tagCode);
    }

    const response = await client.get(`/tags/search?q=${tagCode}`);
    const tag = response.data.find(t => t.code === tagCode);
    
    if (tag) {
      this.tagCache.set(tagCode, tag);
    }

    return tag;
  }
}
```

### 5. Multi-Language Support

Handle content in multiple languages:

```javascript
async function multilingualTagging(content, detectedLanguage) {
  // Get suggestions in multiple languages
  const languages = ['en', 'es', 'fr']; // Based on your user base
  
  const response = await client.post('/tagging/multilingual', {
    content,
    entityType: 'document',
    targetLanguages: languages
  });

  // Merge suggestions from different languages
  const mergedSuggestions = new Map();
  
  for (const [lang, suggestions] of Object.entries(response.data)) {
    for (const suggestion of suggestions) {
      const existing = mergedSuggestions.get(suggestion.tagId);
      
      if (!existing || suggestion.confidence > existing.confidence) {
        mergedSuggestions.set(suggestion.tagId, suggestion);
      }
    }
  }

  return Array.from(mergedSuggestions.values());
}
```

## Advanced Integration Patterns

### 1. Event-Driven Architecture

```javascript
class TaggingEventBus extends EventEmitter {
  constructor(taggingClient) {
    super();
    this.client = taggingClient;
    this.setupHandlers();
  }

  setupHandlers() {
    // Handle new entities
    this.on('entity.created', async (entity) => {
      const tags = await this.client.tagEntity(entity.type, entity.id);
      this.emit('entity.tagged', { entity, tags });
    });

    // Handle tag updates
    this.on('tag.updated', async (tag) => {
      // Re-tag affected entities
      const entities = await this.client.findEntitiesByTag(tag.id);
      
      for (const entity of entities) {
        await this.client.retagEntity(entity.type, entity.id);
      }
    });

    // Handle feedback
    this.on('tag.feedback', async (feedback) => {
      await this.client.submitFeedback(feedback);
      
      if (!feedback.isCorrect) {
        this.emit('tag.correction.needed', feedback);
      }
    });
  }
}
```

### 2. Monitoring and Analytics

```javascript
class TaggingMonitor {
  constructor(client) {
    this.client = client;
    this.metrics = {
      totalTagged: 0,
      successRate: 0,
      avgConfidence: 0,
      apiErrors: 0
    };
  }

  async collectMetrics() {
    try {
      // Get system accuracy
      const accuracy = await this.client.get('/tagging/accuracy?period=day');
      
      this.metrics.totalTagged = accuracy.data.overall.totalTagged;
      this.metrics.successRate = accuracy.data.overall.accuracy;

      // Get tag analytics
      const analytics = await this.client.get('/tagging/analytics');
      
      this.metrics.avgConfidence = analytics.data.averageConfidence;
      
      // Log metrics
      console.log('Tagging Metrics:', this.metrics);
      
      // Send to monitoring service
      await this.sendToMonitoring(this.metrics);
    } catch (error) {
      this.metrics.apiErrors++;
      console.error('Metrics collection failed:', error);
    }
  }

  async sendToMonitoring(metrics) {
    // Send to your monitoring service (e.g., DataDog, CloudWatch)
    // Example: await datadog.gauge('tagging.success_rate', metrics.successRate);
  }
}

// Run metrics collection every hour
setInterval(() => monitor.collectMetrics(), 3600000);
```

## Troubleshooting Common Issues

### Issue: Low Tagging Accuracy

```javascript
async function diagnoseAccuracy(entityType) {
  // 1. Check tag patterns
  const tags = await client.get(`/tags?entityType=${entityType}`);
  const weakTags = tags.data.filter(t => t.successRate < 0.7);
  
  console.log(`Found ${weakTags.length} tags with low success rate`);

  // 2. Analyze recent failures
  const accuracy = await client.get(`/tagging/accuracy?entityType=${entityType}&period=week`);
  
  console.log('Accuracy by method:', accuracy.data.byMethod);

  // 3. Recommendations
  if (accuracy.data.byMethod.AI.accuracy < 0.8) {
    console.log('Recommendation: Retrain AI models with more examples');
  }
  
  if (accuracy.data.byMethod.PATTERN.accuracy < 0.7) {
    console.log('Recommendation: Update tag patterns based on verified examples');
  }

  return {
    weakTags,
    accuracy: accuracy.data,
    recommendations: generateRecommendations(accuracy.data)
  };
}
```

### Issue: Performance Problems

```javascript
class PerformanceOptimizer {
  async analyzePerformance() {
    const issues = [];

    // Check API response times
    const timings = await this.measureApiPerformance();
    
    if (timings.avg > 1000) {
      issues.push({
        issue: 'Slow API responses',
        solution: 'Consider using batch operations'
      });
    }

    // Check cache hit rate
    if (this.cacheHitRate < 0.5) {
      issues.push({
        issue: 'Low cache hit rate',
        solution: 'Increase cache TTL or pre-warm cache'
      });
    }

    // Check rate limiting
    if (this.rateLimitHits > 10) {
      issues.push({
        issue: 'Frequent rate limiting',
        solution: 'Implement request queuing and backoff'
      });
    }

    return issues;
  }

  async measureApiPerformance() {
    const timings = [];
    
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await client.get('/tags?limit=1');
      timings.push(Date.now() - start);
    }

    return {
      avg: timings.reduce((a, b) => a + b) / timings.length,
      max: Math.max(...timings),
      min: Math.min(...timings)
    };
  }
}
```

## Security Best Practices

### 1. Token Management

```javascript
class SecureTokenManager {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }

  async getToken() {
    if (!this.token || Date.now() >= this.expiresAt - 60000) {
      await this.refreshAccessToken();
    }
    return this.token;
  }

  async refreshAccessToken() {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refreshToken: this.refreshToken
      })
    });

    const data = await response.json();
    
    this.token = data.data.accessToken;
    this.expiresAt = Date.now() + (data.data.expiresIn * 1000);
  }
}
```

### 2. Data Validation

```javascript
class SecureTaggingClient {
  validateEntityId(id) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid entity ID format');
    }
    
    return id;
  }

  sanitizeContent(content) {
    // Remove potential XSS
    return content
      .replace(/[<>]/g, '')
      .substring(0, 1000); // Limit length
  }

  async tagEntity(type, id, content) {
    const validId = this.validateEntityId(id);
    const safeContent = this.sanitizeContent(content);
    
    return await this.client.post(`/entities/${type}/${validId}/tags`, {
      content: safeContent
    });
  }
}
```

## Next Steps

1. **Set up monitoring**: Implement comprehensive monitoring for your tagging system
2. **Train your team**: Ensure everyone understands how to use and improve the tagging system
3. **Iterate on tags**: Regularly review and refine your tag hierarchy based on usage
4. **Automate feedback**: Build UI components that make it easy for users to provide feedback
5. **Scale gradually**: Start with a subset of entities and expand as you gain confidence

## Support

For additional support:
- API Documentation: `/docs/universal-tagging/api-reference.md`
- Architecture Guide: `/docs/universal-tagging/architecture.md`
- Troubleshooting: `/docs/universal-tagging/troubleshooting.md`
- Contact: support@your-org.com