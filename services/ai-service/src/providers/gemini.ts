import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseProvider } from '../core/Provider';
import type {
  ChatRequest,
  ChatResponse,
  ModelInfo,
  Capability
} from '../types';

export class GeminiProvider extends BaseProvider {
  name = 'gemini';
  capabilities: Capability[] = ['chat', 'json', 'vision'];

  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    super();
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async models(): Promise<ModelInfo[]> {
    return [
      {
        id: 'gemini-2.5-flash',
        capabilities: ['chat', 'json', 'vision'],
        contextWindow: 1000000,
        costPer1kInput: 0.000075,
        costPer1kOutput: 0.0003
      },
      {
        id: 'gemini-2.5-pro',
        capabilities: ['chat', 'json', 'vision'],
        contextWindow: 2000000,
        costPer1kInput: 0.0035,
        costPer1kOutput: 0.0105
      },
      {
        id: 'gemini-2.0-flash',
        capabilities: ['chat', 'json'],
        contextWindow: 32000,
        costPer1kInput: 0.0005,
        costPer1kOutput: 0.0015
      }
    ];
  }

  async chat(req: ChatRequest, modelId: string): Promise<ChatResponse> {
    const model = this.client.getGenerativeModel({ model: modelId });

    // Convert messages to Gemini format
    const parts: any[] = [];
    let systemPrompt = '';

    for (const message of req.messages) {
      if (message.role === 'system') {
        systemPrompt = message.content;
      } else if (message.role === 'user') {
        parts.push({ text: message.content });
      } else if (message.role === 'assistant') {
        parts.push({ text: message.content });
      }
    }

    // Prepend system prompt if exists
    if (systemPrompt) {
      parts.unshift({ text: `System: ${systemPrompt}\n\n` });
    }

    try {
      const response = await this.withRetry(async () => {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: req.temperature || 0.7,
            maxOutputTokens: req.maxTokens || 1024,
            topP: 0.95,
            topK: 40,
          },
        });
        return result;
      });

      const text = response.response.text();
      const candidates = response.response.candidates || [];
      const finishReason = candidates[0]?.finishReason;
      const usageMetadata = response.response.usageMetadata;

      // Log token usage for debugging
      if (usageMetadata) {
        console.log(`Token usage for ${modelId}:`, {
          prompt: usageMetadata.promptTokenCount,
          candidates: usageMetadata.candidatesTokenCount,
          total: usageMetadata.totalTokenCount,
          finishReason
        });
      }

      // Handle MAX_TOKENS as a special case - likely due to thoughts consuming tokens
      if (finishReason === 'MAX_TOKENS' && !text) {
        console.warn(`${modelId} hit MAX_TOKENS with empty response. Total tokens: ${usageMetadata?.totalTokenCount}`);

        // Treat this as a retriable error similar to rate limits
        const tokenError = new Error(`Model ${modelId} hit token limit during internal reasoning`);
        (tokenError as any).isTokenLimit = true;
        (tokenError as any).model = modelId;
        (tokenError as any).provider = 'gemini';
        (tokenError as any).usageMetadata = usageMetadata;
        throw tokenError;
      }

      // Use actual token counts if available, otherwise estimate
      const inputTokens = usageMetadata?.promptTokenCount || Math.ceil(JSON.stringify(req.messages).length / 4);
      const outputTokens = usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);

      return {
        output: text,
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: usageMetadata?.totalTokenCount || (inputTokens + outputTokens)
        },
        raw: response,
        metadata: {
          model: modelId,
          provider: 'gemini'
        }
      };
    } catch (error: any) {
      console.error(`Gemini API error for model ${modelId}:`, {
        message: error.message,
        status: error.status || error.code,
        details: error.response?.data || error.details,
        model: modelId
      });

      // Re-throw with enhanced error information
      const enhancedError = new Error(error.message);
      (enhancedError as any).status = error.status || error.code;
      (enhancedError as any).isRateLimit = error.status === 429 || error.code === 429;
      (enhancedError as any).model = modelId;
      (enhancedError as any).provider = 'gemini';
      (enhancedError as any).originalError = error;

      throw enhancedError;
    }
  }

  async embed(req: any, modelId: string): Promise<any> {
    throw new Error('Gemini does not support embeddings through this API');
  }
}