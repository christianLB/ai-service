import { Logger } from '../utils/logger';

export enum MessageType {
  COMMAND = 'command',
  QUESTION = 'question',
  CONTENT = 'content',
  CONVERSATION = 'conversation',
  SYSTEM = 'system'
}

export enum Intent {
  // Commands
  EXECUTE_ACTION = 'execute_action',
  STATUS_CHECK = 'status_check',
  CONFIGURE = 'configure',

  // Questions
  EXPLAIN = 'explain',
  ANALYZE = 'analyze',
  SUMMARIZE = 'summarize',
  SEARCH = 'search',

  // Content
  SAVE_CONTENT = 'save_content',
  CLASSIFY_CONTENT = 'classify_content',
  EXTRACT_INFO = 'extract_info',

  // Conversation
  CONTINUE = 'continue',
  CLARIFY = 'clarify',
  CONFIRM = 'confirm',
  GREETING = 'greeting'
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
  position?: [number, number];
}

export interface MessageClassification {
  correlationId: string;
  messageType: MessageType;
  intent: Intent;
  confidence: number;
  entities: Entity[];
  routing: RoutingDecision;
  metadata?: Record<string, any>;
}

export interface RoutingDecision {
  primaryHandler: string;
  secondaryHandlers: string[];
  stream: string;
  priority: 'high' | 'normal' | 'low';
  requiresMemory: boolean;
  requiresContext: boolean;
}

