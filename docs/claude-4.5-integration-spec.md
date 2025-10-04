# Claude Sonnet 4.5 - Technical Integration Specification
**Service**: ai-service
**Spec Version**: 1.0
**Date**: October 2, 2025
**Status**: Draft - Ready for Implementation

---

## 1. Overview

This specification defines the technical implementation for integrating Claude Sonnet 4.5 into ai-service, including API changes, configuration updates, prompt caching, A/B testing, and migration strategy.

---

## 2. Model Configuration

### 2.1 Model Constants

**File**: `src/config/models.ts`

```typescript
export enum ClaudeModel {
  SONNET_3_5 = 'claude-3-5-sonnet-20240620',
  SONNET_4 = 'claude-sonnet-4',
  SONNET_4_5 = 'claude-sonnet-4-5-20250929',
  OPUS_4 = 'claude-opus-4',
  OPUS_4_1 = 'claude-opus-4-1',
}

export const MODEL_SPECS = {
  [ClaudeModel.SONNET_4]: {
    contextWindow: 200_000,
    maxOutput: 16_384,
    inputPrice: 3.0, // per MTok
    outputPrice: 15.0,
    supportsCaching: false,
    supportsMemory: false,
    supportsExtendedThinking: false,
  },
  [ClaudeModel.SONNET_4_5]: {
    contextWindow: 200_000,
    maxOutput: 64_000,
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritePrice5m: 3.75,
    cacheWritePrice1h: 6.0,
    cacheReadPrice: 0.30,
    supportsCaching: true,
    supportsMemory: true, // beta
    supportsExtendedThinking: true,
    minCacheableTokens: 1024,
    maxCacheBreakpoints: 4,
  },
} as const;

export const DEFAULT_MODEL = ClaudeModel.SONNET_4_5;
```

---

### 2.2 Environment Configuration

**File**: `.env`

```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Model Selection
CLAUDE_MODEL=claude-sonnet-4-5-20250929
ENABLE_PROMPT_CACHING=true
ENABLE_MEMORY_TOOL=false  # beta, disabled by default
ENABLE_EXTENDED_THINKING=true

# A/B Testing
AB_TEST_ENABLED=true
AB_TEST_ROLLOUT_PERCENTAGE=10  # Start at 10%
AB_TEST_CONTROL_MODEL=claude-sonnet-4
AB_TEST_EXPERIMENT_MODEL=claude-sonnet-4-5-20250929

# Caching Configuration
CACHE_DEFAULT_TTL=5m  # 5m or 1h
CACHE_MIN_TOKENS=1024
CACHE_MAX_BREAKPOINTS=4

# Cost Controls
MAX_MONTHLY_COST_USD=1500
COST_ALERT_THRESHOLD_USD=1200
ENABLE_COST_LIMITS=true
```

---

## 3. API Client Updates

### 3.1 Anthropic Client Wrapper

