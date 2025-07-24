# OpenAI API

## Overview

OpenAI API provides access to powerful language models for text generation, embeddings, and more. In our AI Service, we use OpenAI v5.8.2 for transaction categorization, document analysis, semantic search, and intelligent financial insights.

### Key Features We Use
- 💬 Chat Completions (GPT-3.5/GPT-4) for analysis
- 🔍 Embeddings for semantic document search
- 📊 Structured outputs for data extraction
- 🌊 Streaming for real-time responses
- 🎯 Function calling for tool integration

## Quick Start

### Environment Configuration
```bash
# .env.local
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_ORG_ID=org-optional-org-id  # Optional
OPENAI_MODEL=gpt-3.5-turbo         # Default model
```

### Our Implementation Files
- **Base Service**: `src/services/openai.ts`
- **Document Analysis**: `src/services/document-intelligence/openai-analysis.service.ts`
- **Transaction Categorization**: `src/services/financial/transaction-categorizer.ts`
- **API Routes**: `src/routes/document-intelligence.ts`
- **Types**: `src/types/openai.types.ts`

## Our Implementation

### 1. Service Configuration

```typescript
// From src/services/openai.ts
import OpenAI from 'openai';

export class OpenAIService {
  private openai: OpenAI;
  private defaultModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID,
      maxRetries: 3,
      timeout: 30000, // 30 seconds
    });
  }

  // Token counting for cost management
  async countTokens(messages: ChatMessage[]): Promise<number> {
    // Rough estimation: 4 chars ≈ 1 token
    return messages.reduce((total, msg) => 
      total + Math.ceil(msg.content.length / 4), 0
    );
  }
}
```

### 2. Transaction Categorization

```typescript
// Smart categorization with structured output
async categorizeTransaction(transaction: Transaction): Promise<Category> {
  const systemPrompt = `You are a financial categorization expert. 
    Categorize transactions into these categories:
    - Income: salary, freelance, investments
    - Housing: rent, mortgage, utilities
    - Food: groceries, restaurants, delivery
    - Transport: fuel, public transport, maintenance
    - Entertainment: streaming, games, events
    - Other: anything else
    
    Respond with JSON: {"category": "...", "confidence": 0.0-1.0}`;

  const response = await this.openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Categorize: ${transaction.description} - €${transaction.amount}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3, // Lower for consistency
    max_tokens: 50,
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### 3. Document Analysis with Streaming

```typescript
// Stream responses for better UX
async analyzeDocumentStream(
  documentText: string,
  analysis: AnalysisType,
  onChunk: (chunk: string) => void
): Promise<void> {
  const stream = await this.openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { 
        role: 'system', 
        content: 'You are an expert document analyst. Provide detailed insights.'
      },
      { 
        role: 'user', 
        content: `Analyze this document for ${analysis}:\n\n${documentText}` 
      }
    ],
    stream: true,
    temperature: 0.7,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      onChunk(content);
    }
  }
}
```

### 4. Embeddings for Semantic Search

```typescript
// Generate embeddings for document search
async generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await this.openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });

  return response.data.map(item => item.embedding);
}

// Find similar documents
async findSimilarDocuments(
  query: string, 
  documents: DocumentWithEmbedding[]
): Promise<SimilarDocument[]> {
  const queryEmbedding = await this.generateEmbeddings([query]);
  
  const similarities = documents.map(doc => ({
    document: doc,
    similarity: this.cosineSimilarity(queryEmbedding[0], doc.embedding)
  }));

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);
}

private cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}
```

### 5. Error Handling & Rate Limiting

```typescript
// Comprehensive error handling
async makeOpenAIRequest<T>(
  requestFn: () => Promise<T>,
  retries = 3
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        // Rate limit handling
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after'] || 60;
          logger.warn(`Rate limited, waiting ${retryAfter}s`);
          await this.delay(retryAfter * 1000);
          continue;
        }
        
        // Token limit
        if (error.code === 'context_length_exceeded') {
          throw new Error('Input too long, please reduce text size');
        }
        
        // Invalid API key
        if (error.status === 401) {
          throw new Error('Invalid OpenAI API key');
        }
      }
      
      // Exponential backoff for other errors
      if (attempt < retries - 1) {
        await this.delay(Math.pow(2, attempt) * 1000);
        continue;
      }
      
      throw error;
    }
  }
}
```

## Code Examples

### Complete Financial Analysis Flow

```typescript
// Example from our financial analysis route
router.post('/analyze-financial-report', authenticate, async (req, res) => {
  const { reportText, analysisType } = req.body;
  
  try {
    // 1. Extract key information
    const extraction = await openAIService.extractFinancialData({
      text: reportText,
      fields: ['revenue', 'expenses', 'profit_margin', 'key_metrics']
    });
    
    // 2. Generate insights
    const insights = await openAIService.generateInsights({
      data: extraction,
      type: analysisType,
      context: 'quarterly_report'
    });
    
    // 3. Create summary
    const summary = await openAIService.summarize({
      text: reportText,
      maxLength: 500,
      style: 'executive_summary'
    });
    
    res.json({
      extraction,
      insights,
      summary,
      tokens_used: await openAIService.getTokenUsage()
    });
  } catch (error) {
    logger.error('Financial analysis failed:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});
```

### Cost-Optimized Batch Processing

```typescript
// Batch multiple operations for efficiency
async processBatchTransactions(transactions: Transaction[]) {
  const batchSize = 20; // Process 20 at a time
  const results = [];
  
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    
    // Single API call for multiple categorizations
    const prompt = batch.map((tx, idx) => 
      `${idx + 1}. ${tx.description} - €${tx.amount}`
    ).join('\n');
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Categorize each transaction...' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    });
    
    results.push(...this.parseMultipleCategories(response));
  }
  
  return results;
}
```

## Best Practices

### 1. Model Selection
- 🚀 **GPT-3.5-turbo**: Fast, cost-effective for categorization
- 🧠 **GPT-4**: Complex analysis, financial insights
- 📐 **text-embedding-3-small**: Efficient for embeddings
- 💎 **GPT-4-turbo**: Long documents, detailed analysis

### 2. Cost Optimization
```typescript
// Cache frequent requests
const cache = new Map<string, any>();

async getCachedResponse(key: string, generator: () => Promise<any>) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const response = await generator();
  cache.set(key, response);
  
  // Expire after 1 hour
  setTimeout(() => cache.delete(key), 3600000);
  
  return response;
}
```

### 3. Token Management
- ✅ Count tokens before sending
- ✅ Truncate long texts intelligently
- ✅ Use streaming for long responses
- ✅ Set appropriate max_tokens

### 4. Prompt Engineering
```typescript
// Structured prompts for consistency
const PROMPTS = {
  categorization: {
    system: 'You are a financial expert...',
    temperature: 0.3,
    max_tokens: 100
  },
  analysis: {
    system: 'You are a senior financial analyst...',
    temperature: 0.7,
    max_tokens: 1000
  }
};
```

## Troubleshooting

### Common Issues

#### 1. "Rate limit exceeded"
```typescript
// Solution: Implement request queue
class OpenAIQueue {
  private queue: Promise<any> = Promise.resolve();
  private requestsPerMinute = 60;
  
  async add<T>(fn: () => Promise<T>): Promise<T> {
    this.queue = this.queue
      .then(() => this.delay(60000 / this.requestsPerMinute))
      .then(fn);
    return this.queue;
  }
}
```

#### 2. "Context length exceeded"
```typescript
// Solution: Smart truncation
function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = Math.ceil(text.length / 4);
  if (estimatedTokens <= maxTokens) return text;
  
  // Keep ratio of text that fits
  const ratio = maxTokens / estimatedTokens;
  return text.substring(0, Math.floor(text.length * ratio));
}
```

#### 3. "Invalid API key"
```typescript
// Solution: Validate on startup
async validateAPIKey() {
  try {
    await this.openai.models.list();
    logger.info('OpenAI API key validated');
  } catch (error) {
    logger.error('Invalid OpenAI API key');
    process.exit(1);
  }
}
```

### Debug Tips

1. **Enable debug logging**:
```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: false, // Never in production
  defaultHeaders: {
    'X-Request-ID': generateRequestId() // Track requests
  }
});
```

2. **Monitor usage**:
```typescript
// Track token usage per request
response.usage?.total_tokens // Total tokens used
response.usage?.prompt_tokens // Input tokens
response.usage?.completion_tokens // Output tokens
```

3. **Test with smaller models first**:
```typescript
const testModel = process.env.NODE_ENV === 'development' 
  ? 'gpt-3.5-turbo' 
  : 'gpt-4';
```

## Resources

### Official Documentation
- [OpenAI API Docs](https://platform.openai.com/docs)
- [API Reference](https://platform.openai.com/docs/api-reference)
- [Best Practices](https://platform.openai.com/docs/guides/best-practices)
- [Rate Limits](https://platform.openai.com/docs/guides/rate-limits)

### Our Internal Docs
- [Document Intelligence Module](../TRADING_INTELLIGENCE.md)
- [Cost Optimization Guide](../IA_DEPENDENCY_STRATEGY.md)
- [MCP Bridge Integration](../MCP_BRIDGE_PROPOSAL.md)

### Useful Tools
- [OpenAI Playground](https://platform.openai.com/playground)
- [Tokenizer Tool](https://platform.openai.com/tokenizer)
- [API Usage Dashboard](https://platform.openai.com/usage)

### Cost Reference (Dec 2024)
| Model | Input | Output |
|-------|-------|--------|
| GPT-3.5-turbo | $0.0005/1K | $0.0015/1K |
| GPT-4-turbo | $0.01/1K | $0.03/1K |
| text-embedding-3-small | $0.00002/1K | - |

---

> **Note**: Always monitor API usage and costs. Implement caching for repeated queries. Use GPT-3.5-turbo for simple tasks and reserve GPT-4 for complex analysis. Never expose API keys in client-side code or logs.