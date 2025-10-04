import { MessageClassification, MessageType, Intent } from './message-classifier';
import { ExtractedEntity, EntityType } from './entity-extractor';
import { Logger } from '../utils/logger';

export interface DecisionResponse {
  correlationId: string;
  type: 'decision' | 'action' | 'error';
  template: string;
  formatted: string;
  metadata: {
    confidence: number;
    requiresConfirmation: boolean;
    actionable: boolean;
  };
}

export class DecisionResponder {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('DecisionResponder');
  }

  /**
   * Generate a decision response based on classification
   */
  async generateResponse(
    classification: MessageClassification,
    originalText: string
  ): Promise<DecisionResponse> {
    this.logger.info(`Generating decision response for ${classification.correlationId}`);

    let response: DecisionResponse = {
      correlationId: classification.correlationId,
      type: 'decision',
      template: '',
      formatted: '',
      metadata: {
        confidence: classification.confidence,
        requiresConfirmation: false,
        actionable: false
      }
    };

    // Generate response based on message type
    switch (classification.messageType) {
      case MessageType.COMMAND:
        response = this.generateCommandResponse(classification, originalText);
        break;

      case MessageType.CONTENT:
        response = this.generateContentResponse(classification, originalText);
        break;

      case MessageType.QUESTION:
        response = this.generateQuestionResponse(classification, originalText);
        break;

      case MessageType.CONVERSATION:
        response = this.generateConversationResponse(classification, originalText);
        break;

      default:
        response = this.generateUncertainResponse(classification, originalText);
    }

    // Add confidence-based adjustments
    if (classification.confidence < 0.5) {
      response = this.generateUncertainResponse(classification, originalText);
    }

    this.logger.info(`Decision response generated: ${response.template}`);
    return response;
  }

  /**
   * Generate command decision response
   */
  private generateCommandResponse(
    classification: MessageClassification,
    originalText: string
  ): DecisionResponse {
    const parts = originalText.split(/\s+/);
    const command = parts[0];
    const params = parts.slice(1).join(' ');

    // Extract service and action from command
    let service = 'system';
    let action = command.replace('/cmd', '').trim();

    if (action.includes('.')) {
      const cmdParts = action.split('.');
      service = cmdParts[0];
      action = cmdParts.slice(1).join('.');
    }

    const confidenceEmoji = this.getConfidenceEmoji(classification.confidence);
    const confidencePercent = Math.round(classification.confidence * 100);

    const formatted = `🤖 **Command Detected**
━━━━━━━━━━━━━━━━━━━━
📋 Action: \`${action}\`
🎯 Target: ${service}-service
📊 Parameters: ${params || 'none'}
${confidenceEmoji} Confidence: ${confidencePercent}%

⚡ Executing: ${this.getActionDescription(action, service)}`;

    return {
      correlationId: classification.correlationId,
      type: 'decision',
      template: 'command_detected',
      formatted,
      metadata: {
        confidence: classification.confidence,
        requiresConfirmation: classification.confidence < 0.8,
        actionable: true
      }
    };
  }

  /**
   * Generate content decision response
   */
  private generateContentResponse(
    classification: MessageClassification,
    originalText: string
  ): DecisionResponse {
    // Detect content type
    let contentType = 'document';
    let source = 'unknown';

    if (originalText.includes('http')) {
      contentType = 'URL';
      const urlMatch = originalText.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        try {
          const url = new URL(urlMatch[0]);
          source = url.hostname;
        } catch (e) {
          source = 'web';
        }
      }
    } else if (originalText.match(/\.(pdf|doc|txt|md)/i)) {
      contentType = 'document';
    } else if (originalText.match(/\.(jpg|png|gif)/i)) {
      contentType = 'image';
    }

    const confidenceEmoji = this.getConfidenceEmoji(classification.confidence);
    const confidencePercent = Math.round(classification.confidence * 100);

    const formatted = `📁 **Content Detection**
━━━━━━━━━━━━━━━━━━━━
📄 Type: ${contentType}
🔗 Source: ${source}
📝 Action: Store & Analyze
${confidenceEmoji} Confidence: ${confidencePercent}%

💾 Processing content...`;

    return {
      correlationId: classification.correlationId,
      type: 'decision',
      template: 'content_detected',
      formatted,
      metadata: {
        confidence: classification.confidence,
        requiresConfirmation: false,
        actionable: true
      }
    };
  }

  /**
   * Generate entity extraction response
   */
  generateEntityResponse(entities: ExtractedEntity[]): string {
    if (entities.length === 0) {
      return '';
    }

    const entityGroups: Record<string, ExtractedEntity[]> = {};

    // Group entities by type
    entities.forEach(entity => {
      const type = entity.type.toString();
      if (!entityGroups[type]) {
        entityGroups[type] = [];
      }
      entityGroups[type].push(entity);
    });

    let formatted = `🔍 **Data Extraction**
━━━━━━━━━━━━━━━━━━━━
Found entities:\n`;

    // Format each entity group
    Object.entries(entityGroups).forEach(([type, items]) => {
      items.forEach(entity => {
        const icon = this.getEntityIcon(entity.type);
        formatted += `${icon} ${this.formatEntityName(entity.type)}: ${entity.value}\n`;
      });
    });

    // Calculate average confidence
    const avgConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
    const confidencePercent = Math.round(avgConfidence * 100);
    const confidenceEmoji = this.getConfidenceEmoji(avgConfidence);

    formatted += `${confidenceEmoji} Confidence: ${confidencePercent}%\n\n`;
    formatted += `✅ I'll process this request with the extracted data`;

    return formatted;
  }

  /**
   * Generate question decision response
   */
  private generateQuestionResponse(
    classification: MessageClassification,
    originalText: string
  ): DecisionResponse {
    const topic = this.extractTopic(classification.entities);
    const confidenceEmoji = this.getConfidenceEmoji(classification.confidence);
    const confidencePercent = Math.round(classification.confidence * 100);

    const formatted = `💬 **Question Understood**
━━━━━━━━━━━━━━━━━━━━
📝 Intent: ${this.formatIntent(classification.intent)}
🎯 Topic: ${topic}
${confidenceEmoji} Confidence: ${confidencePercent}%

🤔 Processing your question...`;

    return {
      correlationId: classification.correlationId,
      type: 'decision',
      template: 'question_understood',
      formatted,
      metadata: {
        confidence: classification.confidence,
        requiresConfirmation: false,
        actionable: true
      }
    };
  }

  /**
   * Generate conversation decision response
   */
  private generateConversationResponse(
    classification: MessageClassification,
    originalText: string
  ): DecisionResponse {
    // For greetings and general conversation, keep it simple
    if (classification.intent === Intent.GREETING) {
      return {
        correlationId: classification.correlationId,
        type: 'decision',
        template: 'greeting',
        formatted: '',  // No decision message for greetings
        metadata: {
          confidence: classification.confidence,
          requiresConfirmation: false,
          actionable: false
        }
      };
    }

    const confidenceEmoji = this.getConfidenceEmoji(classification.confidence);
    const confidencePercent = Math.round(classification.confidence * 100);

    const formatted = `💭 **Message Received**
━━━━━━━━━━━━━━━━━━━━
📝 Type: ${this.formatIntent(classification.intent)}
${confidenceEmoji} Confidence: ${confidencePercent}%

💬 Continuing conversation...`;

    return {
      correlationId: classification.correlationId,
      type: 'decision',
      template: 'conversation',
      formatted,
      metadata: {
        confidence: classification.confidence,
        requiresConfirmation: false,
        actionable: true
      }
    };
  }

  /**
   * Generate uncertain/low confidence response
   */
  private generateUncertainResponse(
    classification: MessageClassification,
    originalText: string
  ): DecisionResponse {
    const confidencePercent = Math.round(classification.confidence * 100);

    // Generate possible interpretations
    const interpretations: string[] = [];

    if (originalText.includes('/')) {
      interpretations.push(`Command execution (${Math.min(confidencePercent + 10, 100)}%)`);
    }
    if (originalText.match(/\d+/)) {
      interpretations.push(`Data with numbers (${Math.min(confidencePercent + 5, 100)}%)`);
    }
    if (originalText.includes('?')) {
      interpretations.push(`Question to answer (${Math.min(confidencePercent + 15, 100)}%)`);
    }
    if (interpretations.length === 0) {
      interpretations.push(`General conversation (${confidencePercent}%)`);
    }

    const formatted = `❓ **Unclear Request**
━━━━━━━━━━━━━━━━━━━━
I'm not certain what you're asking for.

Possible interpretations:
${interpretations.map(i => `• ${i}`).join('\n')}

Please clarify or rephrase your request, or I'll try my best to help.`;

    return {
      correlationId: classification.correlationId,
      type: 'decision',
      template: 'uncertain',
      formatted,
      metadata: {
        confidence: classification.confidence,
        requiresConfirmation: true,
        actionable: false
      }
    };
  }

  /**
   * Get confidence emoji
   */
  private getConfidenceEmoji(confidence: number): string {
    if (confidence >= 0.9) return '🟢';
    if (confidence >= 0.7) return '🟡';
    if (confidence >= 0.5) return '🟠';
    return '🔴';
  }

  /**
   * Get entity type icon
   */
  private getEntityIcon(type: EntityType): string {
    const icons: Record<string, string> = {
      [EntityType.CRYPTOCURRENCY]: '💰',
      [EntityType.TOKEN_AMOUNT]: '💵',
      [EntityType.WALLET_ADDRESS]: '👛',
      [EntityType.TRADING_PAIR]: '💱',
      [EntityType.PRICE]: '💲',
      [EntityType.PERCENTAGE]: '📊',
      [EntityType.ACTION]: '⚡',
      [EntityType.TRANSFER]: '↔️',
      [EntityType.SWAP]: '🔄',
      [EntityType.DATE]: '📅',
      [EntityType.TIME]: '⏰',
      [EntityType.URL]: '🔗',
      [EntityType.EMAIL]: '📧',
      [EntityType.PERSON]: '👤',
      [EntityType.ORGANIZATION]: '🏢'
    };
    return icons[type] || '•';
  }

  /**
   * Format entity type name
   */
  private formatEntityName(type: EntityType): string {
    return type.replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  }

  /**
   * Format intent
   */
  private formatIntent(intent: Intent): string {
    return intent.replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  }

  /**
   * Extract topic from entities
   */
  private extractTopic(entities: any[]): string {
    if (entities.length === 0) return 'general';

    // Look for crypto entities
    const cryptoEntity = entities.find(e =>
      e.type === 'crypto' ||
      e.type === 'trading_pair'
    );
    if (cryptoEntity) return cryptoEntity.value;

    // Look for service entities
    const serviceEntity = entities.find(e => e.type === 'service');
    if (serviceEntity) return serviceEntity.value;

    return 'general topic';
  }

  /**
   * Get action description
   */
  private getActionDescription(action: string, service: string): string {
    const descriptions: Record<string, string> = {
      'trading.execute': 'Execute trading order',
      'trading.status': 'Check trading status',
      'trading.positions': 'List open positions',
      'financial.report': 'Generate financial report',
      'financial.invoice': 'Create invoice',
      'system.status': 'Check system status',
      'system.help': 'Show help information'
    };

    const key = `${service}.${action}`;
    return descriptions[key] || `Execute ${action} on ${service}`;
  }
}