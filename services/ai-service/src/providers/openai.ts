import OpenAI from 'openai';
import { BaseProvider } from '../core/Provider';
import type { 
  ChatRequest, 
  ChatResponse, 
  EmbedRequest, 
  EmbedResponse, 
  ModelInfo,
  Capability 
} from '../types';

export class OpenAIProvider extends BaseProvider {
  name = 'openai';
  capabilities: Capability[] = ['chat', 'json', 'embed', 'toolcall', 'vision'];
  
  private client: OpenAI;
  
  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({ apiKey });
  }

  async models(): Promise<ModelInfo[]> {
    return [
      {
        id: 'gpt-4o-mini',
        capabilities: ['chat', 'json', 'toolcall', 'vision'],
        contextWindow: 128000,
        costPer1kInput: 0.00015,
        costPer1kOutput: 0.0006
      },
      {
        id: 'gpt-4o',
        capabilities: ['chat', 'json', 'toolcall', 'vision'],
        contextWindow: 128000,
        costPer1kInput: 0.0025,
        costPer1kOutput: 0.01
      },
      {
        id: 'gpt-4-turbo',
        capabilities: ['chat', 'json', 'toolcall', 'vision'],
        contextWindow: 128000,
        costPer1kInput: 0.01,
        costPer1kOutput: 0.03
      },
      {
        id: 'text-embedding-3-small',
        capabilities: ['embed'],
        contextWindow: 8191,
        costPer1kInput: 0.00002,
        costPer1kOutput: 0
      },
      {
        id: 'text-embedding-3-large',
        capabilities: ['embed'],
        contextWindow: 8191,
        costPer1kInput: 0.00013,
        costPer1kOutput: 0
      }
    ];
  }

  async chat(req: ChatRequest, modelId: string): Promise<ChatResponse> {
    const response = await this.withRetry(async () => {
      return await this.client.chat.completions.create({
        model: modelId,
        messages: req.messages as any,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        response_format: req.json ? { type: 'json_object' } : undefined,
        tools: req.tools
      });
    });

    const message = response.choices[0].message;
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      output: message.content || '',
      tokens: {
        input: usage.prompt_tokens,
        output: usage.completion_tokens,
        total: usage.total_tokens
      },
      toolCalls: message.tool_calls,
      raw: response
    };
  }

  async embed(req: EmbedRequest, modelId: string): Promise<EmbedResponse> {
    this.validateCapability('embed');
    
    const input = Array.isArray(req.input) ? req.input : [req.input];
    
    const response = await this.withRetry(async () => {
      return await this.client.embeddings.create({
        model: modelId,
        input
      });
    });

    return {
      vectors: response.data.map(d => d.embedding),
      dimensions: response.data[0].embedding.length,
      model: modelId
    };
  }
}