import Redis from 'ioredis';
import { Logger } from '../utils/logger';
import { MessageClassification, RoutingDecision } from './message-classifier';

export interface RoutedMessage {
  correlationId: string;
  originalText: string;
  chatId: string;
  senderId: string;
  classification: MessageClassification;
  timestamp: string;
  context?: any;
  metadata?: Record<string, any>;
}

export class RoutingEngine {
  private redis: Redis;
  private logger: Logger;
  private routingRules: Map<string, RoutingRule>;

  constructor(redis: Redis) {
    this.redis = redis;
    this.logger = new Logger('RoutingEngine');
    this.routingRules = this.initializeRoutingRules();
  }

  /**
   * Route a classified message to appropriate handlers
   */
  async routeMessage(
    message: any,
    classification: MessageClassification
  ): Promise<void> {
    this.logger.info(`Routing message ${classification.correlationId} to handlers`);

    const routedMessage: RoutedMessage = {
      correlationId: classification.correlationId,
      originalText: message.text,
      chatId: message.chatId,
      senderId: message.senderId,
      classification,
      timestamp: new Date().toISOString(),
      metadata: {
        messageId: message.messageId,
        source: 'telegram'
      }
    };

    // Get context if required
    if (classification.routing.requiresContext) {
      routedMessage.context = await this.getContext(message.senderId, message.chatId);
    }

    // Store in memory if required
    if (classification.routing.requiresMemory) {
      await this.storeInMemory(routedMessage);
    }

    // Route to primary handler
    await this.publishToStream(
      classification.routing.stream,
      routedMessage
    );

    // Route to secondary handlers
    for (const handler of classification.routing.secondaryHandlers) {
      const secondaryStream = this.getStreamForHandler(handler);
      if (secondaryStream) {
        await this.publishToStream(secondaryStream, routedMessage);
      }
    }

    this.logger.info(`Message routed successfully to ${classification.routing.stream}`);
  }

  /**
   * Publish message to Redis stream
   */
  private async publishToStream(stream: string, message: RoutedMessage): Promise<void> {
    try {
      const fields = [
        'correlationId', message.correlationId,
        'chatId', message.chatId,
        'senderId', message.senderId,
        'text', message.originalText,
        'messageType', message.classification.messageType,
        'intent', message.classification.intent,
        'confidence', message.classification.confidence.toString(),
        'routing', JSON.stringify(message.classification.routing),
        'entities', JSON.stringify(message.classification.entities),
        'timestamp', message.timestamp
      ];

      if (message.context) {
        fields.push('context', JSON.stringify(message.context));
      }

      if (message.metadata) {
        fields.push('metadata', JSON.stringify(message.metadata));
      }

      await this.redis.xadd(stream, '*', ...fields);

      this.logger.debug(`Published to stream ${stream}:`, {
        correlationId: message.correlationId,
        messageType: message.classification.messageType,
        intent: message.classification.intent
      });
    } catch (error) {
      this.logger.error(`Failed to publish to stream ${stream}:`, error);
      throw error;
    }
  }

  /**
   * Get context for a user/chat
   */
  private async getContext(userId: string, chatId: string): Promise<any> {
    try {
      // Check if memory service is available
      const contextStream = 'memory.context.response';
      const requestId = `ctx-${Date.now()}`;

      // Request context from memory service
      await this.redis.xadd(
        'memory.context.request',
        '*',
        'requestId', requestId,
        'userId', userId,
        'chatId', chatId,
        'limit', '10'
      );

      // Wait for response (with timeout)
      const timeout = 1000; // 1 second
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const messages = await this.redis.xrange(
          contextStream,
          '-',
          '+',
          'COUNT',
          '100'
        );

        const response = messages.find(([, fields]) => {
          const data: any = {};
          for (let i = 0; i < fields.length; i += 2) {
            data[fields[i]] = fields[i + 1];
          }
          return data.requestId === requestId;
        });

        if (response) {
          const [, fields] = response;
          const data: any = {};
          for (let i = 0; i < fields.length; i += 2) {
            data[fields[i]] = fields[i + 1];
          }
          return JSON.parse(data.context || '{}');
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.logger.warn('Context retrieval timed out, proceeding without context');
      return null;
    } catch (error) {
      this.logger.error('Failed to get context:', error);
      return null;
    }
  }

  /**
   * Store message in memory service
   */
  private async storeInMemory(message: RoutedMessage): Promise<void> {
    try {
      await this.redis.xadd(
        'memory.store.request',
        '*',
        'correlationId', message.correlationId,
        'userId', message.senderId,
        'chatId', message.chatId,
        'messageType', message.classification.messageType,
        'intent', message.classification.intent,
        'content', message.originalText,
        'entities', JSON.stringify(message.classification.entities),
        'timestamp', message.timestamp
      );
    } catch (error) {
      this.logger.error('Failed to store in memory:', error);
      // Non-critical, continue processing
    }
  }

  /**
   * Get stream name for a handler
   */
  private getStreamForHandler(handler: string): string | null {
    const handlerStreams: Record<string, string> = {
      'ai-service': 'ai.chat.request',
      'trading-service': 'trading.command.request',
      'financial-service': 'financial.command.request',
      'content-service': 'content.process.request',
      'memory-service': 'memory.store.request'
    };

    return handlerStreams[handler] || null;
  }

  /**
   * Initialize routing rules
   */
  private initializeRoutingRules(): Map<string, RoutingRule> {
    const rules = new Map<string, RoutingRule>();

    // Trading rules
    rules.set('trading-command', {
      pattern: /^\/cmd\s+trading\./,
      handler: 'trading-service',
      stream: 'trading.command.request',
      priority: 'high'
    });

    // Financial rules
    rules.set('financial-command', {
      pattern: /^\/cmd\s+financial\./,
      handler: 'financial-service',
      stream: 'financial.command.request',
      priority: 'high'
    });

    // AI analysis rules
    rules.set('market-analysis', {
      pattern: /analyze|analysis|trend|pattern/i,
      handler: 'ai-service',
      stream: 'ai.analysis.request',
      priority: 'normal'
    });

    // Content rules
    rules.set('url-content', {
      pattern: /https?:\/\//,
      handler: 'content-service',
      stream: 'content.store.request',
      priority: 'normal'
    });

    return rules;
  }

  /**
   * Apply custom routing rules
   */
  async applyCustomRules(
    text: string,
    routing: RoutingDecision
  ): Promise<RoutingDecision> {
    // Check each rule
    for (const [name, rule] of this.routingRules) {
      if (rule.pattern.test(text)) {
        this.logger.debug(`Applying routing rule: ${name}`);
        routing.primaryHandler = rule.handler;
        routing.stream = rule.stream;
        routing.priority = rule.priority;
        break;
      }
    }

    return routing;
  }
}

interface RoutingRule {
  pattern: RegExp;
  handler: string;
  stream: string;
  priority: 'high' | 'normal' | 'low';
}