**File**: `src/clients/anthropic.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { ClaudeModel, MODEL_SPECS } from '../config/models';
import { CacheControl, MessageCreateParams } from './types';

export class AnthropicClient {
  private client: Anthropic;
  private model: ClaudeModel;
  private enableCaching: boolean;

  constructor(config: {
    apiKey: string;
    model?: ClaudeModel;
    enableCaching?: boolean;
  }) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model || ClaudeModel.SONNET_4_5;
    this.enableCaching = config.enableCaching ?? true;
  }

  async createMessage(params: MessageCreateParams) {
    const modelSpec = MODEL_SPECS[this.model];

    // Validate context window
    const estimatedTokens = this.estimateTokens(params);
    if (estimatedTokens > modelSpec.contextWindow) {
      throw new Error(
        `Estimated tokens (${estimatedTokens}) exceed context window (${modelSpec.contextWindow})`
      );
    }

    // Apply caching if enabled and supported
    const finalParams =
      this.enableCaching && modelSpec.supportsCaching
        ? this.applyCaching(params)
        : params;

    // Track costs before request
    const costEstimate = this.estimateCost(finalParams);
    await this.checkCostLimits(costEstimate);

    // Make request with error handling
    try {
      const response = await this.client.messages.create({
        model: this.model,
        ...finalParams,
      });

      // Track actual costs
      await this.recordCost(response);

      return response;
    } catch (error) {
      if (error.status === 529) {
        // Context window exceeded
        throw new ContextWindowExceededError(error.message);
      }
      throw error;
    }
  }

  private applyCaching(params: MessageCreateParams): MessageCreateParams {
    const modelSpec = MODEL_SPECS[this.model];
    if (!modelSpec.supportsCaching) return params;

    // Apply cache control to system prompts
    if (params.system && Array.isArray(params.system)) {
      params.system = params.system.map((block, index) => {
        if (block.type === 'text' && block.text.length > 200) {
          // Cache large system prompts
          return {
            ...block,
            cache_control: { type: 'ephemeral' as const },
          };
        }
        return block;
      });
    }

    // Apply cache control to tools if stable
    if (params.tools && params.tools.length > 0) {
      const lastToolIndex = Math.min(
        params.tools.length - 1,
        modelSpec.maxCacheBreakpoints - 1
      );

      params.tools[lastToolIndex] = {
        ...params.tools[lastToolIndex],
        cache_control: { type: 'ephemeral' as const },
      };
    }

    return params;
  }

  private estimateTokens(params: MessageCreateParams): number {
    // Rough estimation: 1 token ≈ 4 characters
    let total = 0;

    if (params.system) {
      const systemText = Array.isArray(params.system)
        ? params.system.map(b => b.text).join('')
        : params.system;
      total += Math.ceil(systemText.length / 4);
    }

    if (params.messages) {
      for (const msg of params.messages) {
        if (typeof msg.content === 'string') {
          total += Math.ceil(msg.content.length / 4);
        }
      }
    }

    if (params.tools) {
      const toolsJson = JSON.stringify(params.tools);
      total += Math.ceil(toolsJson.length / 4);
    }

    return total;
  }

  private estimateCost(params: MessageCreateParams): number {
    const spec = MODEL_SPECS[this.model];
    const inputTokens = this.estimateTokens(params);
    const outputTokens = params.max_tokens || 4096;

    let inputCost = (inputTokens / 1_000_000) * spec.inputPrice;

    // Adjust for caching
    if (this.enableCaching && spec.supportsCaching) {
      // Assume 30% cache writes, 70% cache reads
      const cacheableTokens = inputTokens * 0.6; // 60% of input is cacheable
      const cacheWriteCost =
        (cacheableTokens * 0.3 / 1_000_000) * spec.cacheWritePrice5m;
      const cacheReadCost =
        (cacheableTokens * 0.7 / 1_000_000) * spec.cacheReadPrice;
      const uncachedCost =
        (inputTokens * 0.4 / 1_000_000) * spec.inputPrice;

      inputCost = cacheWriteCost + cacheReadCost + uncachedCost;
    }

    const outputCost = (outputTokens / 1_000_000) * spec.outputPrice;

    return inputCost + outputCost;
  }

  private async checkCostLimits(estimatedCost: number): Promise<void> {
    const monthlySpend = await this.getMonthlySpend();
    const maxCost = parseFloat(process.env.MAX_MONTHLY_COST_USD || '1500');

    if (monthlySpend + estimatedCost > maxCost) {
      throw new CostLimitExceededError(
        `Monthly cost limit exceeded: $${monthlySpend.toFixed(2)} + $${estimatedCost.toFixed(2)} > $${maxCost}`
      );
    }
  }

  private async recordCost(response: Anthropic.Messages.Message): Promise<void> {
    const spec = MODEL_SPECS[this.model];
    const usage = response.usage;

    let inputCost = 0;
    if (usage.cache_creation_input_tokens) {
      inputCost += (usage.cache_creation_input_tokens / 1_000_000) * spec.cacheWritePrice5m;
    }
    if (usage.cache_read_input_tokens) {
      inputCost += (usage.cache_read_input_tokens / 1_000_000) * spec.cacheReadPrice;
    }
    if (usage.input_tokens) {
      const uncachedTokens = usage.input_tokens - (usage.cache_read_input_tokens || 0);
      inputCost += (uncachedTokens / 1_000_000) * spec.inputPrice;
    }

    const outputCost = (usage.output_tokens / 1_000_000) * spec.outputPrice;
    const totalCost = inputCost + outputCost;

    await this.metrics.recordCost({
      model: this.model,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheWriteTokens: usage.cache_creation_input_tokens || 0,
      cacheReadTokens: usage.cache_read_input_tokens || 0,
      cost: totalCost,
      timestamp: new Date(),
    });
  }

  private async getMonthlySpend(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return await this.metrics.getTotalCost({
      from: startOfMonth,
      to: new Date(),
    });
  }
}
```

