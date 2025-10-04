import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from '../core/Provider';
import type { 
  ChatRequest, 
  ChatResponse, 
  EmbedRequest, 
  EmbedResponse, 
  ModelInfo,
  Capability 
} from '../types';

export class AnthropicProvider extends BaseProvider {
  name = 'anthropic';
  capabilities: Capability[] = ['chat', 'json', 'vision'];
  
  private client: Anthropic;
  
  constructor(apiKey: string) {
    super();
    this.client = new Anthropic({ apiKey });
  }

  async models(): Promise<ModelInfo[]> {
    return [
      {
        id: 'claude-3-5-haiku-20241022',
        capabilities: ['chat', 'json'],
        contextWindow: 200000,
        costPer1kInput: 0.001,
        costPer1kOutput: 0.005
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        capabilities: ['chat', 'json', 'vision'],
        contextWindow: 200000,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015
      },
      {
        id: 'claude-3-opus-20240229',
        capabilities: ['chat', 'json', 'vision'],
        contextWindow: 200000,
        costPer1kInput: 0.015,
        costPer1kOutput: 0.075
      }
    ];
  }

  async chat(req: ChatRequest, modelId: string): Promise<ChatResponse> {
    const systemMessage = req.messages.find(m => m.role === 'system');
    const otherMessages = req.messages.filter(m => m.role !== 'system');

    const response = await this.withRetry(async () => {
      return await this.client.messages.create({
        model: modelId,
        max_tokens: req.maxTokens || 4096,
        temperature: req.temperature,
        system: systemMessage?.content,
        messages: otherMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
      });
    });

    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');

    return {
      output: content,
      tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens
      },
      raw: response
    };
  }

  async embed(_req: EmbedRequest, _modelId: string): Promise<EmbedResponse> {
    throw new Error('Anthropic does not support embeddings');
  }
}