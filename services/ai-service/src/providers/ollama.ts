import { BaseProvider } from '../core/Provider';
import type { 
  ChatRequest, 
  ChatResponse, 
  EmbedRequest, 
  EmbedResponse, 
  ModelInfo,
  Capability 
} from '../types';

interface OllamaModel {
  name: string;
  size: number;
  parameter_size: string;
  quantization_level: string;
}

interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  eval_count: number;
  prompt_eval_count: number;
  total_duration: number;
}

interface OllamaEmbedResponse {
  embedding: number[];
}

export class OllamaProvider extends BaseProvider {
  name = 'ollama';
  capabilities: Capability[] = ['chat', 'embed'];
  
  private baseUrl: string;
  
  constructor(baseUrl: string = 'http://localhost:11434') {
    super();
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async models(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json() as any;
      
      return (data.models || []).map((model: OllamaModel) => ({
        id: model.name,
        capabilities: this.getModelCapabilities(model.name),
        contextWindow: this.getContextWindow(model.name),
        costPer1kInput: 0,
        costPer1kOutput: 0
      }));
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      return this.getDefaultModels();
    }
  }

  private getModelCapabilities(modelName: string): Capability[] {
    if (modelName.includes('embed') || modelName.includes('nomic')) {
      return ['embed'];
    }
    return ['chat'];
  }

  private getContextWindow(modelName: string): number {
    if (modelName.includes('llama3')) return 8192;
    if (modelName.includes('mistral')) return 32768;
    if (modelName.includes('mixtral')) return 32768;
    return 4096;
  }

  private getDefaultModels(): ModelInfo[] {
    return [
      {
        id: 'llama3.1:8b',
        capabilities: ['chat'],
        contextWindow: 8192,
        costPer1kInput: 0,
        costPer1kOutput: 0
      },
      {
        id: 'mistral:7b',
        capabilities: ['chat'],
        contextWindow: 32768,
        costPer1kInput: 0,
        costPer1kOutput: 0
      },
      {
        id: 'nomic-embed-text',
        capabilities: ['embed'],
        contextWindow: 8192,
        costPer1kInput: 0,
        costPer1kOutput: 0
      }
    ];
  }

  async chat(req: ChatRequest, modelId: string): Promise<ChatResponse> {
    const response = await this.withRetry(async () => {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          messages: req.messages,
          stream: false,
          options: {
            temperature: req.temperature,
            num_predict: req.maxTokens
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Ollama chat failed: ${res.statusText}`);
      }

      return res.json() as Promise<OllamaChatResponse>;
    });

    return {
      output: response.message.content,
      tokens: {
        input: response.prompt_eval_count || 0,
        output: response.eval_count || 0,
        total: (response.prompt_eval_count || 0) + (response.eval_count || 0)
      },
      raw: response
    };
  }

  async embed(req: EmbedRequest, modelId: string): Promise<EmbedResponse> {
    this.validateCapability('embed');
    
    const inputs = Array.isArray(req.input) ? req.input : [req.input];
    const vectors: number[][] = [];

    for (const input of inputs) {
      const response = await this.withRetry(async () => {
        const res = await fetch(`${this.baseUrl}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelId,
            prompt: input
          })
        });

        if (!res.ok) {
          throw new Error(`Ollama embed failed: ${res.statusText}`);
        }

        return res.json() as Promise<OllamaEmbedResponse>;
      });

      vectors.push(response.embedding);
    }

    return {
      vectors,
      dimensions: vectors[0].length,
      model: modelId
    };
  }
}