---

## 4. A/B Testing Implementation

### 4.1 Feature Flag System

**File**: `src/lib/ab-testing.ts`

```typescript
import crypto from 'crypto';
import { ClaudeModel } from '../config/models';

export interface ABTestConfig {
  testName: string;
  enabled: boolean;
  rolloutPercentage: number;
  controlModel: ClaudeModel;
  experimentModel: ClaudeModel;
}

export class ABTestManager {
  private config: ABTestConfig;

  constructor() {
    this.config = {
      testName: 'sonnet-4-5-rollout',
      enabled: process.env.AB_TEST_ENABLED === 'true',
      rolloutPercentage: parseInt(
        process.env.AB_TEST_ROLLOUT_PERCENTAGE || '10'
      ),
      controlModel: (process.env.AB_TEST_CONTROL_MODEL as ClaudeModel) || ClaudeModel.SONNET_4,
      experimentModel: (process.env.AB_TEST_EXPERIMENT_MODEL as ClaudeModel) || ClaudeModel.SONNET_4_5,
    };
  }

  getModelForUser(userId: string): ClaudeModel {
    if (!this.config.enabled) {
      return this.config.experimentModel; // Use experiment model if not A/B testing
    }

    const bucket = this.getUserBucket(userId);
    return bucket < this.config.rolloutPercentage
      ? this.config.experimentModel
      : this.config.controlModel;
  }

  private getUserBucket(userId: string): number {
    // Deterministic hash-based bucketing
    const hash = crypto
      .createHash('sha256')
      .update(`${userId}:${this.config.testName}`)
      .digest();

    const bucketValue = hash.readUInt32BE(0);
    return bucketValue % 100; // 0-99
  }

  isInExperiment(userId: string): boolean {
    return this.getModelForUser(userId) === this.config.experimentModel;
  }

  async recordVariant(userId: string, model: ClaudeModel): Promise<void> {
    await this.metrics.recordABVariant({
      userId,
      testName: this.config.testName,
      variant: model === this.config.experimentModel ? 'experiment' : 'control',
      model,
      timestamp: new Date(),
    });
  }
}
```

---

### 4.2 Metrics Collection

**File**: `src/lib/metrics.ts`

