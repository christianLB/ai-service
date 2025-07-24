# OpenAI API v5.x Guide for AI Service

This guide provides comprehensive documentation for using the OpenAI Node.js library v5.x in the AI Service project, focusing on production best practices, performance optimization, and cost management.

## Table of Contents
1. [Installation & Setup](#installation--setup)
2. [Chat Completions API](#chat-completions-api)
3. [Streaming Responses](#streaming-responses)
4. [Embeddings API](#embeddings-api)
5. [Token Management](#token-management)
6. [Rate Limits & Error Handling](#rate-limits--error-handling)
7. [Cost Optimization](#cost-optimization)
8. [Production Best Practices](#production-best-practices)

## Installation & Setup

```bash
npm install openai@^5.8.2
```

Basic initialization:
```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3, // Default is 2
  timeout: 60 * 1000, // 60 seconds timeout
});
```

## Chat Completions API

### Basic Usage

```typescript
import { OpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

async function getChatCompletion(messages: ChatCompletionMessageParam[]) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
      temperature: 0.7,
      max_tokens: 4096,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    return completion.choices[0].message;
  } catch (error) {
    console.error('Chat completion error:', error);
    throw error;
  }
}
```

### System Messages & Context

```typescript
const messages: ChatCompletionMessageParam[] = [
  {
    role: 'system',
    content: 'You are a financial analysis assistant specializing in transaction categorization.'
  },
  {
    role: 'user',
    content: 'Categorize this transaction: "AMAZON WEB SERVICES $150.00"'
  }
];

const response = await getChatCompletion(messages);
```

### Function Calling

```typescript
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'categorize_transaction',
      description: 'Categorize a financial transaction',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['Technology', 'Food', 'Transport', 'Entertainment', 'Other']
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1
          },
          subcategory: {
            type: 'string'
          }
        },
        required: ['category', 'confidence']
      }
    }
  }
];

const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: messages,
  tools: tools,
  tool_choice: 'auto',
});
```

## Streaming Responses

### Basic Streaming

```typescript
async function streamChatCompletion(messages: ChatCompletionMessageParam[]) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: messages,
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}
```

### Streaming with Express

```typescript
import { Response } from 'express';

async function streamToClient(messages: ChatCompletionMessageParam[], res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    res.end();
  }
}
```

### Streaming with Token Counting

```typescript
import { encoding_for_model } from 'tiktoken';

async function streamWithTokenCount(messages: ChatCompletionMessageParam[]) {
  const encoder = encoding_for_model('gpt-4-turbo-preview');
  let totalTokens = 0;
  let content = '';

  const stream = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    content += delta;
    
    // Count tokens incrementally
    if (delta) {
      const tokens = encoder.encode(delta);
      totalTokens += tokens.length;
    }
  }

  encoder.free();
  return { content, totalTokens };
}
```

## Embeddings API

### Basic Embedding Generation

```typescript
async function generateEmbedding(text: string) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error);
    throw error;
  }
}
```

### Batch Embeddings

```typescript
async function generateBatchEmbeddings(texts: string[]) {
  // OpenAI recommends batches of up to 2048 items
  const batchSize = 100;
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      });

      embeddings.push(...response.data.map(d => d.embedding));
      
      // Add delay to respect rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Batch ${i / batchSize} failed:`, error);
      throw error;
    }
  }

  return embeddings;
}
```

### Cosine Similarity Search

```typescript
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function semanticSearch(query: string, documents: Array<{text: string, embedding: number[]}>) {
  const queryEmbedding = await generateEmbedding(query);
  
  const results = documents.map(doc => ({
    ...doc,
    similarity: cosineSimilarity(queryEmbedding, doc.embedding)
  }));

  return results.sort((a, b) => b.similarity - a.similarity);
}
```

## Token Management

### Token Counting

```typescript
import { encoding_for_model, Tiktoken } from 'tiktoken';

class TokenCounter {
  private encoder: Tiktoken;

  constructor(model: string = 'gpt-4-turbo-preview') {
    this.encoder = encoding_for_model(model as any);
  }

  countTokens(text: string): number {
    return this.encoder.encode(text).length;
  }

  countMessageTokens(messages: ChatCompletionMessageParam[]): number {
    let tokenCount = 0;
    
    for (const message of messages) {
      tokenCount += 4; // Every message follows <im_start>{role/name}\n{content}<im_end>\n
      tokenCount += this.countTokens(message.role);
      
      if (typeof message.content === 'string') {
        tokenCount += this.countTokens(message.content);
      }
    }
    
    tokenCount += 2; // Every reply is primed with <im_start>assistant
    return tokenCount;
  }

  estimateCost(tokens: number, model: string = 'gpt-4-turbo-preview'): number {
    const pricing = {
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 }, // per 1K tokens
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'text-embedding-3-small': { input: 0.00002, output: 0 },
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
    return (tokens / 1000) * modelPricing.input;
  }

  cleanup() {
    this.encoder.free();
  }
}
```

### Token Optimization

```typescript
class TokenOptimizer {
  // Truncate text to fit within token limit
  static truncateToTokenLimit(text: string, maxTokens: number, model: string = 'gpt-4-turbo-preview'): string {
    const encoder = encoding_for_model(model as any);
    const tokens = encoder.encode(text);
    
    if (tokens.length <= maxTokens) {
      encoder.free();
      return text;
    }

    const truncatedTokens = tokens.slice(0, maxTokens);
    const truncatedText = new TextDecoder().decode(encoder.decode(truncatedTokens));
    encoder.free();
    
    return truncatedText;
  }

  // Split long text into chunks
  static splitIntoChunks(text: string, maxTokensPerChunk: number): string[] {
    const encoder = encoding_for_model('gpt-4-turbo-preview');
    const tokens = encoder.encode(text);
    const chunks: string[] = [];
    
    for (let i = 0; i < tokens.length; i += maxTokensPerChunk) {
      const chunkTokens = tokens.slice(i, i + maxTokensPerChunk);
      const chunkText = new TextDecoder().decode(encoder.decode(chunkTokens));
      chunks.push(chunkText);
    }
    
    encoder.free();
    return chunks;
  }
}
```

## Rate Limits & Error Handling

### Rate Limit Management

```typescript
import { RateLimitError } from 'openai';

class RateLimitManager {
  private requestQueue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerMinute = 60; // Adjust based on your tier
  private tokensPerMinute = 90000; // Adjust based on your tier
  private currentTokens = 0;
  private windowStart = Date.now();

  async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.requestQueue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart > 60000) {
      this.currentTokens = 0;
      this.windowStart = now;
    }

    const request = this.requestQueue.shift();
    if (request) {
      await request();
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 60000 / this.requestsPerMinute));
    }

    // Continue processing
    this.processQueue();
  }
}
```

### Comprehensive Error Handling

```typescript
import { 
  APIError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  UnprocessableEntityError,
  RateLimitError,
  InternalServerError,
  APIConnectionError,
  APIConnectionTimeoutError
} from 'openai';