export class MessageClassifier {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('MessageClassifier');
  }

  /**
   * Classify an incoming message and determine routing
   */
  async classify(text: string, correlationId: string): Promise<MessageClassification> {
    this.logger.info(`Classifying message: ${correlationId}`);

    // Detect message type
    const messageType = this.detectMessageType(text);

    // Extract intent
    const intent = this.extractIntent(text, messageType);

    // Extract entities
    const entities = this.extractEntities(text);

    // Calculate confidence
    const confidence = this.calculateConfidence(text, messageType, intent);

    // Determine routing
    const routing = this.determineRouting(messageType, intent, entities);

    const classification: MessageClassification = {
      correlationId,
      messageType,
      intent,
      confidence,
      entities,
      routing
    };

    this.logger.info(`Classification result: ${JSON.stringify(classification)}`);
    return classification;
  }

  private detectMessageType(text: string): MessageType {
    const normalized = text.toLowerCase().trim();

    // Command detection
    if (normalized.startsWith('/cmd') || normalized.startsWith('/')) {
      return MessageType.COMMAND;
    }

    // Content detection (URLs, file references)
    if (this.containsUrl(normalized) || this.containsFileReference(normalized)) {
      return MessageType.CONTENT;
    }

    // Question detection
    const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'which', '?'];
    const hasQuestion = questionWords.some(word => normalized.includes(word));
    if (hasQuestion) {
      return MessageType.QUESTION;
    }

    // Greeting/conversation starters
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good evening', 'hola'];
    if (greetings.some(g => normalized.startsWith(g))) {
      return MessageType.CONVERSATION;
    }

    // Default to conversation
    return MessageType.CONVERSATION;
  }

  private extractIntent(text: string, messageType: MessageType): Intent {
    const normalized = text.toLowerCase();

    switch (messageType) {
      case MessageType.COMMAND:
        if (normalized.includes('execute') || normalized.includes('run')) {
          return Intent.EXECUTE_ACTION;
        }
        if (normalized.includes('status') || normalized.includes('check')) {
          return Intent.STATUS_CHECK;
        }
        if (normalized.includes('config') || normalized.includes('set')) {
          return Intent.CONFIGURE;
        }
        return Intent.EXECUTE_ACTION;

      case MessageType.QUESTION:
        if (normalized.includes('explain') || normalized.includes('what is')) {
          return Intent.EXPLAIN;
        }
        if (normalized.includes('analyze') || normalized.includes('analysis')) {
          return Intent.ANALYZE;
        }
        if (normalized.includes('summar') || normalized.includes('brief')) {
          return Intent.SUMMARIZE;
        }
        if (normalized.includes('find') || normalized.includes('search')) {
          return Intent.SEARCH;
        }
        return Intent.EXPLAIN;

      case MessageType.CONTENT:
        if (this.containsUrl(normalized)) {
          return Intent.SAVE_CONTENT;
        }
        return Intent.CLASSIFY_CONTENT;

      case MessageType.CONVERSATION:
        const greetings = ['hello', 'hi', 'hey', 'hola'];
        if (greetings.some(g => normalized.includes(g))) {
          return Intent.GREETING;
        }
        if (normalized.includes('yes') || normalized.includes('confirm')) {
          return Intent.CONFIRM;
        }
        return Intent.CONTINUE;

      default:
        return Intent.CONTINUE;
    }
  }

  private extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];

    // Extract cryptocurrency symbols
    const cryptoRegex = /\b(BTC|ETH|USDT|USDC|BNB|SOL|ADA|DOT|MATIC|AVAX)\b/gi;
    const cryptoMatches = text.match(cryptoRegex);
    if (cryptoMatches) {
      cryptoMatches.forEach(match => {
        entities.push({
          type: 'crypto',
          value: match.toUpperCase(),
          confidence: 0.9
        });
      });
    }

    // Extract trading pairs
    const pairRegex = /\b([A-Z]{2,6})\/([A-Z]{2,6})\b/g;
    const pairMatches = text.match(pairRegex);
    if (pairMatches) {
      pairMatches.forEach(match => {
        entities.push({
          type: 'trading_pair',
          value: match,
          confidence: 0.85
        });
      });
    }

    // Extract numbers/amounts
    const numberRegex = /\b\d+\.?\d*\b/g;
    const numberMatches = text.match(numberRegex);
    if (numberMatches) {
      numberMatches.forEach(match => {
        entities.push({
          type: 'number',
          value: match,
          confidence: 1.0
        });
      });
    }

    // Extract time references
    const timeWords = ['today', 'yesterday', 'tomorrow', 'week', 'month', 'year'];
    timeWords.forEach(word => {
      if (text.toLowerCase().includes(word)) {
        entities.push({
          type: 'time',
          value: word,
          confidence: 0.8
        });
      }
    });

    // Extract service names
    const services = ['trading', 'financial', 'dashboard', 'memory', 'content'];
    services.forEach(service => {
      if (text.toLowerCase().includes(service)) {
        entities.push({
          type: 'service',
          value: service,
          confidence: 0.7
        });
      }
    });

    return entities;
  }

  private calculateConfidence(text: string, messageType: MessageType, intent: Intent): number {
    let confidence = 0.5;

    // Boost confidence for clear patterns
    if (messageType === MessageType.COMMAND && text.startsWith('/')) {
      confidence = 0.95;
    } else if (messageType === MessageType.QUESTION && text.includes('?')) {
      confidence = 0.85;
    } else if (messageType === MessageType.CONTENT && this.containsUrl(text)) {
      confidence = 0.9;
    }

    // Adjust based on text length (very short or very long texts are less confident)
    const textLength = text.length;
    if (textLength < 10 || textLength > 500) {
      confidence *= 0.8;
    }

    return Math.min(confidence, 1.0);
  }

  private determineRouting(
    messageType: MessageType,
    intent: Intent,
    entities: Entity[]
  ): RoutingDecision {
    // Default routing
    let routing: RoutingDecision = {
      primaryHandler: 'ai-service',
      secondaryHandlers: [],
      stream: 'ai.chat.request',
      priority: 'normal',
      requiresMemory: false,
      requiresContext: false
    };

    // Check for trading-related entities
    const hasTradingEntity = entities.some(e =>
      e.type === 'crypto' ||
      e.type === 'trading_pair' ||
      entities.some(e2 => e2.value === 'trading')
    );

    // Check for financial entities
    const hasFinancialEntity = entities.some(e =>
      e.value === 'financial' ||
      e.value === 'invoice' ||
      e.value === 'payment'
    );

    switch (messageType) {
      case MessageType.COMMAND:
        routing.priority = 'high';
        routing.requiresMemory = true;

        if (hasTradingEntity) {
          routing.primaryHandler = 'trading-service';
          routing.stream = 'trading.command.request';
        } else if (hasFinancialEntity) {
          routing.primaryHandler = 'financial-service';
          routing.stream = 'financial.command.request';
        }
        break;

      case MessageType.QUESTION:
        routing.requiresContext = true;
        routing.requiresMemory = true;

        if (intent === Intent.ANALYZE && hasTradingEntity) {
          routing.primaryHandler = 'trading-service';
          routing.secondaryHandlers = ['ai-service'];
          routing.stream = 'trading.analytics.request';
        } else {
          routing.stream = 'ai.chat.request';
        }
        break;

      case MessageType.CONTENT:
        routing.primaryHandler = 'content-service';
        routing.secondaryHandlers = ['ai-service'];
        routing.stream = 'content.store.request';
        routing.requiresMemory = true;
        break;

      case MessageType.CONVERSATION:
        routing.requiresContext = true;
        routing.requiresMemory = intent !== Intent.GREETING;

        if (intent === Intent.GREETING) {
          routing.priority = 'low';
        }
        break;
    }

    return routing;
  }

  private containsUrl(text: string): boolean {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return urlRegex.test(text);
  }

  private containsFileReference(text: string): boolean {
    const fileExtensions = ['.pdf', '.doc', '.txt', '.jpg', '.png', '.csv', '.xlsx'];
    return fileExtensions.some(ext => text.toLowerCase().includes(ext));
  }
}