```typescript
import { Redis } from 'ioredis';

interface ModelMetrics {
  model: string;
  totalRequests: number;
  totalCost: number;
  averageLatency: number;
  errorRate: number;
  cacheHitRate: number;
}

export class MetricsCollector {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  async recordRequest(data: {
    userId: string;
    model: string;
    latencyMs: number;
    cost: number;
    error?: boolean;
    cacheHit?: boolean;
  }): Promise<void> {
    const key = `metrics:${data.model}:${this.getDateKey()}`;

    await this.redis
      .pipeline()
      .hincrby(key, 'requests', 1)
      .hincrbyfloat(key, 'totalCost', data.cost)
      .hincrbyfloat(key, 'totalLatency', data.latencyMs)
      .hincrby(key, 'errors', data.error ? 1 : 0)
      .hincrby(key, 'cacheHits', data.cacheHit ? 1 : 0)
      .expire(key, 86400 * 30) // 30 days
      .exec();
  }

  async getModelMetrics(model: string): Promise<ModelMetrics> {
    const key = `metrics:${model}:${this.getDateKey()}`;
    const data = await this.redis.hgetall(key);

    const requests = parseInt(data.requests || '0');
    const totalCost = parseFloat(data.totalCost || '0');
    const totalLatency = parseFloat(data.totalLatency || '0');
    const errors = parseInt(data.errors || '0');
    const cacheHits = parseInt(data.cacheHits || '0');

    return {
      model,
      totalRequests: requests,
      totalCost,
      averageLatency: requests > 0 ? totalLatency / requests : 0,
      errorRate: requests > 0 ? errors / requests : 0,
      cacheHitRate: requests > 0 ? cacheHits / requests : 0,
    };
  }

  async compareModels(
    modelA: string,
    modelB: string
  ): Promise<{
    modelA: ModelMetrics;
    modelB: ModelMetrics;
    winner: string;
  }> {
    const [metricsA, metricsB] = await Promise.all([
      this.getModelMetrics(modelA),
      this.getModelMetrics(modelB),
    ]);

    // Simple scoring: lower cost, lower latency, lower error rate = better
    const scoreA =
      (metricsB.totalCost / metricsA.totalCost) +
      (metricsB.averageLatency / metricsA.averageLatency) +
      (metricsB.errorRate / (metricsA.errorRate || 0.001));

    const scoreB = 3; // baseline

    return {
      modelA: metricsA,
      modelB: metricsB,
      winner: scoreA > scoreB ? modelA : modelB,
    };
  }

  private getDateKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}
```

---

## 5. Prompt Caching Strategy

### 5.1 System Prompt Caching

**File**: `src/prompts/cached-prompts.ts`

```typescript
export interface CachedPrompt {
  text: string;
  cacheable: boolean;
  estimatedTokens: number;
}

export const FINANCIAL_ANALYSIS_PROMPT: CachedPrompt = {
  text: `You are a financial analysis expert. Your role is to analyze transactions,
identify patterns, and provide actionable insights.

Guidelines:
- Be precise with numbers
- Cite specific transactions when making observations
- Provide both summary and detailed analysis
- Flag anomalies and potential fraud
- Suggest optimizations

Output format:
1. Executive Summary (2-3 sentences)
2. Key Findings (bulleted list)
3. Detailed Analysis (by category)
4. Recommendations (actionable)
5. Risk Factors (if any)`,
  cacheable: true,
  estimatedTokens: 1500,
};

export const TRANSACTION_SCHEMA_PROMPT: CachedPrompt = {
  text: `Transaction Schema:
{
  id: string,
  amount: number,
  currency: string,
  date: ISO8601,
  merchant: string,
  category: string,
  accountId: string,
  pending: boolean,
  metadata: object
}

Categories: dining, groceries, transport, utilities, entertainment, health, shopping, income, transfer, other`,
  cacheable: true,
  estimatedTokens: 800,
};

export function buildCachedSystemPrompt(
  prompts: CachedPrompt[]
): Anthropic.SystemMessage[] {
  return prompts.map(prompt => ({
    type: 'text' as const,
    text: prompt.text,
    cache_control: prompt.cacheable
      ? { type: 'ephemeral' as const }
      : undefined,
  }));
}
```

---

### 5.2 Tool Definition Caching

**File**: `src/tools/cached-tools.ts`

```typescript
import { ClaudeModel, MODEL_SPECS } from '../config/models';

export function buildCachedTools(
  tools: Anthropic.Tool[],
  model: ClaudeModel
): Anthropic.Tool[] {
  const spec = MODEL_SPECS[model];

  if (!spec.supportsCaching || tools.length === 0) {
    return tools;
  }

  // Cache the last tool (or last N tools if we have multiple breakpoints)
  const maxBreakpoints = Math.min(
    spec.maxCacheBreakpoints,
    tools.length
  );

  return tools.map((tool, index) => {
    const shouldCache = index >= tools.length - maxBreakpoints;

    return {
      ...tool,
      cache_control: shouldCache
        ? { type: 'ephemeral' as const }
        : undefined,
    };
  });
}
```

