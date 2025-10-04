import Redis from 'ioredis';
import { route, executeChat } from '../core/router';
import { MessageClassifier } from './message-classifier';
import { IntentClassifier, Intent, IncomingMessage } from '../classification/intent-classifier';
import { RoutingEngine } from './routing-engine';
import { DecisionResponder } from './decision-responder';
import { EntityExtractor } from './entity-extractor';
import { ContentProcessor } from './content-processor';

let redis: Redis;
let classifier: MessageClassifier;
let intentClassifier: IntentClassifier;
let routingEngine: RoutingEngine;
let decisionResponder: DecisionResponder;
let entityExtractor: EntityExtractor;
let contentProcessor: ContentProcessor;

export async function startStreamConsumer() {
  try {
    console.log('[INIT] 1/8 - Initializing Redis connection...');
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    console.log('[INIT] ✅ Redis connected');

    console.log('[INIT] 2/8 - Initializing MessageClassifier...');
    classifier = new MessageClassifier();
    console.log('[INIT] ✅ MessageClassifier initialized');

    console.log('[INIT] 3/8 - Initializing IntentClassifier...');
    const geminiApiKey = process.env.GEMINI_API_KEY || '';
    if (!geminiApiKey) {
      console.warn('[INIT] ⚠️  GEMINI_API_KEY not set - IntentClassifier may fail');
    }
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log(`[INIT] IntentClassifier config: GEMINI_API_KEY=${geminiApiKey ? 'SET' : 'MISSING'}, REDIS_URL=${redisUrl}`);

    intentClassifier = new IntentClassifier(geminiApiKey, redisUrl);
    console.log('[INIT] ✅ IntentClassifier initialized');

    console.log('[INIT] 4/8 - Initializing RoutingEngine...');
    routingEngine = new RoutingEngine(redis);
    console.log('[INIT] ✅ RoutingEngine initialized');

    console.log('[INIT] 5/8 - Initializing DecisionResponder...');
    decisionResponder = new DecisionResponder();
    console.log('[INIT] ✅ DecisionResponder initialized');

    console.log('[INIT] 6/8 - Initializing EntityExtractor...');
    entityExtractor = new EntityExtractor();
    console.log('[INIT] ✅ EntityExtractor initialized');

    console.log('[INIT] 7/8 - Initializing ContentProcessor...');
    contentProcessor = new ContentProcessor(redis);
    console.log('[INIT] ✅ ContentProcessor initialized');

    // Feature flags
    const ENABLE_INTELLIGENT_ROUTING = process.env.ENABLE_INTELLIGENT_ROUTING === 'true';
    const ENABLE_DECISION_RESPONSES = process.env.ENABLE_DECISION_RESPONSES === 'true';
    const ENABLE_HYBRID_INTENT_CLASSIFIER = process.env.ENABLE_HYBRID_INTENT_CLASSIFIER !== 'false'; // Default: true

    console.log('Starting Redis Stream consumer for Telegram messages...');
    console.log(`Hybrid Intent Classifier: ${ENABLE_HYBRID_INTENT_CLASSIFIER ? 'ENABLED' : 'DISABLED'}`);

    // Create consumer group if not exists
    console.log('[INIT] 8/8 - Creating consumer group...');
    try {
      await redis.xgroup('CREATE', 'comm.telegram.incoming', 'ai-service', '$', 'MKSTREAM');
      console.log('Created consumer group ai-service');
    } catch (err: any) {
      if (err.message?.includes('BUSYGROUP')) {
        console.log('Consumer group ai-service already exists');
      } else {
        console.error('Error creating consumer group:', err);
        throw err; // Re-throw if it's not a BUSYGROUP error
      }
    }

    // Start consuming messages
    console.log('🚀 [CONSUMER] About to start consumeMessages()...');
    consumeMessages().catch(err => {
      console.error('💥 [CONSUMER] FATAL: consumeMessages() crashed:', err);
      console.error('Stack:', err.stack);
    });
    console.log('✅ [CONSUMER] consumeMessages() started (non-blocking)');
    console.log('[INIT] ✅ ALL INITIALIZATION COMPLETE');
  } catch (error: any) {
    console.error('💥 [FATAL] startStreamConsumer initialization failed:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error; // Re-throw to let index.js handle it
  }
}

async function consumeMessages() {
  console.log('🔄 [CONSUMER] Starting consume loop...');

  while (true) {
    try {
      console.log('🔄 [CONSUMER] Calling XREADGROUP on stream comm.telegram.incoming...');

      const results = await redis.xreadgroup(
        'GROUP', 'ai-service', 'ai-consumer-1',
        'COUNT', '1',
        'BLOCK', '1000',
        'STREAMS', 'comm.telegram.incoming', '>'
      ) as any;

      console.log(`📥 [CONSUMER] XREADGROUP result: ${results ? `GOT ${results.length} stream(s)` : 'NO DATA (timeout)'}`);

      if (results && results.length > 0) {
        for (const [stream, messages] of results) {
          console.log(`📨 [CONSUMER] Stream ${stream} has ${messages.length} message(s)`);
          for (const [messageId, fields] of messages) {
            console.log(`✅ [CONSUMER] Processing message: ${messageId}`);
            await processMessage(messageId, fields);
          }
        }
      }
    } catch (error) {
      console.error('❌ [CONSUMER] Error consuming messages:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function processMessage(messageId: string, fields: any) {
  try {
    // Extract fields
    const data: any = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }

    console.log(`Processing message ${messageId}:`, {
      correlationId: data.correlationId,
      text: data.text?.substring(0, 50) + '...'
    });

    // Feature flags
    const ENABLE_INTELLIGENT_ROUTING = process.env.ENABLE_INTELLIGENT_ROUTING === 'true';
    const ENABLE_DECISION_RESPONSES = process.env.ENABLE_DECISION_RESPONSES === 'true';
    const ENABLE_HYBRID_INTENT_CLASSIFIER = process.env.ENABLE_HYBRID_INTENT_CLASSIFIER !== 'false'; // Default: true

    // Parse attachments if present
    let attachments = [];
    if (data.attachments) {
      try {
        attachments = JSON.parse(data.attachments);
      } catch (err) {
        console.error('Failed to parse attachments:', err);
      }
    }

    // HYBRID INTENT CLASSIFICATION (NEW ARCHITECTURE)
    if (ENABLE_HYBRID_INTENT_CLASSIFIER) {
      const incomingMessage: IncomingMessage = {
        correlationId: data.correlationId,
        text: data.text || '',
        attachments: attachments.length > 0 ? attachments : undefined
      };

      const intent: Intent = await intentClassifier.classify(incomingMessage);

      console.log(`[HYBRID] Intent classified:`, {
        type: intent.type,
        confidence: intent.confidence,
        method: intent.method,
        subtype: intent.subtype
      });

      // Route based on intent type
      await routeByIntent(data, intent, messageId);
      return;
    }

    // FALLBACK: Skip if no text (legacy behavior)
    if (!data.text) {
      await redis.xack('comm.telegram.incoming', 'ai-service', messageId);
      return;
    }

    if (ENABLE_INTELLIGENT_ROUTING || ENABLE_DECISION_RESPONSES) {
      const classification = await classifier.classify(data.text, data.correlationId);
      console.log(`Message classified:`, {
        type: classification.messageType,
        intent: classification.intent,
        confidence: classification.confidence
      });

      // Send decision response if enabled
      if (ENABLE_DECISION_RESPONSES) {
        const decision = await decisionResponder.generateResponse(classification, data.text);

        // Send decision immediately if it has content
        if (decision.formatted) {
          await publishDecisionResponse(data, decision.formatted);
        }

        // Extract entities if data message
        if (classification.messageType === 'question' ||
            classification.messageType === 'conversation') {
          const entities = await entityExtractor.extract(data.text);
          if (entities.length > 0) {
            const entityResponse = decisionResponder.generateEntityResponse(entities);
            if (entityResponse) {
              await publishDecisionResponse(data, entityResponse);
            }
          }
        }

        // Process content if detected
        if (classification.messageType === 'content') {
          const analysis = await contentProcessor.process(data.text, {
            chatId: data.chatId,
            userId: data.senderId
          });
          console.log(`Content analyzed:`, analysis.id);
        }
      }

      // Route if enabled and confident
      if (ENABLE_INTELLIGENT_ROUTING &&
          classification.confidence > 0.7 &&
          classification.routing.primaryHandler !== 'ai-service') {
        console.log(`Routing to ${classification.routing.primaryHandler}`);
        await routingEngine.routeMessage(data, classification);

        // Still provide AI response if AI is secondary handler
        if (classification.routing.secondaryHandlers.includes('ai-service')) {
          const result = await processWithAI(data.text);
          await publishAIResponse(data, result.response, result.model);
        }

        await redis.xack('comm.telegram.incoming', 'ai-service', messageId);
        return;
      }
    }

    // Default: Process with AI
    const result = await processWithAI(data.text);

    await publishAIResponse(data, result.response, result.model);

    // Acknowledge message
    await redis.xack('comm.telegram.incoming', 'ai-service', messageId);
  } catch (error) {
    console.error('Error processing message:', error);
    // Don't ACK on error, will retry
  }
}

async function processWithAI(text: string): Promise<{ response: string; model: string }> {
  // Determine model preference
  const modelPreference = process.env.AI_MODEL_PREFERENCE || 'flash'; // 'pro' or 'flash'
  let selectedModel = modelPreference === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  let usedFallback = false;

  try {
    // Route to appropriate provider
    const decision = await route('chat.telegram', ['chat']);

    // Override model based on preference
    decision.model = selectedModel;

    // Set token limits based on model - Pro needs more tokens for internal thoughts
    const maxTokens = selectedModel === 'gemini-2.5-pro' ? 2000 : 500;

    // Execute chat
    const result = await executeChat(decision, {
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant responding to Telegram messages. Keep responses concise and friendly.' },
        { role: 'user', content: text }
      ],
      temperature: 0.7,
      maxTokens
    });

    return { response: result.output || 'I understand your message but cannot generate a response right now.', model: selectedModel };
  } catch (error: any) {
    console.error('AI processing error:', {
      message: error.message,
      status: error.status,
      model: selectedModel,
      isRateLimit: error.isRateLimit,
      isTokenLimit: error.isTokenLimit,
      usageMetadata: error.usageMetadata
    });

    // If it's a rate limit or token limit error on Pro model, try Flash as fallback
    if ((error.isRateLimit || error.isTokenLimit) && selectedModel === 'gemini-2.5-pro') {
      const reason = error.isRateLimit ? 'Rate limit' : 'Token limit';
      console.log(`${reason} detected on Pro model, falling back to Flash...`);

      try {
        // Retry with Flash model
        const fallbackDecision = await route('chat.telegram', ['chat']);
        fallbackDecision.model = 'gemini-2.5-flash';

        const fallbackResult = await executeChat(fallbackDecision, {
          messages: [
            { role: 'system', content: 'You are a helpful AI assistant responding to Telegram messages. Keep responses concise and friendly.' },
            { role: 'user', content: text }
          ],
          temperature: 0.7,
          maxTokens: 500  // Flash doesn't need as many tokens
        });

        usedFallback = true;
        selectedModel = 'gemini-2.5-flash';
        console.log('Fallback to Flash model successful');

        return { response: fallbackResult.output || 'I understand your message but cannot generate a response right now.', model: selectedModel };
      } catch (fallbackError: any) {
        console.error('Fallback to Flash model also failed:', fallbackError);
        return { response: `Service temporarily unavailable due to high demand. Please try again in a few minutes.`, model: 'fallback-failed' };
      }
    }

    // For other errors, return informative message
    if (error.isRateLimit) {
      return { response: `Service temporarily rate limited. Please try again in a few minutes.`, model: selectedModel };
    }

    if (error.isTokenLimit) {
      return { response: `Response too complex for current model. Please try a simpler question.`, model: selectedModel };
    }

    return { response: `Error: ${error.message}`, model: selectedModel };
  }
}

async function publishAIResponse(data: any, response: string, model?: string): Promise<void> {
  const modelPreference = process.env.AI_MODEL_PREFERENCE || 'flash';
  const selectedModel = model || (modelPreference === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash');

  await redis.xadd(
    'ai.telegram.reply',
    '*',
    'correlationId', data.correlationId || '',
    'messageId', data.messageId || '',
    'chatId', data.chatId || '',
    'replyText', response,
    'provider', 'gemini',
    'model', selectedModel,
    'timestamp', new Date().toISOString()
  );

  console.log(`Published AI response for ${data.correlationId} using ${selectedModel}`);
}

async function publishDecisionResponse(data: any, decision: string): Promise<void> {
  // Send decision as a preliminary response
  await redis.xadd(
    'ai.telegram.reply',
    '*',
    'correlationId', `${data.correlationId}-decision`,
    'messageId', data.messageId || '',
    'chatId', data.chatId || '',
    'replyText', decision,
    'provider', 'classifier',
    'model', 'decision-engine',
    'timestamp', new Date().toISOString(),
    'isDecision', 'true'
  );

  console.log(`Published decision response for ${data.correlationId}`);
}

/**
 * Route message based on intent classification (NEW HYBRID ARCHITECTURE)
 */
async function routeByIntent(data: any, intent: Intent, messageId: string): Promise<void> {
  try {
    switch (intent.type) {
      case 'file_upload':
        // File uploads already handled by content-service
        // comm-service sent acknowledgment immediately
        // We only respond if analysis was requested
        if (intent.subtype === 'analyze' && intent.parameters?.requestedAnalysis) {
          console.log(`[ROUTE] File upload with analysis request - waiting for content processing`);
          // TODO: Subscribe to content.processing.complete for this file
          // Then process with vision model
        } else {
          console.log(`[ROUTE] File upload (store only) - no AI response needed`);
        }
        await redis.xack('comm.telegram.incoming', 'ai-service', messageId);
        break;

      case 'query':
        // Queries go to memory-service for vector search
        console.log(`[ROUTE] Query detected - publishing to query.identified stream`);
        await redis.xadd(
          'query.identified',
          '*',
          'correlationId', data.correlationId,
          'query', data.text,
          'chatId', data.chatId || '',
          'userId', data.senderId || '',
          'timestamp', new Date().toISOString()
        );
        await redis.xack('comm.telegram.incoming', 'ai-service', messageId);
        break;

      case 'task':
        // Tasks go to task-executor (future phase)
        console.log(`[ROUTE] Task detected - publishing to task.identified stream`);
        await redis.xadd(
          'task.identified',
          '*',
          'correlationId', data.correlationId,
          'taskDescription', data.text,
          'chatId', data.chatId || '',
          'userId', data.senderId || '',
          'timestamp', new Date().toISOString()
        );
        // For now, also process with AI for response
        const taskResult = await processWithAI(data.text);
        await publishAIResponse(data, taskResult.response, taskResult.model);
        await redis.xack('comm.telegram.incoming', 'ai-service', messageId);
        break;

      case 'command':
        // Commands handled by comm-service or specific services
        console.log(`[ROUTE] Command detected - publishing to command.received stream`);
        await redis.xadd(
          'command.received',
          '*',
          'correlationId', data.correlationId,
          'command', data.text,
          'chatId', data.chatId || '',
          'userId', data.senderId || '',
          'timestamp', new Date().toISOString()
        );
        await redis.xack('comm.telegram.incoming', 'ai-service', messageId);
        break;

      case 'chat':
      default:
        // Chat messages processed with Gemini + conversation history
        console.log(`[ROUTE] Chat message - processing with AI (${intent.method}, confidence: ${intent.confidence})`);
        const chatResult = await processWithAI(data.text);
        await publishAIResponse(data, chatResult.response, chatResult.model);
        await redis.xack('comm.telegram.incoming', 'ai-service', messageId);
        break;
    }
  } catch (error) {
    console.error('[ROUTE] Error routing message:', error);
    // Don't ACK on error - will retry
    throw error;
  }
}