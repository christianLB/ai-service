import { Logger } from '../utils/logger';
import { route, executeChat } from '../core/router';

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  normalizedValue?: string;
  metadata?: Record<string, any>;
  position?: [number, number];
}

export enum EntityType {
  // Crypto & Financial
  CRYPTOCURRENCY = 'cryptocurrency',
  TOKEN_AMOUNT = 'token_amount',
  WALLET_ADDRESS = 'wallet_address',
  TRADING_PAIR = 'trading_pair',
  PRICE = 'price',
  PERCENTAGE = 'percentage',

  // Actions
  ACTION = 'action',
  TRANSFER = 'transfer',
  SWAP = 'swap',

  // Time
  DATE = 'date',
  TIME = 'time',
  DURATION = 'duration',

  // General
  URL = 'url',
  EMAIL = 'email',
  PHONE = 'phone',
  PERSON = 'person',
  ORGANIZATION = 'organization',
  LOCATION = 'location'
}

export class EntityExtractor {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('EntityExtractor');
  }

  /**
   * Extract entities from text using pattern matching and AI
   */
  async extract(text: string): Promise<ExtractedEntity[]> {
    this.logger.info('Extracting entities from text');

    // First, use pattern matching for high-confidence entities
    const patternEntities = this.extractWithPatterns(text);

    // Skip AI extraction for now to avoid provider issues
    const aiEntities: ExtractedEntity[] = [];  // await this.extractWithAI(text);

    // Merge and deduplicate entities
    const mergedEntities = this.mergeEntities(patternEntities, aiEntities);

    // Validate and normalize entities
    const validatedEntities = this.validateEntities(mergedEntities);

    this.logger.info(`Extracted ${validatedEntities.length} entities`);
    return validatedEntities;
  }

  /**
   * Extract entities using regex patterns
   */
  private extractWithPatterns(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Cryptocurrency symbols
    const cryptoRegex = /\b(BTC|ETH|USDT|USDC|BNB|SOL|ADA|DOT|MATIC|AVAX|LINK|UNI)\b/gi;
    const cryptoMatches = [...text.matchAll(cryptoRegex)];
    cryptoMatches.forEach(match => {
      entities.push({
        type: EntityType.CRYPTOCURRENCY,
        value: match[0].toUpperCase(),
        confidence: 0.95,
        position: [match.index!, match.index! + match[0].length]
      });
    });

    // Token amounts (number + crypto)
    const amountRegex = /\b(\d+\.?\d*)\s*(BTC|ETH|USDT|USDC|USD|EUR)\b/gi;
    const amountMatches = [...text.matchAll(amountRegex)];
    amountMatches.forEach(match => {
      entities.push({
        type: EntityType.TOKEN_AMOUNT,
        value: `${match[1]} ${match[2].toUpperCase()}`,
        confidence: 0.9,
        normalizedValue: match[1],
        metadata: { amount: parseFloat(match[1]), currency: match[2].toUpperCase() }
      });
    });

    // Ethereum addresses
    const ethAddressRegex = /0x[a-fA-F0-9]{40}/g;
    const ethMatches = [...text.matchAll(ethAddressRegex)];
    ethMatches.forEach(match => {
      entities.push({
        type: EntityType.WALLET_ADDRESS,
        value: match[0],
        confidence: 0.95,
        metadata: { chain: 'ethereum' }
      });
    });

    // Trading pairs
    const pairRegex = /\b([A-Z]{2,6})\/([A-Z]{2,6})\b/g;
    const pairMatches = [...text.matchAll(pairRegex)];
    pairMatches.forEach(match => {
      entities.push({
        type: EntityType.TRADING_PAIR,
        value: match[0],
        confidence: 0.85,
        metadata: { base: match[1], quote: match[2] }
      });
    });

    // URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlMatches = [...text.matchAll(urlRegex)];
    urlMatches.forEach(match => {
      entities.push({
        type: EntityType.URL,
        value: match[0],
        confidence: 1.0
      });
    });

    // Percentages
    const percentRegex = /\b(\d+\.?\d*)\s*%/g;
    const percentMatches = [...text.matchAll(percentRegex)];
    percentMatches.forEach(match => {
      entities.push({
        type: EntityType.PERCENTAGE,
        value: match[0],
        confidence: 0.95,
        normalizedValue: match[1]
      });
    });

    // Action words
    const actionWords = {
      'transfer': EntityType.TRANSFER,
      'send': EntityType.TRANSFER,
      'swap': EntityType.SWAP,
      'exchange': EntityType.SWAP,
      'buy': EntityType.ACTION,
      'sell': EntityType.ACTION,
      'stake': EntityType.ACTION,
      'unstake': EntityType.ACTION
    };

    Object.entries(actionWords).forEach(([word, type]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = [...text.matchAll(regex)];
      matches.forEach(match => {
        entities.push({
          type: type,
          value: word,
          confidence: 0.7,
          position: [match.index!, match.index! + match[0].length]
        });
      });
    });

    return entities;
  }

  /**
   * Extract entities using AI
   */
  private async extractWithAI(text: string): Promise<ExtractedEntity[]> {
    try {
      const prompt = `
Extract entities from the following text. Return a JSON array of entities with these fields:
- type: one of [cryptocurrency, token_amount, wallet_address, trading_pair, price, date, time, action, person, organization]
- value: the entity value
- confidence: confidence score 0-1

Text: "${text}"

Return only the JSON array, no other text.`;

      // Use Gemini directly for entity extraction
      const decision = await route('chat.telegram', ['chat']);
      const result = await executeChat(decision, {
        messages: [
          { role: 'system', content: 'You are an entity extraction specialist. Extract entities and return valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        maxTokens: 500
      });

      if (!result.output) return [];

      // Parse AI response
      try {
        const jsonMatch = result.output.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];

        const entities = JSON.parse(jsonMatch[0]);
        return entities.map((e: any) => ({
          type: this.mapToEntityType(e.type),
          value: e.value,
          confidence: e.confidence || 0.5,
          metadata: { source: 'ai' }
        }));
      } catch (parseError) {
        this.logger.error('Failed to parse AI entity response:', parseError);
        return [];
      }
    } catch (error) {
      this.logger.error('AI entity extraction failed:', error);
      return [];
    }
  }

  /**
   * Merge entities from different sources
   */
  private mergeEntities(
    patternEntities: ExtractedEntity[],
    aiEntities: ExtractedEntity[]
  ): ExtractedEntity[] {
    const merged = [...patternEntities];

    // Add AI entities that don't overlap with pattern entities
    for (const aiEntity of aiEntities) {
      const isDuplicate = patternEntities.some(
        pe => pe.type === aiEntity.type &&
             pe.value.toLowerCase() === aiEntity.value.toLowerCase()
      );

      if (!isDuplicate) {
        merged.push(aiEntity);
      }
    }

    return merged;
  }

  /**
   * Validate and normalize entities
   */
  private validateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    return entities
      .filter(e => e.value && e.value.length > 0)
      .map(e => {
        // Normalize wallet addresses
        if (e.type === EntityType.WALLET_ADDRESS) {
          e.value = e.value.toLowerCase();
        }

        // Normalize cryptocurrencies
        if (e.type === EntityType.CRYPTOCURRENCY) {
          e.value = e.value.toUpperCase();
        }

        // Validate confidence
        if (e.confidence < 0) e.confidence = 0;
        if (e.confidence > 1) e.confidence = 1;

        return e;
      })
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Map AI entity type strings to enum
   */
  private mapToEntityType(type: string): EntityType {
    const mapping: Record<string, EntityType> = {
      'cryptocurrency': EntityType.CRYPTOCURRENCY,
      'crypto': EntityType.CRYPTOCURRENCY,
      'token_amount': EntityType.TOKEN_AMOUNT,
      'amount': EntityType.TOKEN_AMOUNT,
      'wallet_address': EntityType.WALLET_ADDRESS,
      'address': EntityType.WALLET_ADDRESS,
      'trading_pair': EntityType.TRADING_PAIR,
      'pair': EntityType.TRADING_PAIR,
      'price': EntityType.PRICE,
      'date': EntityType.DATE,
      'time': EntityType.TIME,
      'action': EntityType.ACTION,
      'person': EntityType.PERSON,
      'organization': EntityType.ORGANIZATION,
      'url': EntityType.URL,
      'email': EntityType.EMAIL
    };

    return mapping[type.toLowerCase()] || EntityType.ACTION;
  }

  /**
   * Extract structured transaction data
   */
  async extractTransaction(text: string): Promise<{
    action: string;
    amount?: number;
    currency?: string;
    from?: string;
    to?: string;
    metadata?: Record<string, any>;
  } | null> {
    const entities = await this.extract(text);

    // Find transaction components
    const action = entities.find(e =>
      e.type === EntityType.TRANSFER ||
      e.type === EntityType.SWAP ||
      e.type === EntityType.ACTION
    );

    const amount = entities.find(e => e.type === EntityType.TOKEN_AMOUNT);
    const addresses = entities.filter(e => e.type === EntityType.WALLET_ADDRESS);

    if (!action) return null;

    const transaction: any = {
      action: action.value
    };

    if (amount && amount.metadata) {
      transaction.amount = amount.metadata.amount;
      transaction.currency = amount.metadata.currency;
    }

    if (addresses.length > 0) {
      transaction.to = addresses[0].value;
      if (addresses.length > 1) {
        transaction.from = addresses[1].value;
      }
    }

    transaction.metadata = {
      confidence: action.confidence,
      extractedEntities: entities.length
    };

    return transaction;
  }
}