---

## 6. Memory Tool Integration

### 6.1 Memory Tool Configuration

**File**: `src/tools/memory-tool.ts`

```typescript
export const MEMORY_TOOL: Anthropic.Tool = {
  name: 'memory',
  description: 'Store and retrieve user preferences, context, and historical information across conversations',
  input_schema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['store', 'retrieve', 'delete'],
        description: 'Operation to perform on memory'
      },
      key: {
        type: 'string',
        description: 'Memory key (e.g., "preferred_currency", "budget_goals")'
      },
      value: {
        type: 'string',
        description: 'Value to store (for store operation)'
      }
    },
    required: ['operation', 'key']
  }
};

export function enableMemoryTool(
  model: ClaudeModel
): Anthropic.Tool | null {
  const spec = MODEL_SPECS[model];

  if (!spec.supportsMemory) {
    return null;
  }

  if (process.env.ENABLE_MEMORY_TOOL !== 'true') {
    return null;
  }

  return MEMORY_TOOL;
}
```

---

## 7. Extended Thinking Implementation

### 7.1 Extended Thinking Configuration

**File**: `src/lib/extended-thinking.ts`

```typescript
export enum ThinkingMode {
  FAST = 'fast',
  MEDIUM = 'medium',
  DEEP = 'deep',
  VERY_DEEP = 'very_deep',
}

export const THINKING_BUDGETS = {
  [ThinkingMode.FAST]: 0, // No extended thinking
  [ThinkingMode.MEDIUM]: 8_000,
  [ThinkingMode.DEEP]: 16_000,
  [ThinkingMode.VERY_DEEP]: 32_000,
} as const;

export interface ExtendedThinkingParams {
  mode: ThinkingMode;
  showThinking?: boolean; // Show thinking process to user
}

export function buildExtendedThinkingParams(
  config: ExtendedThinkingParams
): Partial<Anthropic.MessageCreateParams> {
  const budget = THINKING_BUDGETS[config.mode];

  if (budget === 0) {
    return {}; // Fast mode, no extended thinking
  }

  return {
    thinking_budget: budget,
    extended_thinking: true,
    // Note: Check latest API docs for exact parameter names
  };
}
```

---

## 8. Error Handling

### 8.1 Custom Error Classes

**File**: `src/errors/anthropic-errors.ts`

```typescript
export class ContextWindowExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContextWindowExceededError';
  }
}

export class CostLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CostLimitExceededError';
  }
}

export class CachingNotSupportedError extends Error {
  constructor(model: string) {
    super(`Model ${model} does not support prompt caching`);
    this.name = 'CachingNotSupportedError';
  }
}

export function handleAnthropicError(error: any): never {
  if (error.status === 529) {
    throw new ContextWindowExceededError(error.message);
  }

  if (error.status === 529 && error.error?.type === 'overloaded_error') {
    // Retry logic
    throw new Error('Anthropic API overloaded, retry later');
  }

  if (error.status === 401) {
    throw new Error('Invalid Anthropic API key');
  }

  if (error.status === 429) {
    throw new Error('Rate limit exceeded');
  }

  throw error;
}
```

---

## 9. Migration Strategy

### 9.1 Backward Compatibility

**File**: `src/lib/migration.ts`

```typescript
export function migrateToSonnet45(
  oldParams: any
): Anthropic.MessageCreateParams {
  // Handle deprecated parameters
  if (oldParams.temperature && oldParams.top_p) {
    console.warn(
      'Cannot specify both temperature and top_p in Sonnet 4.5, using temperature only'
    );
    delete oldParams.top_p;
  }

  // Ensure model is updated
  if (oldParams.model === 'claude-sonnet-4') {
    oldParams.model = ClaudeModel.SONNET_4_5;
  }

  return oldParams;
}

export function shouldMigrate(currentModel: string): boolean {
  return [
    'claude-3-5-sonnet-20240620',
    'claude-sonnet-4',
  ].includes(currentModel);
}
```

