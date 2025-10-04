import { GoogleGenerativeAI } from '@google/generative-ai';
import Redis from 'ioredis';
import crypto from 'crypto';

export interface Intent {
  type: 'chat' | 'query' | 'task' | 'file_upload' | 'command';
  confidence: number;
  method: 'shortcut' | 'keyword' | 'regex' | 'gemini';
  subtype?: string;
  parameters?: Record<string, any>;
}

export interface IncomingMessage {
  correlationId: string;
  text: string;
  attachments?: Array<{
    contentServiceId: string;
    mime: string;
    filename: string;
  }>;
}

export class IntentClassifier {
  private gemini: GoogleGenerativeAI;
  private redis: Redis;
  private model: any;

  // Shortcuts for obvious cases (no LLM needed)
  private shortcuts: Record<string, Intent['type']> = {
    '/help': 'command',
    '/status': 'command',
    '/start': 'command',
    'hola': 'chat',
    'gracias': 'chat',
    'ok': 'chat',
  };

  constructor(geminiApiKey: string, redisUrl: string) {
    this.gemini = new GoogleGenerativeAI(geminiApiKey);
    this.model = this.gemini.getGenerativeModel({
      model: 'gemini-2.0-flash'  // Using stable version (cost: $0.0005/1K input)
    });
    this.redis = new Redis(redisUrl);
  }

  /**
   * Main classification method
   * Cascades through: shortcuts → keywords → regex → Gemini
   */
  async classify(message: IncomingMessage): Promise<Intent> {
    const text = message.text.toLowerCase().trim();

    // 1. File uploads → always file_upload (no LLM)
    if (message.attachments && message.attachments.length > 0) {
      return this.classifyFileUpload(message);
    }

    // 2. Shortcuts (30% of cases, < 5ms)
    const shortcut = this.shortcuts[text];
    if (shortcut) {
      return {
        type: shortcut,
        confidence: 0.95,
        method: 'shortcut'
      };
    }

    // 3. Check cache (15% cache hit rate)
    const cacheKey = `intent:${this.hashText(text)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { ...JSON.parse(cached), fromCache: true };
    }

    // 4. Keyword classification (50% of cases, < 50ms)
    const keywordIntent = this.classifyByKeywords(text);
    if (keywordIntent.confidence >= 0.85) {
      await this.cacheIntent(cacheKey, keywordIntent);
      return keywordIntent;
    }

    // 5. Regex patterns (15% of cases, < 10ms)
    const regexIntent = this.classifyByRegex(text);
    if (regexIntent.confidence >= 0.85) {
      await this.cacheIntent(cacheKey, regexIntent);
      return regexIntent;
    }

    // 6. Gemini Flash (5% of cases - truly ambiguous, < 200ms)
    const geminiIntent = await this.classifyWithGemini(text);
    await this.cacheIntent(cacheKey, geminiIntent);
    return geminiIntent;
  }

  /**
   * Classify file upload messages
   */
  private classifyFileUpload(message: IncomingMessage): Intent {
    const text = message.text.toLowerCase();

    // Check if user wants analysis
    const analysisKeywords = [
      'analiza', 'qué ves', 'describe', 'explica',
      'what do you see', 'analyze', 'explain'
    ];

    const wantsAnalysis = analysisKeywords.some(kw => text.includes(kw));

    return {
      type: 'file_upload',
      confidence: 1.0,
      method: 'shortcut',
      subtype: wantsAnalysis ? 'analyze' : 'store',
      parameters: {
        fileId: message.attachments![0].contentServiceId,
        requestedAnalysis: wantsAnalysis
      }
    };
  }

  /**
   * Keyword-based classification (Spanish + English)
   */
  private classifyByKeywords(text: string): Intent {
    // Query patterns
    const queryKeywords = [
      'busca', 'encuentra', 'qué documentos', 'qué archivos',
      'muestra', 'dame', 'lista', 'tengo sobre',
      'search', 'find', 'show me', 'list'
    ];

    if (queryKeywords.some(kw => text.includes(kw))) {
      return {
        type: 'query',
        confidence: 0.9,
        method: 'keyword'
      };
    }

    // Task patterns
    const taskKeywords = [
      'genera', 'crea', 'calcula', 'envía', 'procesa',
      'analiza', 'haz', 'ejecuta', 'compila',
      'generate', 'create', 'calculate', 'send', 'process'
    ];

    if (taskKeywords.some(kw => text.includes(kw))) {
      return {
        type: 'task',
        confidence: 0.9,
        method: 'keyword'
      };
    }

    // Default: chat (low confidence)
    return {
      type: 'chat',
      confidence: 0.7,
      method: 'keyword'
    };
  }

  /**
   * Regex pattern matching
   */
  private classifyByRegex(text: string): Intent {
    const patterns = {
      query: /^(busca|encuentra|qué|muestra|dame|lista).+(documento|archivo|sobre|de)/i,
      task: /^(genera|crea|calcula|haz).+(reporte|informe|análisis|resumen)/i,
      command: /^\/\w+/,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return {
          type: type as Intent['type'],
          confidence: 0.88,
          method: 'regex'
        };
      }
    }

    return {
      type: 'chat',
      confidence: 0.6,
      method: 'regex'
    };
  }

  /**
   * Gemini Flash classification (fallback for ambiguous cases)
   */
  private async classifyWithGemini(text: string): Promise<Intent> {
    const prompt = `Classify this user message into ONE category:

Categories:
- query: User wants to FIND/SEARCH existing information
- task: User wants system to DO/CREATE/GENERATE something
- chat: Casual conversation, question, or comment
- command: System command (rare)

Message: "${text}"

Rules:
- "busca X" or "encuentra Y" → query
- "genera X" or "crea Y" → task
- Questions, greetings, comments → chat

Respond ONLY with valid JSON:
{"type": "...", "confidence": 0.XX}`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 50,
        }
      });

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      return {
        type: parsed.type,
        confidence: parsed.confidence || 0.8,
        method: 'gemini'
      };
    } catch (error) {
      console.error('Gemini classification failed:', error);
      // Fallback to chat
      return {
        type: 'chat',
        confidence: 0.5,
        method: 'gemini'
      };
    }
  }

  /**
   * Cache intent for performance
   */
  private async cacheIntent(key: string, intent: Intent): Promise<void> {
    await this.redis.setex(key, 3600, JSON.stringify(intent)); // 1 hour TTL
  }

  /**
   * Hash text for cache key
   */
  private hashText(text: string): string {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  /**
   * Get classification stats (for monitoring)
   */
  async getStats(): Promise<Record<string, number>> {
    const keys = await this.redis.keys('intent:*');
    return {
      cachedIntents: keys.length,
      cacheHitRate: 0.15 // Approximate
    };
  }
}
