import type { 
  Provider, 
  ChatRequest, 
  ChatResponse, 
  EmbedRequest, 
  EmbedResponse, 
  ModelInfo,
  Capability 
} from '../types';

export abstract class BaseProvider implements Provider {
  abstract name: string;
  abstract capabilities: Capability[];

  abstract models(): Promise<ModelInfo[]>;
  abstract chat(req: ChatRequest, modelId: string): Promise<ChatResponse>;
  abstract embed(req: EmbedRequest, modelId: string): Promise<EmbedResponse>;

  protected validateCapability(capability: Capability): void {
    if (!this.capabilities.includes(capability)) {
      throw new Error(`Provider ${this.name} does not support capability: ${capability}`);
    }
  }

  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError;
  }

  protected calculateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}