---

### 9.2 Rollback Mechanism

**File**: `src/lib/rollback.ts`

```typescript
export class RollbackManager {
  async rollback(reason: string): Promise<void> {
    console.error(`Rolling back to Sonnet 4: ${reason}`);

    // Update environment variable
    process.env.CLAUDE_MODEL = ClaudeModel.SONNET_4;
    process.env.AB_TEST_ROLLOUT_PERCENTAGE = '0';

    // Notify team
    await this.sendAlert({
      severity: 'high',
      message: `Rolled back to Sonnet 4: ${reason}`,
      timestamp: new Date(),
    });

    // Record rollback event
    await this.metrics.recordEvent({
      type: 'rollback',
      model: ClaudeModel.SONNET_4_5,
      reason,
    });
  }

  async shouldRollback(): Promise<boolean> {
    const metrics = await this.metrics.getModelMetrics(ClaudeModel.SONNET_4_5);

    // Rollback conditions
    if (metrics.errorRate > 0.05) {
      await this.rollback('Error rate >5%');
      return true;
    }

    if (metrics.averageLatency > 10000) {
      // 10 seconds
      await this.rollback('Latency >10s');
      return true;
    }

    const monthlyCost = await this.metrics.getMonthlySpend();
    const expectedCost = 1000; // Expected ~$1000/month
    if (monthlyCost > expectedCost * 1.5) {
      await this.rollback(`Cost >50% expected: $${monthlyCost}`);
      return true;
    }

    return false;
  }
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

**File**: `src/__tests__/anthropic-client.test.ts`

```typescript
import { AnthropicClient } from '../clients/anthropic';
import { ClaudeModel } from '../config/models';

describe('AnthropicClient', () => {
  describe('prompt caching', () => {
    it('should apply cache control to system prompts', () => {
      const client = new AnthropicClient({
        apiKey: 'test-key',
        model: ClaudeModel.SONNET_4_5,
        enableCaching: true,
      });

      const params = {
        system: [
          {
            type: 'text' as const,
            text: 'Long system prompt...'.repeat(100),
          },
        ],
        messages: [{ role: 'user' as const, content: 'Hello' }],
        max_tokens: 1024,
      };

      const cachedParams = client['applyCaching'](params);

      expect(cachedParams.system[0]).toHaveProperty('cache_control');
      expect(cachedParams.system[0].cache_control).toEqual({
        type: 'ephemeral',
      });
    });

    it('should not cache short prompts', () => {
      const client = new AnthropicClient({
        apiKey: 'test-key',
        model: ClaudeModel.SONNET_4_5,
        enableCaching: true,
      });

      const params = {
        system: [{ type: 'text' as const, text: 'Short' }],
        messages: [{ role: 'user' as const, content: 'Hello' }],
        max_tokens: 1024,
      };

      const cachedParams = client['applyCaching'](params);

      expect(cachedParams.system[0]).not.toHaveProperty('cache_control');
    });
  });

  describe('cost estimation', () => {
    it('should estimate costs with caching', () => {
      const client = new AnthropicClient({
        apiKey: 'test-key',
        model: ClaudeModel.SONNET_4_5,
        enableCaching: true,
      });

      const params = {
        system: [
          {
            type: 'text' as const,
            text: 'x'.repeat(4000), // ~1000 tokens
          },
        ],
        messages: [{ role: 'user' as const, content: 'Hello' }],
        max_tokens: 1024,
      };

      const cost = client['estimateCost'](params);

      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(1); // Should be <$1
    });
  });
});
```

---

### 10.2 Integration Tests

**File**: `src/__tests__/integration/sonnet-4-5.test.ts`

```typescript
import { AnthropicClient } from '../../clients/anthropic';
import { ClaudeModel } from '../../config/models';