async function handleOpenAIRequest<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof AuthenticationError) {
        console.error('Authentication failed:', error.message);
        throw error; // Don't retry auth errors
      }
      
      if (error instanceof PermissionDeniedError) {
        console.error('Permission denied:', error.message);
        throw error; // Don't retry permission errors
      }
      
      if (error instanceof NotFoundError) {
        console.error('Resource not found:', error.message);
        throw error; // Don't retry 404s
      }
      
      if (error instanceof UnprocessableEntityError) {
        console.error('Invalid request:', error.message);
        throw error; // Don't retry validation errors
      }
      
      if (error instanceof RateLimitError) {
        const retryAfter = error.headers?.['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        
        console.warn(`Rate limited. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (error instanceof InternalServerError) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.warn(`Server error. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (error instanceof APIConnectionError || error instanceof APIConnectionTimeoutError) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.warn(`Connection error. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Unknown error
      console.error('Unexpected error:', error);
      throw error;
    }
  }
  
  throw lastError!;
}
```

### Request ID Tracking

```typescript
interface OpenAIResponse {
  _request_id?: string;
}

class RequestTracker {
  private requests: Map<string, {
    timestamp: Date;
    model: string;
    tokens: number;
    cost: number;
    error?: Error;
  }> = new Map();

  trackRequest(response: OpenAIResponse & { usage?: { total_tokens: number } }, model: string) {
    if (response._request_id) {
      this.requests.set(response._request_id, {
        timestamp: new Date(),
        model,
        tokens: response.usage?.total_tokens || 0,
        cost: this.calculateCost(response.usage?.total_tokens || 0, model),
      });
    }
  }

  trackError(requestId: string, error: Error) {
    const request = this.requests.get(requestId);
    if (request) {
      request.error = error;
    }
  }

  private calculateCost(tokens: number, model: string): number {
    const pricing = {
      'gpt-4-turbo-preview': 0.03, // per 1K tokens average
      'gpt-3.5-turbo': 0.002,
      'text-embedding-3-small': 0.00002,
    };
    
    return (tokens / 1000) * (pricing[model] || 0);
  }

  generateReport(): {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    errorRate: number;
  } {
    let totalTokens = 0;
    let totalCost = 0;
    let errors = 0;

    for (const request of this.requests.values()) {
      totalTokens += request.tokens;
      totalCost += request.cost;
      if (request.error) errors++;
    }

    return {
      totalRequests: this.requests.size,
      totalTokens,
      totalCost,
      errorRate: errors / this.requests.size,
    };
  }
}
```

## Cost Optimization

### 1. Model Selection Strategy

```typescript
class ModelSelector {
  static selectOptimalModel(task: {
    complexity: 'low' | 'medium' | 'high';
    maxTokens: number;
    requiresLatestData: boolean;
    budget: number;
  }): string {
    if (task.complexity === 'low' && task.maxTokens < 2000) {
      return 'gpt-3.5-turbo'; // Cheapest option
    }
    
    if (task.complexity === 'high' || task.requiresLatestData) {
      return 'gpt-4-turbo-preview'; // Most capable
    }
    
    if (task.budget < 0.01) {
      return 'gpt-3.5-turbo'; // Budget constraint
    }
    
    return 'gpt-4-turbo-preview'; // Default to best quality
  }
}
```

### 2. Prompt Optimization

```typescript
class PromptOptimizer {
  // Compress prompts without losing essential information
  static compressPrompt(prompt: string): string {
    return prompt
      .replace(/\s+/g, ' ') // Remove extra whitespace
      .replace(/\n{3,}/g, '\n\n') // Limit newlines
      .trim();
  }

  // Use few-shot examples efficiently
  static optimizeFewShotExamples(examples: string[], maxExamples: number = 3): string[] {
    // Select most diverse examples
    return examples.slice(0, maxExamples);
  }

  // Create efficient system prompts
  static createEfficientSystemPrompt(role: string, constraints: string[]): string {
    return `Role: ${role}\nConstraints: ${constraints.join(', ')}`;
  }
}
```

### 3. Caching Strategy

```typescript
import crypto from 'crypto';

class ResponseCache {
  private cache: Map<string, {
    response: any;
    timestamp: number;
    tokens: number;
  }> = new Map();
  
  private readonly TTL = 3600000; // 1 hour

  generateKey(messages: ChatCompletionMessageParam[], model: string): string {
    const content = JSON.stringify({ messages, model });
    return crypto.createHash('md5').update(content).digest('hex');
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.response;
  }

  set(key: string, response: any, tokens: number) {
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      tokens,
    });
  }

  getCacheSavings(): { tokensSaved: number; costSaved: number } {
    let tokensSaved = 0;
    
    for (const [_, value] of this.cache) {
      tokensSaved += value.tokens;
    }
    
    return {
      tokensSaved,
      costSaved: (tokensSaved / 1000) * 0.03, // Assuming GPT-4 pricing
    };
  }
}
```

### 4. Batch Processing

```typescript
class BatchProcessor {
  static async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
      batchSize: number;
      delayBetweenBatches: number;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += options.batchSize) {
      const batch = items.slice(i, i + options.batchSize);
      
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      );
      
      results.push(...batchResults);
      
      if (options.onProgress) {
        options.onProgress(results.length, items.length);
      }
      
      if (i + options.batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches));
      }
    }
    
    return results;
  }
}
```

## Production Best Practices

### 1. Service Architecture

```typescript
import { OpenAI } from 'openai';
import { EventEmitter } from 'events';

export class OpenAIService extends EventEmitter {
  private client: OpenAI;
  private cache: ResponseCache;
  private rateLimiter: RateLimitManager;
  private requestTracker: RequestTracker;
  private tokenCounter: TokenCounter;

  constructor(config: {
    apiKey: string;
    maxRetries?: number;
    timeout?: number;
    cacheEnabled?: boolean;
  }) {
    super();
    
    this.client = new OpenAI({
      apiKey: config.apiKey,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 60000,
    });
    
    this.cache = new ResponseCache();
    this.rateLimiter = new RateLimitManager();
    this.requestTracker = new RequestTracker();
    this.tokenCounter = new TokenCounter();
  }

  async chatCompletion(
    messages: ChatCompletionMessageParam[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      useCache?: boolean;
    } = {}
  ) {
    const model = options.model || 'gpt-4-turbo-preview';
    
    // Check cache
    if (options.useCache) {
      const cacheKey = this.cache.generateKey(messages, model);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.emit('cache_hit', { key: cacheKey });
        return cached;
      }
    }

    // Count tokens
    const inputTokens = this.tokenCounter.countMessageTokens(messages);
    this.emit('tokens_counted', { input: inputTokens });

    // Execute with rate limiting
    const response = await this.rateLimiter.executeWithRateLimit(async () => {
      return await handleOpenAIRequest(async () => {
        const completion = await this.client.chat.completions.create({
          model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 4096,
        });

        // Track request
        this.requestTracker.trackRequest(completion as any, model);
        
        return completion;
      });
    });

    // Cache response
    if (options.useCache && response.usage) {
      const cacheKey = this.cache.generateKey(messages, model);
      this.cache.set(cacheKey, response, response.usage.total_tokens);
    }

    this.emit('completion_success', {
      model,
      tokens: response.usage?.total_tokens,
      requestId: (response as any)._request_id,
    });

    return response;
  }

  async generateEmbedding(
    text: string,
    options: {
      model?: string;
    } = {}
  ) {
    const model = options.model || 'text-embedding-3-small';
    
    return await this.rateLimiter.executeWithRateLimit(async () => {
      return await handleOpenAIRequest(async () => {
        const response = await this.client.embeddings.create({
          model,
          input: text,
        });

        this.requestTracker.trackRequest(response as any, model);
        
        return response.data[0].embedding;
      });
    });
  }

  getMetrics() {
    return {
      ...this.requestTracker.generateReport(),
      ...this.cache.getCacheSavings(),
    };
  }

  cleanup() {
    this.tokenCounter.cleanup();
  }
}
```

### 2. Environment Configuration

```typescript
// config/openai.config.ts
export const openAIConfig = {
  apiKey: process.env.OPENAI_API_KEY!,
  organization: process.env.OPENAI_ORGANIZATION,
  maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
  timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000'),
  defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4-turbo-preview',
  
  rateLimits: {
    requestsPerMinute: parseInt(process.env.OPENAI_RPM || '60'),
    tokensPerMinute: parseInt(process.env.OPENAI_TPM || '90000'),
  },
  
  cache: {
    enabled: process.env.OPENAI_CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.OPENAI_CACHE_TTL || '3600000'),
  },
  
  monitoring: {
    enabled: process.env.OPENAI_MONITORING_ENABLED === 'true',
    logLevel: process.env.OPENAI_LOG_LEVEL || 'info',
  },
};
```

### 3. Monitoring & Observability

```typescript
import winston from 'winston';
import { Counter, Histogram, register } from 'prom-client';

// Prometheus metrics
const openaiRequestCounter = new Counter({
  name: 'openai_requests_total',
  help: 'Total number of OpenAI API requests',
  labelNames: ['model', 'status'],
});

const openaiTokenHistogram = new Histogram({
  name: 'openai_tokens_used',
  help: 'Tokens used per request',
  labelNames: ['model'],
  buckets: [100, 500, 1000, 2000, 4000, 8000, 16000],
});

const openaiRequestDuration = new Histogram({
  name: 'openai_request_duration_seconds',
  help: 'OpenAI API request duration',
  labelNames: ['model', 'operation'],
});

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'openai-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'openai-combined.log' }),
  ],
});

// Monitoring middleware
export function monitorOpenAIRequest(operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const model = args[0]?.model || 'unknown';

      try {
        const result = await originalMethod.apply(this, args);
        
        // Record metrics
        openaiRequestCounter.inc({ model, status: 'success' });
        openaiRequestDuration.observe(
          { model, operation },
          (Date.now() - startTime) / 1000
        );

        if (result.usage) {
          openaiTokenHistogram.observe({ model }, result.usage.total_tokens);
        }

        logger.info('OpenAI request completed', {
          operation,
          model,
          duration: Date.now() - startTime,
          tokens: result.usage?.total_tokens,
        });

        return result;
      } catch (error) {
        openaiRequestCounter.inc({ model, status: 'error' });
        
        logger.error('OpenAI request failed', {
          operation,
          model,
          error: error.message,
          duration: Date.now() - startTime,
        });

        throw error;
      }
    };
  };
}
```

### 4. Testing Strategy

```typescript
// __tests__/openai.service.test.ts
import { OpenAIService } from '../src/services/openai.service';
import { OpenAI } from 'openai';

jest.mock('openai');

describe('OpenAIService', () => {
  let service: OpenAIService;
  let mockClient: jest.Mocked<OpenAI>;

  beforeEach(() => {
    service = new OpenAIService({
      apiKey: 'test-key',
      cacheEnabled: true,
    });
    
    mockClient = (service as any).client;
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('chatCompletion', () => {
    it('should handle successful completion', async () => {
      const mockResponse = {
        choices: [{
          message: { role: 'assistant', content: 'Test response' },
          finish_reason: 'stop',
        }],
        usage: { total_tokens: 100 },
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse as any);

      const result = await service.chatCompletion([
        { role: 'user', content: 'Test message' }
      ]);

      expect(result).toEqual(mockResponse);
    });

    it('should use cache for repeated requests', async () => {
      const messages = [{ role: 'user', content: 'Test message' }];
      const mockResponse = {
        choices: [{ message: { content: 'Cached response' } }],
        usage: { total_tokens: 50 },
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse as any);

      // First call
      await service.chatCompletion(messages, { useCache: true });
      
      // Second call should use cache
      const cached = await service.chatCompletion(messages, { useCache: true });
      
      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(1);
      expect(cached).toEqual(mockResponse);
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      
      mockClient.chat.completions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ choices: [{ message: { content: 'Success' } }] } as any);

      const result = await service.chatCompletion([
        { role: 'user', content: 'Test' }
      ]);

      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });
  });
});
```

### 5. Security Best Practices

```typescript
import crypto from 'crypto';

class SecurityManager {
  // Sanitize user input
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .trim();
  }

  // Encrypt sensitive data
  static encryptApiKey(apiKey: string, encryptionKey: string): string {
    const algorithm = 'aes-256-gcm';
    const salt = crypto.randomBytes(64);
    const key = crypto.pbkdf2Sync(encryptionKey, salt, 2145, 32, 'sha512');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(apiKey, 'utf8'),
      cipher.final(),
    ]);
    
    const tag = cipher.getAuthTag();
    
    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
  }

  // Validate API responses
  static validateResponse(response: any): boolean {
    if (!response || typeof response !== 'object') return false;
    if (!response.choices || !Array.isArray(response.choices)) return false;
    if (response.choices.length === 0) return false;
    
    return response.choices.every(choice => 
      choice.message && 
      typeof choice.message.content === 'string'
    );
  }

  // Rate limit by user
  private static userLimits = new Map<string, {
    requests: number;
    tokens: number;
    resetTime: number;
  }>();

  static checkUserLimit(userId: string, tokens: number): boolean {
    const now = Date.now();
    const userLimit = this.userLimits.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      this.userLimits.set(userId, {
        requests: 1,
        tokens: tokens,
        resetTime: now + 3600000, // 1 hour window
      });
      return true;
    }
    
    if (userLimit.requests >= 100 || userLimit.tokens + tokens > 100000) {
      return false;
    }
    
    userLimit.requests++;
    userLimit.tokens += tokens;
    return true;
  }
}
```

## Integration Examples

### Financial Transaction Categorization

```typescript
import { OpenAIService } from './services/openai.service';

export class TransactionCategorizationService {
  constructor(private openai: OpenAIService) {}

  async categorizeTransaction(transaction: {
    description: string;
    amount: number;
    currency: string;
    date: Date;
  }) {
    const systemPrompt = `You are a financial assistant specializing in transaction categorization.
Analyze transactions and provide:
1. Primary category
2. Subcategory
3. Confidence score (0-1)
4. Tax relevance
5. Business expense eligibility`;

    const userPrompt = `Categorize this transaction:
Description: ${transaction.description}
Amount: ${transaction.amount} ${transaction.currency}
Date: ${transaction.date.toISOString()}`;

    const response = await this.openai.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      model: 'gpt-3.5-turbo', // Use cheaper model for simple categorization
      temperature: 0.3, // Lower temperature for consistency
      maxTokens: 200,
    });

    return this.parseCategorizationResponse(response.choices[0].message.content);
  }

  private parseCategorizationResponse(content: string) {
    // Parse structured response
    const lines = content.split('\n');
    return {
      category: this.extractValue(lines, 'Category'),
      subcategory: this.extractValue(lines, 'Subcategory'),
      confidence: parseFloat(this.extractValue(lines, 'Confidence') || '0'),
      taxRelevant: this.extractValue(lines, 'Tax Relevant') === 'Yes',
      businessExpense: this.extractValue(lines, 'Business Expense') === 'Yes',
    };
  }

  private extractValue(lines: string[], key: string): string {
    const line = lines.find(l => l.includes(key));
    return line ? line.split(':')[1]?.trim() || '' : '';
  }
}
```

### Document Q&A System

```typescript
export class DocumentQAService {
  constructor(private openai: OpenAIService) {}

  async answerQuestion(
    question: string,
    documentChunks: Array<{ text: string; embedding: number[] }>,
    options: { maxChunks?: number } = {}
  ) {
    // Find relevant chunks
    const questionEmbedding = await this.openai.generateEmbedding(question);
    
    const relevantChunks = documentChunks
      .map(chunk => ({
        ...chunk,
        similarity: this.cosineSimilarity(questionEmbedding, chunk.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.maxChunks || 5);

    // Build context
    const context = relevantChunks
      .map(chunk => chunk.text)
      .join('\n\n---\n\n');

    // Generate answer
    const systemPrompt = `You are a helpful assistant answering questions based on provided document context.
Only use information from the context to answer. If the answer isn't in the context, say so.`;

    const userPrompt = `Context:\n${context}\n\nQuestion: ${question}`;

    const response = await this.openai.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.5,
      maxTokens: 500,
    });

    return {
      answer: response.choices[0].message.content,
      sources: relevantChunks.map(chunk => ({
        text: chunk.text.substring(0, 200) + '...',
        similarity: chunk.similarity
      })),
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

## Conclusion

This guide covers the essential aspects of using OpenAI API v5.x in production environments. Key takeaways:

1. **Always implement proper error handling** with retries and exponential backoff
2. **Monitor token usage and costs** to avoid surprises
3. **Use streaming** for better user experience with long responses
4. **Implement caching** to reduce costs and improve performance
5. **Choose the right model** based on task complexity and budget
6. **Secure your API keys** and implement user-based rate limiting
7. **Test thoroughly** with mocked responses and edge cases

For the latest updates and additional features, refer to the official OpenAI documentation at https://platform.openai.com/docs/api-reference.