describe('Sonnet 4.5 Integration', () => {
  let client: AnthropicClient;

  beforeEach(() => {
    client = new AnthropicClient({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: ClaudeModel.SONNET_4_5,
    });
  });

  it('should generate response with Sonnet 4.5', async () => {
    const response = await client.createMessage({
      messages: [{ role: 'user', content: 'What is 2+2?' }],
      max_tokens: 100,
    });

    expect(response.content[0].type).toBe('text');
    expect(response.model).toBe(ClaudeModel.SONNET_4_5);
  });

  it('should use prompt caching', async () => {
    const systemPrompt = {
      type: 'text' as const,
      text: 'You are a helpful assistant. '.repeat(300), // ~1500 tokens
      cache_control: { type: 'ephemeral' as const },
    };

    // First request - should create cache
    const response1 = await client.createMessage({
      system: [systemPrompt],
      messages: [{ role: 'user', content: 'Hello 1' }],
      max_tokens: 100,
    });

    expect(response1.usage.cache_creation_input_tokens).toBeGreaterThan(0);

    // Second request - should read from cache
    const response2 = await client.createMessage({
      system: [systemPrompt],
      messages: [{ role: 'user', content: 'Hello 2' }],
      max_tokens: 100,
    });

    expect(response2.usage.cache_read_input_tokens).toBeGreaterThan(0);
  }, 30000);
});
```

---

## 11. Monitoring & Observability

### 11.1 Grafana Dashboard

**File**: `monitoring/grafana-dashboard.json`

```json
{
  "dashboard": {
    "title": "Claude Sonnet 4.5 Monitoring",
    "panels": [
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "rate(cache_hits_total[5m]) / rate(requests_total[5m])"
          }
        ]
      },
      {
        "title": "Cost Per Request",
        "targets": [
          {
            "expr": "rate(total_cost[5m]) / rate(requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(errors_total[5m]) / rate(requests_total[5m])"
          }
        ]
      },
      {
        "title": "Latency P95",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

---

## 12. Deployment Checklist

### Phase 1: Preparation (Day 1-2)
- [ ] Update dependencies (`@anthropic-ai/sdk` to latest)
- [ ] Add environment variables to `.env`
- [ ] Deploy updated config to staging
- [ ] Run unit tests
- [ ] Run integration tests

### Phase 2: Staging Deployment (Day 3-5)
- [ ] Deploy to staging environment
- [ ] Enable A/B testing (10% rollout)
- [ ] Monitor metrics for 48 hours
- [ ] Verify cache hit rates >60%
- [ ] Confirm cost reduction >15%
- [ ] Check error rates <1%

### Phase 3: Production Rollout (Week 2-4)
- [ ] Deploy to production (10% rollout)
- [ ] Monitor for 3 days
- [ ] Increase to 25% if metrics good
- [ ] Monitor for 3 days
- [ ] Increase to 50%
- [ ] Monitor for 3 days
- [ ] Increase to 75%
- [ ] Monitor for 3 days
- [ ] Full rollout to 100%

### Phase 4: Optimization (Week 5+)
- [ ] Analyze cache performance
- [ ] Optimize prompt structure
- [ ] Enable memory tool (beta)
- [ ] Test extended thinking
- [ ] Document learnings

---

## 13. Success Criteria

### Technical Metrics
- ✅ Cache hit rate >70%
- ✅ Error rate <1%
- ✅ Latency P95 <3 seconds
- ✅ Zero critical bugs

### Cost Metrics
- ✅ Cost reduction >15% (Phase 1)
- ✅ Monthly spend <$1,000
- ✅ Cost per request <$0.02

### Quality Metrics
- ✅ Response quality ≥ Sonnet 4
- ✅ User satisfaction maintained
- ✅ No user complaints about quality

---

## 14. Documentation Updates

### Files to Update
- [ ] `README.md` - Update model version
- [ ] `API.md` - Document new parameters
- [ ] `DEPLOYMENT.md` - Add migration guide
- [ ] `MONITORING.md` - Add dashboard info
- [ ] `CHANGELOG.md` - Document changes

---

**Specification Owner**: AI Platform Team
**Implementation Lead**: TBD
**Target Completion**: October 31, 2025
**Status**: Ready for Implementation
